import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import WishlistCard from "../components/WishlistCard";
import api from "../services/api";

function Wishlist() {
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchWishlist = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/wishlist");

      if (response.data && Array.isArray(response.data.wishlist)) {
        setWishlist(response.data.wishlist);
      } else {
        setWishlist([]);
      }
    } catch (err) {
      console.error("Error fetching wishlist:", err);
      if (err.response?.status === 401) {
        // Redirect to login if unauthenticated
        navigate("/login");
        return;
      }
      setError("We couldn't load your wishlist. Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const handleItemRemoved = (productId) => {
    setWishlist((prevList) => prevList.filter((item) => item._id !== productId));
  };

  return (
    <div className="wishlist-page">
      <Navbar />

      <main className="wishlist-container">
        {/* Loading State */}
        {loading ? (
          <div className="wishlist-loading-state">
            <div className="loader"></div>
            <h3>Loading your wishlist...</h3>
            <p>Fetching your favorite saved items from the catalogue.</p>
          </div>
        ) : error ? (
          /* Error State */
          <div className="wishlist-error-state">
            <span className="error-icon">⚠️</span>
            <h2>Something went wrong.</h2>
            <p>{error}</p>
            <button
              className="primary-btn retry-btn"
              onClick={fetchWishlist}
            >
              Try Again
            </button>
          </div>
        ) : wishlist.length === 0 ? (
          /* Empty State */
          <div className="wishlist-empty-state">
            <div className="empty-heart-illustration">❤️</div>
            <h2>Your wishlist is empty</h2>
            <p>Save products you love and find them here later.</p>
            <button
              className="primary-btn browse-btn"
              onClick={() => navigate("/products")}
            >
              Browse Products
            </button>
          </div>
        ) : (
          /* Success / Active List State */
          <div className="wishlist-content">
            <header className="wishlist-header">
              <div className="header-titles">
                <span className="eyebrow">YOUR SAVED ITEMS</span>
                <h1>My Wishlist</h1>
                <p className="items-count-text">
                  {wishlist.length} {wishlist.length === 1 ? "product" : "products"} saved
                </p>
              </div>

              <button
                className="secondary-btn continue-shopping-btn"
                onClick={() => navigate("/products")}
              >
                ← Continue Shopping
              </button>
            </header>

            <div className="wishlist-grid">
              {wishlist.map((product) => (
                <WishlistCard
                  key={product._id}
                  product={product}
                  onRemove={handleItemRemoved}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Wishlist;
