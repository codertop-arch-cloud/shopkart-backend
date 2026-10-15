const express = require("express");
const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  toggleWishlist,
  getWishlistCount,
} = require("../controllers/wishlist.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

// Specific routes before parameterized routes
router.get("/count", authMiddleware, getWishlistCount);

// Core Wishlist API contracts
router.get("/", authMiddleware, getWishlist);
router.post("/", authMiddleware, addToWishlist);
router.post("/:productId", authMiddleware, addToWishlist);
router.delete("/:productId", authMiddleware, removeFromWishlist);

// Bonus: Toggle endpoint
router.patch("/:productId/toggle", authMiddleware, toggleWishlist);
router.post("/:productId/toggle", authMiddleware, toggleWishlist);

module.exports = router;
