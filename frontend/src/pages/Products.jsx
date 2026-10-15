import { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";
import api from "../services/api";

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [wishlistIds, setWishlistIds] = useState(new Set());

  const categories = [
    "All",
    "Electronics",
    "Fashion",
    "Footwear",
    "Accessories",
    "Home & Living",
  ];

  const fetchWishlistStatus = useCallback(async () => {
    try {
      const res = await api.get("/wishlist");
      if (res.data && Array.isArray(res.data.wishlist)) {
        const ids = new Set(res.data.wishlist.map((p) => p._id));
        setWishlistIds(ids);
      }
    } catch {
      // User may not be logged in; silent catch
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};
      if (selectedCategory && selectedCategory !== "All") {
        params.category = selectedCategory;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const response = await api.get("/products", { params });

      if (response.data && Array.isArray(response.data.products)) {
        setProducts(response.data.products);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Unable to load product catalogue. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    fetchWishlistStatus();
  }, [fetchWishlistStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 200);

    return () => clearTimeout(timer);
  }, [fetchProducts]);

  const handleWishlistChange = (id, isSaved) => {
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (isSaved) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  return (
    <div className="products-page">
      <Navbar />

      <main className="products-container">
        <header className="products-header">
          <div className="header-info">
            <span className="eyebrow">SHOPKART CATALOGUE</span>
            <h1>Explore Products</h1>
            <p>Discover our handpicked collection of quality items.</p>
          </div>

          <div className="products-search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search products by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                className="clear-search-btn"
                onClick={() => setSearchQuery("")}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </header>

        <div className="category-filters">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-pill ${
                selectedCategory === cat ? "active" : ""
              }`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="catalogue-loading">
            <div className="loader"></div>
            <p>Loading catalogue...</p>
          </div>
        ) : error ? (
          <div className="catalogue-error">
            <p>{error}</p>
            <button className="primary-btn retry-btn" onClick={fetchProducts}>
              Retry
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="catalogue-empty">
            <span className="empty-icon">📦</span>
            <h3>No products found</h3>
            <p>
              Try adjusting your search or category filter to find what you are
              looking for.
            </p>
            {(selectedCategory !== "All" || searchQuery) && (
              <button
                className="reset-filters-btn"
                onClick={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="products-grid">
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                isSavedInitial={wishlistIds.has(product._id)}
                onWishlistChange={handleWishlistChange}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Products;
