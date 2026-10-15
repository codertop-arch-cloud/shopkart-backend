console.log("INDEX.JS STARTED");

const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const productRoutes = require("./routes/product.routes");
const customerRoutes = require("./routes/customer.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const cartRoutes = require("./routes/cart.routes");
const authRoutes = require("./routes/auth.routes");
const orderRoutes = require("./routes/order.routes");
const multer = require("multer");
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  storage: multer.memoryStorage(),
});
const { isCloudinaryConfigured, uploadImage } = require("./utils/cloudinary");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://localhost:5001",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        return callback(null, true);
      }

      return callback(new Error("CORS policy violation"), false);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/customers", customerRoutes);
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/wishlist", wishlistRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", orderRoutes);

// Optional Cloudinary image upload endpoint
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        success: false,
        message:
          "Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.",
      });
    }

    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    const result = await uploadImage(dataURI, { folder: "shopkart/uploads" });

    return res.status(200).json({
      success: true,
      message: "Image uploaded to Cloudinary successfully",
      url: result.secure_url || result.url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ShopKart backend is running",
    cloudinaryEnabled: isCloudinaryConfigured(),
  });
});

const startServer = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/shopkart";
    const port = process.env.PORT || 5001;

    await mongoose.connect(mongoUri);

    console.log("MongoDB connected successfully");

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  }
};

startServer();