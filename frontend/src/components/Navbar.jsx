import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import { useCart } from "../context/CartContext";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [wishlistCount, setWishlistCount] = useState(0);
  const { totalItems } = useCart();

  const fetchWishlistCount = async () => {
    try {
      const response = await api.get("/wishlist/count");
      if (response.data && typeof response.data.count === "number") {
        setWishlistCount(response.data.count);
      }
    } catch {
      // User might be unauthenticated or offline; ignore silently
    }
  };

  useEffect(() => {
    fetchWishlistCount();

    // Listen to local event fired when items are added/removed from wishlist
    const handleWishlistChange = (event) => {
      if (event.detail && typeof event.detail.count === "number") {
        setWishlistCount(event.detail.count);
      } else {
        fetchWishlistCount();
      }
    };

    window.addEventListener("wishlistChange", handleWishlistChange);
    return () => {
      window.removeEventListener("wishlistChange", handleWishlistChange);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/customers/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("customer");
      navigate("/login");
    }
  };

  return (
    <nav className="navbar">
      <div
        className="nav-brand"
        onClick={() => navigate("/home")}
        style={{ cursor: "pointer" }}
      >
        <span className="brand-logo">🛍️</span>
        <span className="brand-title">ShopKart</span>
      </div>

      <div className="nav-links">
        <button
          className={`nav-link ${location.pathname === "/home" ? "active" : ""}`}
          onClick={() => navigate("/home")}
        >
          Home
        </button>
        <button
          className={`nav-link ${location.pathname === "/products" ? "active" : ""}`}
          onClick={() => navigate("/products")}
        >
          Products
        </button>
        <button
          id="nav-wishlist-link"
          className={`nav-link wishlist-nav-link ${
            location.pathname === "/wishlist" ? "active" : ""
          }`}
          onClick={() => navigate("/wishlist")}
        >
          <span className="nav-heart-icon">❤️</span>
          <span>Wishlist</span>
          {wishlistCount > 0 && (
            <span className="wishlist-badge">({wishlistCount})</span>
          )}
        </button>
        <button
          id="nav-cart-link"
          className={`nav-link cart-nav-link ${
            location.pathname === "/cart" ? "active" : ""
          }`}
          onClick={() => navigate("/cart")}
        >
          <span className="nav-cart-icon">🛒</span>
          <span>Cart</span>
          {totalItems > 0 && (
            <span className="cart-badge">({totalItems})</span>
          )}
        </button>
        <button
          id="nav-orders-link"
          className={`nav-link orders-nav-link ${
            location.pathname.startsWith("/orders") || location.pathname.startsWith("/order-success") ? "active" : ""
          }`}
          onClick={() => navigate("/orders")}
        >
          <span className="nav-orders-icon">📦</span>
          <span>My Orders</span>
        </button>
      </div>

      <button className="logout-btn" onClick={handleLogout} title="Log out of ShopKart">
        Logout
      </button>
    </nav>
  );
}

export default Navbar;
