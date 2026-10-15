const express = require("express");
const {
  addToCart,
  getCart,
  updateQuantity,
  removeFromCart,
  clearCart,
} = require("../controllers/cart.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

// Specific routes before parameterized routes
router.get("/", authMiddleware, getCart);
router.post("/", authMiddleware, addToCart);
router.delete("/", authMiddleware, clearCart);

// Parameterized product routes
router.post("/:productId", authMiddleware, addToCart);
router.patch("/:productId", authMiddleware, updateQuantity);
router.delete("/:productId", authMiddleware, removeFromCart);

module.exports = router;
