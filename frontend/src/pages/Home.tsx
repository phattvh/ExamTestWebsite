import {
  Box, Typography, Container, Toolbar, Skeleton, Grid, Card, CardContent,
  Button, Chip, Avatar, AppBar,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useContext, useEffect, useState } from 'react';
import {
  School, Security, PlayArrow,
  AccessTime, ArrowForward, AutoAwesome,
  Videocam, AnalyticsOutlined, QuizOutlined,
} from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';
import { getPublishedExams } from '../api/examApi';
import type { Exam } from '../api/examApi';

export default function Home() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useContext(AuthContext);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);

  useEffect(() => {
    let mounted = true;
    getPublishedExams()
      .then((data) => {
        if (mounted) setExams(data);
      })
      .catch((err) => console.error('Không thể tải danh sách kỳ thi:', err))
      .finally(() => {
        if (mounted) setLoadingExams(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleExamClick = (examId: string) => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user?.role === 'student' || user?.role === 'admin') {
      navigate(`/student/exam/${examId}`);
    } else {
      navigate('/teacher/exams');
    }
  };

  const bentoFeatures = [
    {
      icon: <Security sx={{ fontSize: 32, color: '#2563EB' }} />,
      badge: 'AI EDGE COMPUTING',
      title: 'Giám sát FaceMesh & Hướng nhìn AI',
      desc: 'Công nghệ phân tích khuôn mặt theo thời gian thực trực tiếp trên trình duyệt, phát hiện quay đầu, vắng mặt, hoặc có người lạ hỗ trợ.',
      bg: '#EFF6FF',
      borderColor: '#BFDBFE',
    },
    {
      icon: <Videocam sx={{ fontSize: 32, color: '#10B981' }} />,
      badge: 'WEBRTC REALTIME',
      title: 'Truyền hình Trực tiếp cho Giám thị',
      desc: 'Giám thị theo dõi đồng thời nhiều thí sinh qua video độ trễ cực thấp, nhận diện định danh đầy đủ Họ tên, Username và IP máy thi.',
      bg: '#ECFDF5',
      borderColor: '#A7F3D0',
    },
    {
      icon: <QuizOutlined sx={{ fontSize: 32, color: '#F59E0B' }} />,
      badge: 'SMART GRADING',
      title: 'Đa dạng Câu hỏi & Chấm điểm Tự động',
      desc: 'Hỗ trợ trắc nghiệm 1/nhiều đáp án, đúng/sai, nối cột và tự luận (gõ văn bản hoặc chụp ảnh bài làm tay tải lên).',
      bg: '#FFFBEB',
      borderColor: '#FDE68A',
    },
    {
      icon: <AnalyticsOutlined sx={{ fontSize: 32, color: '#8B5CF6' }} />,
      badge: 'BENTO ANALYTICS',
      title: 'Thống kê & Báo cáo Năng lực',
      desc: 'Phân tích chi tiết tỷ lệ đạt/chưa đạt, phổ điểm từng môn học và biểu đồ đánh giá chất lượng đề thi theo thời gian thực.',
      bg: '#F5F3FF',
      borderColor: '#DDD6FE',
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F8FAFC', color: '#0F172A', display: 'flex', flexDirection: 'column' }}>
      {/* Floating Glassmorphic Navbar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
          zIndex: 1100,
        }}
      >
        <Toolbar sx={{ maxWidth: 1280, mx: 'auto', width: '100%', display: 'flex', justifyContent: 'space-between', py: 1 }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => navigate('/')}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2.5,
                background: 'linear-gradient(135deg, #2563EB 0%, #10B981 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
              }}
            >
              <AutoAwesome sx={{ color: '#ffffff', fontSize: 20 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
              Exam<span style={{ color: '#2563EB' }}>System</span>
            </Typography>
            <Chip
              label="AI 2.0"
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 800,
                bgcolor: '#EFF6FF',
                color: '#2563EB',
                border: '1px solid #BFDBFE',
              }}
            />
          </Box>

          {/* Navigation Links */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
            <Button
              color="inherit"
              onClick={() => {
                const el = document.getElementById('exams-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              sx={{ color: '#475569', fontWeight: 600, textTransform: 'none', borderRadius: 2, px: 2, '&:hover': { bgcolor: '#F1F5F9' } }}
            >
              Kỳ thi đang mở
            </Button>
            <Button
              color="inherit"
              onClick={() => {
                const el = document.getElementById('features-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              sx={{ color: '#475569', fontWeight: 600, textTransform: 'none', borderRadius: 2, px: 2, '&:hover': { bgcolor: '#F1F5F9' } }}
            >
              Tính năng AI
            </Button>
            {isAuthenticated && user?.role === 'student' && (
              <Button
                color="inherit"
                onClick={() => navigate('/student/results')}
                sx={{ color: '#475569', fontWeight: 600, textTransform: 'none', borderRadius: 2, px: 2, '&:hover': { bgcolor: '#F1F5F9' } }}
              >
                Kết quả của tôi
              </Button>
            )}
            {isAuthenticated && (user?.role === 'teacher' || user?.role === 'admin') && (
              <Button
                color="inherit"
                onClick={() => navigate(user?.role === 'teacher' ? '/teacher/exams' : '/admin/dashboard')}
                sx={{ color: '#2563EB', fontWeight: 700, textTransform: 'none', borderRadius: 2, px: 2, bgcolor: '#EFF6FF' }}
              >
                Cổng Quản trị & Giảng dạy
              </Button>
            )}
          </Box>

          {/* User / Auth Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {!isAuthenticated ? (
              <>
                <Button
                  variant="text"
                  onClick={() => navigate('/login')}
                  sx={{ color: '#0F172A', fontWeight: 600, textTransform: 'none', px: 2, borderRadius: 2 }}
                >
                  Đăng nhập
                </Button>
                <Button
                  variant="contained"
                  onClick={() => navigate('/register')}
                  sx={{
                    bgcolor: '#2563EB',
                    color: '#ffffff',
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: 2.5,
                    px: 2.5,
                    py: 0.8,
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                    '&:hover': { bgcolor: '#1D4ED8' },
                  }}
                >
                  Đăng ký miễn phí
                </Button>
              </>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/dashboard')}
                  sx={{ borderColor: '#CBD5E1', color: '#0F172A', fontWeight: 700, textTransform: 'none', borderRadius: 2.5, px: 2 }}
                >
                  👤 {user?.full_name || user?.username}
                </Button>
                <Button
                  variant="text"
                  color="error"
                  onClick={logout}
                  sx={{ fontWeight: 600, textTransform: 'none', borderRadius: 2 }}
                >
                  Đăng xuất
                </Button>
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: '#0F172A',
          color: '#ffffff',
          pt: { xs: 8, md: 12 },
          pb: { xs: 12, md: 16 },
          position: 'relative',
          overflow: 'hidden',
          backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.25), transparent 70%)',
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          {/* Badge */}
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 0.8,
              borderRadius: 5,
              bgcolor: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38BDF8',
              fontWeight: 700,
              fontSize: '0.85rem',
              mb: 3.5,
              boxShadow: '0 0 20px rgba(56, 189, 248, 0.15)',
            }}
          >
            <AutoAwesome sx={{ fontSize: 16 }} />
            Nền tảng Khảo thí Trực tuyến Tích hợp Giám thị AI 2.0
          </Box>

          {/* Main Headline */}
          <Typography
            variant="h2"
            sx={{
              fontWeight: 900,
              fontSize: { xs: '2.4rem', sm: '3.4rem', md: '4.2rem' },
              lineHeight: 1.15,
              mb: 3,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #BAE6FD 50%, #93C5FD 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Tổ Chức Thi Trực Tuyến<br />Minh Bạch, An Toàn & Tự Động Hoá
          </Typography>

          <Typography
            variant="h6"
            sx={{
              color: '#94A3B8',
              maxWidth: 720,
              mx: 'auto',
              mb: 5,
              lineHeight: 1.6,
              fontWeight: 400,
              fontSize: { xs: '1rem', md: '1.2rem' },
            }}
          >
            Hệ thống hỗ trợ đầy đủ các dạng câu hỏi, tự động chấm điểm tức thì và truyền video WebRTC trực tiếp cho giám thị với công nghệ AI Edge Computing.
          </Typography>

          {/* Action CTAs */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrow />}
              onClick={() => navigate(isAuthenticated ? (user?.role === 'student' ? '/student/exams' : '/dashboard') : '/login')}
              sx={{
                bgcolor: '#2563EB',
                color: '#ffffff',
                fontWeight: 800,
                px: 4,
                py: 1.6,
                fontSize: '1.05rem',
                borderRadius: 3,
                textTransform: 'none',
                boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.5)',
                '&:hover': { bgcolor: '#1D4ED8', transform: 'translateY(-2px)' },
                transition: 'all 0.2s ease',
              }}
            >
              {isAuthenticated ? 'Vào danh sách kỳ thi' : 'Bắt đầu làm bài thi'}
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => {
                const el = document.getElementById('features-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              sx={{
                color: '#E2E8F0',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                fontWeight: 600,
                px: 3.5,
                py: 1.6,
                fontSize: '1.05rem',
                borderRadius: 3,
                textTransform: 'none',
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255, 255, 255, 0.08)' },
              }}
            >
              Khám phá tính năng AI
            </Button>
          </Box>

          {/* Trust Stat Ticker Strip */}
          <Grid container spacing={3} sx={{ mt: 8, maxWidth: 900, mx: 'auto' }}>
            {[
              { label: 'ĐỘ CHÍNH XÁC AI', value: '99.9%' },
              { label: 'ĐỘ TRỄ STREAM', value: '< 50ms' },
              { label: 'TỰ ĐỘNG CHẤM', value: '100%' },
              { label: 'TIÊU CHUẨN BẢO MẬT', value: 'ISO/IEC' },
            ].map((stat, i) => (
              <Grid size={{ xs: 6, sm: 3 }} key={i}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <Typography variant="h5" sx={{ fontWeight: 900, color: '#38BDF8', mb: 0.5 }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, letterSpacing: 0.5 }}>
                    {stat.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Bento Grid Features Section */}
      <Box id="features-section" sx={{ py: 10, bgcolor: '#ffffff', borderBottom: '1px solid #E2E8F0' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 7 }}>
            <Typography variant="caption" sx={{ color: '#2563EB', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
              CÔNG NGHỆ KHẢO THÍ HÀNG ĐẦU
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A', mt: 1, mb: 1.5, letterSpacing: '-0.02em' }}>
              Tính năng Vượt trội của Hệ thống
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640, mx: 'auto' }}>
              Được thiết kế toàn diện nhằm phục vụ nhu cầu khảo thí chuyên nghiệp cho các trường đại học, tổ chức giáo dục và doanh nghiệp.
            </Typography>
          </Box>

          <Grid container spacing={3.5}>
            {bentoFeatures.map((feat, idx) => (
              <Grid size={{ xs: 12, md: 6 }} key={idx}>
                <Card
                  sx={{
                    height: '100%',
                    p: 4,
                    borderRadius: 4,
                    border: `1.5px solid ${feat.borderColor}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                    bgcolor: feat.bg,
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 24px -4px rgba(0,0,0,0.08)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                    <Avatar sx={{ width: 56, height: 56, bgcolor: '#ffffff', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                      {feat.icon}
                    </Avatar>
                    <Chip
                      label={feat.badge}
                      size="small"
                      sx={{ fontWeight: 800, fontSize: '0.7rem', bgcolor: '#ffffff', border: '1px solid #E2E8F0' }}
                    />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5, color: '#0F172A' }}>
                    {feat.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.7, fontSize: '0.95rem' }}>
                    {feat.desc}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Available Exams Section */}
      <Container id="exams-section" maxWidth="lg" sx={{ py: 10 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 4 }}>
          <Box>
            <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
              DANH SÁCH BÀI THI
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A', mt: 0.5, letterSpacing: '-0.02em' }}>
              Kỳ thi đang mở
            </Typography>
          </Box>
          <Button
            variant="text"
            endIcon={<ArrowForward />}
            onClick={() => navigate(isAuthenticated ? '/student/exams' : '/login')}
            sx={{ fontWeight: 700, color: '#2563EB', textTransform: 'none', fontSize: '0.95rem' }}
          >
            Xem toàn bộ đề thi
          </Button>
        </Box>

        {loadingExams ? (
          <Grid container spacing={3}>
            {[1, 2, 3].map((i) => (
              <Grid size={{ xs: 12, md: 4 }} key={i}>
                <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 3.5 }} />
              </Grid>
            ))}
          </Grid>
        ) : exams.length === 0 ? (
          <Card sx={{ p: 8, textAlign: 'center', borderRadius: 4, bgcolor: '#ffffff', border: '1px solid #E2E8F0' }}>
            <School sx={{ fontSize: 56, color: '#94A3B8', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>
              Hiện chưa có đề thi nào được công bố
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Giáo viên sẽ cập nhật các bài thi mới trong thời gian sớm nhất.
            </Typography>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {exams.map((exam) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={exam.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderRadius: 4,
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    transition: 'all 0.25s ease',
                    bgcolor: '#FFFFFF',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      borderColor: '#2563EB',
                      boxShadow: '0 14px 28px -6px rgba(37,99,235,0.15)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 3.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                      <Chip
                        label="● ĐANG MỞ"
                        size="small"
                        sx={{ fontWeight: 800, fontSize: '0.7rem', bgcolor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, color: '#64748B' }}>
                        <AccessTime sx={{ fontSize: 16 }} />
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{exam.duration_minutes} phút</Typography>
                      </Box>
                    </Box>

                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', mb: 1.5, minHeight: 52, lineHeight: 1.3 }}>
                      {exam.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748B', mb: 3, minHeight: 40, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {exam.description || 'Bài kiểm tra đánh giá kiến thức.'}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label={`Tối đa: ${exam.max_attempts} lần thi`} size="small" variant="outlined" sx={{ color: '#475569', borderColor: '#E2E8F0', fontWeight: 600 }} />
                      <Chip label={`Ngưỡng đạt: ${exam.passing_score ?? 50}%`} size="small" variant="outlined" sx={{ color: '#475569', borderColor: '#E2E8F0', fontWeight: 600 }} />
                    </Box>
                  </CardContent>

                  <Box sx={{ p: 3.5, pt: 0 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => handleExamClick(exam.id)}
                      sx={{
                        bgcolor: '#2563EB',
                        fontWeight: 700,
                        py: 1.3,
                        borderRadius: 2.5,
                        textTransform: 'none',
                        fontSize: '0.95rem',
                        boxShadow: '0 2px 8px rgba(37,99,235,0.2)',
                        '&:hover': { bgcolor: '#1D4ED8' },
                      }}
                    >
                      {isAuthenticated ? 'Vào thi ngay' : 'Đăng nhập để thi'}
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      {/* Modern Footer */}
      <Box sx={{ bgcolor: '#0F172A', color: '#94A3B8', py: 6, mt: 'auto', borderTop: '1px solid #1E293B' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: 2, background: 'linear-gradient(135deg, #2563EB 0%, #10B981 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AutoAwesome sx={{ color: '#ffffff', fontSize: 16 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#ffffff' }}>
                Exam<span style={{ color: '#38BDF8' }}>System</span>
              </Typography>
            </Box>

            <Typography variant="body2" sx={{ color: '#64748B' }}>
              © {new Date().getFullYear()} ExamSystem AI Platform. Nền tảng Khảo thí & Giám sát Trực tuyến Thông minh.
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10B981' }} />
              <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 700 }}>
                Hệ thống hoạt động bình thường
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}

