import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function WishlistCard({ product, onRemove }) {
  const navigate = useNavigate();
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");

  const defaultImage =
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80";

  const handleRemove = async () => {
    if (removing) return;

    try {
      setRemoving(true);
      setRemoveError("");

      const response = await api.delete(`/wishlist/${product._id}`);

      // Notify Navbar badge
      if (response.data && typeof response.data.count === "number") {
        window.dispatchEvent(
          new CustomEvent("wishlistChange", {
            detail: { count: response.data.count },
          })
        );
      } else {
        window.dispatchEvent(new CustomEvent("wishlistChange"));
      }

      // Update parent list dynamically without page refresh
      if (onRemove) {
        onRemove(product._id);
      }
    } catch (err) {
      console.error("Failed to remove product from wishlist:", err);
      setRemoveError("Unable to remove item. Please try again.");
      setRemoving(false);
    }
  };

  const handleViewDetails = () => {
    navigate(`/products/${product._id}`);
  };

  return (
    <div className="wishlist-card">
      <div className="wishlist-card-image-wrap" onClick={handleViewDetails}>
        <img
          src={product.image || defaultImage}
          alt={product.name}
          className="wishlist-card-image"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = defaultImage;
          }}
        />
        <span className="wishlist-category-badge">{product.category}</span>
      </div>

      <div className="wishlist-card-content">
        <h3
          className="wishlist-product-name"
          onClick={handleViewDetails}
          title={product.name}
        >
          {product.name}
        </h3>

        <div className="wishlist-product-pricing">
          <span className="currency-symbol">₹</span>
          <span className="price-amount">
            {Number(product.price).toLocaleString("en-IN")}
          </span>
        </div>

        <div className="wishlist-stock-info">
          <span
            className={`stock-indicator ${
              product.stock > 0 ? "in-stock" : "out-of-stock"
            }`}
          >
            {product.stock > 0
              ? `${product.stock} units left`
              : "Currently Out of stock"}
          </span>
        </div>

        {removeError && (
          <div className="wishlist-card-error">{removeError}</div>
        )}

        <div className="wishlist-card-actions">
          <button
            className="secondary-btn wishlist-view-btn"
            onClick={handleViewDetails}
          >
            View Details
          </button>

          <button
            className="remove-wishlist-btn"
            onClick={handleRemove}
            disabled={removing}
            title="Remove from your saved wishlist"
          >
            {removing ? (
              <>
                <span className="spin-icon">⏳</span> Removing...
              </>
            ) : (
              <>
                <span className="remove-heart-icon">♥</span> Remove
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WishlistCard;
