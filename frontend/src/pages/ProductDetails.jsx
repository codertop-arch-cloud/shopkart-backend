import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";
import { useCart } from "../context/CartContext";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, updatingItemId, getItemQuantity } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const defaultImage =
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80";

  const cartQuantity = product ? getItemQuantity(product._id) : 0;
  const isAddingToCart = product ? updatingItemId === product._id : false;
  const isOutOfStock = product ? product.stock < 1 : false;

  const fetchProductAndWishlistStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [productRes, wishlistRes] = await Promise.allSettled([
        api.get(`/products/${id}`),
        api.get("/wishlist"),
      ]);

      if (productRes.status === "fulfilled" && productRes.value.data?.product) {
        setProduct(productRes.value.data.product);
      } else {
        setError("Product not found or unavailable.");
      }

      if (
        wishlistRes.status === "fulfilled" &&
        Array.isArray(wishlistRes.value.data?.wishlist)
      ) {
        const saved = wishlistRes.value.data.wishlist.some(
          (item) => item._id === id
        );
        setIsSaved(saved);
      }
    } catch (err) {
      console.error("Error fetching product details:", err);
      setError("Unable to load product details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProductAndWishlistStatus();
  }, [fetchProductAndWishlistStatus]);

  const handleWishlistToggle = async () => {
    if (wishlistLoading || !product) return;

    try {
      setWishlistLoading(true);
      setToastMessage("");

      const response = await api.patch(`/wishlist/${product._id}/toggle`);

      const nextSaved =
        response.data && typeof response.data.inWishlist === "boolean"
          ? response.data.inWishlist
          : !isSaved;

      setIsSaved(nextSaved);
      setToastMessage(
        nextSaved ? "Product added to wishlist!" : "Product removed from wishlist"
      );

      // Trigger badge update
      if (response.data && typeof response.data.count === "number") {
        window.dispatchEvent(
          new CustomEvent("wishlistChange", {
            detail: { count: response.data.count },
          })
        );
      } else {
        window.dispatchEvent(new CustomEvent("wishlistChange"));
      }

      setTimeout(() => setToastMessage(""), 3000);
    } catch (err) {
      console.error("Wishlist toggle error:", err);
      if (err.response?.status === 401) {
        navigate("/login");
      } else {
        setToastMessage("Failed to update wishlist. Please try again.");
      }
      setTimeout(() => setToastMessage(""), 3500);
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (isAddingToCart || isOutOfStock || !product) return;

    setToastMessage("");
    const result = await addToCart(product._id);

    if (result.success) {
      setToastMessage("Added to cart! 🛒");
      setTimeout(() => setToastMessage(""), 3000);
    } else {
      if (result.status === 401) {
        navigate("/login");
      } else {
        setToastMessage(result.message);
        setTimeout(() => setToastMessage(""), 3500);
      }
    }
  };

  return (
    <div className="product-details-page">
      <Navbar />

      <main className="product-details-container">
        <button
          className="back-nav-btn"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        {loading ? (
          <div className="details-loading-state">
            <div className="loader"></div>
            <p>Loading product details...</p>
          </div>
        ) : error || !product ? (
          <div className="details-error-state">
            <span className="error-icon">❌</span>
            <h2>Product Not Found</h2>
            <p>{error || "The requested product does not exist."}</p>
            <button
              className="primary-btn"
              onClick={() => navigate("/products")}
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="product-details-content">
            <div className="details-image-column">
              <div className="details-image-card">
                <img
                  src={product.image || defaultImage}
                  alt={product.name}
                  className="details-main-image"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = defaultImage;
                  }}
                />
              </div>
            </div>

            <div className="details-info-column">
              <span className="details-category-pill">{product.category}</span>
              <h1 className="details-title">{product.name}</h1>

              <div className="details-price-row">
                <span className="details-currency">₹</span>
                <span className="details-price">
                  {Number(product.price).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="details-stock-row">
                <span
                  className={`stock-pill ${
                    product.stock > 0 ? "in-stock" : "out-of-stock"
                  }`}
                >
                  {product.stock > 0
                    ? `✓ In Stock (${product.stock} units left)`
                    : "✕ Out of Stock"}
                </span>
              </div>

              <div className="details-description-box">
                <h3>About This Product</h3>
                <p>{product.description}</p>
              </div>

              {toastMessage && (
                <div
                  className={`details-toast ${
                    toastMessage.includes("Failed") || toastMessage.includes("exceeds")
                      ? "error"
                      : "success"
                  }`}
                >
                  {toastMessage}
                </div>
              )}

              {/* Action Buttons Row: Add to Cart, Wishlist, Go to Cart */}
              <div className="details-cart-action-box">
                <button
                  className={`primary-btn details-add-to-cart-btn ${
                    cartQuantity > 0 ? "in-cart" : ""
                  }`}
                  onClick={handleAddToCart}
                  disabled={isAddingToCart || isOutOfStock}
                >
                  {isAddingToCart ? (
                    <>
                      <span className="spin-icon">⏳</span> Adding...
                    </>
                  ) : isOutOfStock ? (
                    "Out of Stock"
                  ) : cartQuantity > 0 ? (
                    <>
                      🛒 In Cart ({cartQuantity}) — Add Another (+1)
                    </>
                  ) : (
                    <>
                      🛒 Add to Cart
                    </>
                  )}
                </button>

                {cartQuantity > 0 && (
                  <button
                    className="secondary-btn go-to-cart-btn"
                    onClick={() => navigate("/cart")}
                  >
                    View in Cart →
                  </button>
                )}
              </div>

              <div className="details-actions">
                <button
                  className={`details-wishlist-btn ${isSaved ? "saved" : ""}`}
                  onClick={handleWishlistToggle}
                  disabled={wishlistLoading}
                >
                  {wishlistLoading ? (
                    <>
                      <span className="spin-icon">⏳</span> Updating...
                    </>
                  ) : isSaved ? (
                    <>
                      <span className="heart-icon">♥</span> Saved in Wishlist
                    </>
                  ) : (
                    <>
                      <span className="heart-icon">♡</span> Add to Wishlist
                    </>
                  )}
                </button>

                <button
                  className="secondary-btn view-wishlist-nav-btn"
                  onClick={() => navigate("/wishlist")}
                >
                  Go to Wishlist ❤️
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default ProductDetails;
