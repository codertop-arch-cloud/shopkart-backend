const mongoose = require("mongoose");
const Customer = require("./customer.model");

// Register User model for compatibility with User ref
const User = mongoose.models.User || mongoose.model("User", Customer.schema, "customers");

module.exports = User;
