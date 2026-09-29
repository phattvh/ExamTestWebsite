import { useEffect, useState } from 'react';
import {
  Box, Button, Paper, Skeleton, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  DialogContentText, TextField, IconButton, Snackbar, Typography, Grid, Avatar, Tooltip,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, Category as CategoryIcon, Folder } from '@mui/icons-material';
import { adminApi } from '../api/adminApi';

interface Category {
  id: string;
  name: string;
  description?: string;
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<{ open: boolean; editing: Category | null }>({ open: false, editing: null });
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getCategories();
      setCategories(data || []);
      setError('');
    } catch (err) {
      console.error('Failed to fetch categories', err);
      setError('Không tải được danh mục câu hỏi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreate = () => {
    setName('');
    setDescription('');
    setDialog({ open: true, editing: null });
  };

  const openEdit = (cat: Category) => {
    setName(cat.name);
    setDescription(cat.description || '');
    setDialog({ open: true, editing: cat });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setSnackbar({ open: true, message: 'Vui lòng nhập tên danh mục.', severity: 'error' });
      return;
    }
    try {
      if (dialog.editing) {
        await adminApi.updateCategory(dialog.editing.id, { name, description });
        setSnackbar({ open: true, message: 'Đã cập nhật danh mục.', severity: 'success' });
      } else {
        await adminApi.createCategory({ name, description });
        setSnackbar({ open: true, message: 'Đã tạo danh mục mới.', severity: 'success' });
      }
      setDialog({ open: false, editing: null });
      fetchCategories();
    } catch (err: any) {
      console.error('Failed to save category', err);
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Lưu danh mục thất bại.', severity: 'error' });
    }
  };

  const confirmDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      await adminApi.deleteCategory(deleteDialog.id);
      setCategories((prev) => prev.filter((c) => c.id !== deleteDialog.id));
      setSnackbar({ open: true, message: 'Đã xoá danh mục.', severity: 'success' });
    } catch (err: any) {
      console.error('Failed to delete category', err);
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Xoá danh mục thất bại.', severity: 'error' });
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
            Danh mục & Chủ đề Câu hỏi
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            Phân loại ngân hàng câu hỏi theo môn học, chủ đề kiến thức để dễ dàng trích xuất và sinh đề thi.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          onClick={openCreate}
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
          Thêm danh mục mới
        </Button>
      </Box>

      {/* KPI Stats Strip */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Paper elevation={0} sx={{ p: 2, px: 3, borderRadius: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', display: 'inline-flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: '#EFF6FF', color: '#2563EB', width: 38, height: 38, borderRadius: 1 }}>
            <Folder sx={{ fontSize: 20 }} />
          </Avatar>
          <Box>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>TỔNG SỐ DANH MỤC</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{categories.length}</Typography>
          </Box>
        </Paper>
      </Box>

      {error && <Alert severity="error" sx={{ borderRadius: 1.5 }}>{error}</Alert>}

      {loading ? (
        <Grid container spacing={2.5}>
          {[1, 2, 3, 4].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Skeleton variant="rectangular" height={130} sx={{ borderRadius: 1.5 }} />
            </Grid>
          ))}
        </Grid>
      ) : categories.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 1.5, border: '1px solid #E2E8F0', bgcolor: '#FFFFFF' }}>
          <Folder sx={{ fontSize: 48, color: '#94A3B8', mb: 1 }} />
          <Typography sx={{ color: '#0F172A', fontWeight: 700 }}>Chưa có danh mục nào</Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>Bấm nút "Thêm danh mục mới" ở trên để phân loại câu hỏi.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {categories.map((cat, idx) => {
            const catId = String(cat.id || (cat as any)._id || `cat-${idx}`);
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={catId}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 1.5,
                    border: '1px solid #E2E8F0',
                    bgcolor: '#FFFFFF',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '100%',
                    minHeight: 140,
                    transition: 'all 0.15s ease',
                    '&:hover': { borderColor: '#2563EB', boxShadow: '0 4px 12px -2px rgba(37,99,235,0.1)' },
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        <Avatar sx={{ bgcolor: '#EFF6FF', color: '#2563EB', width: 36, height: 36, borderRadius: 1 }}>
                          <CategoryIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                          {cat.name}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 0.8 }}>
                        <Tooltip title="Chỉnh sửa">
                          <IconButton size="small" onClick={() => openEdit({ ...cat, id: catId })} sx={{ color: '#2563EB', p: 0.8, bgcolor: '#EFF6FF', borderRadius: 1.5, '&:hover': { bgcolor: '#DBEAFE' } }}>
                            <EditIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Xoá danh mục">
                          <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, id: catId })} sx={{ p: 0.8, bgcolor: '#FEF2F2', borderRadius: 1.5, '&:hover': { bgcolor: '#FEE2E2' } }}>
                            <DeleteIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    <Typography variant="body2" sx={{ color: '#64748B', mt: 1, lineHeight: 1.4 }}>
                      {cat.description || 'Chủ đề câu hỏi trong hệ thống kiểm tra.'}
                    </Typography>
                  </Box>

                  <Box sx={{ pt: 2, mt: 1, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: 'monospace' }}>
                      ID: #{catId.length > 8 ? catId.slice(0, 8) : catId}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, editing: null })}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 1.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A' }}>
          {dialog.editing ? 'Chỉnh sửa Danh mục' : 'Thêm Danh mục mới'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField
            label="Tên danh mục / Môn học"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            autoFocus
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
          />
          <TextField
            label="Mô tả danh mục (tuỳ chọn)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button onClick={() => setDialog({ open: false, editing: null })} sx={{ borderRadius: 1.2, textTransform: 'none', fontWeight: 600 }}>
            Huỷ
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{ bgcolor: '#2563EB', '&:hover': { bgcolor: '#1D4ED8' }, borderRadius: 1.2, textTransform: 'none', fontWeight: 700, px: 2.5 }}
          >
            Lưu danh mục
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Cascade Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null })}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 1.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'error.main' }}>Xoá danh mục & Câu hỏi</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#334155', lineHeight: 1.6 }}>
            ⚠️ <b>Cảnh báo:</b> Khi xoá danh mục này, <b>TOÀN BỘ câu hỏi thuộc danh mục</b> sẽ bị xoá vĩnh viễn khỏi ngân hàng câu hỏi.
            <br /><br />
            Hành động này không thể hoàn tác. Bạn có chắc chắn muốn tiếp tục?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button onClick={() => setDeleteDialog({ open: false, id: null })} sx={{ borderRadius: 1.2, textTransform: 'none', fontWeight: 600 }}>
            Huỷ
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained" sx={{ borderRadius: 1.2, textTransform: 'none', fontWeight: 700 }}>
            Xác nhận xoá tất cả
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 1.5 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
