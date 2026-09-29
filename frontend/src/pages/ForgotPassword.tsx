import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Box, Button, TextField, Typography, Container, Card, Alert, Link } from '@mui/material';
import axios from 'axios';
import { Link as RouterLink } from 'react-router-dom';
import { API_URL } from '../api/authInterceptors';

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
});
type FormValues = z.infer<typeof schema>;

const BG_DARK = '#111827';
const CARD_BG = '#1E293B';
const PANEL_BG = '#1D4ED8';
const TEXT_MUTED = '#94A3B8';

export default function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    try {
      setError(null);
      await axios.post(`${API_URL}/auth/forgot-password`, data);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Có lỗi xảy ra, vui lòng thử lại sau.');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: BG_DARK, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Container maxWidth="xs">
        <Card sx={{ bgcolor: CARD_BG, color: '#fff', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Quên mật khẩu</Typography>
          <Typography variant="body2" sx={{ color: TEXT_MUTED, mb: 3 }}>
            Nhập email đã đăng ký, chúng tôi sẽ gửi đường dẫn đặt lại mật khẩu tới email đó.
          </Typography>

          {submitted ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              Nếu email tồn tại trong hệ thống, một đường dẫn đặt lại mật khẩu đã được gửi tới email đó.
              Vui lòng kiểm tra hộp thư (kể cả thư mục Spam).
            </Alert>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <TextField
                fullWidth
                label="Email"
                margin="normal"
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message}
                slotProps={{ inputLabel: { style: { color: TEXT_MUTED } } }}
                sx={{ mb: 3, '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(255,255,255,0.03)', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }}
              />
              <Button type="submit" fullWidth variant="contained" disableElevation sx={{ py: 1.3, bgcolor: PANEL_BG, textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: '#1E40AF' } }}>
                Gửi đường dẫn đặt lại mật khẩu
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
