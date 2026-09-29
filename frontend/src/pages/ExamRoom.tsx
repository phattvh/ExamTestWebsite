import React, { useEffect, useCallback, useState, useContext, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, CircularProgress, Paper, Grid, Container,
  Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, TextField, InputAdornment, IconButton as MuiIconButton, Chip,
} from '@mui/material';
import { ErrorOutlined, WarningAmber as WarningIcon, Block as BlockIcon, Visibility, VisibilityOff, LockOutlined, VerifiedUser } from '@mui/icons-material';
import { useTimer } from '../hooks/useTimer';
import { useProctoring } from '../hooks/useProctoring';
import { useProctorStreamBroadcaster } from '../hooks/useProctorStreamBroadcaster';
import { useExamContext } from '../context/ExamContext';
import type { AnswerValue, Question } from '../context/ExamContext';
import QuestionPanel from '../components/QuestionPanel';
import Timer from '../components/Timer';
import ProctoringStatus from '../components/ProctoringStatus';
import { examApi } from '../api/examApi';
import { proctoringApi } from '../api/proctoringApi';
import { AuthContext } from '../context/AuthContext';

const ExamRoom: React.FC = () => {
  const { id: examId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const { state, setStatus, setQuestions, setAnswer, nextQuestion, prevQuestion, goToQuestion, setExamId, setAttemptId } = useExamContext();
  const { isActive, violationCount, videoRef, cameraReady, cameraError, cameraStream } = useProctoring(examId || '', state.attemptId || '');
  
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [saveAnswerError, setSaveAnswerError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  
  // Kỷ luật phòng thi từ Giám thị
  const [isBanned, setIsBanned] = useState(false);
  const [bannedReason, setBannedReason] = useState('');
  const [disciplinaryAlert, setDisciplinaryAlert] = useState<{ message: string; severity: 'warning' | 'error' | 'info' } | null>(null);
  const deductRef = useRef<((sec: number) => void) | null>(null);
  const processedActionsRef = useRef<Set<string>>(new Set());

  // Mật khẩu truy cập đề thi
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [enableProctoring, setEnableProctoring] = useState<boolean>(true);
  const pendingExamHasPassword = useRef(false);

  const handleProctorAction = useCallback((data: any) => {
    if (!data) return;
    if (data.action_id && processedActionsRef.current.has(data.action_id)) {
      return;
    }
    if (data.action_id) {
      processedActionsRef.current.add(data.action_id);
    }

    if (data.action === 'terminate') {
      setIsBanned(true);
      setBannedReason(data.reason || 'Vi phạm quy chế phòng thi nghiêm trọng.');
      setStatus('error');
    } else if (data.action === 'time_penalty') {
      const minutes = Number(data.penalty_minutes) || 5;
      if (deductRef.current) {
        deductRef.current(minutes * 60);
      }
      setDisciplinaryAlert({
        message: `⚠️ GIÁM THỊ PHẠT: Bạn vừa bị trừ ${minutes} phút thời gian làm bài! Lý do: ${data.reason || 'Vi phạm quy chế'}`,
        severity: 'warning',
      });
    } else if (data.action === 'score_penalty') {
      const percent = Number(data.penalty_percent) || 10;
      setDisciplinaryAlert({
        message: `⚠️ GIÁM THỊ PHẠT: Bài thi của bạn bị trừ trực tiếp ${percent}% tổng điểm! Lý do: ${data.reason || 'Vi phạm quy chế'}`,
        severity: 'error',
      });
    } else if (data.action === 'warning') {
      setDisciplinaryAlert({
        message: `🚨 CẢNH BÁO TỪ GIÁM THỊ: ${data.reason || 'Vui lòng tập trung làm bài và nhìn thẳng camera!'}`,
        severity: 'warning',
      });
    }
  }, [setStatus]);

  useProctorStreamBroadcaster(examId || '', cameraStream, handleProctorAction);

  // Tích hợp Chế độ Kiosk Lockdown & Quét Anti-cheat trên Electron Desktop Client
  useEffect(() => {
    if (!window.electronAPI) return;

    if (state.status === 'in_progress') {
      window.electronAPI.setKioskMode(true);

      // Định kỳ 5s quét và cưỡng chế tắt tiến trình gian lận ngầm (Discord, TeamViewer, UltraViewer, OBS, ...)
      const scanInterval = setInterval(async () => {
        try {
          const res = await window.electronAPI?.scanCheatProcesses();
          if (res && !res.clean && res.processes.length > 0) {
            const appNames = res.processes.map((p) => p.label).join(', ');
            setDisciplinaryAlert({
              message: `🚨 CẢNH BÁO: Hệ thống phát hiện và ĐÃ CƯỠNG CHẾ TẮT ứng dụng cấm (${appNames})!`,
              severity: 'error',
            });
            if (examId && state.attemptId) {
              proctoringApi.sendViolationEvent({
                exam_id: examId,
                exam_session_id: state.attemptId,
                type: 'multiple_faces_detected',
                severity: 'critical',
                details: { source: 'kiosk_anticheat_process_killed', apps: appNames },
              }).catch(() => {});
            }
          }
        } catch (e) {
          console.error('Error scanning processes:', e);
        }
      }, 5000);

      const unbindShortcut = window.electronAPI.onBlockedShortcut((data) => {
        setDisciplinaryAlert({
          message: `⚠️ HÀNH VI BỊ CẤM: Phím tắt [${data.shortcut}] đã bị khóa trong phòng thi!`,
          severity: 'warning',
        });
      });

      return () => {
        clearInterval(scanInterval);
        unbindShortcut();
        window.electronAPI?.setKioskMode(false);
      };
    } else {
      window.electronAPI.setKioskMode(false);
    }
  }, [state.status]);

  // Khóa nút Back trình duyệt khi đang làm bài thi
  useEffect(() => {
    if (state.status === 'in_progress') {
      window.history.pushState(null, '', window.location.href);
      const handlePopState = () => {
        window.history.pushState(null, '', window.location.href);
        alert('⚠️ BẠN ĐANG TRONG PHÒNG THI!\nKhông được phép quay lại trang trước khi chưa hoàn thành hoặc nộp bài thi.');
      };
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('popstate', handlePopState);
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [state.status]);

  const initExam = useCallback(async (password?: string) => {
    try {
      setStatus('joining');
      setExamId(examId || '');

      // Lấy thông tin đề thi để kiểm tra có yêu cầu mật khẩu không và kiểm tra bật proctoring không
      const examInfo = await examApi.getExamById(examId || '');
      setEnableProctoring(examInfo.enable_proctoring !== false);

      if (examInfo.has_password && !password) {
        pendingExamHasPassword.current = true;
        setPasswordDialogOpen(true);
        setStatus('idle');
        setIsJoining(false);
        return;
      }

      const [rawQuestions, attempt] = await Promise.all([
        examApi.getExamQuestions(examId || ''),
        examApi.startExam(examId || '', password)
      ]);

      const questions: Question[] = rawQuestions.map((q) => {
        const isMatching = q.type === 'matching';
        return {
          id: q.question_id,
          content: q.content?.text || '',
          type: q.type,
          options: isMatching ? [] : (q.options || []).map((o, idx) => ({ id: o.id || String(idx), text: o.text || (o as any).content || '' })),
          matching: isMatching
            ? {
                left: (q.options || []).filter((o) => o.id?.startsWith('L_')).map((o) => ({ id: o.id, text: o.text || (o as any).content || '' })),
                right: (q.options || []).filter((o) => o.id?.startsWith('R_')).map((o) => ({ id: o.id, text: o.text || (o as any).content || '' })),
              }
            : undefined,
          essayMode: q.type === 'essay' ? 'both' : undefined,
          media: {
            image: q.content?.image,
            video: (q.content as any)?.video,
            audio: (q.content as any)?.audio,
          },
        };
      });

      setPasswordDialogOpen(false);
      setPasswordInput('');
      setPasswordError('');
      setIsJoining(false);
      setQuestions(questions);
      setAttemptId(attempt.id);
      setExpiresAt(new Date(attempt.expires_at));
      setStatus('in_progress');
    } catch (err: any) {
      console.error('Failed to initialize exam:', err);
      setIsJoining(false);
      const detail = err?.response?.data?.detail;
      const detailStr = typeof detail === 'string' ? detail : '';
      // Mật khẩu sai — hiển thị lỗi trong dialog, không đóng
      if (err?.response?.status === 403 && (detailStr.includes('Mật khẩu') || detailStr.includes('password'))) {
        setPasswordError(detailStr || 'Mật khẩu không chính xác. Vui lòng thử lại.');
        setStatus('idle');
        return;
      }
      setInitError(detailStr || 'Không thể tải đề thi hoặc bắt đầu bài làm. Vui lòng kiểm tra lại kết nối.');
      setStatus('error');
    }
  }, [examId, setStatus, setExamId, setQuestions, setAttemptId]);

  useEffect(() => {
    if (examId) {
      initExam();
    }
  }, [examId, initExam]);

  const submitExam = useCallback(async () => {
    if (!state.attemptId) return;
    setConfirmSubmitOpen(false);
    setStatus('submitting');
    try {
      await examApi.submitExam(state.attemptId);
      navigate(`/${user?.role || 'student'}/result/${state.attemptId}`);
    } catch (err) {
      console.error('Failed to submit exam:', err);
      setStatus('error');
      alert('Không thể nộp bài. Vui lòng thử lại!');
    }
  }, [state.attemptId, setStatus, navigate, user]);

  const initialSecondsLeft = useMemo(() => {
    if (!expiresAt) return 0;
    const diff = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
  }, [expiresAt]);

  const { timeLeft, formattedTime, isWarning, deductSeconds } = useTimer(initialSecondsLeft, submitExam);
  deductRef.current = deductSeconds;

  const handleAnswerSelect = async (answer: AnswerValue) => {
    const currentQ = state.questions[state.currentQuestionIndex];
    if (currentQ && state.attemptId) {
      setAnswer(currentQ.id, answer);
      try {
        await examApi.saveAnswer(state.attemptId, currentQ.id, answer);
      } catch (err: any) {
        console.error('Failed to save answer:', err);
        setSaveAnswerError(
          err?.response?.data?.detail || 'Không thể lưu đáp án — kiểm tra kết nối mạng và thử chọn lại đáp án.'
        );
      }
    }
  };

  // Tính số câu hỏi chưa làm
  const unansweredCount = useMemo(() => {
    return state.questions.filter((q) => {
      const ans = state.answers[q.id];
      if (ans === undefined || ans === null || ans === '') return true;
      if (Array.isArray(ans) && ans.length === 0) return true;
      return false;
    }).length;
  }, [state.questions, state.answers]);

  const handleFinish = () => {
    setConfirmSubmitOpen(true);
  };

  if (passwordDialogOpen) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F8FAFC', p: 3 }}>
        <Dialog
          open={passwordDialogOpen}
          onClose={() => {}}
          maxWidth="xs"
          fullWidth
          slotProps={{ paper: { sx: { borderRadius: 2, p: 1 } } }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockOutlined sx={{ color: '#2563EB' }} /> Đề thi có bảo mật
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2, color: '#475569', fontSize: 14 }}>
              Đề thi này yêu cầu mật khẩu truy cập. Vui lòng nhập mật khẩu do giáo viên/giám thị cung cấp để bắt đầu thi.
            </DialogContentText>
            <TextField
              autoFocus
              fullWidth
              label="Mật khẩu truy cập"
              type={showPassword ? 'text' : 'password'}
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && passwordInput.trim() && !isJoining) { setIsJoining(true); initExam(passwordInput.trim()); } }}
              error={!!passwordError}
              helperText={passwordError || ' '}
              variant="outlined"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <MuiIconButton onClick={() => setShowPassword((v) => !v)} edge="end" size="small">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </MuiIconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => navigate(-1)} sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600, color: '#64748B' }}>
              Quay lại
            </Button>
            <Button
              variant="contained"
              disabled={!passwordInput.trim() || isJoining}
              onClick={() => { setIsJoining(true); initExam(passwordInput.trim()); }}
              sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 700, bgcolor: '#2563EB', '&:hover': { bgcolor: '#1D4ED8' } }}
            >
              {isJoining ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Bắt đầu thi'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  if (state.status === 'joining' || state.status === 'idle') {
    return (
      <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 2, bgcolor: 'background.default' }} role="status" aria-busy="true">
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" color="text.secondary">Đang chuẩn bị phòng thi...</Typography>
      </Box>
    );
  }

  if (isBanned) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', bgcolor: '#450a0a', p: 3 }}>
        <Paper
          elevation={0}
          sx={{
            p: 5,
            textAlign: 'center',
            borderRadius: 1.5,
            maxWidth: 520,
            width: '100%',
            border: '2px solid #ef4444',
            bgcolor: '#1c1917',
            color: '#f8fafc',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: 1.5,
              bgcolor: '#7f1d1d',
              color: '#fca5a5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <BlockIcon sx={{ fontSize: 44 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#ef4444', mb: 1.5 }}>
            BỊ CẤM THI / ĐUỔI THI
          </Typography>
          <Typography variant="body1" sx={{ color: '#e2e8f0', mb: 2, fontWeight: 600 }}>
            Bạn đã bị giám thị truất quyền làm bài và đình chỉ thi do vi phạm quy chế thi.
          </Typography>
          <Box sx={{ p: 2, bgcolor: '#292524', borderRadius: 1.5, mb: 4, border: '1px solid #44403c' }}>
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.5, textTransform: 'uppercase', fontWeight: 700 }}>
              Lý do xử lý kỷ luật:
            </Typography>
            <Typography variant="body2" sx={{ color: '#f87171', fontWeight: 700 }}>
              {bannedReason || 'Vi phạm quy chế phòng thi nghiêm trọng.'}
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="error"
            size="large"
            onClick={() => navigate('/dashboard')}
            sx={{
              fontWeight: 800,
              borderRadius: 1.5,
              py: 1.3,
              px: 4,
              textTransform: 'none',
            }}
          >
            Rời khỏi phòng thi
          </Button>
        </Paper>
      </Box>
    );
  }

  if (state.status === 'error') {
    const isCompleted = initError?.toLowerCase().includes('maximum attempts') || initError?.includes('lượt làm bài') || initError?.includes('already');
    const isBannedError = isBanned || initError?.includes('đình chỉ') || initError?.includes('cấm thi') || initError?.includes('kỷ luật');

    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', bgcolor: isBannedError ? '#1c1917' : '#F8FAFC', p: 3 }}>
        <Paper
          elevation={0}
          sx={{
            p: 5,
            textAlign: 'center',
            borderRadius: 1.5,
            maxWidth: 480,
            width: '100%',
            border: isBannedError ? '1px solid #7f1d1d' : '1px solid #E2E8F0',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            bgcolor: isBannedError ? '#0c0a09' : '#FFFFFF',
            color: isBannedError ? '#fff' : 'inherit',
          }}
        >
          {isBannedError ? (
            <>
              <Box
                sx={{
                  width: 68,
                  height: 68,
                  borderRadius: 2,
                  bgcolor: '#450a0a',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2.5,
                  border: '1px solid #7f1d1d',
                }}
              >
                <BlockIcon sx={{ fontSize: 36 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#f87171', mb: 1 }}>
                BẠN ĐÃ BỊ ĐÌNH CHỈ THI
              </Typography>
              <Typography variant="body2" sx={{ color: '#d6d3d1', mb: 3, lineHeight: 1.6 }}>
                Bạn đã bị giám thị truất quyền làm bài và đình chỉ thi đối với bài thi này do vi phạm kỷ luật phòng thi.
              </Typography>
              <Box sx={{ p: 2, bgcolor: '#1c1917', borderRadius: 1.2, mb: 4, border: '1px solid #292524', textAlign: 'left' }}>
                <Typography variant="caption" sx={{ color: '#a8a29e', display: 'block', mb: 0.5, textTransform: 'uppercase', fontWeight: 700 }}>
                  Thông báo từ giám thị:
                </Typography>
                <Typography variant="body2" sx={{ color: '#fca5a5', fontWeight: 700 }}>
                  {bannedReason || initError || 'Vi phạm quy chế phòng thi nghiêm trọng.'}
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="error"
                size="large"
                fullWidth
                onClick={() => navigate(`/${user?.role || 'student'}/exams`)}
                sx={{
                  fontWeight: 800,
                  borderRadius: 1.2,
                  py: 1.3,
                  textTransform: 'none',
                }}
              >
                Rời khỏi phòng thi
              </Button>
            </>
          ) : isCompleted ? (
            <>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 1.5,
                  bgcolor: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                  border: '1px solid #DBEAFE',
                }}
              >
                <Typography sx={{ fontSize: '1.8rem' }}>🎓</Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>
                Bạn đã tham gia kỳ thi này rồi
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748B', mb: 4, lineHeight: 1.6 }}>
                Bạn đã sử dụng hết số lượt làm bài cho phép cho đề thi này. Bạn có thể xem lại bảng điểm kết quả hoặc liên hệ giáo viên để được cấp thêm lượt thi lại.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/student/results')}
                  sx={{
                    bgcolor: '#2563EB',
                    color: '#fff',
                    fontWeight: 700,
                    borderRadius: 1.5,
                    py: 1.2,
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#1D4ED8' },
                  }}
                >
                  Xem kết quả thi của bạn
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate(`/${user?.role || 'student'}/exams`)}
                  sx={{
                    borderColor: '#E2E8F0',
                    color: '#475569',
                    fontWeight: 600,
                    borderRadius: 1.5,
                    py: 1.2,
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#F8FAFC' },
                  }}
                >
                  Quay lại danh sách kỳ thi
                </Button>
              </Box>
            </>
          ) : (
            <>
              <ErrorOutlined color="error" sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h5" color="error" sx={{ fontWeight: 800, mb: 1 }}>
                Không thể vào phòng thi
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
                {initError || 'Không thể tải hoặc nộp bài thi. Vui lòng kiểm tra lại kết nối.'}
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate(`/${user?.role || 'student'}/exams`)}
                sx={{
                  bgcolor: '#2563EB',
                  fontWeight: 700,
                  borderRadius: 1.5,
                  py: 1.2,
                  px: 4,
                  textTransform: 'none',
                }}
              >
                Quay lại danh sách kỳ thi
              </Button>
            </>
          )}
        </Paper>
      </Box>
    );
  }

  const currentQuestion = state.questions[state.currentQuestionIndex];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F8FAFC', display: 'flex', flexDirection: 'column', pb: 10 }}>
      {/* Zen Topbar */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          px: 3.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #E2E8F0',
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          bgcolor: '#FFFFFF',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', width: 20 }}>
            <Box sx={{ width: 9, height: 9, bgcolor: '#E53935', borderRadius: '2px' }} />
            <Box sx={{ width: 9, height: 9, bgcolor: '#2563EB', borderRadius: '2px' }} />
            <Box sx={{ width: 9, height: 9, bgcolor: '#FDD835', borderRadius: '2px' }} />
            <Box sx={{ width: 9, height: 9, bgcolor: '#10B981', borderRadius: '2px' }} />
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', display: { xs: 'none', sm: 'block' } }}>
            Phòng thi trực tuyến
          </Typography>
          {window.electronAPI && (
            <Chip
              icon={<VerifiedUser sx={{ fontSize: '14px !important', color: '#16A34A !important' }} />}
              label="Kiosk Anti-Cheat"
              size="small"
              sx={{
                bgcolor: '#DCFCE7',
                color: '#15803D',
                fontWeight: 700,
                fontSize: '0.72rem',
                borderRadius: 1,
                border: '1px solid #BBF7D0',
                height: 22,
              }}
            />
          )}
        </Box>

        {/* Center Timer */}
        <Timer timeLeft={timeLeft} isWarning={isWarning} formattedTime={formattedTime} />

        {/* Action Button */}
        <Button
          variant="contained"
          onClick={handleFinish}
          disabled={state.status === 'submitting'}
          aria-label="Nộp bài"
          sx={{
            bgcolor: '#10B981',
            '&:hover': { bgcolor: '#059669' },
            textTransform: 'none',
            borderRadius: 2.5,
            fontWeight: 700,
            px: 3,
            py: 0.9,
            boxShadow: '0 2px 6px rgba(16,185,129,0.2)',
          }}
        >
          {state.status === 'submitting' ? 'Đang nộp...' : 'Nộp bài thi'}
        </Button>
      </Paper>

      {/* Main Workspace */}
      <Container maxWidth="xl" sx={{ flexGrow: 1, py: 4 }}>
        <Grid container spacing={3.5}>
          {/* Question Panel Area */}
          <Grid size={{ xs: 12, lg: 8 }} sx={{ order: { xs: 2, lg: 1 } }}>
            {currentQuestion ? (
              <QuestionPanel
                question={currentQuestion}
                selectedAnswer={state.answers[currentQuestion.id] ?? (currentQuestion.type === 'multiple_select' || currentQuestion.type === 'matching' ? [] : '')}
                onSelectAnswer={handleAnswerSelect}
                questionIndex={state.currentQuestionIndex}
                totalQuestions={state.totalQuestions}
              />
            ) : (
              <Box sx={{ textAlign: 'center', p: 6 }}><Typography>Đang tải câu hỏi...</Typography></Box>
            )}

            <Box sx={{ mt: 3.5, display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                disabled={state.currentQuestionIndex === 0}
                onClick={prevQuestion}
                sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600, px: 3, borderColor: '#CBD5E1', color: '#475569' }}
              >
                ← Câu trước
              </Button>
              <Button
                variant="contained"
                disabled={state.currentQuestionIndex === state.totalQuestions - 1}
                onClick={nextQuestion}
                sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, px: 3, bgcolor: '#2563EB', '&:hover': { bgcolor: '#1D4ED8' } }}
              >
                Câu tiếp theo →
              </Button>
            </Box>
          </Grid>
          
          {/* Bento Matrix Question Navigator */}
          <Grid size={{ xs: 12, lg: 4 }} sx={{ order: { xs: 1, lg: 2 } }}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 3.5,
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                position: { lg: 'sticky' },
                top: 85,
                bgcolor: '#FFFFFF',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                  Mục lục câu hỏi
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                  Đã làm: {Object.values(state.answers).filter(a => Array.isArray(a) ? a.length > 0 : !!a).length} / {state.totalQuestions}
                </Typography>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', gap: 1.2, mb: 3 }} role="group" aria-label="Điều hướng câu hỏi">
                {state.questions.map((q, idx) => {
                  const ans = state.answers[q.id];
                  const answered = Array.isArray(ans) ? ans.length > 0 : !!ans;
                  const isCurrent = state.currentQuestionIndex === idx;
                  
                  let bgColor = '#F8FAFC';
                  let textColor = '#475569';
                  let borderColor = '#E2E8F0';

                  if (isCurrent) {
                    bgColor = '#2563EB';
                    textColor = '#FFFFFF';
                    borderColor = '#2563EB';
                  } else if (answered) {
                    bgColor = '#ECFDF5';
                    textColor = '#059669';
                    borderColor = '#A7F3D0';
                  }

                  return (
                    <Button
                      key={q.id}
                      onClick={() => goToQuestion(idx)}
                      sx={{
                        minWidth: 0,
                        height: 44,
                        borderRadius: 2,
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        p: 0,
                        bgcolor: bgColor,
                        color: textColor,
                        border: `1.5px solid ${borderColor}`,
                        '&:hover': {
                          bgcolor: isCurrent ? '#1D4ED8' : '#EFF6FF',
                          borderColor: '#2563EB',
                        },
                      }}
                      aria-label={`Đi tới câu hỏi ${idx + 1}`}
                      aria-current={isCurrent ? 'true' : 'false'}
                    >
                      {idx + 1}
                    </Button>
                  );
                })}
              </Box>

              {/* Status Legend */}
              <Box sx={{ pt: 2, borderTop: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: '#2563EB' }} />
                  <Typography variant="caption" sx={{ color: '#475569', fontWeight: 500 }}>Đang xem</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: '#ECFDF5', border: '1px solid #A7F3D0' }} />
                  <Typography variant="caption" sx={{ color: '#475569', fontWeight: 500 }}>Đã chọn đáp án</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }} />
                  <Typography variant="caption" sx={{ color: '#475569', fontWeight: 500 }}>Chưa trả lời</Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Floating PIP Camera (chỉ hiển thị khi đề thi bật chống gian lận) */}
      {enableProctoring && (
        <Box sx={{ position: 'fixed', bottom: 70, right: 20, zIndex: 1150, width: 160 }}>
          {cameraError ? (
            <Paper sx={{ p: 1.5, bgcolor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 2.5, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
              <Typography variant="caption" color="error.main" sx={{ fontWeight: 600 }}>{cameraError}</Typography>
            </Paper>
          ) : (
            <Paper sx={{ p: 0.6, borderRadius: 2.5, overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', bgcolor: '#FFFFFF' }}>
              <video
                ref={videoRef}
                muted
                playsInline
                aria-label="Camera giám sát thi (chỉ hiển thị cho bạn, không lưu hình ảnh)"
                style={{ width: '100%', borderRadius: 8, display: 'block', transform: 'scaleX(-1)', opacity: cameraReady ? 1 : 0.3 }}
              />
              <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#64748B', fontWeight: 600, mt: 0.5, fontSize: '0.7rem' }}>
                {cameraReady ? '● AI Giám sát ON' : 'Đang mở camera...'}
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* Bottom Status Pill */}
      <Paper
        elevation={0}
        sx={{
          p: 1.2,
          display: 'flex',
          justifyContent: 'center',
          borderTop: '1px solid #E2E8F0',
          position: 'fixed',
          bottom: 0,
          width: '100%',
          zIndex: 1200,
          bgcolor: '#FFFFFF',
        }}
      >
        {enableProctoring ? (
          <ProctoringStatus isActive={isActive} violationCount={violationCount} />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#059669' }}>
              🛡️ Đề thi tự do • Chế độ làm bài không yêu cầu camera giám sát
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Hộp thoại xác nhận nộp bài kèm cảnh báo câu chưa làm */}
      <Dialog
        open={confirmSubmitOpen}
        onClose={() => setConfirmSubmitOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 1.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: unansweredCount > 0 ? 'warning.dark' : '#0F172A', display: 'flex', alignItems: 'center', gap: 1 }}>
          {unansweredCount > 0 ? <WarningIcon color="warning" /> : null}
          {unansweredCount > 0 ? 'Cảnh báo chưa hoàn thành' : 'Xác nhận nộp bài'}
        </DialogTitle>
        <DialogContent>
          {unansweredCount > 0 ? (
            <DialogContentText sx={{ color: '#334155', lineHeight: 1.6 }}>
              Bạn còn <b>{unansweredCount}</b> trên tổng số <b>{state.questions.length}</b> câu hỏi chưa trả lời (hoặc chưa chọn đáp án).
              <br /><br />
              Bạn có chắc chắn muốn nộp bài thi ngay bây giờ không?
            </DialogContentText>
          ) : (
            <DialogContentText sx={{ color: '#334155', lineHeight: 1.6 }}>
              Bạn đã hoàn thành tất cả <b>{state.questions.length}</b> câu hỏi. Bạn có chắc chắn muốn nộp bài để kết thúc phiên thi không?
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button onClick={() => setConfirmSubmitOpen(false)} sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}>
            Làm tiếp
          </Button>
          <Button
            variant="contained"
            color={unansweredCount > 0 ? 'warning' : 'primary'}
            onClick={submitExam}
            sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 700 }}
          >
            {unansweredCount > 0 ? 'Vẫn nộp bài' : 'Xác nhận nộp bài'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Thông báo kỷ luật thời gian thực từ giám thị */}
      <Snackbar
        open={!!disciplinaryAlert}
        autoHideDuration={8000}
        onClose={() => setDisciplinaryAlert(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={disciplinaryAlert?.severity || 'warning'}
          variant="filled"
          onClose={() => setDisciplinaryAlert(null)}
          sx={{ width: '100%', borderRadius: 1.5, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
        >
          {disciplinaryAlert?.message}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!saveAnswerError}
        autoHideDuration={6000}
        onClose={() => setSaveAnswerError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setSaveAnswerError(null)} sx={{ width: '100%', borderRadius: 1 }}>
          {saveAnswerError}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ExamRoom;
