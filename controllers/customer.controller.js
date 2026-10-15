const bcrypt = require("bcrypt");
const Customer = require("../models/customer.model");
const jwt = require("jsonwebtoken");
const generateToken = require("../utils/generateToken");

const registerCustomer = async (req, res) => {
  try { 
    const fullName = req.body.fullName || req.body.name;
    const { email, password, phone } = req.body;

    if (!fullName || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 6 characters",
      });
    }

    const existingCustomer = await Customer.findOne({
      email: email.toLowerCase(),
    });

    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = await Customer.create({
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
    });

    res.status(201).json({
      success: true,
      message: "Customer registered successfully",
      customer: {
        _id: customer._id,
        fullName: customer.fullName,
        name: customer.fullName,
        email: customer.email,
        phone: customer.phone,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const customer = await Customer.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    if (!customer) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const passwordCorrect = await bcrypt.compare(
      password,
      customer.password
    );

    if (!passwordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(customer._id.toString());

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      customer: {
        _id: customer._id,
        fullName: customer.fullName,
        name: customer.fullName,
        email: customer.email,
        phone: customer.phone,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getMyProfile = async (req, res) => {
  res.status(200).json({
    _id: req.user._id,
    fullName: req.user.fullName,
    name: req.user.fullName,
    email: req.user.email,
    phone: req.user.phone,
  });
};

const logoutCustomer = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

module.exports = {
  registerCustomer,
  loginCustomer,
  getMyProfile,
  logoutCustomer,
};