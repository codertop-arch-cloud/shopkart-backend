import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

function CartItem({ item }) {
  const navigate = useNavigate();
  const { updateQuantity, removeFromCart, updatingItemId } = useCart();

  const product = item.product || {};
  const quantity = item.quantity || 1;
  const isUpdating = updatingItemId === product._id;
  const maxStock = product.stock || 0;
  const isMaxStock = quantity >= maxStock;
  const isMinQuantity = quantity <= 1;

  const defaultImage =
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80";

  const handleDecrease = () => {
    if (isMinQuantity || isUpdating) return;
    updateQuantity(product._id, quantity - 1);
  };

  const handleIncrease = () => {
    if (isMaxStock || isUpdating) return;
    updateQuantity(product._id, quantity + 1);
  };

  const handleRemove = () => {
    if (isUpdating) return;
    removeFromCart(product._id);
  };

  const handleNavigate = () => {
    if (product._id) {
      navigate(`/products/${product._id}`);
    }
  };

  const itemTotal = (Number(product.price) || 0) * quantity;

  return (
    <div className={`cart-item-card ${isUpdating ? "updating" : ""}`}>
      <div className="cart-item-image-wrap" onClick={handleNavigate}>
        <img
          src={product.image || defaultImage}
          alt={product.name || "Product"}
          className="cart-item-image"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = defaultImage;
          }}
        />
      </div>

      <div className="cart-item-info">
        <div className="cart-item-title-row">
          <span className="cart-item-category">{product.category}</span>
          <h3 className="cart-item-name" onClick={handleNavigate}>
            {product.name}
          </h3>
        </div>

        <div className="cart-item-unit-price">
          <span className="currency-symbol">₹</span>
          <span>{Number(product.price || 0).toLocaleString("en-IN")} each</span>
        </div>

        {/* Quantity Controls: [-] 2 [+] */}
        <div className="cart-item-controls-row">
          <div className="quantity-control-group">
            <button
              className="qty-btn decrement-btn"
              onClick={handleDecrease}
              disabled={isMinQuantity || isUpdating}
              title={isMinQuantity ? "Minimum quantity is 1 (use Remove to delete item)" : "Decrease quantity"}
              aria-label="Decrease quantity"
            >
              −
            </button>

            <span className="qty-value-display">
              {isUpdating ? <span className="spin-icon">⏳</span> : quantity}
            </span>

            <button
              className="qty-btn increment-btn"
              onClick={handleIncrease}
              disabled={isMaxStock || isUpdating}
              title={isMaxStock ? `Maximum stock of ${maxStock} reached` : "Increase quantity"}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <button
            className="cart-remove-link-btn"
            onClick={handleRemove}
            disabled={isUpdating}
            title="Remove item from cart"
          >
            Remove
          </button>
        </div>

        {isMaxStock && (
          <div className="stock-limit-note">
            ⚠️ Max available stock reached ({maxStock} units)
          </div>
        )}
      </div>

      <div className="cart-item-total-col">
        <span className="item-total-label">Total</span>
        <div className="item-total-price">
          <span className="currency-symbol">₹</span>
          <span>{itemTotal.toLocaleString("en-IN")}</span>
        </div>
      </div>
    </div>
  );
}

export default CartItem;
