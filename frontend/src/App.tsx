import { BrowserRouter, Route, Routes } from "react-router-dom";

import "./App.css";
import { AuthProvider } from "./auth/store";
import { CartProvider } from "./cart/store";
import { AdminGuard } from "./components/AdminGuard";
import { CartDrawer } from "./components/CartDrawer";
import { NavBar } from "./components/NavBar";
import { AdminPage } from "./pages/AdminPage";
import { AdminProductFormPage } from "./pages/AdminProductFormPage";
import { CatalogPage } from "./pages/CatalogPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
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
              <Route
                path="/admin"
                element={
                  <AdminGuard>
                    <AdminPage />
                  </AdminGuard>
                }
              />
              <Route
                path="/admin/new"
                element={
                  <AdminGuard>
                    <AdminProductFormPage />
                  </AdminGuard>
                }
              />
              <Route
                path="/admin/:id/edit"
                element={
                  <AdminGuard>
                    <AdminProductFormPage />
                  </AdminGuard>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <CartDrawer />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;