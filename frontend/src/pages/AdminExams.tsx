import {
  Box, Button, Typography, Skeleton, Alert, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, DialogContentText, TextField, Snackbar, Chip, Tooltip, IconButton, Grid, Avatar,
  FormControlLabel, Switch,
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { adminApi } from '../api/adminApi';
import {
  Visibility as VisibilityIcon, Delete as DeleteIcon, Add as AddIcon,
  Publish as PublishIcon, Settings as SettingsIcon, CheckCircle, Cancel,
  AccessTime, Assignment, Public, Description, Edit as EditIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ManageExamDialog from '../components/ManageExamDialog';

interface Exam {
  id: string;
  title: string;
  description?: string;
  status: string;
  duration_minutes: number;
  passing_score?: number;
  max_attempts?: number;
  is_public?: boolean;
  enable_proctoring?: boolean;
  show_result_after_submit?: boolean;
  show_answers_after_submit?: boolean;
}

interface ExamFormValues {
  title: string;
  description: string;
  duration_minutes: number;
  passing_score: number;
  max_attempts: number;
  show_result_after_submit: boolean;
  show_answers_after_submit: boolean;
  enable_proctoring: boolean;
  access_password: string;
}

const AdminExams = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [createOpen, setCreateOpen] = useState(false);
  const [editExam, setEditExam] = useState<Exam | null>(null);
  const [manageDialog, setManageDialog] = useState<{ open: boolean; examId: string | null; title?: string }>({ open: false, examId: null });
  const navigate = useNavigate();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<ExamFormValues>({
    defaultValues: {
      title: '',
      description: '',
      duration_minutes: 60,
      passing_score: 50,
      max_attempts: 1,
      show_result_after_submit: true,
      show_answers_after_submit: true,
      enable_proctoring: true,
      access_password: '',
    },
  });

  const fetchExams = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getExams();
      setExams(data || []);
      setError('');
    } catch (err) {
      console.error('Failed to fetch exams', err);
      setError('Không tải được danh sách đề thi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleOpenCreate = () => {
    setEditExam(null);
    reset({
      title: '',
      description: '',
      duration_minutes: 60,
      passing_score: 50,
      max_attempts: 1,
      show_result_after_submit: true,
      show_answers_after_submit: true,
      enable_proctoring: true,
      access_password: '',
    });
    setCreateOpen(true);
  };

  const handleOpenEdit = (exam: Exam) => {
    setEditExam(exam);
    reset({
      title: exam.title || '',
      description: exam.description || '',
      duration_minutes: exam.duration_minutes || 60,
      passing_score: exam.passing_score ?? 50,
      max_attempts: exam.max_attempts ?? 1,
      show_result_after_submit: exam.show_result_after_submit !== false,
      show_answers_after_submit: exam.show_answers_after_submit !== false,
      enable_proctoring: exam.enable_proctoring !== false,
      access_password: '',  // Never pre-fill password from server for security
    });
    setCreateOpen(true);
  };

  const onFormSubmit = async (data: ExamFormValues) => {
    try {
      if (editExam) {
        await adminApi.updateExam(editExam.id, data);
        setCreateOpen(false);
        setSnackbar({ open: true, message: 'Đã cập nhật thông tin đề thi thành công.', severity: 'success' });
        fetchExams();
      } else {
        const newExam = await adminApi.createExam({ ...data, is_public: true });
        setCreateOpen(false);
        reset();
        setSnackbar({ open: true, message: 'Đã tạo đề thi. Hãy thêm câu hỏi trước khi công bố.', severity: 'success' });
        fetchExams();
        if (newExam?.id) {
          setManageDialog({ open: true, examId: newExam.id, title: data.title });
        }
      }
    } catch (err: any) {
      console.error('Failed to save exam', err);
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Lưu thông tin đề thi thất bại.', severity: 'error' });
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteDialog({ open: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      await adminApi.deleteExam(deleteDialog.id);
      setExams((prev) => prev.filter((e) => e.id !== deleteDialog.id));
      setSnackbar({ open: true, message: 'Đã xoá đề thi.', severity: 'success' });
    } catch (err: any) {
      console.error('Failed to delete exam', err);
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Xoá đề thi thất bại.', severity: 'error' });
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await adminApi.publishExam(id);
      setSnackbar({ open: true, message: 'Đã công bố đề thi cho thí sinh làm bài.', severity: 'success' });
      fetchExams();
    } catch (err: any) {
      console.error('Failed to publish exam', err);
      const detail = err?.response?.data?.detail;
      setSnackbar({ open: true, message: detail || 'Công bố đề thi thất bại.', severity: 'error' });
    }
  };

  const handleUnpublish = async (id: string) => {
    try {
      await adminApi.unpublishExam(id);
      setSnackbar({ open: true, message: 'Đã chuyển đề thi về bản nháp.', severity: 'success' });
      fetchExams();
    } catch (err: any) {
      console.error('Failed to unpublish exam', err);
      const detail = err?.response?.data?.detail;
      setSnackbar({ open: true, message: detail || 'Gỡ công bố đề thi thất bại.', severity: 'error' });
    }
  };

  const stats = useMemo(() => {
    const published = exams.filter((e) => e.status === 'published').length;
    const drafts = exams.length - published;
    return { total: exams.length, published, drafts };
  }, [exams]);

  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: 'MÃ ĐỀ',
      width: 110,
      renderCell: (params) => (
        <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#64748B', fontSize: '0.8rem' }}>
          #{params.value?.slice(0, 8)}
        </Typography>
      ),
    },
    {
      field: 'title',
      headerName: 'TÊN ĐỀ THI & MÔ TẢ',
      flex: 3,
      minWidth: 260,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
          <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
            {params.value}
          </Typography>
          {params.row.description && (
            <Typography variant="caption" sx={{ color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 360 }}>
              {params.row.description}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'duration_minutes',
      headerName: 'THỜI LƯỢNG',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#334155' }}>
          <AccessTime sx={{ fontSize: 15, color: '#64748B' }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{params.value} phút</Typography>
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'TRẠNG THÁI',
      flex: 1.2,
      minWidth: 140,
      renderCell: (params) => {
        const isPublished = params.row.status === 'published';
        return (
          <Chip
            icon={isPublished ? <CheckCircle sx={{ fontSize: '14px !important' }} /> : <Cancel sx={{ fontSize: '14px !important' }} />}
            label={isPublished ? 'Đã công bố' : 'Bản nháp'}
            size="small"
            color={isPublished ? 'success' : 'default'}
            variant="outlined"
            sx={{ borderRadius: 1, fontWeight: 700, fontSize: '0.72rem' }}
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: 'THAO TÁC QUẢN TRỊ',
      flex: 2.8,
      minWidth: 380,
      align: 'right',
      headerAlign: 'right',
      sortable: false,
      renderCell: (params) => {
        const isPublished = params.row.status === 'published';
        return (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<SettingsIcon sx={{ fontSize: 15 }} />}
              onClick={() => setManageDialog({ open: true, examId: params.row.id, title: params.row.title })}
              sx={{
                borderRadius: 1.2,
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: '#2563EB',
                '&:hover': { bgcolor: '#1D4ED8' },
                fontSize: '0.78rem',
                px: 1.5,
              }}
            >
              Cấu trúc & Câu hỏi
            </Button>

            {!isPublished ? (
              <Button
                variant="contained"
                size="small"
                startIcon={<PublishIcon sx={{ fontSize: 15 }} />}
                onClick={() => handlePublish(params.row.id)}
                sx={{
                  borderRadius: 1.2,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  bgcolor: '#059669',
                  '&:hover': { bgcolor: '#047857' },
                  px: 1.5,
                }}
              >
                Công bố
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="warning"
                size="small"
                onClick={() => handleUnpublish(params.row.id)}
                sx={{ borderRadius: 1.2, textTransform: 'none', fontWeight: 700, fontSize: '0.78rem', px: 1.2 }}
              >
                Gỡ công bố
              </Button>
            )}

            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<VisibilityIcon sx={{ fontSize: 15 }} />}
              onClick={() => navigate(`/proctor/exam/${params.row.id}`)}
              sx={{ borderRadius: 1.2, textTransform: 'none', fontWeight: 700, fontSize: '0.78rem' }}
            >
              Giám sát
            </Button>

            <Tooltip title="Chỉnh sửa thông tin đề thi">
              <IconButton
                size="small"
                onClick={() => handleOpenEdit(params.row)}
                sx={{ bgcolor: '#EFF6FF', color: '#2563EB', borderRadius: 1, p: 0.7, '&:hover': { bgcolor: '#DBEAFE' } }}
              >
                <EditIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Xoá đề thi">
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDeleteClick(params.row.id)}
                sx={{ bgcolor: '#FEF2F2', borderRadius: 1, p: 0.7, '&:hover': { bgcolor: '#FEE2E2' } }}
              >
                <DeleteIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
            Quản lý Đề thi & Phòng thi
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            Khởi tạo đề thi, thiết lập ngân hàng câu hỏi, sinh đề tự động và giám sát thí sinh trong thời gian thực.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{
            bgcolor: '#2563EB',
            '&:hover': { bgcolor: '#1D4ED8' },
            borderRadius: 1.2,
            textTransform: 'none',
            fontWeight: 700,
            px: 2.5,
            py: 0.9,
          }}
        >
          Soạn đề thi mới
        </Button>
      </Box>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#EFF6FF', color: '#2563EB', width: 42, height: 42, borderRadius: 1 }}>
              <Assignment />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>TỔNG SỐ ĐỀ THI</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>{stats.total}</Typography>
            </Box>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#ECFDF5', color: '#10B981', width: 42, height: 42, borderRadius: 1 }}>
              <Public />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>ĐÃ CÔNG BỐ (PUBLIC)</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#10B981' }}>{stats.published}</Typography>
            </Box>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#F8FAFC', color: '#64748B', width: 42, height: 42, borderRadius: 1 }}>
              <Description />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>ĐANG LÀ BẢN NHÁP</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#475569' }}>{stats.drafts}</Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {error && <Alert severity="error" sx={{ borderRadius: 1.5 }}>{error}</Alert>}

      <Paper
        elevation={0}
        sx={{
          height: 600,
          width: '100%',
          borderRadius: 1.5,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.02)',
          overflow: 'hidden',
          bgcolor: '#FFFFFF',
        }}
      >
        {loading ? (
          <Box sx={{ p: 3 }}>
            <Skeleton variant="rectangular" height={50} sx={{ mb: 2, borderRadius: 1 }} />
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 1 }} />
          </Box>
        ) : (
          <DataGrid
            rows={exams}
            columns={columns}
            rowHeight={68}
            slots={{ toolbar: GridToolbar }}
            slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 500 } } }}
            initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
              '& .MuiDataGrid-cell:focus': { outline: 'none' },
              '& .MuiDataGrid-columnHeaders': { bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontWeight: 800, fontSize: '0.8rem', color: '#475569' },
            }}
          />
        )}
      </Paper>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 1.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A' }}>
          {editExam ? 'Chỉnh sửa thông tin đề thi' : 'Soạn đề thi mới'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
              <Controller
                name="title"
                control={control}
                rules={{ required: 'Tiêu đề là bắt buộc' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Tiêu đề đề thi"
                    variant="outlined"
                    fullWidth
                    required
                    error={!!errors.title}
                    helperText={errors.title?.message}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                  />
                )}
              />

              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Mô tả đề thi"
                    variant="outlined"
                    multiline
                    rows={2}
                    fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                  />
                )}
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Controller
                  name="duration_minutes"
                  control={control}
                  rules={{ required: 'Thời lượng là bắt buộc', min: { value: 1, message: 'Tối thiểu 1 phút' } }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="number"
                      label="Thời lượng (phút)"
                      variant="outlined"
                      fullWidth
                      required
                      error={!!errors.duration_minutes}
                      helperText={errors.duration_minutes?.message}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                    />
                  )}
                />

                <Controller
                  name="passing_score"
                  control={control}
                  rules={{ min: { value: 0, message: 'Tối thiểu 0%' }, max: { value: 100, message: 'Tối đa 100%' } }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="number"
                      label="Ngưỡng đạt (%)"
                      variant="outlined"
                      fullWidth
                      error={!!errors.passing_score}
                      helperText={errors.passing_score?.message}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                    />
                  )}
                />
              </Box>

              <Controller
                name="access_password"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="password"
                    label="Mật khẩu truy cập (để trống = không yêu cầu)"
                    variant="outlined"
                    fullWidth
                    autoComplete="new-password"
                    helperText="Nếu đặt mật khẩu, thí sinh phải nhập đúng mới bắt đầu được thi."
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                  />
                )}
              />

              <Controller
                name="enable_proctoring"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} color="primary" />}
                    label={<Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A' }}>Kích hoạt Giám thị AI & Chống gian lận (Camera, phát hiện khuôn mặt, rời tab)</Typography>}
                  />
                )}
              />

              <Controller
                name="show_result_after_submit"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} color="primary" />}
                    label={<Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A' }}>Hiển thị điểm số & kết quả cho thí sinh ngay sau khi nộp</Typography>}
                  />
                )}
              />

              <Controller
                name="show_answers_after_submit"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} color="primary" />}
                    label={<Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A' }}>Cho phép xem lại chi tiết câu hỏi & đáp án sau khi nộp</Typography>}
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 0 }}>
            <Button onClick={() => setCreateOpen(false)} sx={{ borderRadius: 1.2, textTransform: 'none', fontWeight: 600 }}>
              Huỷ
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{ bgcolor: '#2563EB', '&:hover': { bgcolor: '#1D4ED8' }, borderRadius: 1.2, textTransform: 'none', fontWeight: 700, px: 3 }}
            >
              {editExam ? 'Lưu thay đổi' : 'Tạo đề thi'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null })}
        slotProps={{ paper: { sx: { borderRadius: 1.5, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'error.main' }}>Xoá đề thi</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn xoá đề thi này? Toàn bộ kết quả và lượt làm bài của thí sinh liên quan sẽ không thể hoàn tác.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialog({ open: false, id: null })} sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}>
            Huỷ
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained" sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 700 }}>
            Xác nhận xoá
          </Button>
        </DialogActions>
      </Dialog>

      <ManageExamDialog
        open={manageDialog.open}
        examId={manageDialog.examId}
        examTitle={manageDialog.title}
        onClose={() => {
          setManageDialog({ open: false, examId: null });
          fetchExams();
        }}
      />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 1.5 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminExams;
