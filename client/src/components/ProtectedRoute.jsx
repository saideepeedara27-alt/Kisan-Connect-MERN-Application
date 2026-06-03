import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, role }) {
  const { user, isAuthenticated, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return <div className="page-pad">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role && user.role !== role) {
    const fallback =
      user.role === 'farmer'
        ? '/farmer'
        : user.role === 'admin'
          ? '/admin'
          : user.role === 'delivery'
            ? '/delivery'
            : '/market';
    return <Navigate to={fallback} replace />;
  }

  return children;
}
