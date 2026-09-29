import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, Skeleton,
  Chip, Paper, TextField, InputAdornment, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, ToggleButton,
  ToggleButtonGroup, MenuItem,
} from '@mui/material';
import {
  PlayArrow, AccessTime, ErrorOutlined, Search,
  ViewList, ViewModule,
  HelpOutlined,
} from '@mui/icons-material';
import { examApi } from '../api/examApi';
import type { Exam } from '../api/examApi';
import { useNavigate } from 'react-router-dom';

const ExamList: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [durationFilter, setDurationFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchExams = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await examApi.getPublishedExams();
        setExams(data || []);
      } catch (err) {
        console.error('Failed to fetch exams', err);
        setError('Không thể tải danh sách bài thi. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  const filteredExams = exams.filter((e) => {
    const titleMatch = (e.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.id || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!titleMatch) return false;

    if (durationFilter === 'under30') return (e.duration_minutes || 0) < 30;
    if (durationFilter === '30to60') return (e.duration_minutes || 0) >= 30 && (e.duration_minutes || 0) <= 60;
    if (durationFilter === 'over60') return (e.duration_minutes || 0) > 60;
    return true;
  });

  return (
    <Box>
      {/* Main Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
            Danh sách đề thi trực tuyến
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            Tổng hợp các đề thi đang mở. Hệ thống tự động giám sát camera và ghi nhận kết quả ngay sau khi nộp bài.
          </Typography>
        </Box>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, next) => next && setViewMode(next)}
          size="small"
          sx={{ bgcolor: '#FFFFFF', borderRadius: 1.5, border: '1px solid #E2E8F0' }}
        >
          <ToggleButton value="table" sx={{ textTransform: 'none', px: 1.5, py: 0.5, fontWeight: 600, gap: 0.5 }}>
            <ViewList sx={{ fontSize: 18 }} /> Bảng
          </ToggleButton>
          <ToggleButton value="grid" sx={{ textTransform: 'none', px: 1.5, py: 0.5, fontWeight: 600, gap: 0.5 }}>
            <ViewModule sx={{ fontSize: 18 }} /> Thẻ
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Content Grid */}
      <Grid container spacing={3}>
        {/* Left Side: Exam List / Table */}
        <Grid size={{ xs: 12, lg: 8.5 }}>
          {loading ? (
            <Paper sx={{ p: 3, borderRadius: 1.5, border: '1px solid #E2E8F0', bgcolor: '#FFFFFF' }}>
              <Skeleton variant="rectangular" height={50} sx={{ mb: 2, borderRadius: 1 }} />
              <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 1 }} />
            </Paper>
          ) : error ? (
            <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 1.5 }} role="alert">
              <ErrorOutlined color="error" sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="h6" color="error">{error}</Typography>
              <Button variant="contained" sx={{ mt: 2.5, borderRadius: 1.5, textTransform: 'none' }} onClick={() => window.location.reload()}>
                Thử lại
              </Button>
            </Paper>
          ) : filteredExams.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 1.5, bgcolor: '#ffffff', border: '1px solid #E2E8F0' }}>
              <Typography variant="h6" color="text.secondary">
                {searchTerm || durationFilter !== 'all' ? 'Không tìm thấy đề thi nào khớp với bộ lọc.' : 'Hiện chưa có bài thi nào được mở.'}
              </Typography>
            </Paper>
          ) : viewMode === 'table' ? (
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                borderRadius: 1.5,
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.02)',
                bgcolor: '#FFFFFF',
                overflow: 'hidden',
              }}
            >
              <Table size="medium">
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.82rem', width: '100px' }}>MÃ ĐỀ</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.82rem' }}>TÊN ĐỀ THI</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.82rem', width: '120px' }}>THỜI GIAN</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.82rem', width: '120px' }}>CHUẨN ĐẠT</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.82rem', width: '130px', textAlign: 'right' }}>THAO TÁC</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredExams.map((exam) => (
                    <TableRow
                      key={exam.id}
                      hover
                      sx={{
                        '&:hover': { bgcolor: '#F8FAFC' },
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#64748B', fontSize: '0.8rem' }}>
                        #{exam.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
                          {exam.title}
                        </Typography>
                        {exam.description && (
                          <Typography variant="caption" sx={{ color: '#64748B', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>
                            {exam.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#334155' }}>
                          <AccessTime sx={{ fontSize: 15, color: '#64748B' }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{exam.duration_minutes} phút</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`≥ ${exam.passing_score ?? 50}%`}
                          size="small"
                          sx={{ fontWeight: 700, bgcolor: '#EFF6FF', color: '#2563EB', borderRadius: 1 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<PlayArrow sx={{ fontSize: 16 }} />}
                          onClick={() => navigate(`/student/exam/${exam.id}`)}
                          sx={{
                            bgcolor: '#2563EB',
                            '&:hover': { bgcolor: '#1D4ED8' },
                            fontWeight: 700,
                            borderRadius: 1.2,
                            textTransform: 'none',
                            px: 1.8,
                            py: 0.6,
                            fontSize: '0.8rem',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Làm bài
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Grid container spacing={2.5}>
              {filteredExams.map((exam) => (
                <Grid size={{ xs: 12, sm: 6 }} key={exam.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderRadius: 1.5,
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.02)',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        borderColor: '#2563EB',
                        boxShadow: '0 8px 16px -2px rgba(37,99,235,0.1)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Chip label="Đang mở" color="success" size="small" sx={{ fontWeight: 800, fontSize: '0.7rem', borderRadius: 1 }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748B' }}>
                          <AccessTime sx={{ fontSize: 15 }} />
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>{exam.duration_minutes} phút</Typography>
                        </Box>
                      </Box>

                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A', mb: 1, minHeight: 44, fontSize: '1rem', lineHeight: 1.3 }}>
                        {exam.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748B', mb: 2, minHeight: 36, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontSize: '0.82rem' }}>
                        {exam.description || 'Bài kiểm tra đánh giá kiến thức trực tuyến.'}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={`Ngưỡng đạt: ${exam.passing_score ?? 50}%`}
                          size="small"
                          variant="outlined"
                          sx={{ color: '#64748B', borderColor: '#E2E8F0', borderRadius: 1 }}
                        />
                      </Box>
                    </CardContent>

                    <Box sx={{ p: 2.5, pt: 0 }}>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<PlayArrow />}
                        onClick={() => navigate(`/student/exam/${exam.id}`)}
                        sx={{
                          bgcolor: '#2563EB',
                          fontWeight: 700,
                          py: 1,
                          borderRadius: 1.5,
                          textTransform: 'none',
                          '&:hover': { bgcolor: '#1D4ED8' },
                        }}
                      >
                        Bắt đầu làm bài
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Grid>

        {/* Right Side: Filters & Quick Actions */}
        <Grid size={{ xs: 12, lg: 3.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Filter Panel */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 1.5,
                border: '1px solid #E2E8F0',
                bgcolor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Search sx={{ color: '#2563EB', fontSize: 20 }} /> Tìm kiếm & Lọc đề
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Nhập tên môn, mã đề..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search sx={{ color: '#94A3B8', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: '#F8FAFC' } }}
                />

                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Thời lượng làm bài"
                  value={durationFilter}
                  onChange={(e) => setDurationFilter(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: '#F8FAFC' } }}
                >
                  <MenuItem value="all">Tất cả thời lượng</MenuItem>
                  <MenuItem value="under30">Dưới 30 phút</MenuItem>
                  <MenuItem value="30to60">Từ 30 - 60 phút</MenuItem>
                  <MenuItem value="over60">Trên 60 phút</MenuItem>
                </TextField>
              </Box>
            </Paper>

            {/* Quick Rules / Instructions Box */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 1.5,
                border: '1px solid #E2E8F0',
                bgcolor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <HelpOutlined sx={{ color: '#F59E0B', fontSize: 18 }} /> Quy chế làm bài thi
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 1, lineHeight: 1.6 }}>
                • Hãy đảm bảo camera hoạt động bình thường trước khi bấm làm bài.
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 1, lineHeight: 1.6 }}>
                • Không chuyển tab hoặc rời khỏi góc nhìn camera để tránh bị hệ thống ghi nhận vi phạm.
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block', lineHeight: 1.6 }}>
                • Giám thị có quyền trừ điểm, trừ thời gian hoặc đình chỉ thi nếu phát hiện gian lận.
              </Typography>
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ExamList;

