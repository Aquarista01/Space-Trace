import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { googleLoginUrl } from "@/lib/api";

export default function AuthCta({ label, className }) {
  const { isAuthenticated, loading, hadSession } = useAuth();

  if (loading && !hadSession) {
    return <span className={`${className} opacity-0`}>{label}</span>;
  }

  if (isAuthenticated) {
    return (
      <Link to="/dashboard" className={className}>
        {label}
      </Link>
    );
  }

  return (
    <a href={googleLoginUrl} className={className}>
      {label}
    </a>
  );
}