const http = require("http");
const crypto = require("crypto");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const express = require("express");
const cookieParser = require("cookie-parser");

const Customer = require("../models/customer.model");
const Product = require("../models/product.model");
const Order = require("../models/order.model");

const customerRoutes = require("../routes/customer.routes");
const authRoutes = require("../routes/auth.routes");
const productRoutes = require("../routes/product.routes");
const cartRoutes = require("../routes/cart.routes");
const orderRoutes = require("../routes/order.routes");

const JWT_SECRET = process.env.JWT_SECRET || "shopkart_super_secret_key_123456";
const RAZORPAY_SECRET = process.env.RAZORPAY_KEY_SECRET || "mock_secret_key_123456";
process.env.JWT_SECRET = JWT_SECRET;
process.env.RAZORPAY_KEY_SECRET = RAZORPAY_SECRET;

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/customers", customerRoutes);
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", orderRoutes);

function request(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = { ...headers };
    if (payload) {
      reqHeaders["Content-Type"] = "application/json";
      reqHeaders["Content-Length"] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        host: "127.0.0.1",
        port: 5097,
        method,
        path,
        headers: reqHeaders,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch (e) {
            json = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        });
      }
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runOrderTests() {
  console.log("=== RUNNING ORDERS & CHECKOUT BACKEND AUTOMATED TESTS ===");
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/shopkart");
  console.log("✓ Connected to MongoDB");

  const server = app.listen(5097);

  try {
    // Setup test customers
    const userA = await Customer.create({
      fullName: "Student User A",
      email: `student_a_${Date.now()}@shopkart.test`,
      password: "hashedpassword123",
      phone: "9876543210",
      cart: [],
    });

    const userB = await Customer.create({
      fullName: "Student User B",
      email: `student_b_${Date.now()}@shopkart.test`,
      password: "hashedpassword123",
      phone: "9876543211",
      cart: [],
    });

    const tokenA = jwt.sign({ customerId: userA._id.toString() }, JWT_SECRET, { expiresIn: "1h" });
    const authA = { Authorization: `Bearer ${tokenA}` };

    const tokenB = jwt.sign({ customerId: userB._id.toString() }, JWT_SECRET, { expiresIn: "1h" });
    const authB = { Authorization: `Bearer ${tokenB}` };

    const product = await Product.findOne({ stock: { $gte: 5 } });
    if (!product) throw new Error("Product with sufficient stock required for testing");

    console.log(`✓ Using User A: ${userA._id}, Product: ${product.name} (Stock: ${product.stock}, Price: ${product.price})`);

    // Test 9: Unauthenticated request -> 401
    const unauth = await request("POST", "/orders/create-payment-order", {}, {});
    console.log(`[Test 9 - Unauthenticated] Status: ${unauth.status} (Expected: 401)`);
    if (unauth.status !== 401) throw new Error("Expected 401 for unauthenticated request");

    // Test 1: Empty cart -> 400
    const emptyCartRes = await request("POST", "/orders", authA, {
      shippingAddress: {
        fullName: "Student User A",
        phone: "9876543210",
        addressLine1: "22 MG Road",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560001",
      },
    });
    console.log(`[Test 1 - Empty Cart] Status: ${emptyCartRes.status} (Expected: 400)`);
    if (emptyCartRes.status !== 400) throw new Error("Expected 400 when checking out with empty cart");

    // Add item to User A's cart
    await request("POST", `/cart/${product._id}`, authA);
    await request("POST", `/cart/${product._id}`, authA); // quantity: 2

    // Shipping address validation test: invalid pincode -> 400
    const invalidPin = await request("POST", "/orders/create-payment-order", authA, {
      shippingAddress: {
        fullName: "Student User A",
        phone: "9876543210",
        addressLine1: "22 MG Road",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "123", // invalid
      },
    });
    console.log(`[Validation - Invalid Pincode] Status: ${invalidPin.status} (Expected: 400)`);
    if (invalidPin.status !== 400) throw new Error("Expected 400 for invalid pincode");

    // Test 2 & 8: Create Payment Order + Fake Total Ignored
    const orderRes = await request("POST", "/orders/create-payment-order", authA, {
      shippingAddress: {
        fullName: "Student User A",
        phone: "9876543210",
        addressLine1: "22 MG Road",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560001",
      },
      totalAmount: 1, // Manipulated fake total, should be ignored!
    });
    console.log(`[Test 2 - Create Payment Order] Status: ${orderRes.status}`);
    if (orderRes.status !== 201) throw new Error("Expected 201 on order creation");

    const { shopKartOrderId, razorpayOrderId, amount } = orderRes.body;
    const expectedAmountPaise = product.price * 2 * 100;
    console.log(`✓ Order ID: ${shopKartOrderId}, Razorpay Order ID: ${razorpayOrderId}, Amount: ${amount} (Expected: ${expectedAmountPaise})`);
    if (amount !== expectedAmountPaise) throw new Error(`Server calculated total mismatch: expected ${expectedAmountPaise}, got ${amount}`);

    // Test 3: Cart before payment verification should still contain items
    const cartBeforeVerify = await request("GET", "/cart", authA);
    console.log(`[Test 3 - Cart Before Verify] Items: ${cartBeforeVerify.body.cart.length} (Expected: 1 item with qty 2)`);
    if (cartBeforeVerify.body.cart.length !== 1 || cartBeforeVerify.body.cart[0].quantity !== 2) {
      throw new Error("Cart should NOT be cleared before payment verification");
    }

    // Test B: Fake payment verification signature -> 400 Bad Request
    const fakeVerify = await request("POST", "/orders/verify-payment", authA, {
      shopKartOrderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: "pay_test_fake123",
      razorpay_signature: "invalid_tampered_signature_abc",
    });
    console.log(`[Test B - Fake Signature] Status: ${fakeVerify.status} (Expected: 400)`);
    if (fakeVerify.status !== 400) throw new Error("Expected 400 for invalid signature");

    // Test 4: Verify successful payment with valid signature
    const testPaymentId = "pay_test_" + Date.now();
    const validSignature = crypto
      .createHmac("sha256", RAZORPAY_SECRET)
      .update(razorpayOrderId + "|" + testPaymentId)
      .digest("hex");

    const validVerify = await request("POST", "/orders/verify-payment", authA, {
      shopKartOrderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: validSignature,
    });
    console.log(`[Test 4 - Valid Payment Verification] Status: ${validVerify.status}`);
    if (validVerify.status !== 200) throw new Error("Expected 200 for valid payment verification");
    if (validVerify.body.order.paymentStatus !== "PAID" || validVerify.body.order.status !== "PLACED") {
      throw new Error("Expected paymentStatus PAID and status PLACED");
    }

    // Test 5: Confirm cart is cleared after verified payment
    const cartAfterVerify = await request("GET", "/cart", authA);
    console.log(`[Test 5 - Cart Cleared After Payment] Items: ${cartAfterVerify.body.cart.length} (Expected: 0)`);
    if (cartAfterVerify.body.cart.length !== 0) {
      throw new Error("Cart should be empty after verified payment");
    }

    // Test 6: Get Orders
    const ordersRes = await request("GET", "/orders", authA);
    console.log(`[Test 6 - Get Orders] Status: ${ordersRes.status}, Orders count: ${ordersRes.body.orders.length}`);
    if (ordersRes.status !== 200 || ordersRes.body.orders.length === 0) {
      throw new Error("Expected user orders list with placed order");
    }
    const savedOrder = ordersRes.body.orders[0];
    if (savedOrder.items[0].name !== product.name || savedOrder.items[0].price !== product.price) {
      throw new Error("Order items must be purchase-time snapshots!");
    }
    console.log(`✓ Order item snapshot verified: "${savedOrder.items[0].name}" at ₹${savedOrder.items[0].price}`);

    // Single Order API
    const singleOrderRes = await request("GET", `/orders/${shopKartOrderId}`, authA);
    console.log(`[Single Order API] Status: ${singleOrderRes.status}`);
    if (singleOrderRes.status !== 200 || singleOrderRes.body.order._id !== shopKartOrderId) {
      throw new Error("Failed to fetch single order by ID");
    }

    // Test 10: Access another user's order -> 403 Forbidden
    const crossAccessRes = await request("GET", `/orders/${shopKartOrderId}`, authB);
    console.log(`[Test 10 - Access Other User's Order] Status: ${crossAccessRes.status} (Expected: 403)`);
    if (crossAccessRes.status !== 403) throw new Error("Expected 403 when accessing another user's order");

    // Bonus Challenge: Update status
    const updateStatusRes = await request("PATCH", `/orders/${shopKartOrderId}/status`, authA, {
      status: "CONFIRMED",
    });
    console.log(`[Bonus - Order Status Progression] Status: ${updateStatusRes.status}, New status: ${updateStatusRes.body.order.status}`);
    if (updateStatusRes.status !== 200 || updateStatusRes.body.order.status !== "CONFIRMED") {
      throw new Error("Failed to update status to CONFIRMED");
    }

    // Test 7: Insufficient stock check
    // Create product with stock 1
    const lowStockProd = await Product.create({
      name: "Limited Edition Item",
      description: "Only 1 unit available",
      price: 999,
      category: "Special",
      image: "https://example.com/item.png",
      stock: 1,
    });

    await request("POST", `/cart/${lowStockProd._id}`, authB); // User B has 1 unit
    // Simulate stock decreasing to 0 in database before checkout
    await Product.findByIdAndUpdate(lowStockProd._id, { stock: 0 });

    const outOfStockRes = await request("POST", "/orders/create-payment-order", authB, {
      shippingAddress: {
        fullName: "Student User B",
        phone: "9876543211",
        addressLine1: "10 Park Street",
        city: "Kolkata",
        state: "West Bengal",
        pincode: "700016",
      },
    });
    console.log(`[Test 7 - Insufficient Stock Revalidation] Status: ${outOfStockRes.status} (Expected: 400)`);
    if (outOfStockRes.status !== 400) throw new Error("Expected 400 when product stock is insufficient");

    // Clean up
    await Customer.deleteMany({ _id: { $in: [userA._id, userB._id] } });
    await Order.deleteMany({ _id: shopKartOrderId });
    await Product.deleteOne({ _id: lowStockProd._id });

    console.log("✓ Cleanup finished.");
    console.log("\n🎉 ALL CHECKOUT & ORDERS BACKEND TESTS PASSED WITH 100% SUCCESS!");
  } finally {
    server.close();
    await mongoose.connection.close();
  }
}

runOrderTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
