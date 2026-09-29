import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  Alert,
  Avatar,
} from '@mui/material';
import { LockReset } from '@mui/icons-material';
import { API_URL } from '../api/authInterceptors';

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(
        `${API_URL}/auth/change-password`,
        { old_password: oldPassword, new_password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Đổi mật khẩu thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#F8FAFC', p: 3 }}>
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 1.5,
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 20px -2px rgba(0,0,0,0.06)',
            bgcolor: '#FFFFFF',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Avatar sx={{ width: 52, height: 52, bgcolor: '#EFF6FF', color: '#2563EB', mb: 1.5, borderRadius: 1.2 }}>
              <LockReset sx={{ fontSize: 28 }} />
            </Avatar>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', textAlign: 'center' }}>
              Yêu cầu đổi mật khẩu
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B', textAlign: 'center', mt: 0.5, maxWidth: 440 }}>
              Vì lý do an toàn, bạn cần cập nhật mật khẩu mới trước khi tiếp tục truy cập vào hệ thống.
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 1.5 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                fullWidth
                label="Mật khẩu hiện tại"
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
              <TextField
                fullWidth
                label="Mật khẩu mới"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                helperText="Mật khẩu có độ dài tối thiểu 8 ký tự"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
              <TextField
                fullWidth
                label="Xác nhận mật khẩu mới"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  mt: 1,
                  py: 1.3,
                  bgcolor: '#2563EB',
                  '&:hover': { bgcolor: '#1D4ED8' },
                  borderRadius: 1.2,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                }}
              >
                {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
              </Button>
            </Box>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}
