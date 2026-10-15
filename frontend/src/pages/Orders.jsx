import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

const STATUS_STEPS = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED"];

function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // Fetch orders belonging to the logged-in user
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/orders");
      if (res.data?.success && Array.isArray(res.data.orders)) {
        setOrders(res.data.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      if (err.response?.status === 401) {
        navigate("/login");
      } else {
        setError("Failed to load your orders. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Bonus feature: advance order status for demo/testing
  const handleAdvanceStatus = async (orderId, currentStatus) => {
    const currentIndex = STATUS_STEPS.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex >= STATUS_STEPS.length - 1) return;

    const nextStatus = STATUS_STEPS[currentIndex + 1];

    try {
      setUpdatingOrderId(orderId);
      const res = await api.patch(`/orders/${orderId}/status`, {
        status: nextStatus,
      });

      if (res.data?.success) {
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, status: nextStatus } : o))
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="orders-page">
      <Navbar />

      <main className="orders-container">
        <header className="orders-header">
          <div>
            <h1>My Orders</h1>
            <p>Track your past purchases, shipment statuses, and receipts</p>
          </div>
          {orders.length > 0 && (
            <button className="secondary-btn refresh-btn" onClick={fetchOrders}>
              ↻ Refresh Orders
            </button>
          )}
        </header>

        {loading ? (
          <div className="orders-loading-state">
            <div className="loader"></div>
            <h3>Loading your orders...</h3>
          </div>
        ) : error ? (
          <div className="orders-error-state">
            <span className="error-icon">⚠️</span>
            <h2>Unable to load orders</h2>
            <p>{error}</p>
            <button className="primary-btn" onClick={fetchOrders}>
              Try Again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="orders-empty-state">
            <div className="empty-orders-illustration">📦</div>
            <h2>You have not placed any orders yet.</h2>
            <p>Your order history will appear here once you make your first purchase.</p>
            <button
              className="primary-btn start-shopping-btn"
              onClick={() => navigate("/products")}
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => {
              const currentStepIndex = STATUS_STEPS.indexOf(order.status);

              return (
                <div key={order._id} className="order-card">
                  <div className="order-card-header">
                    <div className="order-header-info">
                      <span className="order-number-label">Order</span>
                      <span className="order-id-value">#{order._id}</span>
                      <span className="order-date-text">
                        • {formatDate(order.createdAt)}
                      </span>
                    </div>

                    <div className="order-badges">
                      <span
                        className={`status-badge status-${order.status?.toLowerCase()}`}
                      >
                        {order.status}
                      </span>
                      <span
                        className={`payment-badge payment-${order.paymentStatus?.toLowerCase()}`}
                      >
                        {order.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Bonus Challenge: Visual Status Timeline */}
                  {order.status !== "PENDING_PAYMENT" && (
                    <div className="order-timeline">
                      {STATUS_STEPS.map((step, idx) => {
                        const isDone = currentStepIndex >= idx;
                        const isCurrent = currentStepIndex === idx;

                        return (
                          <div
                            key={step}
                            className={`timeline-step ${
                              isDone ? "step-done" : ""
                            } ${isCurrent ? "step-current" : ""}`}
                          >
                            <div className="step-circle">
                              {isDone ? "✓" : idx + 1}
                            </div>
                            <span className="step-label">{step}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Items list */}
                  <div className="order-card-items">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="order-item-line">
                        <div className="item-name-qty">
                          <span className="item-bullet">•</span>
                          <span className="item-name">{item.name}</span>
                          <span className="item-qty">× {item.quantity}</span>
                        </div>
                        <span className="item-line-price">
                          ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="order-card-divider"></div>

                  <div className="order-card-footer">
                    <div className="order-footer-total">
                      <span>Total:</span>
                      <strong>₹{order.totalAmount?.toLocaleString("en-IN")}</strong>
                    </div>

                    <div className="order-footer-actions">
                      {/* Bonus Status Advance Button for testing */}
                      {currentStepIndex >= 0 &&
                        currentStepIndex < STATUS_STEPS.length - 1 && (
                          <button
                            className="secondary-btn advance-status-btn"
                            disabled={updatingOrderId === order._id}
                            onClick={() =>
                              handleAdvanceStatus(order._id, order.status)
                            }
                            title="Bonus: Advance status to next stage"
                          >
                            {updatingOrderId === order._id
                              ? "Updating..."
                              : `Advance to ${STATUS_STEPS[currentStepIndex + 1]} (Demo)`}
                          </button>
                        )}

                      <button
                        className="primary-btn view-details-btn"
                        onClick={() => navigate(`/order-success/${order._id}`)}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default Orders;
