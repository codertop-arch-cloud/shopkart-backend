const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const Customer = require("../models/customer.model");
const razorpay = require("../config/razorpay");

// Create pending order and generate Razorpay order
const createPaymentOrder = async (req, res) => {
  try {
    const { shippingAddress } = req.body;

    // Validate shipping details
    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: "Shipping address is required",
      });
    }

    const { fullName, phone, addressLine1, city, state, pincode } = shippingAddress;

    if (
      !fullName?.trim() ||
      !phone?.trim() ||
      !addressLine1?.trim() ||
      !city?.trim() ||
      !state?.trim() ||
      !pincode?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "All shipping address fields are required",
      });
    }

    const cleanPhone = phone.trim().replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid phone number",
      });
    }

    if (!/^\d{6}$/.test(pincode.trim())) {
      return res.status(400).json({
        success: false,
        message: "Pincode must contain 6 digits",
      });
    }

    // Get current user and their cart
    const user = await Customer.findById(req.user._id);
    if (!user || !user.cart || user.cart.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart cannot be empty",
      });
    }

    let calculatedTotal = 0;
    const orderItems = [];

    // Verify stock and snapshot product details
    for (const item of user.cart) {
      const product = await Product.findById(item.product);

      if (!product) {
        return res.status(400).json({
          success: false,
          message: "A product in your cart is no longer available",
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`,
        });
      }

      calculatedTotal += product.price * item.quantity;

      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.image,
      });
    }

    // Create pending order in database
    const order = new Order({
      user: user._id,
      items: orderItems,
      shippingAddress: {
        fullName: fullName.trim(),
        phone: phone.trim(),
        addressLine1: addressLine1.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
      },
      totalAmount: calculatedTotal,
      paymentStatus: "PENDING",
      status: "PENDING_PAYMENT",
    });

    await order.save();

    const amountInPaise = Math.round(calculatedTotal * 100);
    let razorpayOrderId = "";

    // Create Razorpay order
    try {
      const rzpOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: order._id.toString(),
      });
      razorpayOrderId = rzpOrder.id;
    } catch (rzpErr) {
      console.log("Razorpay test order fallback:", rzpErr?.message || rzpErr);
      razorpayOrderId = "order_" + Math.random().toString(36).substring(2, 12);
    }

    order.razorpayOrderId = razorpayOrderId;
    await order.save();

    return res.status(201).json({
      success: true,
      shopKartOrderId: order._id,
      razorpayOrderId: razorpayOrderId,
      amount: amountInPaise,
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
    });
  } catch (error) {
    console.error("Create payment order error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create payment order",
    });
  }
};

// Verify payment signature and complete order
const verifyPayment = async (req, res) => {
  try {
    const { shopKartOrderId, razorpay_payment_id, razorpay_signature, razorpay_order_id } =
      req.body;

    if (!shopKartOrderId || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification details",
      });
    }

    const order = await Order.findById(shopKartOrderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Verify order ownership
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Verify razorpay signature using HMAC SHA256
    const rzpOrderId = order.razorpayOrderId || razorpay_order_id;
    const body = rzpOrderId + "|" + razorpay_payment_id;
    const secret = process.env.RAZORPAY_KEY_SECRET || "mock_secret_key_123456";

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      order.paymentStatus = "FAILED";
      await order.save();

      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // Mark order as paid and placed
    order.paymentStatus = "PAID";
    order.status = "PLACED";
    order.razorpayPaymentId = razorpay_payment_id;
    await order.save();

    // Deduct stock for each purchased item
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    // Clear user's cart in database
    const user = await Customer.findById(req.user._id);
    if (user) {
      user.cart = [];
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      order,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
    });
  }
};

// Get all orders for logged in user
const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Get orders error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};

// Get single order by ID
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Enforce order ownership
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized order access",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get single order error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order",
    });
  }
};

// Update order status (Bonus Challenge)
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.status = status;
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order status updated",
      order,
    });
  } catch (error) {
    console.error("Update status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update status",
    });
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
};
