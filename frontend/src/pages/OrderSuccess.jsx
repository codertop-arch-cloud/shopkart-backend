import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

function OrderSuccess() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/orders/${id}`);
        if (res.data?.success && res.data.order) {
          setOrder(res.data.order);
        } else {
          setError("Order details not found.");
        }
      } catch (err) {
        console.error("Error loading order:", err);
        setError("Could not load order details.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchOrderDetails();
    }
  }, [id]);

  return (
    <div className="order-success-page">
      <Navbar />

      <main className="order-success-container">
        {loading ? (
          <div className="cart-loading-state">
            <div className="loader"></div>
            <h3>Loading order confirmation...</h3>
          </div>
        ) : error ? (
          <div className="order-success-card error-card">
            <span className="error-icon">⚠️</span>
            <h2>Order Confirmation</h2>
            <p>{error}</p>
            <div className="confirmation-actions">
              <button
                className="primary-btn"
                onClick={() => navigate("/orders")}
              >
                View My Orders
              </button>
            </div>
          </div>
        ) : (
          <div className="order-success-card">
            <div className="success-icon-badge">✅</div>
            <h1>Order Placed Successfully!</h1>
            <p className="success-subtitle">
              Your order has been confirmed and saved.
            </p>

            <div className="order-meta-box">
              <div className="meta-item">
                <span className="meta-label">Order ID:</span>
                <span className="meta-value order-id-highlight">{order._id}</span>
              </div>

              <div className="meta-item">
                <span className="meta-label">Status:</span>
                <span className={`status-badge status-${order.status?.toLowerCase()}`}>
                  {order.status || "PLACED"}
                </span>
              </div>

              <div className="meta-item">
                <span className="meta-label">Payment Status:</span>
                <span className="payment-status-badge">
                  {order.paymentStatus || "PAID"}
                </span>
              </div>

              <div className="meta-item">
                <span className="meta-label">Total Amount:</span>
                <span className="meta-value total-highlight">
                  ₹{order.totalAmount?.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Purchased Items Snapshot */}
            <div className="order-items-preview">
              <h3>Items in this Order</h3>
              <div className="order-items-list">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="preview-item-row">
                    <div className="preview-item-info">
                      <span className="preview-item-name">{item.name}</span>
                      <span className="preview-item-qty">Qty: {item.quantity}</span>
                    </div>
                    <span className="preview-item-price">
                      ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Details */}
            {order.shippingAddress && (
              <div className="order-address-box">
                <h3>Delivery Address</h3>
                <p>
                  <strong>{order.shippingAddress.fullName}</strong> ({order.shippingAddress.phone})
                </p>
                <p>
                  {order.shippingAddress.addressLine1}, {order.shippingAddress.city},{" "}
                  {order.shippingAddress.state} - {order.shippingAddress.pincode}
                </p>
              </div>
            )}

            <div className="confirmation-actions">
              <button
                className="primary-btn view-orders-btn"
                onClick={() => navigate("/orders")}
              >
                View My Orders
              </button>
              <button
                className="secondary-btn continue-shopping-btn"
                onClick={() => navigate("/products")}
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default OrderSuccess;
