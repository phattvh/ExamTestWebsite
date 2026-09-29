import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Box, CircularProgress } from '@mui/material';

interface StaffRouteProps {
  children: ReactNode;
}

/**
 * Cho phép cả "admin" và "teacher" — dùng cho các trang quản lý đề thi/câu hỏi mà
 * backend đã cấp quyền cho giáo viên (exam:create, question:create,...), khác với
 * AdminRoute (chỉ admin) dùng cho quản lý người dùng/thống kê toàn hệ thống.
 */
const StaffRoute = ({ children }: StaffRouteProps) => {
  const { user, isAuthenticated, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (user && user.requires_password_change) {
    return <Navigate to="/change-password" />;
  }

  if (user && !['admin', 'teacher'].includes(user.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
};

export default StaffRoute;
