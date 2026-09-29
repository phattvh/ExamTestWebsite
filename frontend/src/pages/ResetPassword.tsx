import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Box, Button, TextField, Typography, Container, Card, Alert, Link } from '@mui/material';
import axios from 'axios';
import { useNavigate, Link as RouterLink, useSearchParams } from 'react-router-dom';
import { API_URL } from '../api/authInterceptors';

const schema = z.object({
  new_password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirm_password'],
});
type FormValues = z.infer<typeof schema>;

const BG_DARK = '#111827';
const CARD_BG = '#1E293B';
const PANEL_BG = '#1D4ED8';
const TEXT_MUTED = '#94A3B8';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    try {
      setError(null);
      await axios.post(`${API_URL}/auth/reset-password`, { token, new_password: data.new_password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Đặt lại mật khẩu thất bại. Đường dẫn có thể đã hết hạn.');
    }
  };

  if (!token) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: BG_DARK, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Alert severity="error">Đường dẫn không hợp lệ — thiếu mã token. Vui lòng yêu cầu lại từ trang "Quên mật khẩu".</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: BG_DARK, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Container maxWidth="xs">
        <Card sx={{ bgcolor: CARD_BG, color: '#fff', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Đặt lại mật khẩu</Typography>
          <Typography variant="body2" sx={{ color: TEXT_MUTED, mb: 3 }}>
            Nhập mật khẩu mới cho tài khoản của bạn.
          </Typography>

          {success ? (
            <Alert severity="success">Đặt lại mật khẩu thành công! Đang chuyển tới trang đăng nhập...</Alert>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <TextField
                fullWidth
                type="password"
                label="Mật khẩu mới"
                margin="normal"
                {...register('new_password')}
                error={!!errors.new_password}
                helperText={errors.new_password?.message}
                slotProps={{ inputLabel: { style: { color: TEXT_MUTED } } }}
                sx={{ mb: 1, '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(255,255,255,0.03)', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }}
              />
              <TextField
                fullWidth
                type="password"
                label="Xác nhận mật khẩu mới"
                margin="normal"
                {...register('confirm_password')}
                error={!!errors.confirm_password}
                helperText={errors.confirm_password?.message}
                slotProps={{ inputLabel: { style: { color: TEXT_MUTED } } }}
                sx={{ mb: 3, '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(255,255,255,0.03)', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }}
              />
              <Button type="submit" fullWidth variant="contained" disableElevation sx={{ py: 1.3, bgcolor: PANEL_BG, textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: '#1E40AF' } }}>
                Đặt lại mật khẩu
              </Button>
            </form>
          )}

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Link component={RouterLink} to="/login" sx={{ color: '#60a5fa', fontSize: '0.85rem' }} underline="hover">
              Quay lại đăng nhập
            </Link>
          </Box>
        </Card>
      </Container>
    </Box>
  );
}
