import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import api from "../services/api";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingItemId, setUpdatingItemId] = useState(null);

  /**
   * Fetch authenticated user's cart from backend
   */
  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/cart");

      if (response.data && Array.isArray(response.data.cart)) {
        setCart(response.data.cart);
      } else {
        setCart([]);
      }
    } catch (err) {
      console.error("Cart fetch error:", err);
      if (err.response?.status === 401) {
        // Not authenticated yet
        setCart([]);
      } else {
        setError("Unable to load your cart. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  /**
   * Add a product to the cart (quantity 1 or increment existing)
   */
  const addToCart = async (productId) => {
    try {
      setUpdatingItemId(productId);
      const response = await api.post(`/cart/${productId}`);

      if (response.data && Array.isArray(response.data.cart)) {
        setCart(response.data.cart);
      }

      return {
        success: true,
        message: response.data?.message || "Added to cart!",
      };
    } catch (err) {
      console.error("Error adding to cart:", err);
      const msg =
        err.response?.data?.message || "Failed to add product to cart.";
      return {
        success: false,
        message: msg,
        status: err.response?.status,
      };
    } finally {
      setUpdatingItemId(null);
    }
  };

  /**
   * Update quantity of an item in the cart
   */
  const updateQuantity = async (productId, quantity) => {
    try {
      setUpdatingItemId(productId);
      const response = await api.patch(`/cart/${productId}`, { quantity });

      if (response.data && Array.isArray(response.data.cart)) {
        setCart(response.data.cart);
      }

      return {
        success: true,
        message: response.data?.message || "Quantity updated",
      };
    } catch (err) {
      console.error("Error updating quantity:", err);
      const msg =
        err.response?.data?.message || "Failed to update quantity.";
      return {
        success: false,
        message: msg,
        status: err.response?.status,
      };
    } finally {
      setUpdatingItemId(null);
    }
  };

  /**
   * Remove a product from the cart
   */
  const removeFromCart = async (productId) => {
    try {
      setUpdatingItemId(productId);
      const response = await api.delete(`/cart/${productId}`);

      if (response.data && Array.isArray(response.data.cart)) {
        setCart(response.data.cart);
      }

      return {
        success: true,
        message: response.data?.message || "Item removed from cart",
      };
    } catch (err) {
      console.error("Error removing from cart:", err);
      const msg =
        err.response?.data?.message || "Failed to remove item from cart.";
      return {
        success: false,
        message: msg,
        status: err.response?.status,
      };
    } finally {
      setUpdatingItemId(null);
    }
  };

  /**
   * Clear the entire cart
   */
  const clearCart = async () => {
    try {
      setLoading(true);
      await api.delete("/cart");
      setCart([]);
      return { success: true };
    } catch (err) {
      console.error("Error clearing cart:", err);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Clear cart in local state after successful order placement
  const resetCart = () => {
    setCart([]);
  };

  /**
   * Derived calculations - computed directly from cart state, not stored in DB
   */
  const totalItems = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }, [cart]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const price = Number(item.product?.price) || 0;
      const qty = Number(item.quantity) || 0;
      return sum + price * qty;
    }, 0);
  }, [cart]);

  const getItemQuantity = useCallback(
    (productId) => {
      const item = cart.find(
        (i) => (i.product?._id || i.product) === productId
      );
      return item ? item.quantity : 0;
    },
    [cart]
  );

  const isInCart = useCallback(
    (productId) => {
      return cart.some((i) => (i.product?._id || i.product) === productId);
    },
    [cart]
  );

  const value = {
    cart,
    loading,
    error,
    updatingItemId,
    totalItems,
    subtotal,
    itemCount: cart.length,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    resetCart,
    fetchCart,
    getItemQuantity,
    isInCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

export default CartContext;
