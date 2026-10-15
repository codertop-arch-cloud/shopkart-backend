const Razorpay = require("razorpay");

// Initialize Razorpay instance with environment variables
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "mock_secret_key_123456",
});

module.exports = razorpay;
