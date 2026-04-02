import React, { createContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    const cartItemsFromStorage = localStorage.getItem('cartItems');
    return cartItemsFromStorage ? JSON.parse(cartItemsFromStorage) : [];
  });

  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, qty = 1) => {
    const existItem = cartItems.find((x) => x._id === product._id);

    if (existItem) {
      setCartItems(
        cartItems.map((x) =>
          x._id === existItem._id ? { ...x, qty: x.qty + qty } : x
        )
      );
    } else {
      setCartItems([...cartItems, { ...product, qty }]);
    }
    toast.success(`${product.name} added to cart`);
  };

  const incrementQty = (id) => {
    const item = cartItems.find(x => x._id === id);
    setCartItems(
      cartItems.map((x) =>
        x._id === id ? { ...x, qty: x.qty + 1 } : x
      )
    );
    if (item) toast.success(`Quantity updated for ${item.name}`, { id: `qty-${id}` });
  };

  const decrementQty = (id) => {
    const existItem = cartItems.find((x) => x._id === id);
    if (!existItem) return;
    if (existItem.qty <= 1) {
      setCartItems(cartItems.filter((x) => x._id !== id));
      toast.success(`${existItem.name} removed from cart`);
    } else {
      setCartItems(
        cartItems.map((x) =>
          x._id === id ? { ...x, qty: x.qty - 1 } : x
        )
      );
      toast.success(`Quantity updated for ${existItem.name}`, { id: `qty-${id}` });
    }
  };

  const removeFromCart = (id) => {
    const item = cartItems.find(x => x._id === id);
    setCartItems(cartItems.filter((x) => x._id !== id));
    if (item) toast.success(`${item.name} removed from cart`);
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.qty, 0);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, incrementQty, decrementQty, removeFromCart, clearCart, cartCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = React.useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
};
