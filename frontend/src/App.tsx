import { BrowserRouter, Route, Routes } from "react-router-dom";

import "./App.css";
import { AuthProvider } from "./auth/store";
import { CartProvider } from "./cart/store";
import { CartDrawer } from "./components/CartDrawer";
import { NavBar } from "./components/NavBar";
import { CatalogPage } from "./pages/CatalogPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { LoginPage } from "./pages/LoginPage";
import { OrderDetailPage } from "./pages/OrderDetailPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ProductPage } from "./pages/ProductPage";
import { RegisterPage } from "./pages/RegisterPage";

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <NavBar />
          <main className="app">
            <Routes>
              <Route path="/" element={<CatalogPage />} />
              <Route path="/products/:slug" element={<ProductPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:id" element={<OrderDetailPage />} />
            </Routes>
          </main>
          <CartDrawer />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;