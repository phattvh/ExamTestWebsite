import { Navigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Box, CircularProgress } from '@mui/material';

interface RoleRouteProps {
  children: ReactNode;
  allowedRoles: string[];
}

const RoleRoute = ({ children, allowedRoles }: RoleRouteProps) => {
  const { user, isAuthenticated, isLoading } = useContext(AuthContext);
  const location = useLocation();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#0f172a' }}>
        <CircularProgress size={60} thickness={4} sx={{ color: '#38bdf8' }} />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (user && user.requires_password_change && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" />;
  }

  if (user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
};

export default RoleRoute;
