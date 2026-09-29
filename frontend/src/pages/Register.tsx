import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Box, Button, TextField, Typography, Container, Card, Alert, Link } from '@mui/material';
import axios from 'axios';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { API_URL } from '../api/authInterceptors';

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(1, 'Full name is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type RegisterSchema = z.infer<typeof registerSchema>;

// Bảng màu phẳng (flat) cho màn hình xác thực — không dùng gradient/đổ bóng.
const BG_DARK = '#111827';
const CARD_BG = '#1E293B';
const PANEL_BG = '#059669';
const TEXT_LIGHT = '#ffffff';
const TEXT_MUTED = '#94A3B8';

const Register = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterSchema) => {
    try {
      setError(null);
      await axios.post(`${API_URL}/auth/register`, data, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register. Username or email may already exist.');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: BG_DARK, color: TEXT_LIGHT, fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3, }}>
      <Container maxWidth="md">
        <Card sx={{ bgcolor: CARD_BG, color: TEXT_LIGHT, borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
          
          {/* Left Side - Branding */}
          <Box sx={{ flex: 1, bgcolor: PANEL_BG, p: 6, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', cursor: 'pointer', mb: 2 }} onClick={() => navigate('/')}>
                <Box sx={{ display: 'flex', mr: 1.5 }}>
                  <Box sx={{ width: 14, height: 14, bgcolor: '#fff', borderRadius: '4px', mr: 0.5, opacity: 0.9 }} />
                  <Box sx={{ width: 14, height: 14, bgcolor: '#fff', borderRadius: '4px', mr: 0.5, opacity: 0.7 }} />
                  <Box sx={{ width: 14, height: 14, bgcolor: '#fff', borderRadius: '4px', opacity: 0.5 }} />
                </Box>
                <Box>
                  <Typography component="span" sx={{ lineHeight: 1, color: '#fff', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.5px' }}>exam</Typography>
                  <Typography component="span" sx={{ lineHeight: 1, color: 'rgba(255,255,255,0.7)', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.5px' }}>system</Typography>
                </Box>
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, mt: 4, mb: 2, color: '#fff' }}>
                Bắt đầu hành trình học tập
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
                Đăng ký tài khoản ngay hôm nay để tham gia các kỳ thi trực tuyến và đánh giá năng lực cá nhân.
              </Typography>
            </Box>
            
            <Box sx={{ mt: 8 }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                © 2026 ExamSystem. All rights reserved.
              </Typography>
            </Box>
          </Box>

          {/* Right Side - Form */}
          <Box sx={{ flex: 1, p: { xs: 4, md: 6 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 700, mb: 1 }}>
              Đăng ký
            </Typography>
            <Typography variant="body2" sx={{ color: TEXT_MUTED, mb: 3 }}>
              Tạo tài khoản mới hoàn toàn miễn phí.
            </Typography>
            
            {error && <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', '& .MuiAlert-icon': { color: '#ef4444' } }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 3, bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', '& .MuiAlert-icon': { color: '#10b981' } }}>Đăng ký thành công! Đang chuyển hướng...</Alert>}
            
            <form onSubmit={handleSubmit(onSubmit)}>
              <TextField
                fullWidth
                label="Tên đăng nhập"
                margin="normal"
                variant="outlined"
                {...register('username')}
                error={!!errors.username}
                helperText={errors.username?.message}
                slotProps={{ inputLabel: { style: { color: TEXT_MUTED } } }}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(255,255,255,0.03)', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&.Mui-focused fieldset': { borderColor: PANEL_BG, borderWidth: '2px' } } }}
              />
              <TextField
                fullWidth
                label="Email"
                type="email"
                margin="normal"
                variant="outlined"
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message}
                slotProps={{ inputLabel: { style: { color: TEXT_MUTED } } }}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(255,255,255,0.03)', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&.Mui-focused fieldset': { borderColor: PANEL_BG, borderWidth: '2px' } } }}
              />
              <TextField
                fullWidth
                label="Họ và tên"
                margin="normal"
                variant="outlined"
                {...register('full_name')}
                error={!!errors.full_name}
                helperText={errors.full_name?.message}
                slotProps={{ inputLabel: { style: { color: TEXT_MUTED } } }}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(255,255,255,0.03)', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&.Mui-focused fieldset': { borderColor: PANEL_BG, borderWidth: '2px' } } }}
              />
              <TextField
                fullWidth
                label="Mật khẩu"
                type="password"
                margin="normal"
                variant="outlined"
                {...register('password')}
                error={!!errors.password}
                helperText={errors.password?.message}
                slotProps={{ inputLabel: { style: { color: TEXT_MUTED } } }}
                sx={{ mb: 3, '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(255,255,255,0.03)', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&.Mui-focused fieldset': { borderColor: PANEL_BG, borderWidth: '2px' } } }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disableElevation
                disabled={success}
                sx={{ mb: 3, py: 1.5, bgcolor: PANEL_BG, color: '#fff', fontWeight: 600, fontSize: '1rem', borderRadius: 2, textTransform: 'none', '&:hover': { bgcolor: '#047857' }, '&.Mui-disabled': { bgcolor: 'rgba(16, 185, 129, 0.3)', color: 'rgba(255,255,255,0.5)' } }}
              >
                Tạo tài khoản
              </Button>
            </form>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="body2" sx={{ color: TEXT_MUTED }}>
                Đã có tài khoản?{' '}
                <Link component={RouterLink} to="/login" sx={{ color: '#34d399', textDecoration: 'none', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}>
                  Đăng nhập
                </Link>
              </Typography>
            </Box>
          </Box>
        </Card>
      </Container>
    </Box>
  );
};

export default Register;
