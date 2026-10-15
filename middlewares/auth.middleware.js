const jwt = require("jsonwebtoken");
const Customer = require("../models/customer.model");

const authMiddleware = async (req, res, next) => {
  try {
    let token = req.cookies.token;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const customer = await Customer.findById(decoded.customerId || decoded.id);

    if (!customer) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    req.user = customer;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
};

module.exports = authMiddleware;