import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useCart } from "../context/CartContext";
import api from "../services/api";

// Helper to load Razorpay Checkout script dynamically
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      return resolve(true);
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

function Checkout() {
  const navigate = useNavigate();
  const { cart, subtotal, resetCart } = useCart();

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    addressLine1: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState(null);

  // Autofill user details if available in localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("customer");
      if (stored) {
        const user = JSON.parse(stored);
        setFormData((prev) => ({
          ...prev,
          fullName: user.fullName || user.name || "",
          phone: user.phone || "",
        }));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for edited field
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  // Validate form fields on the client before calling API
  const validateForm = () => {
    const errors = {};

    if (!formData.fullName.trim()) {
      errors.fullName = "Full name is required";
    }

    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required";
    } else {
      const cleanPhone = formData.phone.trim().replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        errors.phone = "Phone number must contain at least 10 digits";
      }
    }

    if (!formData.addressLine1.trim()) {
      errors.addressLine1 = "Address is required";
    }

    if (!formData.city.trim()) {
      errors.city = "City is required";
    }

    if (!formData.state.trim()) {
      errors.state = "State is required";
    }

    if (!formData.pincode.trim()) {
      errors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
      errors.pincode = "Pincode must contain 6 digits";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Verify payment on backend and complete checkout
  const verifyAndCompleteOrder = async (verificationPayload) => {
    try {
      setSubmitting(true);
      const res = await api.post("/orders/verify-payment", verificationPayload);

      if (res.data && res.data.success) {
        // Clear global cart state in React
        resetCart();
        navigate(`/order-success/${res.data.order._id}`);
      } else {
        setApiError(res.data?.message || "Payment verification failed");
        setSubmitting(false);
      }
    } catch (err) {
      console.error("Payment verification error:", err);
      setApiError(
        err.response?.data?.message ||
          "Payment verification failed. Your cart was not cleared."
      );
      setSubmitting(false);
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setApiError("");

    if (!validateForm()) {
      return;
    }

    if (cart.length === 0) {
      setApiError("Your cart is empty. Add products before checking out.");
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Create ShopKart Order + Razorpay Order
      const res = await api.post("/orders/create-payment-order", {
        shippingAddress: {
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim(),
          addressLine1: formData.addressLine1.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode.trim(),
        },
      });

      const orderData = res.data;
      setPendingOrderData(orderData);

      // Step 2: Load Razorpay Checkout SDK
      const isLoaded = await loadRazorpayScript();

      if (!isLoaded || !window.Razorpay) {
        // If script is blocked or offline, use interactive fallback simulator
        setShowSimulateModal(true);
        setSubmitting(false);
        return;
      }

      // Step 3: Open Razorpay Checkout modal
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "ShopKart",
        description: "Order Payment",
        order_id: orderData.razorpayOrderId,
        handler: async function (response) {
          await verifyAndCompleteOrder({
            shopKartOrderId: orderData.shopKartOrderId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        prefill: {
          name: formData.fullName,
          contact: formData.phone,
        },
        theme: {
          color: "#3b82f6",
        },
      };

      const razorpayInstance = new window.Razorpay(options);

      razorpayInstance.on("payment.failed", function (response) {
        console.error("Payment failed:", response.error);
        setApiError(
          "Payment failed: " +
            (response.error?.description || "Transaction was cancelled.") +
            " Your cart has not been cleared. Please try again."
        );
        setSubmitting(false);
      });

      razorpayInstance.open();
    } catch (err) {
      console.error("Error creating order:", err);
      setApiError(
        err.response?.data?.message ||
          "Failed to initiate order. Please try again."
      );
      setSubmitting(false);
    }
  };

  // Helper for simulated test mode payment when testing without live SDK
  const handleSimulatePayment = async (success) => {
    setShowSimulateModal(false);
    if (!success) {
      setApiError(
        "Payment cancelled. Your cart has not been cleared. Please try again."
      );
      return;
    }

    if (!pendingOrderData) return;

    // Use mock verification
    const mockPaymentId = "pay_sim_" + Date.now();
    // For mock testing, call backend verification
    // Generate valid HMAC signature if in test mode
    try {
      setSubmitting(true);
      const res = await api.post("/orders/verify-payment", {
        shopKartOrderId: pendingOrderData.shopKartOrderId,
        razorpay_order_id: pendingOrderData.razorpayOrderId,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: "mock_test_signature", // In production/real tests, generated via Razorpay
      });

      if (res.data?.success) {
        resetCart();
        navigate(`/order-success/${pendingOrderData.shopKartOrderId}`);
      } else {
        setApiError("Simulation failed");
      }
    } catch (err) {
      // If signature check failed because mock signature was used
      setApiError(
        err.response?.data?.message ||
          "Payment signature verification failed. Test with live Razorpay keys or check .env"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="checkout-page">
      <Navbar />

      <main className="checkout-container">
        <header className="checkout-header">
          <h1>Checkout</h1>
          <p>Review your order and enter shipping details to complete purchase</p>
        </header>

        {apiError && (
          <div className="checkout-error-banner" role="alert">
            <span className="error-icon">⚠️</span>
            <span>{apiError}</span>
          </div>
        )}

        {cart.length === 0 ? (
          <div className="cart-empty-state">
            <div className="empty-cart-illustration">🛒</div>
            <h2>Your cart is empty</h2>
            <p>Please add products to your cart before proceeding to checkout.</p>
            <button
              className="primary-btn browse-btn"
              onClick={() => navigate("/products")}
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="checkout-grid">
            {/* Left Column: Shipping Details Form */}
            <section className="checkout-form-section">
              <div className="checkout-card">
                <h2 className="section-title">Shipping Details</h2>

                <form onSubmit={handlePlaceOrder} noValidate>
                  <div className="form-group">
                    <label htmlFor="fullName">Full Name *</label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      className={`form-input ${formErrors.fullName ? "input-error" : ""}`}
                      placeholder="e.g. Aarav Sharma"
                      value={formData.fullName}
                      onChange={handleChange}
                    />
                    {formErrors.fullName && (
                      <span className="field-error">{formErrors.fullName}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Phone Number *</label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      className={`form-input ${formErrors.phone ? "input-error" : ""}`}
                      placeholder="e.g. 9876543210"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                    {formErrors.phone && (
                      <span className="field-error">{formErrors.phone}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="addressLine1">Address Line *</label>
                    <input
                      id="addressLine1"
                      name="addressLine1"
                      type="text"
                      className={`form-input ${formErrors.addressLine1 ? "input-error" : ""}`}
                      placeholder="e.g. 22 MG Road, Apartment 4B"
                      value={formData.addressLine1}
                      onChange={handleChange}
                    />
                    {formErrors.addressLine1 && (
                      <span className="field-error">{formErrors.addressLine1}</span>
                    )}
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label htmlFor="city">City *</label>
                      <input
                        id="city"
                        name="city"
                        type="text"
                        className={`form-input ${formErrors.city ? "input-error" : ""}`}
                        placeholder="e.g. Bengaluru"
                        value={formData.city}
                        onChange={handleChange}
                      />
                      {formErrors.city && (
                        <span className="field-error">{formErrors.city}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="state">State *</label>
                      <input
                        id="state"
                        name="state"
                        type="text"
                        className={`form-input ${formErrors.state ? "input-error" : ""}`}
                        placeholder="e.g. Karnataka"
                        value={formData.state}
                        onChange={handleChange}
                      />
                      {formErrors.state && (
                        <span className="field-error">{formErrors.state}</span>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="pincode">Pincode (6 digits) *</label>
                    <input
                      id="pincode"
                      name="pincode"
                      type="text"
                      maxLength={6}
                      className={`form-input ${formErrors.pincode ? "input-error" : ""}`}
                      placeholder="e.g. 560001"
                      value={formData.pincode}
                      onChange={handleChange}
                    />
                    {formErrors.pincode && (
                      <span className="field-error">{formErrors.pincode}</span>
                    )}
                  </div>

                  <div className="payment-security-notice">
                    <span>🛡️</span>
                    <span>
                      Payment processed securely via <strong>Razorpay Test Mode</strong>. No real money is charged.
                    </span>
                  </div>
                </form>
              </div>
            </section>

            {/* Right Column: Order Summary */}
            <aside className="checkout-summary-section">
              <div className="checkout-card order-summary-card">
                <h2 className="section-title">Order Summary</h2>

                <div className="checkout-items-list">
                  {cart.map((item) => (
                    <div
                      key={item.product?._id || item._id}
                      className="checkout-item-row"
                    >
                      <div className="checkout-item-info">
                        <span className="checkout-item-name">
                          {item.product?.name || "Product"}
                        </span>
                        <span className="checkout-item-qty">
                          × {item.quantity}
                        </span>
                      </div>
                      <span className="checkout-item-price">
                        ₹{((item.product?.price || 0) * item.quantity).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="summary-divider"></div>

                <div className="summary-rows">
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="summary-row">
                    <span>Shipping</span>
                    <span className="free-shipping">FREE</span>
                  </div>
                  <div className="summary-divider"></div>
                  <div className="summary-row total-row">
                    <strong>Total Amount</strong>
                    <div className="summary-total-price">
                      <span>₹{subtotal.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  id="place-order-btn"
                  className="primary-btn place-order-btn"
                  disabled={submitting}
                  onClick={handlePlaceOrder}
                >
                  {submitting ? (
                    <span className="btn-spinner-text">
                      <span className="spinner-inline"></span> Processing...
                    </span>
                  ) : (
                    "Place Order & Pay with Razorpay"
                  )}
                </button>

                <div className="back-to-cart-link">
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => navigate("/cart")}
                  >
                    ← Edit Cart Items
                  </button>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Modal when SDK is not reachable / test sandbox */}
        {showSimulateModal && (
          <div className="modal-backdrop">
            <div className="modal-content">
              <h3>💳 Razorpay Test Mode Simulator</h3>
              <p>
                The Razorpay Checkout modal could not be opened automatically (this can happen in sandbox/offline environments).
              </p>
              <p>You can simulate the payment callback here:</p>
              <div className="modal-actions">
                <button
                  className="primary-btn"
                  onClick={() => handleSimulatePayment(true)}
                >
                  ✓ Simulate Successful Payment
                </button>
                <button
                  className="secondary-btn"
                  onClick={() => handleSimulatePayment(false)}
                >
                  ✕ Simulate Payment Failure
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Checkout;
