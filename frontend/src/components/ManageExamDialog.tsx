import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  Tabs, Tab, List, ListItem, ListItemText, IconButton, TextField, MenuItem,
  Chip, Alert, Autocomplete, Divider, CircularProgress, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip,
} from '@mui/material';
import { Delete as DeleteIcon, RestartAlt as RestartAltIcon, FileDownload as FileDownloadIcon } from '@mui/icons-material';
import { adminApi } from '../api/adminApi';
import apiClient from '../api/apiClient';
import * as xlsx from 'xlsx';

interface ManageExamDialogProps {
  open: boolean;
  onClose: () => void;
  examId: string | null;
  examTitle?: string;
}

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'Trắc nghiệm 1 đáp án',
  multiple_select: 'Trắc nghiệm nhiều đáp án',
  true_false: 'Đúng/Sai',
  matching: 'Nối cột',
  essay: 'Tự luận',
};

function TabPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 3 }}>{children}</Box>;
}

export default function ManageExamDialog({ open, onClose, examId, examTitle }: ManageExamDialogProps) {
  const [tab, setTab] = useState(0);

  // Tab Câu hỏi
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [bank, setBank] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [genSubject, setGenSubject] = useState('');
  const [genCount, setGenCount] = useState(5);
  const [genTypes, setGenTypes] = useState<string[]>(['multiple_choice']);
  const [generating, setGenerating] = useState(false);
  const [manualAdd, setManualAdd] = useState<any>(null);

  // Tab Lịch thi
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');

  // Tab Thí sinh & Lượt thi (Attempts & Scores)
  const [attempts, setAttempts] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [resultsMap, setResultsMap] = useState<Record<string, any>>({});
  const [examDetails, setExamDetails] = useState<any>(null);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [error, setError] = useState('');

  const loadQuestionsTab = async () => {
    if (!examId) return;
    setLoadingQuestions(true);
    try {
      const [eq, bankData] = await Promise.all([
        adminApi.getExamQuestions(examId),
        adminApi.getQuestions(),
      ]);
      setExamQuestions(eq || []);
      setBank(bankData || []);
    } catch (err) {
      console.error('Failed to load exam questions', err);
      setError('Không tải được danh sách câu hỏi.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const loadSchedulesTab = async () => {
    if (!examId) return;
    setLoadingSchedules(true);
    try {
      const s = await adminApi.listExamSchedules(examId);
      setSchedules(s || []);
    } catch (err) {
      console.error('Failed to load schedules', err);
      setError('Không tải được lịch thi.');
    } finally {
      setLoadingSchedules(false);
    }
  };

  const loadAttemptsTab = async () => {
    if (!examId) return;
    setLoadingAttempts(true);
    try {
      const [attList, users, results, examInfo] = await Promise.all([
        adminApi.getExamAttempts(examId).catch(() => []),
        adminApi.getUsers().catch(() => []),
        apiClient.get(`/v1/results/exam/${examId}`).then((r) => r.data).catch(() => []),
        apiClient.get(`/v1/exams/${examId}`).then((r) => r.data).catch(() => null),
      ]);
      setAttempts(attList || []);
      setExamDetails(examInfo);
      const uMap: Record<string, any> = {};
      (users || []).forEach((u: any) => {
        uMap[String(u.id)] = u;
      });
      setUsersMap(uMap);

      const rMap: Record<string, any> = {};
      (results || []).forEach((r: any) => {
        if (r.attempt_id) rMap[String(r.attempt_id)] = r;
        if (r.user_id) rMap[String(r.user_id)] = r;
      });
      setResultsMap(rMap);
    } catch (err) {
      console.error('Failed to load attempts', err);
      setError('Không tải được danh sách lượt thi của thí sinh.');
    } finally {
      setLoadingAttempts(false);
    }
  };

  const handleExportExcel = () => {
    if (!attempts || attempts.length === 0) return;

    const dataRows = attempts.map((att, idx) => {
      const student = usersMap[att.user_id];
      const res = resultsMap[att.id] || resultsMap[att.user_id];
      const isSubmitted = att.status === 'submitted' || att.status === 'auto_submitted' || att.status === 'graded';
      const scoreStr = res ? `${res.score} / ${res.total_possible}` : (isSubmitted ? 'Đang chấm' : 'Chưa nộp');
      const percentStr = res ? `${res.percentage}%` : '—';
      const passingThreshold = examDetails?.passing_score ?? 50;
      const isPassed = res ? (res.percentage >= passingThreshold ? 'ĐẠT' : 'CHƯA ĐẠT') : '—';

      return {
        'STT': idx + 1,
        'Mã Lượt thi': att.id ? String(att.id).slice(0, 8) : '',
        'Họ và tên thí sinh': student?.full_name || student?.username || `@${att.user_id}`,
        'Tên đăng nhập (@username)': student?.username || '',
        'Email': student?.email || '',
        'Lần thi': `Lần ${att.attempt_number || 1}`,
        'Trạng thái': isSubmitted ? 'Đã nộp bài' : (att.status === 'in_progress' ? 'Đang làm' : (att.status === 'terminated' ? 'Đình chỉ' : att.status)),
        'Điểm số': scoreStr,
        'Tỷ lệ (%)': percentStr,
        'Kết quả': isPassed,
        'Thời gian bắt đầu': att.started_at ? formatDT(att.started_at) : '',
        'Thời gian nộp bài': att.submitted_at ? formatDT(att.submitted_at) : '',
      };
    });

    const worksheet = xlsx.utils.json_to_sheet(dataRows);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 26 },
      { wch: 18 },
      { wch: 26 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 14 },
      { wch: 22 },
      { wch: 22 },
    ];

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Ket_Qua_Thi');
    const safeTitle = (examTitle || 'de_thi').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
    xlsx.writeFile(workbook, `Ket_qua_${safeTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  useEffect(() => {
    if (open && examId) {
      setError('');
      setSuccessMsg('');
      loadQuestionsTab();
      loadSchedulesTab();
      loadAttemptsTab();
    }
  }, [open, examId]);

  const handleDeleteAttempt = async (attemptId: string, studentName: string) => {
    if (!examId) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xoá lượt thi này của thí sinh "${studentName}" để cho phép thí sinh vào thi lại?`)) return;
    try {
      await adminApi.deleteExamAttempt(examId, attemptId);
      setSuccessMsg(`Đã xoá lượt thi của "${studentName}". Thí sinh có thể vào thi lại ngay.`);
      loadAttemptsTab();
    } catch (err: any) {
      console.error('Failed to delete attempt', err);
      setError(err?.response?.data?.detail || 'Xoá lượt thi thất bại.');
    }
  };

  const existingIds = new Set(examQuestions.map((q) => String(q.question_id || q.id || '')));
  const availableBank = bank.filter((q) => !existingIds.has(String(q.id || q._id || '')));

  const handleAddManual = async () => {
    if (!examId || !manualAdd) return;
    try {
      await adminApi.addExamQuestion(examId, { question_id: manualAdd.id || manualAdd._id, point_value: 1 });
      setManualAdd(null);
      setError('');
      loadQuestionsTab();
    } catch (err: any) {
      console.error('Failed to add question', err);
      setError(err?.response?.data?.detail || 'Câu hỏi này đã có trong đề thi hoặc không thể thêm.');
    }
  };

  const handleRemoveQuestion = async (questionId: string) => {
    if (!examId) return;
    try {
      await adminApi.removeExamQuestion(examId, questionId);
      setExamQuestions((prev) => prev.filter((q) => (q.question_id || q.id) !== questionId));
    } catch (err) {
      console.error('Failed to remove question', err);
      setError('Xoá câu hỏi khỏi đề thất bại.');
    }
  };

  const handleGenerate = async () => {
    if (!examId || !genSubject.trim()) {
      setError('Vui lòng nhập môn học để tự động chọn câu hỏi.');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      await adminApi.generateExamQuestions(examId, {
        subject: genSubject,
        difficulty: 'medium',
        num_questions: genCount,
        question_types: genTypes,
      });
      loadQuestionsTab();
    } catch (err) {
      console.error('Failed to generate questions', err);
      setError('Tự động chọn câu hỏi thất bại — có thể ngân hàng câu hỏi không đủ số lượng phù hợp.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!examId || !newStart || !newEnd) {
      setError('Vui lòng chọn đầy đủ thời gian bắt đầu và kết thúc.');
      return;
    }
    try {
      await adminApi.addExamSchedule(examId, {
        start_time: new Date(newStart).toISOString(),
        end_time: new Date(newEnd).toISOString(),
      });
      setNewStart('');
      setNewEnd('');
      loadSchedulesTab();
    } catch (err) {
      console.error('Failed to add schedule', err);
      setError('Thêm lịch thi thất bại.');
    }
  };

  const handleRemoveSchedule = async (scheduleId: string) => {
    if (!examId) return;
    try {
      await adminApi.removeExamSchedule(examId, scheduleId);
      setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
    } catch (err) {
      console.error('Failed to remove schedule', err);
      setError('Xoá lịch thi thất bại.');
    }
  };

  const formatDT = (iso: string) => new Date(iso).toLocaleString('vi-VN');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth slotProps={{ paper: { sx: { borderRadius: 1.5 } } }}>
      <DialogTitle sx={{ fontWeight: 800, color: '#0F172A', pb: 1 }}>
        Quản lý đề thi{examTitle ? `: ${examTitle}` : ''}
      </DialogTitle>
      <DialogContent sx={{ minHeight: 450 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Câu hỏi trong đề" sx={{ fontWeight: 700, textTransform: 'none' }} />
          <Tab label="Lịch thi" sx={{ fontWeight: 700, textTransform: 'none' }} />
          <Tab label={`Thí sinh & Lượt thi (${attempts.length})`} sx={{ fontWeight: 700, textTransform: 'none' }} />
        </Tabs>

        {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 1.5 }} onClose={() => setError('')}>{error}</Alert>}
        {successMsg && <Alert severity="success" sx={{ mt: 2, borderRadius: 1.5 }} onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}

        <TabPanel value={tab} index={0}>
          {loadingQuestions ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            <>
              <Typography sx={{ fontWeight: 700, mb: 1, color: '#0F172A' }}>
                Câu hỏi hiện có trong đề ({examQuestions.length})
              </Typography>
              <List dense sx={{ maxHeight: 240, overflow: 'auto', border: '1px solid #E2E8F0', borderRadius: 1.5, mb: 3 }}>
                {examQuestions.length === 0 && (
                  <ListItem><ListItemText primary="Đề thi chưa có câu hỏi nào." /></ListItem>
                )}
                {examQuestions.map((q) => (
                  <ListItem
                    key={q.question_id || q.id}
                    secondaryAction={
                      <IconButton edge="end" color="error" onClick={() => handleRemoveQuestion(q.question_id || q.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    <Box sx={{ flex: 1, pr: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A' }}>
                        {q.content?.text || q.question_text || '(không có nội dung)'}
                      </Typography>
                      <Chip label={TYPE_LABELS[q.type] || q.type} size="small" sx={{ borderRadius: 1, mt: 0.5, height: 20, fontSize: '0.7rem' }} />
                    </Box>
                  </ListItem>
                ))}
              </List>

              <Divider sx={{ mb: 3 }} />

              <Typography sx={{ fontWeight: 700, mb: 1, color: '#0F172A' }}>Thêm câu hỏi thủ công từ ngân hàng</Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                <Autocomplete
                  options={availableBank}
                  getOptionLabel={(o) => o.content?.text || o.question_text || o.id || ''}
                  isOptionEqualToValue={(option, value) => String(option.id || option._id) === String(value.id || value._id)}
                  value={manualAdd}
                  onChange={(_e, v) => setManualAdd(v)}
                  sx={{ flex: 1 }}
                  renderInput={(params) => <TextField {...params} label="Chọn câu hỏi từ ngân hàng..." size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.2 } }} />}
                />
                <Button variant="contained" onClick={handleAddManual} disabled={!manualAdd} sx={{ borderRadius: 1.2, textTransform: 'none', bgcolor: '#2563EB', fontWeight: 700, px: 3 }}>
                  Thêm vào đề
                </Button>
              </Box>

              <Typography sx={{ fontWeight: 700, mb: 1, color: '#0F172A' }}>Tự động chọn ngẫu nhiên từ ngân hàng</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField label="Môn học / Chủ đề" size="small" value={genSubject} onChange={(e) => setGenSubject(e.target.value)} sx={{ width: 200, '& .MuiOutlinedInput-root': { borderRadius: 1.2 } }} />
                <TextField
                  select label="Loại câu hỏi" size="small" sx={{ width: 220 }}
                  value={genTypes[0] || 'multiple_choice'}
                  onChange={(e) => setGenTypes([e.target.value])}
                >
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                </TextField>
                <TextField
                  label="Số lượng" type="number" size="small" sx={{ width: 100 }}
                  value={genCount} onChange={(e) => setGenCount(Number(e.target.value))}
                />
                <Button variant="outlined" onClick={handleGenerate} disabled={generating} sx={{ borderRadius: 2, textTransform: 'none' }}>
                  {generating ? 'Đang chọn...' : 'Tự động chọn'}
                </Button>
              </Box>
            </>
          )}
        </TabPanel>

        <TabPanel value={tab} index={1}>
          {loadingSchedules ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            <>
              <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
                Nếu không đặt lịch nào, đề thi được mở bất cứ lúc nào (sau khi công bố). Nếu đặt ít nhất 1 khung giờ,
                học sinh chỉ có thể bắt đầu làm bài trong các khung giờ đó.
              </Alert>
              <List dense sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3 }}>
                {schedules.length === 0 && (
                  <ListItem><ListItemText primary="Chưa đặt khung giờ nào — đề thi đang mở tự do." /></ListItem>
                )}
                {schedules.map((s) => (
                  <ListItem
                    key={s.id}
                    secondaryAction={
                      <IconButton edge="end" color="error" onClick={() => handleRemoveSchedule(s.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    <ListItemText primary={`${formatDT(s.start_time)} → ${formatDT(s.end_time)}`} />
                  </ListItem>
                ))}
              </List>

              <Typography sx={{ fontWeight: 600, mb: 1 }}>Thêm khung giờ mới</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField
                  label="Bắt đầu" type="datetime-local" size="small" value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="Kết thúc" type="datetime-local" size="small" value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <Button variant="contained" onClick={handleAddSchedule} sx={{ borderRadius: 2, textTransform: 'none' }}>
                  Thêm khung giờ
                </Button>
              </Box>
            </>
          )}
        </TabPanel>

        <TabPanel value={tab} index={2}>
          {loadingAttempts ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip label={`Tổng lượt thi: ${attempts.length}`} size="small" sx={{ fontWeight: 700, bgcolor: '#EFF6FF', color: '#1D4ED8' }} />
                  <Chip label={`Đã có điểm: ${attempts.filter(a => resultsMap[a.id] || resultsMap[a.user_id]).length}`} size="small" sx={{ fontWeight: 700, bgcolor: '#ECFDF5', color: '#047857' }} />
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<FileDownloadIcon />}
                  onClick={handleExportExcel}
                  disabled={attempts.length === 0}
                  sx={{
                    bgcolor: '#059669',
                    '&:hover': { bgcolor: '#047857' },
                    borderRadius: 1.2,
                    textTransform: 'none',
                    fontWeight: 700,
                    px: 2,
                    py: 0.7,
                  }}
                >
                  Xuất Báo cáo Excel (.xlsx)
                </Button>
              </Box>

              {attempts.length === 0 ? (
                <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
                  <Typography color="text.secondary" sx={{ fontWeight: 600 }}>Chưa có thí sinh nào tham gia làm bài thi này.</Typography>
                </Paper>
              ) : (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2, maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#F8FAFC', width: '25%' }}>Thí sinh</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#F8FAFC', width: '8%' }}>Lần</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#F8FAFC', width: '12%' }}>Trạng thái</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#F8FAFC', width: '15%' }}>Điểm số</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#F8FAFC', width: '12%' }}>Đánh giá</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#F8FAFC', width: '14%' }}>Thời gian nộp</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#F8FAFC', width: '14%' }}>Thao tác</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {attempts.map((att) => {
                        const student = usersMap[att.user_id];
                        const studentName = student?.full_name || student?.username || `@${att.user_id}`;
                        const res = resultsMap[att.id] || resultsMap[att.user_id];
                        const isSubmitted = att.status === 'submitted' || att.status === 'auto_submitted' || att.status === 'graded';
                        const passingThreshold = examDetails?.passing_score ?? 50;
                        const isPassed = res ? res.percentage >= passingThreshold : null;

                        return (
                          <TableRow key={att.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            <TableCell sx={{ width: '25%' }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                                {studentName}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748B' }}>
                                {student?.email ? `${student.email} • ` : ''}@{student?.username || att.user_id}
                              </Typography>
                            </TableCell>
                            <TableCell align="center" sx={{ width: '8%' }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>
                                #{att.attempt_number || 1}
                              </Typography>
                            </TableCell>
                            <TableCell align="center" sx={{ width: '12%' }}>
                              <Chip
                                label={att.status === 'terminated' ? 'Đình chỉ' : isSubmitted ? 'Đã nộp' : att.status === 'in_progress' ? 'Đang thi' : att.status}
                                size="small"
                                color={att.status === 'terminated' ? 'error' : isSubmitted ? 'success' : 'warning'}
                                sx={{ fontWeight: 700, fontSize: '0.72rem', height: 22 }}
                              />
                            </TableCell>
                            <TableCell align="center" sx={{ width: '15%' }}>
                              {res ? (
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#1E293B' }}>
                                    {res.score} / {res.total_possible}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#2563EB', fontWeight: 700 }}>
                                    ({res.percentage}%)
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                                  {isSubmitted ? 'Đang chấm' : '—'}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="center" sx={{ width: '12%' }}>
                              {isPassed !== null ? (
                                <Chip
                                  label={isPassed ? 'ĐẠT' : 'CHƯA ĐẠT'}
                                  size="small"
                                  color={isPassed ? 'success' : 'error'}
                                  variant="outlined"
                                  sx={{ fontWeight: 800, fontSize: '0.7rem', height: 22 }}
                                />
                              ) : (
                                <Typography variant="caption" sx={{ color: '#94A3B8' }}>—</Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ width: '14%' }}>
                              <Typography variant="caption" sx={{ color: '#475569', display: 'block', fontWeight: 500 }}>
                                {att.submitted_at ? formatDT(att.submitted_at) : (att.started_at ? `Bắt đầu: ${formatDT(att.started_at)}` : '—')}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ width: '14%' }}>
                              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8, justifyContent: 'flex-end' }}>
                                <Tooltip title="Xoá lượt thi này để thí sinh vào làm bài lại">
                                  <Button
                                    variant="outlined"
                                    color="warning"
                                    size="small"
                                    startIcon={<RestartAltIcon sx={{ fontSize: 15 }} />}
                                    onClick={() => handleDeleteAttempt(att.id, studentName)}
                                    sx={{ borderRadius: 1.2, textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', px: 1.2, py: 0.3 }}
                                  >
                                    Thi lại
                                  </Button>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </TabPanel>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose} variant="contained" sx={{ borderRadius: 2, textTransform: 'none', px: 3, fontWeight: 700 }}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
}
