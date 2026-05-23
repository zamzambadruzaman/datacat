import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import AssetsPage from "./pages/AssetsPage";
import AssetDetail from "./components/AssetDetail";
import AssetForm from "./components/AssetForm";
import DomainsPage from "./pages/DomainsPage";
import TeamList from "./components/TeamList";
import TeamDetail from "./components/TeamDetail";
import LoginPage from "./pages/LoginPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/assets/new" element={<AssetForm />} />
        <Route path="/assets/:id" element={<AssetDetail />} />
        <Route path="/domains" element={<DomainsPage />} />
        <Route path="/teams" element={<TeamList />} />
        <Route path="/teams/:teamId" element={<TeamDetail />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
