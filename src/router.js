import { store } from "./state/store.js";
import { renderPage } from "./ui/layout.js";
import { homePage } from "./pages/homePage.js";
import { posPage } from "./pages/posPage.js";
import { productsPage } from "./pages/productsPage.js";
import { inventoryPage } from "./pages/inventoryPage.js";
import { salesPage } from "./pages/salesPage.js";
import { debtsPage } from "./pages/debtsPage.js";
import { categoriesPage } from "./pages/categoriesPage.js";
import { settingsPage } from "./pages/settingsPage.js";

const routes = {
  home: homePage,
  pos: posPage,
  products: productsPage,
  inventory: inventoryPage,
  sales: salesPage,
  debts: debtsPage,
  categories: categoriesPage,
  settings: settingsPage
};

function getRoute() {
  const hash = window.location.hash.replace("#/", "");
  if (routes[hash]) return hash;
  return "home";
}

export function startRouter() {
  const render = () => {
    const route = getRoute();
    store.setState({ currentPage: route });
    renderPage(routes[route]);
  };
  window.addEventListener("hashchange", render);
  render();
}
