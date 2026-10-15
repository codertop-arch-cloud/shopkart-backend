const mongoose = require("mongoose");
const Product = require("../models/product.model");
// Create product
const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, image, stock } = req.body;

    if (!name || !description || price === undefined || !category || !image || stock === undefined) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be greater than 0",
      });
    }

    if (stock < 0) {
      return res.status(400).json({
        success: false,
        message: "Stock cannot be negative",
      });
    }

    const product = await Product.create({
      name,
      description,
      price,
      category,
      image,
      stock,
    });

    res.status(201).json({
      success: true,
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all products + search + category
const getProducts = async (req, res) => {
  try {
    const { search, category } = req.query;

    let query = {};

    if (search) {
      query.name = {
        $regex: search,
        $options: "i",
      };
    }

    if (category && category !== "All Categories") {
      query.category = category;
    }

    const products = await Product.find(query);

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get single product
const getProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProduct,
};