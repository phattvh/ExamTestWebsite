import { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Skeleton, Alert, Card, CardContent,
  TextField, Button, Chip, Snackbar, Avatar, Grid, IconButton, Tooltip,
} from '@mui/material';
import {
  RateReview, AssignmentTurnedIn, School, Quiz, ArrowBack,
  Assignment, Person, ArrowForward, CheckCircle,
} from '@mui/icons-material';
import { gradingApi } from '../api/gradingApi';
import type { PendingManualGradeItem } from '../api/gradingApi';
import { adminApi } from '../api/adminApi';

export default function ManualGrading() {
  const [items, setItems] = useState<PendingManualGradeItem[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [examsMap, setExamsMap] = useState<Record<string, any>>({});
  const [questionsMap, setQuestionsMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const fetchPending = async () => {
    try {
      setLoading(true);
      const [data, users, exams, questions] = await Promise.all([
        gradingApi.getPendingManualGrading().catch(() => []),
        adminApi.getUsers().catch(() => []),
        adminApi.getExams().catch(() => []),
        adminApi.getQuestions().catch(() => []),
      ]);
      setItems(data || []);

      const uMap: Record<string, any> = {};
      (users || []).forEach((u: any) => { uMap[String(u.id)] = u; });
      setUsersMap(uMap);

      const eMap: Record<string, any> = {};
      (exams || []).forEach((e: any) => { eMap[String(e.id)] = e; });
      setExamsMap(eMap);

      const qMap: Record<string, any> = {};
      (questions || []).forEach((q: any) => { qMap[String(q.id || q._id)] = q; });
      setQuestionsMap(qMap);

      setError('');
    } catch (err) {
      console.error('Failed to fetch pending manual grading', err);
      setError('Không tải được danh sách bài chờ chấm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const key = (item: PendingManualGradeItem) => `${item.result_id}:${item.question_id}`;

  // Gom nhóm các bài tự luận theo Đề thi
  const groupedExams = useMemo(() => {
    const groups: Record<string, { examId: string; exam: any; items: PendingManualGradeItem[]; studentIds: Set<string> }> = {};
    items.forEach((item) => {
      const eId = String(item.exam_id);
      if (!groups[eId]) {
        groups[eId] = {
          examId: eId,
          exam: examsMap[eId],
          items: [],
          studentIds: new Set(),
        };
      }
      groups[eId].items.push(item);
      if (item.user_id) groups[eId].studentIds.add(String(item.user_id));
    });
    return Object.values(groups);
  }, [items, examsMap]);

  const activeExamItems = useMemo(() => {
    if (!selectedExamId) return [];
    return items.filter((it) => String(it.exam_id) === String(selectedExamId));
  }, [items, selectedExamId]);

  const handleSubmit = async (item: PendingManualGradeItem) => {
    const k = key(item);
    const scoreStr = scores[k];
    const score = Number(scoreStr);
    if (scoreStr === undefined || scoreStr === '' || isNaN(score)) {
      setSnackbar({ open: true, message: 'Vui lòng nhập điểm hợp lệ.', severity: 'error' });
      return;
    }
    if (score < 0 || score > item.point_possible) {
      setSnackbar({ open: true, message: `Điểm phải trong khoảng 0 - ${item.point_possible}.`, severity: 'error' });
      return;
    }
    setSubmitting(k);
    try {
      await gradingApi.manualGradeQuestion(item.result_id, item.question_id, score, notes[k]);
      setItems((prev) => prev.filter((it) => key(it) !== k));
      setSnackbar({ open: true, message: 'Đã lưu kết quả chấm bài thành công.', severity: 'success' });
    } catch (err: any) {
      console.error('Failed to submit manual grade', err);
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Lưu điểm thất bại.', severity: 'error' });
    } finally {
      setSubmitting(null);
    }
  };

  const isImageAnswer = (answer: string | null) => !!answer && answer.startsWith('data:image');

  const selectedExam = selectedExamId ? examsMap[selectedExamId] : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {selectedExamId && (
              <Tooltip title="Quay lại danh sách đề thi">
                <IconButton onClick={() => setSelectedExamId(null)} sx={{ bgcolor: '#F1F5F9', '&:hover': { bgcolor: '#E2E8F0' } }}>
                  <ArrowBack fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
              {selectedExamId ? `Chấm bài: ${selectedExam?.title || 'Đề thi'}` : 'Chấm bài Tự luận'}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            {selectedExamId
              ? 'Xem lại chi tiết câu trả lời tự luận của từng học sinh trong đề thi này, cho điểm và nhận xét.'
              : 'Chọn một đề thi bên dưới để bắt đầu chấm điểm các câu tự luận của học sinh.'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            icon={<Assignment sx={{ fontSize: '15px !important' }} />}
            label={`${groupedExams.length} đề có bài chờ chấm`}
            sx={{ fontWeight: 700, borderRadius: 1.2, bgcolor: '#EFF6FF', color: '#1D4ED8' }}
          />
          <Chip
            icon={<RateReview sx={{ fontSize: '15px !important' }} />}
            label={`${items.length} câu tự luận cần chấm`}
            color={items.length > 0 ? 'warning' : 'success'}
            sx={{ fontWeight: 700, borderRadius: 1.2, px: 1 }}
          />
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ borderRadius: 1.5 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 1.5 }} />
          <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 1.5 }} />
        </Box>
      ) : items.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 1.5, border: '1px solid #E2E8F0', bgcolor: '#FFFFFF' }}>
          <AssignmentTurnedIn sx={{ fontSize: 52, color: '#10B981', mb: 1 }} />
          <Typography sx={{ color: '#0F172A', fontWeight: 800, fontSize: '1.2rem' }}>Tất cả bài thi đã được chấm hoàn tất!</Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>Hiện tại không có câu trả lời tự luận nào đang chờ chấm điểm.</Typography>
        </Paper>
      ) : !selectedExamId ? (
        /* MÀN HÌNH 1: DANH SÁCH CÁC ĐỀ THI CÓ BÀI TỰ LUẬN CHỜ CHẤM */
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Danh sách đề thi đang có bài tự luận cần chấm:
          </Typography>

          <Grid container spacing={2.5}>
            {groupedExams.map((g) => {
              const examTitle = g.exam?.title || `Đề thi #${g.examId.slice(0, 8)}`;
              const examDesc = g.exam?.description || 'Không có mô tả';

              return (
                <Grid size={{ xs: 12, md: 6 }} key={g.examId}>
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: 2,
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#2563EB',
                        boxShadow: '0 6px 16px rgba(37,99,235,0.08)',
                        transform: 'translateY(-2px)',
                      },
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                          <Avatar sx={{ bgcolor: '#EFF6FF', color: '#2563EB', width: 44, height: 44, borderRadius: 1.5 }}>
                            <School />
                          </Avatar>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1.05rem', lineHeight: 1.2 }}>
                              {examTitle}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>
                              Mã đề: #{g.examId.slice(0, 8)}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      <Typography variant="body2" sx={{ color: '#475569', mb: 2.5, minHeight: 40, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {examDesc}
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2.5, flexWrap: 'wrap' }}>
                        <Chip
                          icon={<RateReview sx={{ fontSize: '14px !important' }} />}
                          label={`${g.items.length} câu tự luận`}
                          color="warning"
                          size="small"
                          sx={{ fontWeight: 700, borderRadius: 1 }}
                        />
                        <Chip
                          icon={<Person sx={{ fontSize: '14px !important' }} />}
                          label={`${g.studentIds.size} thí sinh`}
                          size="small"
                          sx={{ bgcolor: '#F1F5F9', color: '#334155', fontWeight: 600, borderRadius: 1 }}
                        />
                      </Box>

                      <Button
                        variant="contained"
                        fullWidth
                        endIcon={<ArrowForward />}
                        onClick={() => setSelectedExamId(g.examId)}
                        sx={{
                          bgcolor: '#2563EB',
                          '&:hover': { bgcolor: '#1D4ED8' },
                          borderRadius: 1.2,
                          textTransform: 'none',
                          fontWeight: 700,
                          py: 1,
                        }}
                      >
                        Vào chấm bài đề này ({g.items.length})
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      ) : (
        /* MÀN HÌNH 2: GIAO DIỆN CHẤM BÀI TẬP TRUNG CHO ĐỀ THI ĐÃ CHỌN */
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {activeExamItems.length === 0 ? (
            <Paper elevation={0} sx={{ p: 5, textAlign: 'center', borderRadius: 1.5, border: '1px solid #E2E8F0', bgcolor: '#FFFFFF' }}>
              <CheckCircle sx={{ fontSize: 48, color: '#10B981', mb: 1 }} />
              <Typography sx={{ color: '#0F172A', fontWeight: 800, fontSize: '1.1rem' }}>
                Đã hoàn tất chấm điểm cho đề thi này!
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5, mb: 2 }}>
                Tất cả các câu tự luận của đề thi này đã được cho điểm.
              </Typography>
              <Button variant="outlined" onClick={() => setSelectedExamId(null)} startIcon={<ArrowBack />} sx={{ borderRadius: 1.2, textTransform: 'none', fontWeight: 700 }}>
                Quay lại danh sách đề thi
              </Button>
            </Paper>
          ) : (
            activeExamItems.map((item, idx) => {
              const k = key(item);
              const student = usersMap[item.user_id];
              const question = questionsMap[item.question_id];
              const displayName = student?.full_name || student?.username || `Thí sinh #${item.user_id?.slice(0, 8)}`;
              const username = student?.username || '';
              const email = student?.email || '';

              return (
                <Card
                  key={k}
                  elevation={0}
                  sx={{
                    borderRadius: 1.5,
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    overflow: 'hidden',
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    {/* Header: Student Info & Exam Badge */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2.5, pb: 2, borderBottom: '1px solid #F1F5F9' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 42, height: 42, bgcolor: '#2563EB', color: '#fff', fontWeight: 800, fontSize: '1rem', borderRadius: 1.5 }}>
                          {displayName.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                            {displayName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                            {email ? `${email} • ` : ''}@{username || item.user_id?.slice(0, 8)}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={`Bài #${idx + 1} / ${activeExamItems.length}`}
                          size="small"
                          sx={{ bgcolor: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', fontWeight: 700, borderRadius: 1 }}
                        />
                        <Chip
                          label={`Thang điểm: 0 - ${item.point_possible} đ`}
                          size="small"
                          sx={{ bgcolor: '#EFF6FF', color: '#2563EB', fontWeight: 700, borderRadius: 1 }}
                        />
                      </Box>
                    </Box>

                    {/* Question Prompt */}
                    <Box sx={{ mb: 2.5, p: 2, bgcolor: '#F8FAFC', borderRadius: 1.2, border: '1px solid #E2E8F0' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.8, color: '#2563EB' }}>
                        <Quiz sx={{ fontSize: 18 }} />
                        <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Đề bài / Câu hỏi tự luận:
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: '#0F172A', fontWeight: 600, whiteSpace: 'pre-wrap' }}>
                        {question?.content?.text || '(Nội dung câu hỏi)'}
                      </Typography>
                    </Box>

                    {/* Student Answer Box */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1 }}>
                        Bài làm của thí sinh:
                      </Typography>
                      {isImageAnswer(item.user_answer) ? (
                        <Box sx={{ p: 2, bgcolor: '#FFFFFF', borderRadius: 1.2, border: '1px solid #E2E8F0', display: 'inline-block', maxWidth: '100%' }}>
                          <img
                            src={item.user_answer as string}
                            alt="Ảnh chụp bài làm của thí sinh"
                            style={{ maxWidth: '100%', maxHeight: 450, borderRadius: 6, display: 'block' }}
                          />
                        </Box>
                      ) : (
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2.5,
                            bgcolor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: 1.2,
                            color: '#0F172A',
                            fontFamily: 'inherit',
                            whiteSpace: 'pre-wrap',
                            fontSize: '0.92rem',
                            lineHeight: 1.6,
                          }}
                        >
                          {item.user_answer || <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Thí sinh không nhập câu trả lời</span>}
                        </Paper>
                      )}
                    </Box>

                    {/* Grading Inputs */}
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap', pt: 2, borderTop: '1px solid #F1F5F9' }}>
                      <TextField
                        label={`Điểm (tối đa ${item.point_possible})`}
                        type="number"
                        size="small"
                        value={scores[k] ?? ''}
                        onChange={(e) => setScores({ ...scores, [k]: e.target.value })}
                        slotProps={{ htmlInput: { min: 0, max: item.point_possible, step: 0.25 } }}
                        sx={{ width: 200, '& .MuiOutlinedInput-root': { borderRadius: 1.2 } }}
                      />

                      <TextField
                        label="Nhận xét / Lời phê của giáo viên"
                        size="small"
                        fullWidth
                        value={notes[k] ?? ''}
                        onChange={(e) => setNotes({ ...notes, [k]: e.target.value })}
                        sx={{ flex: 1, minWidth: 260, '& .MuiOutlinedInput-root': { borderRadius: 1.2 } }}
                      />

                      <Button
                        variant="contained"
                        disabled={submitting === k}
                        onClick={() => handleSubmit(item)}
                        sx={{
                          bgcolor: '#2563EB',
                          '&:hover': { bgcolor: '#1D4ED8' },
                          borderRadius: 1.2,
                          textTransform: 'none',
                          fontWeight: 700,
                          px: 3,
                          py: 0.9,
                        }}
                      >
                        {submitting === k ? 'Đang lưu...' : 'Lưu điểm'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              );
            })
          )}
        </Box>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 1.5 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

