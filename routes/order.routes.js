const express = require("express");
const {
  createPaymentOrder,
  verifyPayment,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
} = require("../controllers/order.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

// Order creation and payment
router.post("/create-payment-order", authMiddleware, createPaymentOrder);
router.post("/verify-payment", authMiddleware, verifyPayment);
router.post("/", authMiddleware, createPaymentOrder);

// Fetch orders
router.get("/", authMiddleware, getUserOrders);
router.get("/:id", authMiddleware, getOrderById);

// Status update (Bonus)
router.patch("/:id/status", authMiddleware, updateOrderStatus);

module.exports = router;
