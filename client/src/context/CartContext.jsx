import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'kisan-connect-cart';
const SAVED_STORAGE_KEY = 'kisan-connect-saved-products';

function readStoredList(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch (error) {
    return [];
  }
}

function clampQuantity(quantity, stock) {
  const parsedQuantity = Number.parseInt(quantity, 10);
  const parsedStock = Number.parseInt(stock, 10);
  const maxStock = Number.isFinite(parsedStock) && parsedStock > 0 ? parsedStock : 1;

  if (!Number.isFinite(parsedQuantity)) {
    return 1;
  }

  return Math.max(1, Math.min(parsedQuantity, maxStock));
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => readStoredList(STORAGE_KEY));
  const [savedItems, setSavedItems] = useState(() => readStoredList(SAVED_STORAGE_KEY));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(savedItems));
  }, [savedItems]);

  function addItem(product) {
    setItems((currentItems) => {
      const existing = currentItems.find((item) => item._id === product._id);

      if (existing) {
        return currentItems.map((item) =>
          item._id === product._id
            ? { ...item, quantity: clampQuantity(item.quantity + 1, product.stock) }
            : item
        );
      }

      return [...currentItems, { ...product, quantity: 1 }];
    });
  }

  function updateQuantity(productId, quantity) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item._id === productId ? { ...item, quantity: clampQuantity(quantity, item.stock) } : item
      )
    );
  }

  function removeItem(productId) {
    setItems((currentItems) => currentItems.filter((item) => item._id !== productId));
  }

  function toggleSaved(product) {
    setSavedItems((currentItems) => {
      const isSaved = currentItems.some((item) => item._id === product._id);

      if (isSaved) {
        return currentItems.filter((item) => item._id !== product._id);
      }

      return [...currentItems, product];
    });
  }

  function isSaved(productId) {
    return savedItems.some((item) => item._id === productId);
  }

  function clearCart() {
    setItems([]);
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const value = useMemo(
    () => ({
      items,
      savedItems,
      subtotal,
      totalItems,
      addItem,
      updateQuantity,
      removeItem,
      toggleSaved,
      isSaved,
      clearCart
    }),
    [items, savedItems, subtotal, totalItems]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used inside CartProvider.');
  }

  return context;
}
