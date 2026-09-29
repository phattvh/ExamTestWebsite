import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button,
  Skeleton, Alert, Avatar, Paper,
} from '@mui/material';
import {
  School, CheckCircle, Cancel, AccessTime, Visibility,
  EmojiEvents, AssignmentTurnedIn, HourglassEmpty,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { gradingApi } from '../api/gradingApi';
import { adminApi } from '../api/adminApi';

interface AttemptResult {
  id: string;
  attempt_id: string;
  exam_id: string;
  score: number;
  total_possible?: number;
  percentage: number;
  has_pending_manual_grading?: boolean;
  created_at: string;
}

export default function StudentResults() {
  const navigate = useNavigate();
  const [results, setResults] = useState<AttemptResult[]>([]);
  const [examsMap, setExamsMap] = useState<Record<string, { title: string; passing_score?: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [resultsData, examsData] = await Promise.all([
          gradingApi.getMyResults().catch(() => []),
          adminApi.getExams().catch(() => []),
        ]);

        const eMap: Record<string, { title: string; passing_score?: number }> = {};
        (examsData || []).forEach((e: any) => {
          eMap[e.id] = { title: e.title, passing_score: e.passing_score ?? 50 };
        });
        setExamsMap(eMap);
        setResults(resultsData || []);
      } catch (err: any) {
        console.error('Failed to load student results', err);
        setError('Không thể tải lịch sử kết quả thi. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalExamsTaken = results.length;
  const passedCount = results.filter((r) => {
    const passThreshold = examsMap[r.exam_id]?.passing_score ?? 50;
    return r.percentage >= passThreshold;
  }).length;
  const avgScore =
    totalExamsTaken > 0
      ? Math.round(results.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / totalExamsTaken)
      : 0;

  return (
    <Box>
      {/* Clean Header */}
      <Box sx={{ mb: 3.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
          Kết quả học tập & Lịch sử làm bài
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748B' }}>
          Theo dõi tiến độ học tập, điểm số và xem lại chi tiết bài làm của bạn trong từng kỳ thi.
        </Typography>
      </Box>

      {/* KPI Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2.5, borderRadius: 1.5, bgcolor: '#ffffff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 46, height: 46, bgcolor: '#EFF6FF', color: '#2563EB', borderRadius: 1.2 }}>
              <AssignmentTurnedIn />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Số bài đã nộp</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>{totalExamsTaken}</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2.5, borderRadius: 1.5, bgcolor: '#ffffff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 46, height: 46, bgcolor: '#ECFDF5', color: '#10B981', borderRadius: 1.2 }}>
              <CheckCircle />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Bài thi Đạt</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#10B981' }}>{passedCount} / {totalExamsTaken}</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2.5, borderRadius: 1.5, bgcolor: '#ffffff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 46, height: 46, bgcolor: '#FFFBEB', color: '#F59E0B', borderRadius: 1.2 }}>
              <EmojiEvents />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Điểm TB (%)</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#F59E0B' }}>{avgScore}%</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 1.5 }}>{error}</Alert>}

      {loading ? (
        <Grid container spacing={2.5}>
          {[1, 2, 3].map((n) => (
            <Grid size={{ xs: 12 }} key={n}>
              <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1.5 }} />
            </Grid>
          ))}
        </Grid>
      ) : results.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 1.5, bgcolor: '#ffffff', border: '1px solid #E2E8F0' }}>
          <School sx={{ fontSize: 60, color: '#94A3B8', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#334155', mb: 1 }}>
            Chưa có kết quả làm bài nào
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Bạn chưa hoàn thành bài thi nào. Hãy bắt đầu một bài thi ngay bây giờ!
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/student/exams')}
            sx={{ borderRadius: 1.5, px: 3, py: 1, textTransform: 'none', fontWeight: 600 }}
          >
            Xem danh sách đề thi
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {results.map((r) => {
            const examTitle = examsMap[r.exam_id]?.title || `Đề thi #${r.exam_id.slice(0, 8)}`;
            const passingScore = examsMap[r.exam_id]?.passing_score ?? 50;
            const isPassed = r.percentage >= passingScore;

            return (
              <Grid size={{ xs: 12 }} key={r.id || r.attempt_id}>
                <Card
                  sx={{
                    borderRadius: 1.5,
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.02)',
                    transition: 'all 0.15s ease',
                    '&:hover': { borderColor: '#3B82F6', boxShadow: '0 4px 12px rgba(59,130,246,0.08)' },
                  }}
                >
                    <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B' }}>
                              {examTitle}
                            </Typography>
                            {r.has_pending_manual_grading ? (
                              <Chip
                                icon={<HourglassEmpty fontSize="small" />}
                                label="Chờ chấm tự luận"
                                size="small"
                                color="warning"
                                sx={{ fontWeight: 600 }}
                              />
                            ) : isPassed ? (
                              <Chip
                                icon={<CheckCircle fontSize="small" />}
                                label="ĐẠT"
                                size="small"
                                color="success"
                                sx={{ fontWeight: 700, px: 0.5 }}
                              />
                            ) : (
                              <Chip
                                icon={<Cancel fontSize="small" />}
                                label="CHƯA ĐẠT"
                                size="small"
                                color="error"
                                sx={{ fontWeight: 700, px: 0.5 }}
                              />
                            )}
                          </Box>
                          <Typography variant="body2" sx={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AccessTime sx={{ fontSize: 16 }} />
                            Nộp bài lúc: {new Date(r.created_at || Date.now()).toLocaleString('vi-VN')}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, width: { xs: '100%', md: 'auto' }, justifyContent: { xs: 'space-between', md: 'flex-end' } }}>
                          <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: isPassed ? '#10B981' : '#EF4444' }}>
                              {r.score} điểm ({r.percentage}%)
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                              Ngưỡng đạt: {passingScore}%
                            </Typography>
                          </Box>

                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<Visibility />}
                            onClick={() => navigate(`/student/result/${r.attempt_id}`)}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 2.5 }}
                          >
                            Xem chi tiết
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
    </Box>
  );
}