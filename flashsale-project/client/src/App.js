import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import MainLayout from './layouts/MainLayout';
import { Home, Login, Register, ProductDetail, Cart, Account, OrderHistory, OrderDetail, ShopOrders, Profile, ChangePassword, Search, Report, ShopProducts, ProductForm, ShopCategories, ShopPermissions, AdminUsers, SystemHealth, ActivityLogs, ShopFlashSaleCampaign } from './routes/AppRoutes';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="home" element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="product/:id" element={<ProductDetail />} />
          <Route path="cart" element={<Cart />} />
          <Route path="account" element={<Account />} />
          <Route path="profile" element={<Profile />} />
          <Route path="change-password" element={<ChangePassword />} />
          <Route path="orders" element={<OrderHistory />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="shop/orders" element={<ShopOrders />} />
          <Route path="shop/products" element={<ShopProducts />} />
          <Route path="shop/products/new" element={<ProductForm />} />
          <Route path="shop/products/:id/edit" element={<ProductForm />} />
          <Route path="shop/flash-sale/campaign" element={<ShopFlashSaleCampaign />} />
          <Route path="shop/categories" element={<ShopCategories />} />
          <Route path="shop/report" element={<Report />} />
          <Route path="shop/permissions" element={<ShopPermissions />} />
          <Route path="shop/users" element={<AdminUsers />} />
          <Route path="shop/health" element={<SystemHealth />} />
          <Route path="shop/logs" element={<ActivityLogs />} />
          <Route path="search" element={<Search />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
