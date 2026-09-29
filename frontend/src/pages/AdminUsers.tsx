import { Box, Button, Typography, Skeleton, Alert, Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField, DialogContentText, Chip, MenuItem, FormControlLabel, Switch, Snackbar, Grid, Avatar, IconButton, Tooltip } from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { adminApi } from '../api/adminApi';
import { 
  PersonAdd as PersonAddIcon, Delete as DeleteIcon, Edit as EditIcon, 
  People, School, AdminPanelSettings, CloudUpload,
} from '@mui/icons-material';
import ExcelUserImportDialog from '../components/ExcelUserImportDialog';

interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role: string;
  is_active: boolean;
}

interface CreateFormValues {
  username: string;
  email: string;
  full_name: string;
  password: string;
  role: string;
}

interface EditFormValues {
  role: string;
  is_active: boolean;
}

const ROLES = ['student', 'teacher', 'admin'];

const ROLE_LABELS: Record<string, string> = {
  student: 'Học sinh',
  teacher: 'Giáo viên',
  admin: 'Quản trị viên',
};

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [tempPasswordDialog, setTempPasswordDialog] = useState<{ open: boolean; username: string; password: string }>({ open: false, username: '', password: '' });
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const { control, handleSubmit, reset } = useForm<CreateFormValues>({
    defaultValues: { username: '', email: '', full_name: '', password: '', role: 'student' },
  });

  const { control: editControl, handleSubmit: handleEditSubmit, reset: resetEdit } = useForm<EditFormValues>({
    defaultValues: { role: 'student', is_active: true },
  });

  const stats = useMemo(() => {
    const total = users.length;
    const students = users.filter((u) => u.role === 'student').length;
    const teachers = users.filter((u) => u.role === 'teacher').length;
    const admins = users.filter((u) => u.role === 'admin').length;
    return { total, students, teachers, admins };
  }, [users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getUsers();
      setUsers(data || []);
      setError('');
    } catch (err) {
      console.error('Failed to fetch users', err);
      setError('Không tải được danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onSubmit = async (data: CreateFormValues) => {
    try {
      const newUser = await adminApi.createUser(data);
      setOpen(false);
      reset();
      if (newUser?.temp_password) {
        setTempPasswordDialog({ open: true, username: newUser.username, password: newUser.temp_password });
      } else {
        setSnackbar({ open: true, message: 'Đã tạo tài khoản mới.', severity: 'success' });
      }
      fetchUsers();
    } catch (err: any) {
      console.error('Failed to create user', err);
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Tạo tài khoản thất bại.', severity: 'error' });
    }
  };

  const handleEditClick = (user: User) => {
    setEditUser(user);
    resetEdit({ role: user.role, is_active: user.is_active });
  };

  const onEditSubmit = async (data: EditFormValues) => {
    if (!editUser) return;
    try {
      await adminApi.updateUser(editUser.id, data);
      setEditUser(null);
      setSnackbar({ open: true, message: 'Đã cập nhật thông tin tài khoản.', severity: 'success' });
      fetchUsers();
    } catch (err: any) {
      console.error('Failed to update user', err);
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Cập nhật thất bại.', severity: 'error' });
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteDialog({ open: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      await adminApi.deleteUser(deleteDialog.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteDialog.id));
      setSnackbar({ open: true, message: 'Đã xoá tài khoản thành công.', severity: 'success' });
    } catch (err: any) {
      console.error('Failed to delete user', err);
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Xoá tài khoản thất bại.', severity: 'error' });
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'username',
      headerName: 'NGƯỜI DÙNG',
      flex: 2.5,
      minWidth: 240,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, height: '100%' }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: params.row.role === 'admin' ? '#4F46E5' : params.row.role === 'teacher' ? '#059669' : '#2563EB', fontSize: '0.85rem', fontWeight: 800, borderRadius: 1 }}>
            {(params.row.username || 'U').charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
              {params.row.full_name || params.row.username}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontFamily: 'monospace', lineHeight: 1.2 }}>
              @{params.row.username}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'email',
      headerName: 'EMAIL',
      flex: 2,
      minWidth: 220,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'role',
      headerName: 'VAI TRÒ',
      flex: 1.2,
      minWidth: 150,
      renderCell: (params) => {
        const isAdm = params.value === 'admin';
        const isTch = params.value === 'teacher';
        const isProctor = params.value === 'proctor';
        const color = isAdm ? '#4F46E5' : isTch ? '#059669' : isProctor ? '#D97706' : '#2563EB';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, height: '100%' }}>
            {isAdm ? <AdminPanelSettings sx={{ fontSize: 16, color }} /> : isTch ? <School sx={{ fontSize: 16, color }} /> : <People sx={{ fontSize: 16, color }} />}
            <Typography variant="body2" sx={{ color, fontWeight: 700, fontSize: '0.85rem' }}>
              {ROLE_LABELS[params.value] || params.value}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: 'is_active',
      headerName: 'TRẠNG THÁI',
      flex: 1,
      minWidth: 130,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Chip
            label={params.value ? 'Hoạt động' : 'Tạm khoá'}
            size="small"
            color={params.value ? 'success' : 'default'}
            variant="outlined"
            sx={{ borderRadius: 1, fontWeight: 700, fontSize: '0.72rem' }}
          />
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: 'HÀNH ĐỘNG',
      width: 140,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1.2, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Tooltip title="Chỉnh sửa vai trò / trạng thái">
            <IconButton
              size="medium"
              onClick={() => handleEditClick(params.row)}
              sx={{ bgcolor: '#EFF6FF', color: '#2563EB', borderRadius: 1.5, p: 1, '&:hover': { bgcolor: '#DBEAFE' } }}
            >
              <EditIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Xoá tài khoản">
            <IconButton
              size="medium"
              onClick={() => handleDeleteClick(params.row.id)}
              sx={{ bgcolor: '#FEF2F2', color: '#EF4444', borderRadius: 1.5, p: 1, '&:hover': { bgcolor: '#FEE2E2' } }}
            >
              <DeleteIcon sx={{ fontSize: 18 }} />
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
            Quản trị Người dùng & Phân quyền
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            Quản lý danh sách tài khoản học sinh, giáo viên và thiết lập vai trò trong hệ thống.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<CloudUpload sx={{ fontSize: 16 }} />}
            onClick={() => setImportDialogOpen(true)}
            sx={{
              borderColor: '#CBD5E1',
              color: '#334155',
              bgcolor: '#FFFFFF',
              '&:hover': { bgcolor: '#F8FAFC', borderColor: '#94A3B8' },
              borderRadius: 1.2,
              textTransform: 'none',
              fontWeight: 700,
              px: 2,
              py: 0.9,
            }}
          >
            Nhập từ Excel
          </Button>

          <Button
            variant="contained"
            startIcon={<PersonAddIcon sx={{ fontSize: 16 }} />}
            onClick={() => setOpen(true)}
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
            Thêm người dùng mới
          </Button>
        </Box>
      </Box>

      {/* KPI Stats Strip */}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#EFF6FF', color: '#2563EB', width: 40, height: 40, borderRadius: 1 }}>
              <People />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>TỔNG NGƯỜI DÙNG</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>{stats.total}</Typography>
            </Box>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#ECFDF5', color: '#059669', width: 40, height: 40, borderRadius: 1 }}>
              <People />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>HỌC SINH</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#059669' }}>{stats.students}</Typography>
            </Box>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#F5F3FF', color: '#7C3AED', width: 40, height: 40, borderRadius: 1 }}>
              <School />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>GIÁO VIÊN</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#7C3AED' }}>{stats.teachers}</Typography>
            </Box>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#EEF2FF', color: '#4F46E5', width: 40, height: 40, borderRadius: 1 }}>
              <AdminPanelSettings />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>QUẢN TRỊ VIÊN</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#4F46E5' }}>{stats.admins}</Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {error && <Alert severity="error" sx={{ borderRadius: 1.5 }}>{error}</Alert>}

      {/* Main Table */}
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
            rows={users}
            columns={columns}
            rowHeight={64}
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

      {/* Create User Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 1.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A' }}>Thêm tài khoản mới</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <Controller
              name="username"
              control={control}
              rules={{ required: 'Tên đăng nhập là bắt buộc' }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Tên đăng nhập (username)"
                  fullWidth
                  required
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
              )}
            />
            <Controller
              name="email"
              control={control}
              rules={{ required: 'Email là bắt buộc' }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Email"
                  type="email"
                  fullWidth
                  required
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
              )}
            />
            <Controller
              name="full_name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Họ và tên"
                  fullWidth
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
              )}
            />
            <Controller
              name="password"
              control={control}
              rules={{ required: 'Mật khẩu là bắt buộc' }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Mật khẩu khởi tạo"
                  type="password"
                  fullWidth
                  required
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
              )}
            />
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Vai trò tài khoản"
                  fullWidth
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                >
                  {ROLES.map((role) => (
                    <MenuItem key={role} value={role}>{ROLE_LABELS[role] || role}</MenuItem>
                  ))}
                </TextField>
              )}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 0 }}>
            <Button onClick={() => setOpen(false)} sx={{ borderRadius: 1.2, textTransform: 'none', fontWeight: 600 }}>Huỷ</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#2563EB', '&:hover': { bgcolor: '#1D4ED8' }, borderRadius: 1.2, textTransform: 'none', fontWeight: 700, px: 2.5 }}>
              Tạo tài khoản
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={Boolean(editUser)}
        onClose={() => setEditUser(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 1.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A' }}>Chỉnh sửa tài khoản</DialogTitle>
        <form onSubmit={handleEditSubmit(onEditSubmit)}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <Typography variant="body2" sx={{ color: '#64748B' }}>
              Người dùng: <b>{editUser?.full_name || editUser?.username}</b>
            </Typography>
            <Controller
              name="role"
              control={editControl}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Vai trò"
                  fullWidth
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                >
                  {ROLES.map((role) => (
                    <MenuItem key={role} value={role}>{ROLE_LABELS[role] || role}</MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="is_active"
              control={editControl}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} color="primary" />}
                  label="Kích hoạt tài khoản"
                />
              )}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 0 }}>
            <Button onClick={() => setEditUser(null)} sx={{ borderRadius: 1.2, textTransform: 'none', fontWeight: 600 }}>Huỷ</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#2563EB', '&:hover': { bgcolor: '#1D4ED8' }, borderRadius: 1.2, textTransform: 'none', fontWeight: 700, px: 2.5 }}>
              Lưu thay đổi
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null })}
        slotProps={{ paper: { sx: { borderRadius: 1.5, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'error.main' }}>Xoá tài khoản</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn xoá tài khoản này? Người dùng sẽ không thể đăng nhập vào hệ thống nữa.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialog({ open: false, id: null })} sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}>Huỷ</Button>
          <Button onClick={confirmDelete} color="error" variant="contained" sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 700 }}>
            Xác nhận xoá
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={tempPasswordDialog.open} onClose={() => setTempPasswordDialog({ open: false, username: '', password: '' })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Đã tạo tài khoản thành công</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Gửi lại thông tin sau cho <strong>{tempPasswordDialog.username}</strong> — mật khẩu tạm chỉ hiện được 1 lần, hãy sao chép ngay:
          </DialogContentText>
          <Box sx={{ p: 2, bgcolor: '#F8FAFC', border: '1px dashed', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 700, letterSpacing: 1 }}>
              {tempPasswordDialog.password}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Người dùng sẽ được yêu cầu đổi mật khẩu ngay khi đăng nhập lần đầu.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            onClick={() => {
              navigator.clipboard?.writeText(tempPasswordDialog.password);
              setSnackbar({ open: true, message: 'Đã sao chép mật khẩu.', severity: 'success' });
            }}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Sao chép
          </Button>
          <Button onClick={() => setTempPasswordDialog({ open: false, username: '', password: '' })} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Import học sinh từ file Excel */}
      <ExcelUserImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImportSuccess={() => {
          fetchUsers();
        }}
        onImportApi={async (payloads) => {
          return await adminApi.importUsersBulk(payloads);
        }}
      />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminUsers;
