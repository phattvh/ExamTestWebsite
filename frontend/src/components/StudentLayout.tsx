import { useContext, useMemo, type ReactNode } from 'react';
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
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  HistoryEdu as HistoryEduIcon,
  Videocam as VideocamIcon,
  Lock as LockIcon,
  ExitToApp as ExitToAppIcon,
  Person as PersonIcon,
  VerifiedUser,
  School,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const SIDEBAR_W = 260;

const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên',
  teacher: 'Giáo viên',
  student: 'Học sinh',
};

export default function StudentLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useContext(AuthContext) as any;
  const user = auth?.user;
  const displayName = user?.full_name || user?.username || 'Thí sinh';

  const menuGroups = useMemo(() => {
    const groups = [
      {
        label: 'THI CỬ & HỌC TẬP',
        items: [
          { text: 'Danh sách đề thi', icon: <AssignmentIcon fontSize="small" />, path: '/dashboard' },
          { text: 'Kết quả & Lịch sử', icon: <HistoryEduIcon fontSize="small" />, path: '/student/results' },
        ],
      },
      {
        label: 'CÁ NHÂN & CÔNG CỤ',
        items: [
          { text: 'Đổi mật khẩu', icon: <LockIcon fontSize="small" />, path: '/change-password' },
          { text: 'Kiểm tra Camera', icon: <VideocamIcon fontSize="small" />, path: '/student/camera-test' },
        ],
      },
    ];

    if (user?.role === 'admin') {
      groups.push({
        label: 'QUẢN TRỊ HỆ THỐNG',
        items: [
          { text: 'Bảng điều khiển Admin', icon: <VerifiedUser fontSize="small" />, path: '/admin/dashboard' },
        ],
      });
    } else if (user?.role === 'teacher') {
      groups.push({
        label: 'CỔNG GIẢNG DẠY',
        items: [
          { text: 'Quản lý Đề & Chấm thi', icon: <School fontSize="small" />, path: '/admin/exams' },
        ],
      });
    }

    return groups;
  }, [user?.role]);

  const handleLogout = () => {
    if (auth?.logout) auth.logout();
    navigate('/login');
  };

  const currentItem = menuGroups.flatMap((g) => g.items).find((i) => i.path === location.pathname);
  const currentTitle = currentItem?.text || 'Hệ thống Thi Trực tuyến';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F8FAFC' }}>
      {/* Sidebar */}
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
          {/* Brand Logo */}
          <Box
            sx={{
              p: 2.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1.2,
              borderBottom: '1px solid #1E293B',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/dashboard')}
          >
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: 1.2,
                bgcolor: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: '1rem',
              }}
            >
              ✦
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#F8FAFC', lineHeight: 1.1 }}>
                Exam<span style={{ color: '#38BDF8' }}>System</span>
              </Typography>
              <Typography sx={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>
                Thi & Giám sát trực tuyến
              </Typography>
            </Box>
          </Box>

          {/* Navigation Groups */}
          <Box sx={{ p: 2 }}>
            {menuGroups.map((group, gIdx) => (
              <Box key={gIdx} sx={{ mb: 2.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    px: 1.5,
                    mb: 1,
                    display: 'block',
                    color: '#64748B',
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    fontSize: '0.68rem',
                  }}
                >
                  {group.label}
                </Typography>
                <List disablePadding>
                  {group.items.map((item, iIdx) => {
                    const active = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/student/exams');
                    return (
                      <ListItemButton
                        key={iIdx}
                        onClick={() => navigate(item.path)}
                        sx={{
                          borderRadius: 1.2,
                          mb: 0.5,
                          px: 1.5,
                          py: 0.9,
                          bgcolor: active ? '#2563EB' : 'transparent',
                          color: active ? '#FFFFFF' : '#94A3B8',
                          fontWeight: active ? 700 : 500,
                          '&:hover': {
                            bgcolor: active ? '#1D4ED8' : '#1E293B',
                            color: '#F8FAFC',
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 32,
                            color: active ? '#FFFFFF' : '#64748B',
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography sx={{ fontSize: '0.84rem', fontWeight: active ? 700 : 500, color: 'inherit' }}>
                              {item.text}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              </Box>
            ))}
          </Box>
        </Box>

        {/* User Card & Logout in Footer */}
        <Box sx={{ p: 2, borderTop: '1px solid #1E293B', bgcolor: '#0B1120' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1.5 }}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: '#2563EB', fontSize: '0.82rem', fontWeight: 700, borderRadius: 1 }}>
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ overflow: 'hidden' }}>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#F8FAFC', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {displayName}
              </Typography>
              <Chip
                label={ROLE_LABELS[user?.role] || user?.role || 'Học sinh'}
                size="small"
                sx={{ height: 18, fontSize: '0.62rem', bgcolor: '#1E293B', color: '#93C5FD', fontWeight: 600, borderRadius: 0.8 }}
              />
            </Box>
          </Box>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            startIcon={<ExitToAppIcon sx={{ fontSize: 16 }} />}
            onClick={handleLogout}
            sx={{
              borderColor: '#334155',
              color: '#EF4444',
              borderRadius: 1.2,
              textTransform: 'none',
              fontSize: '0.78rem',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#EF4444',
                bgcolor: 'rgba(239, 68, 68, 0.08)',
              },
            }}
          >
            Đăng xuất
          </Button>
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        {/* Top Header */}
        <Box
          component="header"
          sx={{
            height: 60,
            px: 3.5,
            bgcolor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1rem' }}>
            {currentTitle}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              onClick={() => navigate('/profile')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.6,
                bgcolor: '#F1F5F9',
                borderRadius: 1.2,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                '&:hover': { bgcolor: '#E2E8F0' },
              }}
            >
              <PersonIcon sx={{ fontSize: 18, color: '#64748B' }} />
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                {user?.username || 'student'}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Content Body */}
        <Box sx={{ p: 3.5, flex: 1 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
