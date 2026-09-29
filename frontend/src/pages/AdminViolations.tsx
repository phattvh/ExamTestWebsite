import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, Button, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  Alert, Skeleton, TextField, InputAdornment, Avatar, Tooltip,
  Snackbar, MenuItem,
} from '@mui/material';
import {
  Folder, ArrowBack, Download, Delete, Search, Visibility,
  WarningAmber, Shield, CheckCircle, ImageNotSupported,
  AccessTime, Person, Refresh,
} from '@mui/icons-material';
import { adminApi } from '../api/adminApi';

interface ViolationSession {
  exam_id: string;
  exam_title: string;
  duration_minutes: number;
  first_violation_at: string;
  last_violation_at: string;
  total_violations: number;
  total_students: number;
  total_screenshots: number;
}

interface ViolationDetail {
  id: string;
  exam_id: string;
  exam_title: string;
  user_id: string;
  username: string;
  full_name: string;
  type: string;
  severity: string;
  timestamp: string;
  details?: any;
  screenshot_url?: string;
  device_info?: any;
  risk_score_at_event?: number;
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: '#FEE2E2', text: '#DC2626' },
  high: { bg: '#FFEDD5', text: '#EA580C' },
  medium: { bg: '#FEF3C7', text: '#D97706' },
  low: { bg: '#F1F5F9', text: '#475569' },
};

const VIOLATION_TYPE_NAMES: Record<string, string> = {
  tab_switch: 'Chuyển tab / Rời màn hình',
  window_blur: 'Mất tiêu điểm cửa sổ',
  multiple_faces: 'Phát hiện nhiều người trước camera',
  no_face: 'Không phát hiện khuôn mặt',
  looking_away: 'Quay đầu / Nhìn đi hướng khác',
  audio_detected: 'Phát hiện âm thanh bất thường',
  fullscreen_exit: 'Thoát chế độ toàn màn hình',
  suspicious_device: 'Phát hiện thiết bị đáng ngờ',
  risk_score_high: 'Cảnh báo mức độ rủi ro cao',
};

export default function AdminViolations() {
  const [sessions, setSessions] = useState<ViolationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSession, setSelectedSession] = useState<ViolationSession | null>(null);

  // Screen 2 Data
  const [details, setDetails] = useState<ViolationDetail[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  // Dialogs
  const [deleteSessionDialog, setDeleteSessionDialog] = useState<{ open: boolean; session: ViolationSession | null }>({
    open: false,
    session: null,
  });
  const [deleteViolationDialog, setDeleteViolationDialog] = useState<{ open: boolean; violation: ViolationDetail | null }>({
    open: false,
    violation: null,
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getViolationSessions();
      setSessions(data || []);
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch violation sessions:', err);
      setError('Không tải được danh mục hình ảnh vi phạm sau thi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const openSessionDetails = async (session: ViolationSession) => {
    setSelectedSession(session);
    setSearchTerm('');
    setSeverityFilter('');
    try {
      setLoadingDetails(true);
      const data = await adminApi.getViolationSessionDetails(session.exam_id);
      setDetails(data || []);
    } catch (err: any) {
      console.error('Failed to fetch session details:', err);
      setSnackbar({ open: true, message: 'Không tải được chi tiết vi phạm của bài thi này.', severity: 'error' });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDownloadImage = (v: ViolationDetail) => {
    if (!v.screenshot_url) return;
    const link = document.createElement('a');
    link.href = v.screenshot_url;
    const cleanName = (v.full_name || v.username).replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_');
    const timeStr = new Date(v.timestamp).toISOString().replace(/[:.]/g, '-');
    link.download = `ViPham_${cleanName}_${v.type}_${timeStr}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSnackbar({ open: true, message: 'Đang tải hình ảnh vi phạm về máy...', severity: 'success' });
  };

  const confirmDeleteSession = async () => {
    if (!deleteSessionDialog.session) return;
    try {
      await adminApi.deleteViolationSession(deleteSessionDialog.session.exam_id);
      setSessions((prev) => prev.filter((s) => s.exam_id !== deleteSessionDialog.session?.exam_id));
      if (selectedSession?.exam_id === deleteSessionDialog.session.exam_id) {
        setSelectedSession(null);
      }
      setSnackbar({ open: true, message: 'Đã xóa toàn bộ mục vi phạm của bài thi.', severity: 'success' });
    } catch (err: any) {
      console.error('Failed to delete violation session:', err);
      setSnackbar({ open: true, message: err?.response?.data?.detail || 'Xóa mục bài thi thất bại.', severity: 'error' });
    } finally {
      setDeleteSessionDialog({ open: false, session: null });
    }
  };

  const confirmDeleteViolation = async () => {
    if (!deleteViolationDialog.violation) return;
    try {
      await adminApi.deleteViolation(deleteViolationDialog.violation.id);
      setDetails((prev) => prev.filter((d) => d.id !== deleteViolationDialog.violation?.id));
      setSessions((prev) =>
        prev.map((s) => {
          if (s.exam_id === deleteViolationDialog.violation?.exam_id) {
            return {
              ...s,
              total_violations: Math.max(0, s.total_violations - 1),
              total_screenshots: deleteViolationDialog.violation?.screenshot_url
                ? Math.max(0, s.total_screenshots - 1)
                : s.total_screenshots,
            };
          }
          return s;
        })
      );
      setSnackbar({ open: true, message: 'Đã xóa ảnh/bản ghi vi phạm gian lận.', severity: 'success' });
    } catch (err: any) {
      console.error('Failed to delete violation:', err);
      setSnackbar({ open: true, message: err?.response?.data?.detail || 'Xóa hình vi phạm thất bại.', severity: 'error' });
    } finally {
      setDeleteViolationDialog({ open: false, violation: null });
    }
  };

  const filteredDetails = useMemo(() => {
    return details.filter((d) => {
      const term = searchTerm.toLowerCase().trim();
      const matchText =
        !term ||
        (d.full_name || '').toLowerCase().includes(term) ||
        (d.username || '').toLowerCase().includes(term) ||
        (d.user_id || '').toLowerCase().includes(term) ||
        (VIOLATION_TYPE_NAMES[d.type] || d.type).toLowerCase().includes(term);
      const matchSev = !severityFilter || d.severity === severityFilter;
      return matchText && matchSev;
    });
  }, [details, searchTerm, severityFilter]);

  const formatSessionTimeTitle = (s: ViolationSession) => {
    if (!s.first_violation_at) return `${s.exam_title}`;
    const start = new Date(s.first_violation_at);
    const end = s.last_violation_at ? new Date(s.last_violation_at) : start;
    const dateStr = start.toLocaleDateString('vi-VN');
    const startHour = start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const endHour = end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return `${s.exam_title} — ${dateStr} [${startHour} - ${endHour}]`;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* SCREEN 1: Danh sách các thư mục bài thi có ảnh vi phạm */}
      {!selectedSession ? (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Shield sx={{ color: '#2563EB' }} /> Quản lý Hình ảnh & Bằng chứng Gian lận Sau thi
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748B' }}>
                Hệ thống tự động lưu trữ ảnh chụp giám thị AI mỗi khi thí sinh vi phạm, phân chia theo từng bài thi và khung giờ thi.
              </Typography>
            </Box>

            <Button
              variant="outlined"
              size="small"
              startIcon={<Refresh sx={{ fontSize: 16 }} />}
              onClick={fetchSessions}
              sx={{ borderRadius: 1.2, textTransform: 'none', fontWeight: 600, borderColor: '#CBD5E1', color: '#334155' }}
            >
              Làm mới danh sách
            </Button>
          </Box>

          {error && <Alert severity="error" sx={{ borderRadius: 1.5 }}>{error}</Alert>}

          {loading ? (
            <Grid container spacing={2.5}>
              {[1, 2, 3, 4].map((n) => (
                <Grid size={{ xs: 12, md: 6 }} key={n}>
                  <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
                </Grid>
              ))}
            </Grid>
          ) : sessions.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 6,
                textAlign: 'center',
                borderRadius: 2,
                border: '1px dashed #CBD5E1',
                bgcolor: '#F8FAFC',
              }}
            >
              <CheckCircle sx={{ fontSize: 56, color: '#10B981', mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B' }}>
                Không có dữ liệu vi phạm nào
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
                Tất cả các ca thi gần đây đều diễn ra trung thực hoặc chưa phát sinh ảnh chụp cảnh báo.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2.5}>
              {sessions.map((session) => (
                <Grid size={{ xs: 12, md: 6 }} key={session.exam_id}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      border: '1px solid #E2E8F0',
                      bgcolor: '#FFFFFF',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#2563EB',
                        boxShadow: '0 4px 12px rgba(37,99,235,0.08)',
                      },
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: '#EFF6FF', color: '#2563EB', width: 44, height: 44, borderRadius: 1.5 }}>
                          <Folder />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
                            {session.exam_title}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                            <AccessTime sx={{ fontSize: 13 }} />
                            {session.first_violation_at
                              ? new Date(session.first_violation_at).toLocaleDateString('vi-VN') +
                                ' (' +
                                new Date(session.first_violation_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
                                ' - ' +
                                new Date(session.last_violation_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
                                ')'
                              : 'Chưa có mốc giờ'}
                          </Typography>
                        </Box>
                      </Box>

                      <Tooltip title="Xóa toàn bộ mục vi phạm bài thi">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteSessionDialog({ open: true, session })}
                          sx={{ bgcolor: '#FEF2F2', borderRadius: 1, '&:hover': { bgcolor: '#FEE2E2' } }}
                        >
                          <Delete sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    {/* Stats bar */}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={`${session.total_violations} lượt vi phạm`}
                        size="small"
                        sx={{ bgcolor: '#FEF2F2', color: '#DC2626', fontWeight: 700, borderRadius: 1 }}
                      />
                      <Chip
                        label={`${session.total_students} thí sinh`}
                        size="small"
                        sx={{ bgcolor: '#EFF6FF', color: '#2563EB', fontWeight: 700, borderRadius: 1 }}
                      />
                      <Chip
                        label={`${session.total_screenshots} hình ảnh chụp lại`}
                        size="small"
                        sx={{ bgcolor: '#F0FDF4', color: '#16A34A', fontWeight: 700, borderRadius: 1 }}
                      />
                    </Box>

                    {/* Open folder button */}
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<Visibility sx={{ fontSize: 16 }} />}
                      onClick={() => openSessionDetails(session)}
                      sx={{
                        bgcolor: '#2563EB',
                        '&:hover': { bgcolor: '#1D4ED8' },
                        borderRadius: 1.2,
                        textTransform: 'none',
                        fontWeight: 700,
                        py: 0.9,
                      }}
                    >
                      Mở xem thư viện ảnh vi phạm ({session.total_screenshots} ảnh)
                    </Button>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      ) : (
        /* SCREEN 2: Chi tiết các hình ảnh & sự kiện vi phạm của đợt thi */
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={() => setSelectedSession(null)}
                sx={{ borderRadius: 1.2, textTransform: 'none', fontWeight: 700, borderColor: '#CBD5E1', color: '#334155' }}
              >
                Quay lại danh mục
              </Button>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>
                  {formatSessionTimeTitle(selectedSession)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                  Tổng cộng {details.length} vi phạm • {details.filter((d) => d.screenshot_url).length} bằng chứng hình ảnh
                </Typography>
              </Box>
            </Box>

            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete sx={{ fontSize: 16 }} />}
              onClick={() => setDeleteSessionDialog({ open: true, session: selectedSession })}
              sx={{ borderRadius: 1.2, textTransform: 'none', fontWeight: 700 }}
            >
              Xóa cả mục bài thi này
            </Button>
          </Box>

          {/* Search & Severity Filters */}
          <Paper elevation={0} sx={{ p: 2, bgcolor: '#FFFFFF', borderRadius: 1.5, border: '1px solid #E2E8F0', display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Tìm theo tên học sinh, mã thí sinh, loại vi phạm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: '#64748B', fontSize: 19 }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ flex: 1, minWidth: 260, '& .MuiOutlinedInput-root': { borderRadius: 1.2 } }}
            />

            <TextField
              select
              size="small"
              label="Mức độ rủi ro"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: 1.2 } }}
            >
              <MenuItem value=""><em>Tất cả mức độ</em></MenuItem>
              <MenuItem value="critical">Nghiêm trọng (Critical)</MenuItem>
              <MenuItem value="high">Cao (High)</MenuItem>
              <MenuItem value="medium">Trung bình (Medium)</MenuItem>
              <MenuItem value="low">Thấp (Low)</MenuItem>
            </TextField>
          </Paper>

          {loadingDetails ? (
            <Grid container spacing={2.5}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={n}>
                  <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />
                </Grid>
              ))}
            </Grid>
          ) : filteredDetails.length === 0 ? (
            <Paper elevation={0} sx={{ p: 5, textAlign: 'center', borderRadius: 2, border: '1px dashed #CBD5E1', bgcolor: '#F8FAFC' }}>
              <Typography variant="body1" sx={{ fontWeight: 700, color: '#64748B' }}>
                Không tìm thấy bản ghi vi phạm phù hợp với bộ lọc.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2.5}>
              {filteredDetails.map((v) => {
                const sevStyle = SEVERITY_COLORS[v.severity] || SEVERITY_COLORS.low;
                const typeName = VIOLATION_TYPE_NAMES[v.type] || v.type;
                const timeFormatted = new Date(v.timestamp).toLocaleString('vi-VN');

                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={v.id}>
                    <Paper
                      elevation={0}
                      sx={{
                        borderRadius: 2,
                        border: '1px solid #E2E8F0',
                        bgcolor: '#FFFFFF',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: '#2563EB',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                        },
                      }}
                    >
                      {/* Image snapshot */}
                      <Box
                        sx={{
                          height: 200,
                          bgcolor: '#0F172A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        {v.screenshot_url ? (
                          <img
                            src={v.screenshot_url}
                            alt="Ảnh vi phạm"
                            onClick={() => setPreviewImage(v.screenshot_url || null)}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              cursor: 'pointer',
                            }}
                          />
                        ) : (
                          <Box sx={{ textAlign: 'center', color: '#94A3B8' }}>
                            <ImageNotSupported sx={{ fontSize: 40, mb: 0.5 }} />
                            <Typography variant="caption" sx={{ display: 'block' }}>
                              Không có ảnh chụp
                            </Typography>
                          </Box>
                        )}

                        <Chip
                          label={v.severity.toUpperCase()}
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            bgcolor: sevStyle.bg,
                            color: sevStyle.text,
                            fontWeight: 800,
                            fontSize: 10,
                            height: 22,
                            borderRadius: 1,
                          }}
                        />
                      </Box>

                      {/* Content details */}
                      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.2, flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Person sx={{ fontSize: 18, color: '#2563EB' }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A' }}>
                            {v.full_name || v.username}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ color: '#64748B', fontFamily: 'monospace', fontWeight: 600 }}>
                            Mã: {v.username}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: 0.4 }}>
                            <AccessTime sx={{ fontSize: 12 }} /> {timeFormatted}
                          </Typography>
                        </Box>

                        <Box sx={{ mt: 0.5, p: 1, bgcolor: '#F8FAFC', borderRadius: 1, border: '1px solid #E2E8F0' }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <WarningAmber sx={{ fontSize: 14 }} /> {typeName}
                          </Typography>
                        </Box>

                        {/* Action buttons */}
                        <Box sx={{ display: 'flex', gap: 1, mt: 'auto', pt: 1.5, borderTop: '1px solid #F1F5F9' }}>
                          {v.screenshot_url && (
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Download sx={{ fontSize: 14 }} />}
                              onClick={() => handleDownloadImage(v)}
                              sx={{ flex: 1, borderRadius: 1, textTransform: 'none', fontWeight: 700, fontSize: 12, borderColor: '#CBD5E1', color: '#334155' }}
                            >
                              Lưu ảnh về máy
                            </Button>
                          )}
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<Delete sx={{ fontSize: 14 }} />}
                            onClick={() => setDeleteViolationDialog({ open: true, violation: v })}
                            sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 700, fontSize: 12 }}
                          >
                            Xóa
                          </Button>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </>
      )}

      {/* Lightbox Preview Modal */}
      <Dialog
        open={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: '#000', p: 1, borderRadius: 2 } } }}
      >
        <DialogContent sx={{ p: 0, display: 'flex', justifyContent: 'center', bgcolor: '#000' }}>
          {previewImage && (
            <img
              src={previewImage}
              alt="Bằng chứng vi phạm"
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 2, py: 1 }}>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={() => {
              if (previewImage) {
                const link = document.createElement('a');
                link.href = previewImage;
                link.download = `BangChung_${Date.now()}.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            }}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#2563EB' }}
          >
            Tải ảnh gốc về máy
          </Button>
          <Button onClick={() => setPreviewImage(null)} sx={{ color: '#FFF', textTransform: 'none', fontWeight: 600 }}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Single Violation Dialog */}
      <Dialog
        open={deleteViolationDialog.open}
        onClose={() => setDeleteViolationDialog({ open: false, violation: null })}
        slotProps={{ paper: { sx: { borderRadius: 1.5, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'error.main' }}>Xác nhận xóa hình ảnh vi phạm</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn xóa bản ghi và hình ảnh vi phạm của thí sinh{' '}
            <strong>{deleteViolationDialog.violation?.full_name || deleteViolationDialog.violation?.username}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteViolationDialog({ open: false, violation: null })} sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}>
            Hủy
          </Button>
          <Button onClick={confirmDeleteViolation} color="error" variant="contained" sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 700 }}>
            Xác nhận xóa
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Exam Session Dialog */}
      <Dialog
        open={deleteSessionDialog.open}
        onClose={() => setDeleteSessionDialog({ open: false, session: null })}
        slotProps={{ paper: { sx: { borderRadius: 1.5, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'error.main' }}>Xác nhận xóa toàn bộ mục bài thi</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Hành động này sẽ xóa toàn bộ nhật ký vi phạm và tất cả ảnh chụp bằng chứng của bài thi{' '}
            <strong>{deleteSessionDialog.session?.exam_title}</strong>. Bạn có chắc chắn muốn tiếp tục?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteSessionDialog({ open: false, session: null })} sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}>
            Hủy
          </Button>
          <Button onClick={confirmDeleteSession} color="error" variant="contained" sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 700 }}>
            Xóa toàn bộ
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 1.5 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
