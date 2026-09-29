import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, CircularProgress, Container, Fade, Alert,
  Accordion, AccordionSummary, AccordionDetails, Chip,
} from '@mui/material';
import { CheckCircleOutlined, CancelOutlined, EmojiEvents, Home, ExpandMore, HourglassEmpty } from '@mui/icons-material';
import { gradingApi } from '../api/gradingApi';
import type { ExamResult } from '../api/gradingApi';
import { getExamById, getExamQuestions } from '../api/examApi';
import type { ExamQuestionDetail } from '../api/examApi';

const ResultSummary: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<any | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [passingScore, setPassingScore] = useState<number>(50);
  const [questionsMap, setQuestionsMap] = useState<Record<string, ExamQuestionDetail>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchResult = async (retryCount = 0) => {
      try {
        const res = await gradingApi.getExamResult(attemptId);
        if (cancelled) return;
        setResult(res);
        try {
          const [examData, questions] = await Promise.all([
            getExamById(res.exam_id),
            getExamQuestions(res.exam_id),
          ]);
          if (!cancelled) {
            setExam(examData);
            setPassingScore(examData.passing_score ?? 50);
            const map: Record<string, ExamQuestionDetail> = {};
            questions.forEach((q) => { map[q.question_id] = q; });
            setQuestionsMap(map);
          }
        } catch {
          // Fallback
        }
        setLoading(false);
      } catch (err: any) {
        if (retryCount < 8) {
          // Hệ thống đang chấm bài tự động bằng Celery, retry sau 1.2s
          setTimeout(() => {
            if (!cancelled) fetchResult(retryCount + 1);
          }, 1200);
        } else {
          if (!cancelled) {
            setError('Không thể tải kết quả. Vui lòng thử lại sau.');
            setLoading(false);
          }
        }
      }
    };

    fetchResult();
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', bgcolor: 'background.default' }} role="status" aria-busy="true">
        <CircularProgress size={60} thickness={4} color="primary" />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 10 }}>
        <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 4, border: '1px solid', borderColor: 'divider' }} role="alert">
          <CancelOutlined color="error" sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h5" color="error" gutterBottom>
            Đã xảy ra lỗi
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            {error}
          </Typography>
          <Button variant="contained" onClick={() => navigate('/dashboard')} startIcon={<Home />}>
            Về trang chủ
          </Button>
        </Paper>
      </Container>
    );
  }

  if (!result) {
    return (
      <Container maxWidth="sm" sx={{ mt: 10 }}>
        <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 4, border: '1px solid', borderColor: 'divider' }} role="status">
          <Typography variant="h5" color="text.secondary" gutterBottom>
            Không tìm thấy kết quả.
          </Typography>
          <Button variant="contained" sx={{ mt: 3 }} onClick={() => navigate('/dashboard')} startIcon={<Home />}>
            Về trang chủ
          </Button>
        </Paper>
      </Container>
    );
  }

  const formatUserAnswer = (qr: { question_id: string; user_answer: string }): string => {
    const q = questionsMap[qr.question_id];
    if (!qr.user_answer) return '(không trả lời)';
    if (!q) return qr.user_answer;

    const optionText = (id: string) => q.options.find((o) => o.id === id)?.text || id;

    if (q.type === 'multiple_choice' || q.type === 'true_false') {
      return optionText(qr.user_answer);
    }

    if (q.type === 'multiple_select') {
      try {
        const ids: string[] = JSON.parse(qr.user_answer);
        return ids.map(optionText).join(', ');
      } catch {
        return qr.user_answer;
      }
    }

    if (q.type === 'matching') {
      try {
        const pairs: [string, string][] = JSON.parse(qr.user_answer);
        return pairs.map(([l, r]) => `${optionText(l)} → ${optionText(r)}`).join('; ');
      } catch {
        return qr.user_answer;
      }
    }

    if (qr.user_answer.startsWith('data:image')) return '(đã nộp ảnh chụp bài làm)';
    return qr.user_answer;
  };

  const isEssayImageAnswer = (qr: { question_id: string; user_answer: string }) => {
    const q = questionsMap[qr.question_id];
    return q?.type === 'essay' && qr.user_answer?.startsWith('data:image');
  };

  const showResult = exam ? exam.show_result_after_submit !== false : true;
  const showAnswers = exam ? exam.show_answers_after_submit !== false : true;
  const passed = result.percentage >= passingScore;

  return (
    <Box sx={{ minHeight: '100vh', pt: 6, pb: 8, bgcolor: '#F8FAFC', display: 'flex', justifyContent: 'center' }}>
      <Container maxWidth="md">
        <Fade in={true} timeout={600}>
          <Paper
            sx={{
              p: { xs: 3, md: 5 },
              textAlign: 'center',
              borderRadius: 1.5,
              bgcolor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            {!showResult ? (
              <Box sx={{ py: 3 }}>
                <Box sx={{ mb: 2 }}>
                  <CheckCircleOutlined sx={{ fontSize: 72, color: '#10B981' }} aria-hidden="true" />
                </Box>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 800, color: '#0F172A' }}>
                  Bài thi đã được ghi nhận thành công!
                </Typography>
                <Typography variant="body1" sx={{ color: '#64748B', maxWidth: 520, mx: 'auto', mb: 4, lineHeight: 1.6 }}>
                  Cảm ơn bạn đã hoàn thành bài thi. Đề thi này được thiết lập bảo mật điểm số, kết quả sẽ được giáo viên / quản trị viên công bố sau khi kết thúc đợt thi.
                </Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ mb: 2 }}>
                  {passed ? (
                    <EmojiEvents sx={{ fontSize: 72, color: '#F59E0B' }} aria-hidden="true" />
                  ) : (
                    <CancelOutlined sx={{ fontSize: 72, color: '#EF4444' }} aria-hidden="true" />
                  )}
                </Box>
                <Typography variant="h4" gutterBottom color={passed ? '#10B981' : '#EF4444'} sx={{ fontWeight: 800 }}>
                  {passed ? 'Chúc mừng bạn đã hoàn thành xuất sắc!' : 'Rất tiếc, bạn chưa đạt yêu cầu!'}
                </Typography>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: '#0F172A' }}>
                  Điểm số: <Box component="span" sx={{ color: '#2563EB', fontSize: '1.4rem' }}>{result.score} / {result.total_possible}</Box>
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748B', mb: 3 }}>
                  Tỷ lệ chính xác: <span style={{ fontWeight: 700, color: '#0F172A' }}>{result.percentage}%</span> (Ngưỡng đạt: {passingScore}%)
                </Typography>

                {result.has_pending_manual_grading && (
                  <Alert severity="info" sx={{ mb: 3, textAlign: 'left', borderRadius: 1.5, bgcolor: '#EFF6FF', border: '1px solid #DBEAFE', color: '#1E40AF' }}>
                    Bài thi có câu tự luận đang chờ giáo viên chấm điểm — điểm số ở trên là điểm tạm tính, có thể thay đổi sau khi giáo viên chấm xong.
                  </Alert>
                )}

                {/* Bento Grid Stats */}
                {(() => {
                  const pendingCount = result.question_results?.filter((q: any) => q.needs_manual_grading).length || 0;
                  return (
                    <Box sx={{
                      display: 'grid',
                      gridTemplateColumns: pendingCount > 0 ? { xs: '1fr', sm: '1fr 1fr 1fr' } : { xs: '1fr', sm: '1fr 1fr' },
                      gap: 2,
                      my: 3,
                    }}>
                      <Box sx={{ p: 2, bgcolor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 1.5 }}>
                        <Typography variant="h4" sx={{ color: '#059669', fontWeight: 800, mb: 0.5 }}>
                          {result.correct_count}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#065F46', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          <CheckCircleOutlined fontSize="small" /> Câu trả lời đúng
                        </Typography>
                      </Box>

                      <Box sx={{ p: 2, bgcolor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 1.5 }}>
                        <Typography variant="h4" sx={{ color: '#DC2626', fontWeight: 800, mb: 0.5 }}>
                          {result.incorrect_count}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#991B1B', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          <CancelOutlined fontSize="small" /> Câu trả lời sai
                        </Typography>
                      </Box>

                      {pendingCount > 0 && (
                        <Box sx={{ p: 2, bgcolor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 1.5 }}>
                          <Typography variant="h4" sx={{ color: '#D97706', fontWeight: 800, mb: 0.5 }}>
                            {pendingCount}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#92400E', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <HourglassEmpty fontSize="small" /> Tự luận chờ chấm
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  );
                })()}
              </>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mt: 3 }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/student/results')}
                sx={{
                  py: 1.1,
                  px: 3,
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  borderRadius: 1.2,
                  textTransform: 'none',
                  borderColor: '#CBD5E1',
                  color: '#475569',
                }}
              >
                Xem lịch sử học tập
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate('/dashboard')}
                startIcon={<Home />}
                aria-label="Trở về bảng điều khiển"
                sx={{
                  py: 1.1,
                  px: 3.5,
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  borderRadius: 1.2,
                  textTransform: 'none',
                  bgcolor: '#2563EB',
                  '&:hover': { bgcolor: '#1D4ED8' },
                  boxShadow: '0 2px 6px rgba(37,99,235,0.2)',
                }}
              >
                Về bảng điều khiển
              </Button>
            </Box>
          </Paper>
        </Fade>

        {/* Chi tiết từng câu */}
        {showResult && showAnswers && result.question_results && result.question_results.length > 0 && Object.keys(questionsMap).length > 0 && (
          <Fade in={true} timeout={800}>
            <Paper sx={{ mt: 3.5, p: { xs: 2.5, md: 4 }, borderRadius: 1.5, border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', bgcolor: '#FFFFFF' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2.5, textAlign: 'left', color: '#0F172A' }}>
                Chi tiết đáp án từng câu hỏi
              </Typography>
              {result.question_results.map((qr, idx) => {
                const q = questionsMap[qr.question_id];
                return (
                  <Accordion key={qr.question_id} disableGutters sx={{ mb: 1, '&:before': { display: 'none' }, border: '1px solid #eee', borderRadius: '8px !important' }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', textAlign: 'left' }}>
                        {qr.needs_manual_grading ? (
                          <HourglassEmpty sx={{ color: '#F59E0B' }} fontSize="small" />
                        ) : qr.is_correct ? (
                          <CheckCircleOutlined sx={{ color: '#10B981' }} fontSize="small" />
                        ) : (
                          <CancelOutlined sx={{ color: '#EF4444' }} fontSize="small" />
                        )}
                        <Typography sx={{ flex: 1, fontWeight: 600 }}>
                          Câu {idx + 1}: {q?.content?.text ? (q.content.text.length > 60 ? q.content.text.slice(0, 60) + '…' : q.content.text) : '(không có nội dung)'}
                        </Typography>
                        <Chip
                          size="small"
                          label={qr.needs_manual_grading ? 'Chờ chấm' : `${qr.point_earned}/${qr.point_possible} điểm`}
                          color={qr.needs_manual_grading ? 'warning' : qr.is_correct ? 'success' : 'error'}
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ textAlign: 'left' }}>
                      <Typography sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>{q?.content?.text}</Typography>
                      {isEssayImageAnswer(qr) ? (
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Ảnh bài làm đã nộp:</Typography>
                          <img src={qr.user_answer} alt="Bài làm đã nộp" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Đáp án của bạn: <strong>{formatUserAnswer(qr)}</strong>
                        </Typography>
                      )}
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Paper>
          </Fade>
        )}
      </Container>
    </Box>
  );
};

export default ResultSummary;
