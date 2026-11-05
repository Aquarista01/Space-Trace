import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AppShell from "@/components/layout/AppShell";
import OverviewPage from "@/pages/app/OverviewPage";
import PlaceholderPage from "@/pages/app/PlaceholderPage";
import HomePage from "@/pages/HomePage";
import ObjectsPage from "@/pages/app/ObjectsPage";
import SpacesPage from "@/pages/app/SpacesPage";
import PhotosPage from "@/pages/app/PhotosPage";
import SettingsPage from "@/pages/app/SettingsPage";
import ObjectDetailPage from "@/pages/app/ObjectDetailPage";
import SpaceDetailPage from "@/pages/app/SpaceDetailPage";
import SpaceDiffPage from "@/pages/app/SpaceDiffPage";
import { Toaster } from "react-hot-toast";
function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (!loading && !isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { fontSize: "14px" },
        }}
      />
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="objects" element={<ObjectsPage />} />
          <Route path="objects/:id" element={<ObjectDetailPage />} />
          <Route path="spaces" element={<SpacesPage />} />
          <Route path="spaces/:spaceId" element={<SpaceDetailPage />} />
          <Route path="spaces/:spaceId/diff" element={<SpaceDiffPage />} />
          <Route path="photos" element={<PhotosPage title="Google Photos" description="Manage connected and indexed photos." />} />
          <Route path="settings" element={<SettingsPage title="Settings" description="Customize your account." />} />
          

        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}