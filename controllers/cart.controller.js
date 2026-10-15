const mongoose = require("mongoose");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model");

/**
 * Task 2: Add Product to Cart
 * POST /cart/:productId
 * If item not present -> quantity = 1
 * If item present -> quantity += 1 (must not exceed stock)
 */
const addToCart = async (req, res) => {
  try {
    const productId = req.params.productId || req.body?.productId || req.body?._id;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required (in URL path or body)",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const user = await Customer.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!Array.isArray(user.cart)) {
      user.cart = [];
    }

    const itemIndex = user.cart.findIndex(
      (item) => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      // Product not in cart yet -> check if in stock
      if (product.stock < 1) {
        return res.status(400).json({
          success: false,
          message: "Product is out of stock",
        });
      }

      user.cart.push({
        product: productId,
        quantity: 1,
      });
    } else {
      // Product already in cart -> increment quantity
      const newQuantity = user.cart[itemIndex].quantity + 1;

      if (newQuantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Requested quantity exceeds available stock (${product.stock})`,
        });
      }

      user.cart[itemIndex].quantity = newQuantity;
    }

    await user.save();

    await user.populate({
      path: "cart.product",
      select: "name description price category image stock",
    });

    const validCart = (user.cart || []).filter((item) => item.product !== null);

    return res.status(200).json({
      success: true,
      message: "Cart updated",
      cart: validCart,
    });
  } catch (error) {
    console.error("Error adding to cart:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while adding to cart",
    });
  }
};

/**
 * Task 3: Get Current User Cart
 * GET /cart
 * Populates each cart item's Product
 */
const getCart = async (req, res) => {
  try {
    const user = await Customer.findById(req.user._id).populate({
      path: "cart.product",
      select: "name description price category image stock",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const validCart = (user.cart || []).filter((item) => item.product !== null);

    return res.status(200).json({
      success: true,
      cart: validCart,
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching cart",
    });
  }
};

/**
 * Task 4: Update Product Quantity
 * PATCH /cart/:productId
 * Request body: { quantity: Number }
 */
const updateQuantity = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    if (
      quantity === undefined ||
      typeof quantity !== "number" ||
      isNaN(quantity) ||
      !Number.isInteger(quantity)
    ) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a valid integer",
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const user = await Customer.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!Array.isArray(user.cart)) {
      user.cart = [];
    }

    const item = user.cart.find(
      (i) => i.product.toString() === productId
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Product not in cart",
      });
    }

    if (quantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Requested quantity exceeds available stock (${product.stock})`,
      });
    }

    item.quantity = quantity;
    await user.save();

    await user.populate({
      path: "cart.product",
      select: "name description price category image stock",
    });

    const validCart = (user.cart || []).filter((i) => i.product !== null);

    return res.status(200).json({
      success: true,
      message: "Cart quantity updated",
      cart: validCart,
    });
  } catch (error) {
    console.error("Error updating cart quantity:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating cart",
    });
  }
};

/**
 * Task 5: Remove Product from Cart
 * DELETE /cart/:productId
 */
const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const user = await Customer.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!Array.isArray(user.cart)) {
      user.cart = [];
    }

    const exists = user.cart.some(
      (item) => item.product.toString() === productId
    );

    if (!exists) {
      return res.status(404).json({
        success: false,
        message: "Product not in cart",
      });
    }

    user.cart = user.cart.filter(
      (item) => item.product.toString() !== productId
    );

    await user.save();

    await user.populate({
      path: "cart.product",
      select: "name description price category image stock",
    });

    const validCart = (user.cart || []).filter((item) => item.product !== null);

    return res.status(200).json({
      success: true,
      message: "Product removed from cart",
      cart: validCart,
    });
  } catch (error) {
    console.error("Error removing from cart:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while removing from cart",
    });
  }
};

/**
 * Helper: Clear entire cart
 * DELETE /cart
 */
const clearCart = async (req, res) => {
  try {
    const user = await Customer.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.cart = [];
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Cart cleared",
      cart: [],
    });
  } catch (error) {
    console.error("Error clearing cart:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while clearing cart",
    });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateQuantity,
  removeFromCart,
  clearCart,
};
