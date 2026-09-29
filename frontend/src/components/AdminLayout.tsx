import { useContext, type ReactNode } from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  Chip,
  Button,
  Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Article as ArticleIcon,
  ExitToApp as ExitToAppIcon,
  RateReview as RateReviewIcon,
  Assessment as AssessmentIcon,
  Category as CategoryIcon,
  School as SchoolIcon,
  AdminPanelSettings as AdminIcon,
  Launch as LaunchIcon,
  Person as PersonIcon,
  FiberManualRecord,
  PhotoLibrary as PhotoLibraryIcon,
  Bolt as BoltIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const SIDEBAR_W = 260;

const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên',
  teacher: 'Giáo viên',
  student: 'Học sinh',
};

const menuGroups = [
  {
    label: 'TỔNG QUAN',
    teacherLabel: 'TỔNG QUAN GIẢNG DẠY',
    items: [
      { text: 'Bảng điều khiển', icon: <DashboardIcon fontSize="small" />, path: '/admin/dashboard', roles: ['admin'] },
      { text: 'Báo cáo & Phân tích', icon: <AssessmentIcon fontSize="small" />, path: '/admin/reports', roles: ['admin', 'teacher'] },
    ],
  },
  {
    label: 'QUẢN LÝ THI CỬ',
    teacherLabel: 'QUẢN LÝ ĐỀ THI & CHẤM ĐIỂM',
    items: [
      { text: 'Quản lý Đề thi', icon: <AssignmentIcon fontSize="small" />, path: '/admin/exams', roles: ['admin', 'teacher'] },
      { text: 'Ngân hàng Câu hỏi', icon: <ArticleIcon fontSize="small" />, path: '/admin/questions', roles: ['admin', 'teacher'] },
      { text: 'Danh mục & Chủ đề', icon: <CategoryIcon fontSize="small" />, path: '/admin/categories', roles: ['admin', 'teacher'] },
      { text: 'Chấm bài tự luận', icon: <RateReviewIcon fontSize="small" />, path: '/admin/manual-grading', roles: ['admin', 'teacher'] },
      { text: 'Ảnh vi phạm sau thi', icon: <PhotoLibraryIcon fontSize="small" />, path: '/admin/violations', roles: ['admin', 'teacher'] },
      { text: 'VJP Pro (Siêu tốc)', icon: <BoltIcon fontSize="small" />, path: '/admin/vjp-pro', roles: ['admin', 'teacher'] },
    ],
  },
  {
    label: 'QUẢN TRỊ HỆ THỐNG',
    teacherLabel: 'QUẢN TRỊ HỆ THỐNG',
    items: [
      { text: 'Quản lý Người dùng', icon: <PeopleIcon fontSize="small" />, path: '/admin/users', roles: ['admin'] },
    ],
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useContext(AuthContext) as any;
  const user = auth?.user;
  const displayName = user?.full_name || user?.username || 'Người dùng';
  const role = user?.role || 'admin';
  const isTeacher = role === 'teacher';

  const handleLogout = () => {
    if (auth?.logout) auth.logout();
    navigate('/login');
  };

  const currentItem = menuGroups.flatMap((g) => g.items).find((i) => i.path === location.pathname);
  const currentTitle = currentItem?.text || (isTeacher ? 'Cổng Giáo Viên' : 'Trang Quản lý');

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F8FAFC' }}>
      {/* Sidebar - Modern Dark Slate */}
      <Box
        component="nav"
        sx={{
          width: SIDEBAR_W,
          flexShrink: 0,
          bgcolor: '#0F172A',
          color: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: '1px solid #1E293B',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        <Box>
          {/* Brand Logo Header */}
          <Box
            sx={{
              p: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #1E293B',
              cursor: 'pointer',
            }}
            onClick={() => navigate(isTeacher ? '/admin/exams' : '/admin/dashboard')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1.2,
                  bgcolor: isTeacher ? '#059669' : '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: '1rem',
                  boxShadow: isTeacher ? '0 2px 8px rgba(5, 150, 105, 0.4)' : '0 2px 8px rgba(37, 99, 235, 0.4)',
                }}
              >
                {isTeacher ? '🎓' : '✦'}
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#F8FAFC', lineHeight: 1.1 }}>
                  Exam<span style={{ color: isTeacher ? '#34D399' : '#38BDF8' }}>System</span>
                </Typography>
                <Typography sx={{ fontSize: '0.65rem', color: isTeacher ? '#6EE7B7' : '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {isTeacher ? 'Teacher Portal • Giáo Viên' : 'Admin Portal • Quản Trị'}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* User Profile Mini Banner */}
          <Box sx={{ p: 1.5, mx: 1.5, my: 1.5, bgcolor: '#1E293B', borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: role === 'admin' ? '#4F46E5' : '#10B981', color: '#fff', fontWeight: 800, fontSize: '0.85rem', borderRadius: 1 }}>
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {role === 'admin' ? <AdminIcon sx={{ fontSize: 13, color: '#818CF8' }} /> : <SchoolIcon sx={{ fontSize: 13, color: '#34D399' }} />}
                <Typography sx={{ fontSize: '0.68rem', color: role === 'admin' ? '#A5B4FC' : '#6EE7B7', fontWeight: 600 }}>
                  {ROLE_LABELS[role] || role}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Navigation Groups */}
          {menuGroups.map((group, gIdx) => {
            const items = group.items.filter((i) => i.roles.includes(role));
            if (items.length === 0) return null;
            return (
              <Box key={gIdx} sx={{ px: 1.5, mb: 2 }}>
                <Typography
                  variant="caption"
                  sx={{
                    px: 1.2,
                    mb: 0.8,
                    display: 'block',
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    color: isTeacher ? '#34D399' : '#64748B',
                    letterSpacing: 0.6,
                  }}
                >
                  {isTeacher && group.teacherLabel ? group.teacherLabel : group.label}
                </Typography>
                <List dense disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {items.map((item, iIdx) => {
                    const selected = location.pathname === item.path;
                    return (
                      <ListItemButton
                        key={iIdx}
                        onClick={() => navigate(item.path)}
                        sx={{
                          px: 1.5,
                          py: 0.8,
                          borderRadius: 1.2,
                          color: selected ? '#FFFFFF' : '#94A3B8',
                          bgcolor: selected ? (isTeacher ? '#059669 !important' : '#2563EB !important') : 'transparent',
                          fontWeight: selected ? 700 : 500,
                          '&:hover': {
                            bgcolor: selected ? (isTeacher ? '#047857' : '#1D4ED8') : '#1E293B',
                            color: '#FFFFFF',
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 30, color: selected ? '#FFFFFF' : '#64748B' }}>
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography sx={{ fontSize: '0.82rem', fontWeight: selected ? 700 : 500, color: 'inherit' }}>
                              {item.text}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              </Box>
            );
          })}
        </Box>

        {/* Sidebar Footer: Switch to student mode & Logout */}
        <Box sx={{ p: 1.5, borderTop: '1px solid #1E293B', bgcolor: '#0B1120' }}>
          <ListItemButton
            onClick={() => navigate('/dashboard')}
            sx={{
              px: 1.5,
              py: 0.8,
              borderRadius: 1.2,
              color: '#94A3B8',
              mb: 0.5,
              border: '1px solid #1E293B',
              '&:hover': { bgcolor: '#1E293B', color: '#38BDF8', borderColor: '#334155' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 28, color: 'inherit' }}>
              <LaunchIcon sx={{ fontSize: 16 }} />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'inherit' }}>
                  Giao diện Thí sinh
                </Typography>
              }
            />
          </ListItemButton>

          <ListItemButton
            onClick={handleLogout}
            sx={{
              px: 1.5,
              py: 0.8,
              borderRadius: 1.2,
              color: '#F87171',
              '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.12)', color: '#EF4444' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 28, color: '#F87171' }}>
              <ExitToAppIcon sx={{ fontSize: 16 }} />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'inherit' }}>
                  Đăng xuất
                </Typography>
              }
            />
          </ListItemButton>
        </Box>
      </Box>

      {/* Main Panel */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Top Header Bar */}
        <Box
          component="header"
          sx={{
            height: 60,
            bgcolor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            px: 3.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1rem' }}>
              {currentTitle}
            </Typography>
            <Chip
              icon={<FiberManualRecord sx={{ fontSize: '9px !important', color: (isTeacher ? '#059669 !important' : '#10B981 !important') }} />}
              label={isTeacher ? 'Cổng Giáo Viên • Trực tuyến' : 'Hệ thống trực tuyến'}
              size="small"
              sx={{
                bgcolor: isTeacher ? '#ECFDF5' : '#EFF6FF',
                color: isTeacher ? '#065F46' : '#1E40AF',
                fontWeight: 600,
                fontSize: '0.7rem',
                height: 22,
                borderRadius: 1,
                border: isTeacher ? '1px solid #A7F3D0' : '1px solid #BFDBFE',
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Tooltip title="Vào giao diện Thí sinh (Làm bài)">
              <Button
                variant="outlined"
                size="small"
                startIcon={<LaunchIcon sx={{ fontSize: 15 }} />}
                onClick={() => navigate('/dashboard')}
                sx={{
                  borderRadius: 1.2,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  borderColor: '#E2E8F0',
                  color: '#475569',
                  '&:hover': { borderColor: '#CBD5E1', bgcolor: '#F8FAFC' },
                }}
              >
                Giao diện Thí sinh
              </Button>
            </Tooltip>

            <Box
              onClick={() => navigate('/profile')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.5,
                bgcolor: '#F1F5F9',
                borderRadius: 1.2,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                '&:hover': { bgcolor: '#E2E8F0' },
              }}
            >
              <PersonIcon sx={{ fontSize: 17, color: '#64748B' }} />
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
                {user?.username}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Content Body */}
        <Box sx={{ p: 3.5, flexGrow: 1, overflowY: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

