const http = require("http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model");
const express = require("express");
const cookieParser = require("cookie-parser");

const customerRoutes = require("../routes/customer.routes");
const authRoutes = require("../routes/auth.routes");
const productRoutes = require("../routes/product.routes");
const wishlistRoutes = require("../routes/wishlist.routes");

const JWT_SECRET = process.env.JWT_SECRET || "shopkart_super_secret_key_123456";
process.env.JWT_SECRET = JWT_SECRET;

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/customers", customerRoutes);
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/wishlist", wishlistRoutes);

function request(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = { ...headers };
    if (payload) {
      reqHeaders["Content-Type"] = "application/json";
      reqHeaders["Content-Length"] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        host: "127.0.0.1",
        port: 5099,
        method,
        path,
        headers: reqHeaders,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch (e) {
            json = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        });
      }
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log("=== RUNNING WISHLIST BACKEND AUTOMATED TESTS ===");
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/shopkart");
  console.log("✓ Connected to MongoDB");

  const server = app.listen(5099);

  try {
    // 1. Setup a test customer and test product
    const testEmail = `tester_${Date.now()}@shopkart.test`;
    const customer = await Customer.create({
      fullName: "Wishlist Tester",
      email: testEmail,
      password: "hashedpassword123",
      phone: "9876543210",
      wishlist: [],
    });

    const token = jwt.sign({ customerId: customer._id.toString() }, JWT_SECRET, {
      expiresIn: "1h",
    });
    const authHeader = { Authorization: `Bearer ${token}` };

    const product = await Product.findOne();
    if (!product) {
      throw new Error("No product found in catalogue for testing.");
    }
    const productId = product._id.toString();
    console.log(`✓ Using Test Customer ID: ${customer._id}, Product ID: ${productId}`);

    // TEST 5 (First): Unauthenticated access -> 401
    const unauthRes = await request("POST", `/wishlist/${productId}`);
    console.log(`[Test 5 - Unauthenticated] Status: ${unauthRes.status} (Expected: 401)`);
    if (unauthRes.status !== 401) throw new Error("Expected 401 for unauthenticated request");

    // Invalid Product ID -> 400
    const invalidIdRes = await request("POST", `/wishlist/invalid_mongo_id`, authHeader);
    console.log(`[Edge Case - Invalid ID] Status: ${invalidIdRes.status} (Expected: 400)`);
    if (invalidIdRes.status !== 400) throw new Error("Expected 400 for invalid product id");

    // Non-existent Product ID -> 404
    const fakeId = new mongoose.Types.ObjectId().toString();
    const notFoundRes = await request("POST", `/wishlist/${fakeId}`, authHeader);
    console.log(`[Edge Case - Product Not Found] Status: ${notFoundRes.status} (Expected: 404)`);
    if (notFoundRes.status !== 404) throw new Error("Expected 404 for non-existent product");

    // TEST 1: Add product to wishlist -> 200/201
    const addRes = await request("POST", `/wishlist/${productId}`, authHeader);
    console.log(`[Test 1 - Add Product] Status: ${addRes.status}, Body:`, addRes.body);
    if (addRes.status !== 200 && addRes.status !== 201) throw new Error("Expected 200/201 on add");

    // TEST 2: Duplicate add -> 409 Conflict
    const dupRes = await request("POST", `/wishlist/${productId}`, authHeader);
    console.log(`[Test 2 - Duplicate Add] Status: ${dupRes.status} (Expected: 409), Body:`, dupRes.body);
    if (dupRes.status !== 409) throw new Error("Expected 409 on duplicate product");

    // TEST 3: Get Wishlist -> 200 with populated product details
    const getRes = await request("GET", "/wishlist", authHeader);
    console.log(`[Test 3 - Get Wishlist] Status: ${getRes.status}, Count: ${getRes.body.count}`);
    if (getRes.status !== 200) throw new Error("Expected 200 on get wishlist");
    if (!Array.isArray(getRes.body.wishlist) || getRes.body.count !== 1) {
      throw new Error("Wishlist should have 1 item");
    }
    const populatedItem = getRes.body.wishlist[0];
    if (!populatedItem.name || !populatedItem.price) {
      throw new Error("Wishlist items should be populated with product fields");
    }
    console.log(`✓ Populated Product: ${populatedItem.name}, Price: ₹${populatedItem.price}`);

    // Bonus: Wishlist Count endpoint
    const countRes = await request("GET", "/wishlist/count", authHeader);
    console.log(`[Bonus - Wishlist Count] Status: ${countRes.status}, Count: ${countRes.body.count}`);
    if (countRes.status !== 200 || countRes.body.count !== 1) throw new Error("Count endpoint failed");

    // TEST 4: Remove Product from Wishlist -> 200
    const remRes = await request("DELETE", `/wishlist/${productId}`, authHeader);
    console.log(`[Test 4 - Remove Product] Status: ${remRes.status}, Body:`, remRes.body);
    if (remRes.status !== 200) throw new Error("Expected 200 on remove");

    // Edge Case: Remove when not in wishlist -> 404
    const remAgainRes = await request("DELETE", `/wishlist/${productId}`, authHeader);
    console.log(`[Edge Case - Remove Absent Product] Status: ${remAgainRes.status} (Expected: 404)`);
    if (remAgainRes.status !== 404) throw new Error("Expected 404 on removing non-wishlist product");

    // Bonus: Toggle Endpoint
    const toggleAdd = await request("PATCH", `/wishlist/${productId}/toggle`, authHeader);
    console.log(`[Bonus - Toggle Add] In Wishlist: ${toggleAdd.body.inWishlist} (Expected: true)`);
    if (!toggleAdd.body.inWishlist) throw new Error("Toggle add failed");

    const toggleRemove = await request("PATCH", `/wishlist/${productId}/toggle`, authHeader);
    console.log(`[Bonus - Toggle Remove] In Wishlist: ${toggleRemove.body.inWishlist} (Expected: false)`);
    if (toggleRemove.body.inWishlist) throw new Error("Toggle remove failed");

    // Cleanup
    await Customer.findByIdAndDelete(customer._id);
    console.log("✓ Cleanup finished.");

    console.log("\n🎉 ALL BACKEND TESTS PASSED SUCCESSFULLY! (100% SPEC COMPLIANCE)");
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
