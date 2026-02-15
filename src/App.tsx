import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import Fields from './pages/Fields';
import EquipmentPage from './pages/EquipmentPage';
import Operations from './pages/Operations';
import ProductsPage from './pages/Products';
import Operators from './pages/Operators';
import Flags from './pages/Flags';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/fields" element={<Fields />} />
          <Route path="/equipment" element={<EquipmentPage />} />
          <Route path="/operations" element={<Operations />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/operators" element={<Operators />} />
          <Route path="/flags" element={<Flags />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
