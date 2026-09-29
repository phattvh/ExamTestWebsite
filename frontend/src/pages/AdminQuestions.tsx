import {
  Box, Button, Typography, Skeleton, Alert, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, DialogContentText,
  Snackbar, IconButton, Tooltip, Grid, Avatar, TextField,
  MenuItem, InputAdornment, Chip
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRowSelectionModel, GridRowId } from '@mui/x-data-grid';
import { useState, useEffect, useMemo } from 'react';
import { adminApi } from '../api/adminApi';
import {
  Delete as DeleteIcon, Add as AddIcon,
  Edit as EditIcon, Quiz,
  CheckCircleOutlined, EditNote, LinearScale, CloudUpload,
  Search as SearchIcon, Category as CategoryIcon, FolderOpen,
} from '@mui/icons-material';
import ManualQuestionDialog from '../components/ManualQuestionDialog';
import ExcelImportDialog from '../components/ExcelImportDialog';

// Shape thật trả về từ question_service (QuestionModel)
interface Question {
  id: string;
  _id?: string;
  content: { text: string };
  type: string;
  category_id?: string;
  metadata: { subject: string; difficulty: string; tags?: string[] };
  options?: any[];
  correct_answer?: any;
}

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'Trắc nghiệm 1 đáp án',
  multiple_select: 'Trắc nghiệm nhiều đáp án',
  true_false: 'Đúng / Sai',
  matching: 'Nối cột',
  essay: 'Tự luận',
};

const TYPE_COLORS: Record<string, string> = {
  multiple_choice: '#2563EB',
  multiple_select: '#7C3AED',
  true_false: '#059669',
  matching: '#D97706',
  essay: '#E11D48',
};

const AdminQuestions = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchAssignOpen, setBatchAssignOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState<string>('');
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({
    type: 'include',
    ids: new Set<GridRowId>(),
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const [qData, cData] = await Promise.all([
        adminApi.getQuestions(),
        adminApi.getCategories().catch(() => []),
      ]);
      setQuestions(qData || []);
      setCategories(cData || []);
      setError('');
    } catch (err) {
      console.error('Failed to fetch questions', err);
      setError('Không tải được ngân hàng câu hỏi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const stats = useMemo(() => {
    const total = questions.length;
    const mc = questions.filter((q) => q.type === 'multiple_choice' || q.type === 'multiple_select').length;
    const essay = questions.filter((q) => q.type === 'essay').length;
    const other = total - mc - essay;
    return { total, mc, essay, other };
  }, [questions]);

  const categoriesMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [categories]);

  // Danh sách câu hỏi sau khi tìm kiếm và lọc
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const term = searchTerm.toLowerCase().trim();
      const textMatch =
        !term ||
        (q.content?.text || '').toLowerCase().includes(term) ||
        (q.metadata?.subject || '').toLowerCase().includes(term) ||
        (q.metadata?.tags || []).some((t: string) => t.toLowerCase().includes(term));
      const catMatch = !selectedCategory || q.category_id === selectedCategory;
      const typeMatch = !selectedType || q.type === selectedType;
      return textMatch && catMatch && typeMatch;
    });
  }, [questions, searchTerm, selectedCategory, selectedType]);

  // Đảm bảo mỗi dòng có field id duy nhất
  const rows = useMemo(() => {
    return filteredQuestions.map((q) => ({
      ...q,
      id: String(q.id || q._id || ''),
    }));
  }, [filteredQuestions]);

  // Tính toán danh sách ID đã chọn tương thích với mọi chế độ selection của MUI DataGrid v9
  const selectedIds = useMemo<string[]>(() => {
    if (!rowSelectionModel) return [];
    if (Array.isArray(rowSelectionModel)) {
      return (rowSelectionModel as any[]).map(String);
    }
    if (rowSelectionModel.type === 'include') {
      return Array.from(rowSelectionModel.ids).map(String);
    } else if (rowSelectionModel.type === 'exclude') {
      const excluded = rowSelectionModel.ids;
      return rows.map((r) => r.id).filter((id) => !excluded.has(id));
    }
    return [];
  }, [rowSelectionModel, rows]);

  const handleOpenCreate = () => {
    setEditingQuestion(null);
    setCreateOpen(true);
  };

  const handleEditClick = (question: any) => {
    setEditingQuestion(question);
    setCreateOpen(true);
  };

  const handleSaveQuestion = async (payload: any) => {
    const qId = editingQuestion?.id || editingQuestion?._id;
    if (qId) {
      await adminApi.updateQuestion(qId, payload);
      setSnackbar({ open: true, message: 'Đã cập nhật câu hỏi thành công.', severity: 'success' });
    } else {
      await adminApi.createQuestion(payload);
      setSnackbar({ open: true, message: 'Đã thêm câu hỏi mới vào ngân hàng.', severity: 'success' });
    }
    setCreateOpen(false);
    setEditingQuestion(null);
    fetchQuestions();
  };

  const handleDeleteClick = (id: string) => {
    setDeleteDialog({ open: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      await adminApi.deleteQuestion(deleteDialog.id);
      setQuestions((prev) => prev.filter((q: any) => (q.id || q._id) !== deleteDialog.id));
      setRowSelectionModel((prev) => {
        if (Array.isArray(prev)) return prev.filter((id) => id !== deleteDialog.id) as any;
        const newIds = new Set(prev.ids);
        newIds.delete(deleteDialog.id as string);
        return { ...prev, ids: newIds };
      });
      setSnackbar({ open: true, message: 'Đã xoá câu hỏi.', severity: 'success' });
    } catch (err: any) {
      console.error('Failed to delete question', err);
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Xoá câu hỏi thất bại.', severity: 'error' });
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  // Xóa hàng loạt câu hỏi đã chọn
  const handleConfirmBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await adminApi.bulkDeleteQuestions(selectedIds);
      setQuestions((prev) => prev.filter((q: any) => !selectedIds.includes(q.id || q._id)));
      setRowSelectionModel({ type: 'include', ids: new Set() });
      setSnackbar({ open: true, message: `Đã xóa thành công ${selectedIds.length} câu hỏi.`, severity: 'success' });
    } catch (err: any) {
      console.error('Failed to batch delete questions', err);
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Xóa hàng loạt thất bại.', severity: 'error' });
    } finally {
      setBatchDeleteOpen(false);
    }
  };

  // Gán hàng loạt câu hỏi vào danh mục
  const handleConfirmBatchAssign = async () => {
    if (selectedIds.length === 0) return;
    try {
      await adminApi.bulkAssignCategory(selectedIds, targetCategory || null);
      setSnackbar({ open: true, message: `Đã gán ${selectedIds.length} câu hỏi vào danh mục thành công.`, severity: 'success' });
      setRowSelectionModel({ type: 'include', ids: new Set() });
      fetchQuestions();
    } catch (err: any) {
      console.error('Failed to batch assign category', err);
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Gán danh mục thất bại.', severity: 'error' });
    } finally {
      setBatchAssignOpen(false);
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'content',
      headerName: 'NỘI DUNG CÂU HỎI',
      flex: 3,
      minWidth: 300,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', width: '100%' }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {params.row.content?.text || ''}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'type',
      headerName: 'LOẠI CÂU HỎI',
      flex: 1.4,
      minWidth: 170,
      renderCell: (params) => {
        const color = TYPE_COLORS[params.value] || '#475569';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Typography variant="body2" sx={{ color: color, fontWeight: 700, fontSize: '0.85rem' }}>
              {TYPE_LABELS[params.value] || params.value}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: 'category_id',
      headerName: 'DANH MỤC',
      flex: 1.4,
      minWidth: 160,
      renderCell: (params) => {
        const catName = categoriesMap[params.value] || 'Chưa phân loại';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Chip
              label={catName}
              size="small"
              sx={{
                bgcolor: params.value ? '#EFF6FF' : '#F1F5F9',
                color: params.value ? '#1D4ED8' : '#64748B',
                fontWeight: 600,
                borderRadius: 1,
              }}
            />
          </Box>
        );
      },
    },
    {
      field: 'subject',
      headerName: 'MÔN HỌC',
      flex: 1.2,
      minWidth: 130,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2" sx={{ color: '#475569', fontWeight: 600 }}>
            {params.row.metadata?.subject || 'Chung'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: 'HÀNH ĐỘNG',
      width: 130,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1.2, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Tooltip title="Chỉnh sửa câu hỏi">
            <IconButton
              size="small"
              onClick={() => handleEditClick(params.row)}
              sx={{ bgcolor: '#EFF6FF', color: '#2563EB', borderRadius: 1.2, p: 0.8, '&:hover': { bgcolor: '#DBEAFE' } }}
            >
              <EditIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Xoá câu hỏi">
            <IconButton
              size="small"
              onClick={() => handleDeleteClick(params.row.id || params.row._id)}
              sx={{ bgcolor: '#FEF2F2', color: '#EF4444', borderRadius: 1.2, p: 0.8, '&:hover': { bgcolor: '#FEE2E2' } }}
            >
              <DeleteIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
            Ngân hàng Câu hỏi
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            Kho lưu trữ câu hỏi trắc nghiệm, tự luận, đúng/sai và nối cột. Hỗ trợ tìm kiếm, lọc theo danh mục và thao tác hàng loạt.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<CloudUpload sx={{ fontSize: 16 }} />}
            onClick={() => setImportDialogOpen(true)}
            sx={{ borderRadius: 1.2, textTransform: 'none', fontWeight: 600, borderColor: '#CBD5E1', color: '#334155' }}
          >
            Nhập từ Excel
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={handleOpenCreate}
            sx={{ bgcolor: '#2563EB', '&:hover': { bgcolor: '#1D4ED8' }, borderRadius: 1.2, textTransform: 'none', fontWeight: 700, px: 2 }}
          >
            Thêm câu hỏi mới
          </Button>
        </Box>
      </Box>

      {/* KPI Stats Strip */}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#EFF6FF', color: '#2563EB', width: 40, height: 40, borderRadius: 1 }}>
              <Quiz />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>TỔNG SỐ CÂU HỎI</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>{stats.total}</Typography>
            </Box>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#ECFDF5', color: '#059669', width: 40, height: 40, borderRadius: 1 }}>
              <CheckCircleOutlined />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>TRẮC NGHIỆM</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#059669' }}>{stats.mc}</Typography>
            </Box>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#FDF2F8', color: '#DB2777', width: 40, height: 40, borderRadius: 1 }}>
              <EditNote />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>TỰ LUẬN</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#DB2777' }}>{stats.essay}</Typography>
            </Box>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#FFFBEB', color: '#D97706', width: 40, height: 40, borderRadius: 1 }}>
              <LinearScale />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>ĐÚNG/SAI & NỐI CỘT</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#D97706' }}>{stats.other}</Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Bộ lọc & Thanh tìm kiếm */}
      <Paper elevation={0} sx={{ p: 2, bgcolor: '#FFFFFF', borderRadius: 1.5, border: '1px solid #E2E8F0', display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Tìm kiếm theo nội dung câu hỏi, môn học, thẻ tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#64748B', fontSize: 19 }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ flex: 1, minWidth: 260, '& .MuiOutlinedInput-root': { borderRadius: 1.2 } }}
        />

        <TextField
          select
          size="small"
          label="Lọc theo Danh mục"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: 1.2 } }}
        >
          <MenuItem value=""><em>Tất cả danh mục ({questions.length})</em></MenuItem>
          {categories.map((c) => (
            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Lọc theo Thể loại"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          sx={{ minWidth: 190, '& .MuiOutlinedInput-root': { borderRadius: 1.2 } }}
        >
          <MenuItem value=""><em>Tất cả thể loại</em></MenuItem>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <MenuItem key={k} value={k}>{v}</MenuItem>
          ))}
        </TextField>

        {(searchTerm || selectedCategory || selectedType) && (
          <Button
            size="small"
            onClick={() => { setSearchTerm(''); setSelectedCategory(''); setSelectedType(''); }}
            sx={{ textTransform: 'none', fontWeight: 600, color: '#64748B' }}
          >
            Đặt lại
          </Button>
        )}
      </Paper>

      {/* Thanh Thao Tác Hàng Loạt Khi Chọn Nhiều Câu Hỏi */}
      {selectedIds.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            px: 2.5,
            bgcolor: '#EFF6FF',
            borderRadius: 1.5,
            border: '1px solid #BFDBFE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Chip
              label={`Đã chọn ${selectedIds.length} câu hỏi`}
              color="primary"
              size="small"
              sx={{ fontWeight: 800, bgcolor: '#2563EB' }}
            />
            <Typography variant="body2" sx={{ color: '#1E40AF', fontWeight: 600 }}>
              Thao tác nhanh cho các câu hỏi đã chọn:
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.2 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<CategoryIcon sx={{ fontSize: 16 }} />}
              onClick={() => setBatchAssignOpen(true)}
              sx={{ bgcolor: '#2563EB', '&:hover': { bgcolor: '#1D4ED8' }, borderRadius: 1.2, textTransform: 'none', fontWeight: 700 }}
            >
              Gán vào danh mục
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="error"
              startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
              onClick={() => setBatchDeleteOpen(true)}
              sx={{ bgcolor: '#FFFFFF', borderRadius: 1.2, textTransform: 'none', fontWeight: 700 }}
            >
              Xóa {selectedIds.length} câu hỏi
            </Button>
          </Box>
        </Paper>
      )}

      {error && <Alert severity="error" sx={{ borderRadius: 1.5 }}>{error}</Alert>}

      {/* DataGrid Bảng Câu Hỏi */}
      <Paper
        elevation={0}
        sx={{
          height: 600,
          width: '100%',
          borderRadius: 1.5,
          border: '1px solid #E2E8F0',
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
            rows={rows}
            columns={columns}
            rowHeight={60}
            getRowId={(row) => row.id}
            checkboxSelection
            onRowSelectionModelChange={(newModel: GridRowSelectionModel) => {
              setRowSelectionModel(newModel);
            }}
            rowSelectionModel={rowSelectionModel}
            initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50, 100]}
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

      {/* Dialog Tạo/Sửa câu hỏi */}
      <ManualQuestionDialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); setEditingQuestion(null); }}
        onSave={handleSaveQuestion}
        initialQuestion={editingQuestion}
      />

      {/* Dialog Xóa 1 câu hỏi */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null })}
        slotProps={{ paper: { sx: { borderRadius: 1.5, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'error.main' }}>Xác nhận xoá câu hỏi</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn xoá câu hỏi này khỏi ngân hàng câu hỏi? Câu hỏi sẽ không còn xuất hiện trong các đề thi tạo mới.
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

      {/* Dialog Xóa Hàng Loạt Câu Hỏi */}
      <Dialog
        open={batchDeleteOpen}
        onClose={() => setBatchDeleteOpen(false)}
        slotProps={{ paper: { sx: { borderRadius: 1.5, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'error.main' }}>
          Xác nhận xoá hàng loạt ({selectedIds.length} câu hỏi)
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Hành động này sẽ xóa vĩnh viễn <strong>{selectedIds.length} câu hỏi</strong> đã chọn khỏi ngân hàng. Bạn có chắc chắn muốn tiếp tục?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBatchDeleteOpen(false)} sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}>
            Huỷ
          </Button>
          <Button onClick={handleConfirmBatchDelete} color="error" variant="contained" sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 700 }}>
            Xác nhận xóa {selectedIds.length} câu hỏi
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Gán Hàng Loạt Vào Danh Mục */}
      <Dialog
        open={batchAssignOpen}
        onClose={() => setBatchAssignOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 1.5, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1 }}>
          <FolderOpen sx={{ color: '#2563EB' }} /> Gán vào Danh mục
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <DialogContentText sx={{ mb: 2 }}>
            Chọn danh mục bạn muốn gán cho <strong>{selectedIds.length} câu hỏi</strong> đã chọn:
          </DialogContentText>
          <TextField
            select
            fullWidth
            label="Chọn Danh mục đích"
            value={targetCategory}
            onChange={(e) => setTargetCategory(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.2 } }}
          >
            <MenuItem value=""><em>-- Bỏ khỏi danh mục (Chưa phân loại) --</em></MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBatchAssignOpen(false)} sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}>
            Hủy
          </Button>
          <Button onClick={handleConfirmBatchAssign} variant="contained" sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 700, bgcolor: '#2563EB' }}>
            Áp dụng
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Import Excel */}
      <ExcelImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImportApi={adminApi.importQuestionsBulk}
        onImportSuccess={(count) => {
          setImportDialogOpen(false);
          fetchQuestions();
          setSnackbar({ open: true, message: `Đã nhập thành công ${count} câu hỏi từ Excel vào ngân hàng.`, severity: 'success' });
        }}
      />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 1.5 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminQuestions;
