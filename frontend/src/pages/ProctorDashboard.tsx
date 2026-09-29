import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, CircularProgress, Grid, Paper, Alert,
  TextField, InputAdornment, Chip,
} from '@mui/material';
import { useProctoringData } from '../hooks/useProctoringData';
import { useProctorStreamViewer } from '../hooks/useProctorWebSocket';
import StudentList from '../components/Proctor/StudentList';
import ViolationFeed from '../components/Proctor/ViolationFeed';
import AlertBanner from '../components/Proctor/AlertBanner';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';

const ProctorDashboard = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { students, violations, alerts, clearAlerts, loading, refreshing, refetch, unauthorized, error, socket } = useProctoringData(examId || '');
  const { streams, frames, requestStream, stopStream } = useProctorStreamViewer(socket);

  const [filter, setFilter] = useState<'all' | 'violation' | 'high_risk' | 'online'>('all');
  const [search, setSearch] = useState('');

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Tìm kiếm theo tên hoặc username
      const name = (s.full_name || '').toLowerCase();
      const username = (s.username || '').toLowerCase();
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || name.includes(q) || username.includes(q);
      if (!matchesSearch) return false;

      // Lọc theo điều kiện
      if (filter === 'violation') return s.violations_count > 0 || s.risk_score > 0;
      if (filter === 'high_risk') return s.risk_score >= 40;
      if (filter === 'online') return s.is_online;
      return true;
    });
  }, [students, filter, search]);

  const violationCount = students.filter((s) => s.violations_count > 0 || s.risk_score > 0).length;
  const highRiskCount = students.filter((s) => s.risk_score >= 40).length;
  const onlineCount = students.filter((s) => s.is_online).length;

  if (unauthorized) {
    return (
      <Box sx={{ p: 4, height: '100vh', bgcolor: '#0f172a' }}>
        <Alert severity="error" variant="filled" sx={{ borderRadius: 1.5 }}>
          Bạn không có quyền giám sát đề thi này hoặc đề thi không tồn tại.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#0f172a' }}>
        <CircularProgress size={48} thickness={4} sx={{ color: '#38bdf8', mb: 2 }} />
        <Typography variant="body1" sx={{ color: '#94a3b8' }}>Đang kết nối phòng giám sát thi...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, height: '100vh', bgcolor: '#0f172a' }}>
        <Alert severity="error" variant="filled" sx={{ borderRadius: 1.5 }}>
          Lỗi kết nối giám sát: {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#0f172a', color: '#f8fafc' }}>
      {/* Header */}
      <Box sx={{ p: 2, px: 3, borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#0f172a' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <VisibilityIcon sx={{ fontSize: 26, color: '#38bdf8' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.3, fontSize: '1.1rem' }}>
              Trung tâm Giám sát Thi Trực tiếp (Live Proctoring)
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#22c55e', display: 'inline-block' }} />
              Đề thi ID: {examId}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />}
            onClick={() => refetch()}
            disabled={refreshing}
            sx={{
              bgcolor: '#0284c7',
              '&:hover': { bgcolor: '#0369a1' },
              borderRadius: 1,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.78rem',
              px: 1.8,
              py: 0.6,
            }}
          >
            {refreshing ? 'Đang làm mới...' : 'Làm mới (Refresh)'}
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate('/admin/exams')}
            sx={{ color: '#94a3b8', borderColor: '#334155', borderRadius: 1, textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: '#64748b', color: '#fff' } }}
          >
            Rời phòng giám sát
          </Button>
        </Box>
      </Box>
      
      <Grid container sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {/* Main Students Grid */}
        <Grid size={{ xs: 12, md: 8, lg: 9 }} sx={{ height: '100%', overflowY: 'auto', p: 3 }}>
          {/* Toolbar: Filters and Search */}
          <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip
                label={`Tất cả (${students.length})`}
                size="small"
                onClick={() => setFilter('all')}
                color={filter === 'all' ? 'primary' : 'default'}
                variant={filter === 'all' ? 'filled' : 'outlined'}
                sx={{ borderRadius: 1, fontWeight: 700, color: filter === 'all' ? '#fff' : '#94a3b8' }}
              />
              <Chip
                label={`Có vi phạm (${violationCount})`}
                size="small"
                onClick={() => setFilter('violation')}
                color={filter === 'violation' ? 'warning' : 'default'}
                variant={filter === 'violation' ? 'filled' : 'outlined'}
                sx={{ borderRadius: 1, fontWeight: 700, color: filter === 'violation' ? '#fff' : '#94a3b8' }}
              />
              <Chip
                label={`Nguy cơ cao (${highRiskCount})`}
                size="small"
                onClick={() => setFilter('high_risk')}
                color={filter === 'high_risk' ? 'error' : 'default'}
                variant={filter === 'high_risk' ? 'filled' : 'outlined'}
                sx={{ borderRadius: 1, fontWeight: 700, color: filter === 'high_risk' ? '#fff' : '#94a3b8' }}
              />
              <Chip
                label={`Đang thi (${onlineCount})`}
                size="small"
                onClick={() => setFilter('online')}
                color={filter === 'online' ? 'success' : 'default'}
                variant={filter === 'online' ? 'filled' : 'outlined'}
                sx={{ borderRadius: 1, fontWeight: 700, color: filter === 'online' ? '#fff' : '#94a3b8' }}
              />
            </Box>

            <TextField
              placeholder="Tìm thí sinh theo tên / username..."
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#64748b', fontSize: 18 }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                width: { xs: '100%', sm: 260 },
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                  bgcolor: '#1e293b',
                  color: '#fff',
                  fontSize: '0.85rem',
                  '& fieldset': { borderColor: '#334155' },
                  '&:hover fieldset': { borderColor: '#475569' },
                },
              }}
            />
          </Box>
          
          {filteredStudents.length > 0 ? (
            <StudentList
              students={filteredStudents}
              examId={examId}
              onRequestStream={(userId, type) => requestStream(examId || '', userId, type)}
              onStopStream={stopStream}
              streams={streams}
              frames={frames}
            />
          ) : (
            <Paper sx={{ p: 6, textAlign: 'center', bgcolor: '#1e293b', border: '1px dashed #334155', borderRadius: 1.5 }}>
              <VideocamOffIcon sx={{ fontSize: 48, color: '#475569', mb: 1.5 }} />
              <Typography variant="h6" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.5 }}>Không tìm thấy thí sinh</Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                {search || filter !== 'all' ? 'Không có thí sinh nào khớp với bộ lọc hiện tại.' : 'Đang chờ thí sinh tham gia vào phòng thi...'}
              </Typography>
            </Paper>
          )}
        </Grid>
        
        {/* Real-time Violation Feed Panel */}
        <Grid size={{ xs: 12, md: 4, lg: 3 }} sx={{ height: '100%', borderLeft: '1px solid #1e293b', bgcolor: '#162032' }}>
          <ViolationFeed violations={violations} />
        </Grid>
      </Grid>
      
      <AlertBanner alerts={alerts} onClearAlerts={clearAlerts} />
    </Box>
  );
};

export default ProctorDashboard;
