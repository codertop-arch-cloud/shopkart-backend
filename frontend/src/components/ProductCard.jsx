import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useCart } from "../context/CartContext";

function ProductCard({ product, isSavedInitial = false, onWishlistChange }) {
  const navigate = useNavigate();
  const { addToCart, updatingItemId, getItemQuantity } = useCart();

  const [isSaved, setIsSaved] = useState(isSavedInitial);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedback, setFeedback] = useState("");

  const defaultImage =
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80";

  const cartQuantity = getItemQuantity(product._id);
  const isAddingToCart = updatingItemId === product._id;
  const isOutOfStock = product.stock < 1;

  const handleWishlistToggle = async (e) => {
    e.stopPropagation();

    if (wishlistLoading) return;

    try {
      setWishlistLoading(true);
      setErrorMessage("");
      setFeedback("");

      const endpoint = `/wishlist/${product._id}/toggle`;
      const response = await api.patch(endpoint);

      const nextSavedState =
        response.data && typeof response.data.inWishlist === "boolean"
          ? response.data.inWishlist
          : !isSaved;

      setIsSaved(nextSavedState);
      setFeedback(nextSavedState ? "Added to Wishlist!" : "Removed from Wishlist");

      if (response.data && typeof response.data.count === "number") {
        window.dispatchEvent(
          new CustomEvent("wishlistChange", {
            detail: { count: response.data.count },
          })
        );
      } else {
        window.dispatchEvent(new CustomEvent("wishlistChange"));
      }

      if (onWishlistChange) {
        onWishlistChange(product._id, nextSavedState);
      }

      setTimeout(() => setFeedback(""), 2500);
    } catch (err) {
      console.error("Wishlist operation failed:", err);
      if (err.response?.status === 401) {
        setErrorMessage("Please login to save products.");
      } else if (err.response?.status === 409) {
        setIsSaved(true);
        setErrorMessage("Already in your wishlist.");
      } else {
        setErrorMessage("Unable to save product. Please try again.");
      }

      setTimeout(() => setErrorMessage(""), 3500);
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleAddToCart = async (e) => {
    e.stopPropagation();

    if (isAddingToCart || isOutOfStock) return;

    setErrorMessage("");
    setFeedback("");

    const result = await addToCart(product._id);

    if (result.success) {
      setFeedback("Added to cart! 🛒");
      setTimeout(() => setFeedback(""), 2500);
    } else {
      if (result.status === 401) {
        navigate("/login");
      } else {
        setErrorMessage(result.message);
        setTimeout(() => setErrorMessage(""), 3500);
      }
    }
  };

  const handleViewDetails = (e) => {
    e.stopPropagation();
    navigate(`/products/${product._id}`);
  };

  return (
    <div className={`product-card ${isSaved ? "card-saved" : ""}`}>
      <div className="product-image-container" onClick={handleViewDetails}>
        <img
          src={product.image || defaultImage}
          alt={product.name}
          className="product-image"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = defaultImage;
          }}
        />

        <span className="product-category-tag">{product.category}</span>

        {/* Quick floating heart button */}
        <button
          className={`floating-wishlist-btn ${isSaved ? "active" : ""}`}
          onClick={handleWishlistToggle}
          disabled={wishlistLoading}
          title={isSaved ? "Remove from Wishlist" : "Add to Wishlist"}
          aria-label="Wishlist action"
        >
          {wishlistLoading ? "⏳" : isSaved ? "❤️" : "🤍"}
        </button>
      </div>

      <div className="product-body">
        <h3 className="product-name" onClick={handleViewDetails} title={product.name}>
          {product.name}
        </h3>
        <p className="product-description">{product.description}</p>

        <div className="product-meta-row">
          <div className="product-pricing">
            <span className="product-currency">₹</span>
            <span className="product-price">
              {Number(product.price).toLocaleString("en-IN")}
            </span>
          </div>

          <span
            className={`product-stock-tag ${
              !isOutOfStock ? "in-stock" : "out-of-stock"
            }`}
          >
            {!isOutOfStock ? `${product.stock} units left` : "Out of stock"}
          </span>
        </div>

        {/* Inline Feedback / Error */}
        {feedback && <div className="card-inline-success">{feedback}</div>}
        {errorMessage && <div className="card-inline-error">{errorMessage}</div>}

        {/* Primary Cart CTA & Action Buttons */}
        <div className="product-actions-group">
          <button
            className="secondary-btn view-details-btn"
            onClick={handleViewDetails}
          >
            View Details
          </button>

          <button
            className={`add-to-cart-btn ${cartQuantity > 0 ? "in-cart" : ""}`}
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
                <span className="cart-item-count-pill">{cartQuantity}</span> In Cart (+1)
              </>
            ) : (
              <>
                <span>🛒</span> Add to Cart
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
