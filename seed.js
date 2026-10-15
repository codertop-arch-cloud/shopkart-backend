const mongoose = require("mongoose");
const Product = require("./models/product.model");

const sampleProducts = [
  {
    name: "Wireless Noise-Canceling Headphones",
    description: "Premium over-ear headphones with active noise cancellation and 30-hour battery life.",
    price: 6499,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
    stock: 15,
  },
  {
    name: "Minimalist Leather Backpack",
    description: "Handcrafted water-resistant leather backpack with padded 15-inch laptop sleeve.",
    price: 3499,
    category: "Accessories",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80",
    stock: 8,
  },
  {
    name: "Running Shoes UltraFlow",
    description: "Breathable knit mesh running sneakers with responsive foam cushioning.",
    price: 4299,
    category: "Footwear",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
    stock: 20,
  },
  {
    name: "Classic Chronograph Watch",
    description: "Sleek stainless steel timepiece with genuine sapphire glass and Japanese movement.",
    price: 5499,
    category: "Accessories",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
    stock: 12,
  },
  {
    name: "Organic Cotton Relaxed Hoodie",
    description: "Heavyweight 400 GSM brushed organic fleece hoodie for everyday warmth.",
    price: 2199,
    category: "Fashion",
    image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80",
    stock: 25,
  },
  {
    name: "Ceramic Pour-Over Coffee Set",
    description: "Artisan stoneware dripper with heat-resistant glass carafe and bamboo stand.",
    price: 1899,
    category: "Home & Living",
    image: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=600&auto=format&fit=crop&q=80",
    stock: 14,
  },
  {
    name: "Smart Fitness Band Pro",
    description: "All-day heart rate tracking, SpO2 monitoring, and 14-day battery life with AMOLED display.",
    price: 2499,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=600&auto=format&fit=crop&q=80",
    stock: 18,
  },
];

async function seed() {
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/shopkart";
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");

  for (const item of sampleProducts) {
    const exists = await Product.findOne({ name: item.name });
    if (!exists) {
      await Product.create(item);
      console.log(`Added: ${item.name}`);
    } else {
      console.log(`Already exists: ${item.name}`);
    }
  }

  const total = await Product.countDocuments();
  console.log(`Total products in catalogue: ${total}`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
