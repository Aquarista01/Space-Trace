import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import HomePage from "@/pages/HomePage";
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


  
      </Routes>
    </AuthProvider>
  );
}