import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import CartItem from "../components/CartItem";
import { useCart } from "../context/CartContext";

function Cart() {
  const navigate = useNavigate();
  const { cart, loading, error, subtotal, totalItems, fetchCart, clearCart } = useCart();

  const handleCheckout = () => {
    navigate("/checkout");
  };

  return (
    <div className="cart-page">
      <Navbar />

      <main className="cart-container">
        {loading ? (
          <div className="cart-loading-state">
            <div className="loader"></div>
            <h3>Loading your cart...</h3>
            <p>Fetching your current selections from the server.</p>
          </div>
        ) : error ? (
          <div className="cart-error-state">
            <span className="error-icon">⚠️</span>
            <h2>Unable to load your cart.</h2>
            <p>{error}</p>
            <button className="primary-btn retry-btn" onClick={fetchCart}>
              Try Again
            </button>
          </div>
        ) : cart.length === 0 ? (
          <div className="cart-empty-state">
            <div className="empty-cart-illustration">🛒</div>
            <h2>Your cart is empty</h2>
            <p>Looks like you haven't added anything yet.</p>
            <button
              className="primary-btn browse-btn"
              onClick={() => navigate("/products")}
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="cart-content-wrapper">
            <header className="cart-header">
              <div className="header-titles">
                <span className="eyebrow">READY TO PURCHASE</span>
                <h1>My Cart</h1>
                <p className="items-count-text">
                  {cart.length} {cart.length === 1 ? "item" : "items"} ({totalItems} total {totalItems === 1 ? "unit" : "units"})
                </p>
              </div>

              <div className="cart-header-actions">
                <button
                  className="secondary-btn continue-shopping-btn"
                  onClick={() => navigate("/products")}
                >
                  ← Continue Shopping
                </button>
                <button
                  className="clear-cart-link-btn"
                  onClick={clearCart}
                  title="Remove all items from your cart"
                >
                  Clear Cart
                </button>
              </div>
            </header>

            <div className="cart-main-grid">
              {/* Left Column: Cart Items */}
              <section className="cart-items-section">
                <div className="cart-items-list">
                  {cart.map((item) => (
                    <CartItem
                      key={item.product?._id || item._id}
                      item={item}
                    />
                  ))}
                </div>
              </section>

              {/* Right Column: Order Summary */}
              <aside className="order-summary-sidebar">
                <div className="order-summary-card">
                  <h2 className="summary-title">Order Summary</h2>

                  <div className="summary-rows">
                    <div className="summary-row">
                      <span>Distinct Products</span>
                      <span className="summary-value">{cart.length}</span>
                    </div>

                    <div className="summary-row">
                      <span>Total Units</span>
                      <span className="summary-value">{totalItems}</span>
                    </div>

                    <div className="summary-row">
                      <span>Estimated Shipping</span>
                      <span className="summary-value free-shipping">FREE</span>
                    </div>

                    <div className="summary-divider"></div>

                    <div className="summary-row total-row">
                      <span>Subtotal</span>
                      <div className="summary-total-price">
                        <span className="currency-symbol">₹</span>
                        <span>{subtotal.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    className="primary-btn checkout-btn"
                    onClick={handleCheckout}
                  >
                    Proceed to Checkout →
                  </button>

                  <div className="security-assurance">
                    <span className="lock-icon">🔒</span>
                    <span>Safe & Secure 256-bit Encrypted Checkout</span>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Cart;
