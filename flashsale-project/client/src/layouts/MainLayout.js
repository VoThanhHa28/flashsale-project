import Layout from '../components/Layout';
import ConnectionStatus from '../components/ConnectionStatus';

function MainLayout() {
  return (
    <>
      <ConnectionStatus />
      <Layout />
    </>
  );
}

export default MainLayout;
