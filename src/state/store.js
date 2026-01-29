const state = {
  selectedCategory: null,
  cart: [],
  currentPage: "home",
  filters: {
    search: "",
    category: null
  },
  modalState: null,
  connectivity: navigator.onLine ? "online" : "offline"
};

const listeners = new Set();

export const store = {
  getState() {
    return { ...state };
  },
  setState(patch) {
    Object.assign(state, patch);
    listeners.forEach((fn) => fn(this.getState()));
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  addToCart(item) {
    const existing = state.cart.find((i) => i.productId === item.productId);
    if (existing) {
      existing.qty += item.qty;
    } else {
      state.cart.push(item);
    }
    this.setState({ cart: [...state.cart] });
  },
  updateCart(productId, qty) {
    const item = state.cart.find((i) => i.productId === productId);
    if (item) {
      item.qty = qty;
    }
    this.setState({ cart: [...state.cart] });
  },
  removeFromCart(productId) {
    state.cart = state.cart.filter((i) => i.productId !== productId);
    this.setState({ cart: [...state.cart] });
  },
  clearCart() {
    state.cart = [];
    this.setState({ cart: [] });
  }
};
