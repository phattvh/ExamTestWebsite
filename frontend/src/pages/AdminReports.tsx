import { Box, Typography, Paper, Alert, Skeleton, Grid, Avatar } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useState, useEffect, useContext } from 'react';
import { adminApi } from '../api/adminApi';
import { AuthContext } from '../context/AuthContext';
import { Assessment, CheckCircle, Cancel, TrendingUp } from '@mui/icons-material';

const AdminReports = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useContext(AuthContext);

  useEffect(() => {
    adminApi.getReports()
      .then((res) => {
        const reportList = Array.isArray(res) ? res : (res?.data || []);
        setData(reportList);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Không tải được dữ liệu báo cáo thống kê.');
        setLoading(false);
      });
  }, []);

  const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  const totalPass = data.reduce((acc, curr) => acc + (curr.pass || 0), 0);
  const totalFail = data.reduce((acc, curr) => acc + (curr.fail || 0), 0);
  const totalAttempts = totalPass + totalFail;
  const passRate = totalAttempts > 0 ? Math.round((totalPass / totalAttempts) * 100) : 0;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Skeleton variant="text" height={40} width="30%" />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 1.5 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      {/* Header Bar */}
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
          Báo cáo & Phân tích Kết quả
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748B' }}>
          {user?.role === 'teacher'
            ? 'Thống kê kết quả và phân tích tỷ lệ đạt/chưa đạt của các đề thi do bạn quản lý.'
            : 'Tổng hợp phân tích toàn diện hiệu suất thi cử, tỷ lệ đạt chuẩn và phân bố kết quả của toàn hệ thống.'}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ borderRadius: 1.5 }}>{error}</Alert>}

      {/* KPI Cards */}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Tổng lượt thi</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.5 }}>{totalAttempts}</Typography>
            </Box>
            <Avatar sx={{ bgcolor: '#EFF6FF', color: '#2563EB', width: 42, height: 42, borderRadius: 1 }}>
              <Assessment />
            </Avatar>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Lượt thi Đạt</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#10B981', mt: 0.5 }}>{totalPass}</Typography>
            </Box>
            <Avatar sx={{ bgcolor: '#ECFDF5', color: '#10B981', width: 42, height: 42, borderRadius: 1 }}>
              <CheckCircle />
            </Avatar>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Lượt thi Chưa đạt</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#EF4444', mt: 0.5 }}>{totalFail}</Typography>
            </Box>
            <Avatar sx={{ bgcolor: '#FEF2F2', color: '#EF4444', width: 42, height: 42, borderRadius: 1 }}>
              <Cancel />
            </Avatar>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Tỷ lệ Đạt chuẩn</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#2563EB', mt: 0.5 }}>{passRate}%</Typography>
            </Box>
            <Avatar sx={{ bgcolor: '#EFF6FF', color: '#2563EB', width: 42, height: 42, borderRadius: 1 }}>
              <TrendingUp />
            </Avatar>
          </Paper>
        </Grid>
      </Grid>

      {data.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
          <Typography sx={{ color: '#64748B' }}>
            Chưa có dữ liệu bài nộp nào để thống kê. Dữ liệu sẽ tự động tổng hợp ngay khi học sinh hoàn thành bài thi.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Paper elevation={0} sx={{ height: 420, width: '100%', p: 3, borderRadius: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 800, color: '#0F172A' }}>Tỷ lệ Đạt / Chưa đạt theo từng Đề thi</Typography>
              <ResponsiveContainer width="100%" height="88%">
                <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Legend wrapperStyle={{ paddingTop: 10 }} />
                  <Bar name="Đạt chuẩn" dataKey="pass" stackId="a" fill="#10B981" radius={[0, 0, 4, 4]} />
                  <Bar name="Chưa đạt" dataKey="fail" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper elevation={0} sx={{ height: 420, width: '100%', p: 3, borderRadius: 1.5, display: 'flex', flexDirection: 'column', bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 800, color: '#0F172A' }}>Phân bố lượt làm bài</Typography>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} dataKey="pass" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4}>
                    {data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default AdminReports;
