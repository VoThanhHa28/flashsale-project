import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import * as api from '../services/api';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  const refreshCart = useCallback(async () => {
    if (!api.isApiConfigured() || !api.getToken()) {
      setCart(null);
      return;
    }
    setLoading(true);
    try {
      const c = await api.getCart();
      setCart(c);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!api.getToken()) {
      setCart(null);
      return;
    }
    refreshCart();
  }, [location.pathname, refreshCart]);

  const itemCount = useMemo(() => {
    if (cart?.totalQuantity != null) return cart.totalQuantity;
    if (!Array.isArray(cart?.items)) return 0;
    return cart.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  }, [cart]);

  const value = useMemo(
    () => ({
      cart,
      loading,
      refreshCart,
      itemCount,
    }),
    [cart, loading, refreshCart, itemCount],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
}
