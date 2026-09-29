import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Box, CircularProgress } from '@mui/material';

interface AdminRouteProps {
  children: ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, isAuthenticated, isLoading } = useContext(AuthContext);

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

  if (user && user.requires_password_change) {
    return <Navigate to="/change-password" />;
  }

  if (user && user.role !== 'admin') {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
};

export default AdminRoute;
