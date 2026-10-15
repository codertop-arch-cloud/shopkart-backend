const http = require("http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const express = require("express");
const cookieParser = require("cookie-parser");

const Customer = require("../models/customer.model");
const Product = require("../models/product.model");

const customerRoutes = require("../routes/customer.routes");
const authRoutes = require("../routes/auth.routes");
const productRoutes = require("../routes/product.routes");
const wishlistRoutes = require("../routes/wishlist.routes");
const cartRoutes = require("../routes/cart.routes");

const JWT_SECRET = process.env.JWT_SECRET || "shopkart_super_secret_key_123456";
process.env.JWT_SECRET = JWT_SECRET;

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/customers", customerRoutes);
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/wishlist", wishlistRoutes);
app.use("/cart", cartRoutes);

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
        port: 5098,
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

async function runCartTests() {
  console.log("=== RUNNING SHOPPING CART BACKEND AUTOMATED TESTS ===");
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/shopkart");
  console.log("✓ Connected to MongoDB");

  const server = app.listen(5098);

  try {
    // 1. Create a test customer
    const testEmail = `cart_tester_${Date.now()}@shopkart.test`;
    const customer = await Customer.create({
      fullName: "Cart Tester",
      email: testEmail,
      password: "hashedpassword123",
      phone: "9876543210",
      cart: [],
    });

    const token = jwt.sign({ customerId: customer._id.toString() }, JWT_SECRET, {
      expiresIn: "1h",
    });
    const authHeader = { Authorization: `Bearer ${token}` };

    // 2. Fetch a test product with stock
    const product = await Product.findOne({ stock: { $gte: 5 } });
    if (!product) {
      throw new Error("No product with at least 5 units in stock found for testing.");
    }
    const productId = product._id.toString();
    console.log(`✓ Using Customer: ${customer._id}, Product: ${product.name} (Stock: ${product.stock})`);

    // TEST 7: Unauthenticated request -> 401
    const unauthRes = await request("GET", "/cart");
    console.log(`[Test 7 - Unauthenticated] Status: ${unauthRes.status} (Expected: 401)`);
    if (unauthRes.status !== 401) throw new Error("Expected 401 for unauthenticated request");

    // Edge Case: Invalid product ID -> 400
    const invalidIdRes = await request("POST", "/cart/invalid_mongo_id", authHeader);
    console.log(`[Edge Case - Invalid Product ID] Status: ${invalidIdRes.status} (Expected: 400)`);
    if (invalidIdRes.status !== 400) throw new Error("Expected 400 for invalid product id");

    // Edge Case: Non-existent product ID -> 404
    const fakeId = new mongoose.Types.ObjectId().toString();
    const notFoundRes = await request("POST", `/cart/${fakeId}`, authHeader);
    console.log(`[Edge Case - Product Not Found] Status: ${notFoundRes.status} (Expected: 404)`);
    if (notFoundRes.status !== 404) throw new Error("Expected 404 for non-existent product");

    // TEST 1: Add new item -> Expected quantity: 1
    const add1Res = await request("POST", `/cart/${productId}`, authHeader);
    console.log(`[Test 1 - Add New Item] Status: ${add1Res.status}`);
    if (add1Res.status !== 200) throw new Error("Expected 200 on adding to cart");
    const item1 = add1Res.body.cart.find((i) => i.product._id === productId);
    if (!item1 || item1.quantity !== 1) {
      throw new Error(`Expected quantity: 1, got: ${item1 ? item1.quantity : "null"}`);
    }
    console.log(`✓ Added product to cart with quantity: ${item1.quantity}`);

    // TEST 2: Add same item again -> Expected quantity: 2
    const add2Res = await request("POST", `/cart/${productId}`, authHeader);
    console.log(`[Test 2 - Add Same Item Again] Status: ${add2Res.status}`);
    if (add2Res.status !== 200) throw new Error("Expected 200 on adding same item again");
    const item2 = add2Res.body.cart.find((i) => i.product._id === productId);
    if (!item2 || item2.quantity !== 2) {
      throw new Error(`Expected quantity: 2, got: ${item2 ? item2.quantity : "null"}`);
    }
    console.log(`✓ Quantity incremented to: ${item2.quantity}`);

    // TEST 3: Get Cart -> Populated Product information
    const getCartRes = await request("GET", "/cart", authHeader);
    console.log(`[Test 3 - Get Cart] Status: ${getCartRes.status}, Items: ${getCartRes.body.cart.length}`);
    if (getCartRes.status !== 200) throw new Error("Expected 200 on get cart");
    const populatedProduct = getCartRes.body.cart[0].product;
    if (!populatedProduct.name || !populatedProduct.price || populatedProduct.stock === undefined) {
      throw new Error("Product data not properly populated in cart response");
    }
    console.log(`✓ Cart contains populated item: "${populatedProduct.name}", Price: ₹${populatedProduct.price}`);

    // TEST 4: Update quantity -> Set quantity to 3
    const updateRes = await request("PATCH", `/cart/${productId}`, authHeader, { quantity: 3 });
    console.log(`[Test 4 - Update Quantity to 3] Status: ${updateRes.status}`);
    if (updateRes.status !== 200) throw new Error("Expected 200 on update quantity");
    const item3 = updateRes.body.cart.find((i) => i.product._id === productId);
    if (!item3 || item3.quantity !== 3) {
      throw new Error(`Expected quantity: 3, got: ${item3 ? item3.quantity : "null"}`);
    }
    console.log(`✓ Updated quantity to: ${item3.quantity}`);

    // Edge Case: Quantity < 1 -> 400
    const zeroQtyRes = await request("PATCH", `/cart/${productId}`, authHeader, { quantity: 0 });
    console.log(`[Edge Case - Quantity < 1] Status: ${zeroQtyRes.status} (Expected: 400)`);
    if (zeroQtyRes.status !== 400) throw new Error("Expected 400 for quantity < 1");

    // TEST 5: Exceed stock -> 400 Bad Request
    const excessiveQty = product.stock + 10;
    const exceedStockRes = await request("PATCH", `/cart/${productId}`, authHeader, { quantity: excessiveQty });
    console.log(`[Test 5 - Exceed Stock (Qty: ${excessiveQty}, Stock: ${product.stock})] Status: ${exceedStockRes.status} (Expected: 400)`);
    if (exceedStockRes.status !== 400) throw new Error("Expected 400 when exceeding stock");

    // TEST 6: Remove item -> Expected: item removed from cart
    const deleteRes = await request("DELETE", `/cart/${productId}`, authHeader);
    console.log(`[Test 6 - Remove Item] Status: ${deleteRes.status}, Remaining items: ${deleteRes.body.cart.length}`);
    if (deleteRes.status !== 200) throw new Error("Expected 200 on remove from cart");
    const stillThere = deleteRes.body.cart.some((i) => i.product._id === productId);
    if (stillThere) throw new Error("Item was not removed from cart");
    console.log("✓ Product successfully removed from cart.");

    // Edge Case: Remove item not in cart -> 404
    const removeAgainRes = await request("DELETE", `/cart/${productId}`, authHeader);
    console.log(`[Edge Case - Remove Item Not in Cart] Status: ${removeAgainRes.status} (Expected: 404)`);
    if (removeAgainRes.status !== 404) throw new Error("Expected 404 when removing absent item");

    // Cleanup test user
    await Customer.findByIdAndDelete(customer._id);
    console.log("✓ Test customer cleanup finished.");

    console.log("\n🎉 ALL SHOPPING CART BACKEND TESTS PASSED WITH 100% SUCCESS!");
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runCartTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
