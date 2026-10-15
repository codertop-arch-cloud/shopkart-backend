const mongoose = require("mongoose");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model");

/**
 * Task 2: Add Product to Wishlist
 * POST /wishlist/:productId
 * Protected by authMiddleware
 */
const addToWishlist = async (req, res) => {
  try {
    const productId = req.params.productId || req.body?.productId || req.body?._id;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required (in URL path or body)",
      });
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    // Verify product exists in the database
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Find the authenticated user
    const user = await Customer.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Ensure wishlist array is initialized (for backward compatibility)
    if (!Array.isArray(user.wishlist)) {
      user.wishlist = [];
    }

    // Check for duplicate product reference
    const isAlreadyInWishlist = user.wishlist.some(
      (id) => id.toString() === productId
    );

    if (isAlreadyInWishlist) {
      return res.status(409).json({
        success: false,
        message: "Product already in wishlist",
      });
    }

    // Store only the ObjectId reference (not duplicated product data)
    user.wishlist.push(productId);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Product added to wishlist",
      count: user.wishlist.length,
    });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while adding to wishlist",
    });
  }
};

/**
 * Task 3: Get Current User's Wishlist
 * GET /wishlist
 * Protected by authMiddleware
 */
const getWishlist = async (req, res) => {
  try {
    // Current user identified from authMiddleware
    const user = await Customer.findById(req.user._id).populate({
      path: "wishlist",
      select: "name description price category image stock createdAt",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Filter out null values in case a referenced product was removed from the database
    const validWishlist = (user.wishlist || []).filter((item) => item !== null);

    return res.status(200).json({
      success: true,
      count: validWishlist.length,
      wishlist: validWishlist,
    });
  } catch (error) {
    console.error("Error getting wishlist:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching wishlist",
    });
  }
};

/**
 * Task 4: Remove Product from Wishlist
 * DELETE /wishlist/:productId
 * Protected by authMiddleware
 */
const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate MongoDB ObjectId
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

    if (!Array.isArray(user.wishlist)) {
      user.wishlist = [];
    }

    // Check if the product reference is currently in the user's wishlist
    const exists = user.wishlist.some((id) => id.toString() === productId);

    if (!exists) {
      return res.status(404).json({
        success: false,
        message: "Product not in wishlist",
      });
    }

    // Remove the product ObjectId reference
    user.wishlist = user.wishlist.filter(
      (id) => id.toString() !== productId
    );

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
      count: user.wishlist.length,
    });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while removing from wishlist",
    });
  }
};

/**
 * Bonus: Toggle Product in Wishlist
 * PATCH or POST /wishlist/:productId/toggle
 * Protected by authMiddleware
 */
const toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

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

    if (!Array.isArray(user.wishlist)) {
      user.wishlist = [];
    }

    const isAlreadySaved = user.wishlist.some(
      (id) => id.toString() === productId
    );

    if (isAlreadySaved) {
      user.wishlist = user.wishlist.filter(
        (id) => id.toString() !== productId
      );
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Product removed from wishlist",
        inWishlist: false,
        count: user.wishlist.length,
      });
    } else {
      user.wishlist.push(productId);
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Product added to wishlist",
        inWishlist: true,
        count: user.wishlist.length,
      });
    }
  } catch (error) {
    console.error("Error toggling wishlist:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while toggling wishlist",
    });
  }
};

/**
 * Bonus: Get Wishlist Count
 * GET /wishlist/count
 * Protected by authMiddleware
 */
const getWishlistCount = async (req, res) => {
  try {
    const user = await Customer.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const count = Array.isArray(user.wishlist) ? user.wishlist.length : 0;

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Error getting wishlist count:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching count",
    });
  }
};

module.exports = {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  toggleWishlist,
  getWishlistCount,
};
