import Layout from '../components/Layout';
import ConnectionStatus from '../components/ConnectionStatus';
import { CartProvider } from '../contexts/CartContext';

function MainLayout() {
  return (
    <CartProvider>
      <ConnectionStatus />
      <Layout />
    </CartProvider>
  );
}

export default MainLayout;
