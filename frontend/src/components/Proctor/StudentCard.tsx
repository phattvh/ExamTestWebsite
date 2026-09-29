import { useEffect, useRef, useState, useCallback, memo } from 'react';
import {
  Card, CardContent, Typography, Box, Button, Chip, Avatar, Dialog,
  DialogTitle, DialogContent, DialogActions,
  IconButton, Tooltip, ButtonGroup, CircularProgress,
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  ScreenShare as ScreenShareIcon,
  StopScreenShare as StopScreenShareIcon,
  Lan as LanIcon,
  Fullscreen as FullscreenIcon,
  Gavel as GavelIcon,
} from '@mui/icons-material';
import type { StudentSession } from '../../types/proctoring';
import RiskIndicator from './RiskIndicator';
import DisciplinaryDialog from './DisciplinaryDialog';

interface StudentCardProps {
  student: StudentSession;
  examId?: string;
  onRequestStream?: (userId: string, type?: 'camera' | 'screen' | 'both') => void;
  onStopStream?: (userId: string) => void;
  stream?: MediaStream | null;
  frame?: string;
}

const StudentCard = ({ student, examId, onRequestStream, onStopStream, stream, frame }: StudentCardProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fullVideoRef = useRef<HTMLVideoElement | null>(null);
  const [watching, setWatching] = useState(true);
  const [streamMode, setStreamMode] = useState<'camera' | 'screen'>('screen');
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);

  const handleCloseActionDialog = useCallback(() => {
    setActionDialogOpen(false);
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
    if (fullVideoRef.current && stream) {
      fullVideoRef.current.srcObject = stream;
    }
  }, [stream, watching, fullscreenOpen, streamMode]);

  const handleToggleCamera = () => {
    if (watching && streamMode === 'camera') {
      onStopStream?.(student.user_id);
      setWatching(false);
    } else {
      setStreamMode('camera');
      onRequestStream?.(student.user_id, 'camera');
      setWatching(true);
    }
  };

  const handleToggleScreen = () => {
    if (watching && streamMode === 'screen') {
      onStopStream?.(student.user_id);
      setWatching(false);
    } else {
      setStreamMode('screen');
      onRequestStream?.(student.user_id, 'screen');
      setWatching(true);
    }
  };

  const handleOpenFullscreen = () => {
    if (!watching) {
      onRequestStream?.(student.user_id, streamMode);
      setWatching(true);
    }
    setFullscreenOpen(true);
  };

  const displayName = student.full_name || student.username || 'Thí sinh';
  const username = student.username || 'student';
  const clientIp = student.ip || '127.0.0.1';

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: 1.5, boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
      {watching && (
        <Box sx={{ bgcolor: '#000', aspectRatio: '16/9', position: 'relative', borderTopLeftRadius: 6, borderTopRightRadius: 6, overflow: 'hidden' }}>
          {stream ? (
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : frame ? (
            <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
              <img src={frame} alt="Live Snapshot" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              <Chip
                size="small"
                label="● TRỰC TIẾP"
                sx={{ position: 'absolute', bottom: 8, left: 8, bgcolor: 'rgba(34,197,94,0.9)', color: '#fff', fontWeight: 800, fontSize: '0.65rem', height: 20 }}
              />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 1 }}>
              <CircularProgress size={24} sx={{ color: '#38bdf8' }} />
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                Đang kết nối luồng {streamMode === 'screen' ? 'màn hình làm bài' : 'camera'}...
              </Typography>
            </Box>
          )}

          {/* Mode indicator badge */}
          <Chip
            size="small"
            label={streamMode === 'screen' ? '🖥️ Màn hình' : '📷 Camera'}
            sx={{ position: 'absolute', top: 8, left: 8, bgcolor: 'rgba(0,0,0,0.7)', color: '#38bdf8', fontWeight: 700, fontSize: '0.7rem', height: 22 }}
          />

          <Tooltip title="Xem toàn màn hình">
            <IconButton
              size="small"
              onClick={handleOpenFullscreen}
              sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' } }}
            >
              <FullscreenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
      <CardContent sx={{ p: 2 }}>
        {/* Header: Avatar, Name, Username, Risk Score */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Avatar sx={{ bgcolor: '#2563EB', color: '#fff', width: 36, height: 36, fontWeight: 700, fontSize: '0.85rem', borderRadius: 1 }}>
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#f8fafc', lineHeight: 1.2 }}>
                {displayName}
              </Typography>
              <Typography variant="caption" sx={{ color: '#38bdf8', fontWeight: 600, display: 'block' }}>
                @{username}
              </Typography>
            </Box>
          </Box>
          <RiskIndicator score={student.risk_score} />
        </Box>

        {/* IP Address & Network status badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, p: 0.8, px: 1, bgcolor: '#0f172a', borderRadius: 1, border: '1px solid #334155' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, color: '#94a3b8' }}>
            <LanIcon sx={{ fontSize: 15, color: '#38bdf8' }} />
            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#cbd5e1', fontSize: '0.72rem' }}>
              IP: {clientIp}
            </Typography>
          </Box>
          <Chip
            label={student.is_online ? 'Đang thi' : 'Mất kết nối'}
            size="small"
            color={student.is_online ? 'success' : 'default'}
            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, borderRadius: 0.8 }}
          />
        </Box>

        {/* Violations Count */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, pt: 1, borderTop: '1px solid #334155' }}>
          <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 600 }}>
            Số vi phạm:{' '}
            <Box component="span" sx={{ color: student.violations_count > 0 ? '#f87171' : '#4ade80', fontWeight: 'bold' }}>
              {student.violations_count}
            </Box>
          </Typography>
        </Box>

        {/* Action Controls */}
        <Box sx={{ display: 'flex', gap: 0.8, mt: 1.5, flexWrap: 'wrap' }}>
          <Tooltip title={watching && streamMode === 'camera' ? 'Tắt xem camera' : 'Xem trực tiếp luồng camera của thí sinh'}>
            <Button
              size="small"
              variant={watching && streamMode === 'camera' ? 'contained' : 'outlined'}
              color={watching && streamMode === 'camera' ? 'error' : 'primary'}
              startIcon={watching && streamMode === 'camera' ? <VideocamOffIcon sx={{ fontSize: 16 }} /> : <VideocamIcon sx={{ fontSize: 16 }} />}
              onClick={handleToggleCamera}
              sx={{ flex: 1, borderRadius: 1, textTransform: 'none', fontWeight: 700, fontSize: '0.78rem', py: 0.7 }}
            >
              {watching && streamMode === 'camera' ? 'Tắt cam' : 'Xem Cam'}
            </Button>
          </Tooltip>

          <Tooltip title={watching && streamMode === 'screen' ? 'Tắt xem màn hình' : 'Xem trực tiếp màn hình làm bài của thí sinh'}>
            <Button
              size="small"
              variant={watching && streamMode === 'screen' ? 'contained' : 'outlined'}
              color={watching && streamMode === 'screen' ? 'error' : 'info'}
              startIcon={watching && streamMode === 'screen' ? <StopScreenShareIcon sx={{ fontSize: 16 }} /> : <ScreenShareIcon sx={{ fontSize: 16 }} />}
              onClick={handleToggleScreen}
              sx={{ flex: 1, borderRadius: 1, textTransform: 'none', fontWeight: 700, fontSize: '0.78rem', py: 0.7 }}
            >
              {watching && streamMode === 'screen' ? 'Tắt hình' : 'Màn hình'}
            </Button>
          </Tooltip>

          <Button
            size="small"
            variant="contained"
            color="warning"
            startIcon={<GavelIcon sx={{ fontSize: 16 }} />}
            onClick={() => setActionDialogOpen(true)}
            sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 700, fontSize: '0.78rem', py: 0.7, px: 1.5 }}
          >
            Phạt
          </Button>
        </Box>
      </CardContent>

      {/* Fullscreen Video Modal */}
      <Dialog
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        maxWidth="lg"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: '#0f172a', color: '#fff', borderRadius: 1.5, border: '1px solid #334155' } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid #1e293b' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#2563EB', width: 36, height: 36, fontWeight: 700 }}>
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{displayName} (@{username})</Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>IP: {clientIp} • Phòng thi: {examId}</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ButtonGroup size="small" variant="outlined">
              <Button
                variant={streamMode === 'camera' ? 'contained' : 'outlined'}
                onClick={() => {
                  setStreamMode('camera');
                  onRequestStream?.(student.user_id, 'camera');
                }}
                startIcon={<VideocamIcon />}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Camera
              </Button>
              <Button
                variant={streamMode === 'screen' ? 'contained' : 'outlined'}
                onClick={() => {
                  setStreamMode('screen');
                  onRequestStream?.(student.user_id, 'screen');
                }}
                startIcon={<ScreenShareIcon />}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Màn hình làm bài
              </Button>
            </ButtonGroup>
            <RiskIndicator score={student.risk_score} />
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: '#000', minHeight: 520 }}>
          {stream ? (
            <video ref={fullVideoRef} autoPlay playsInline muted style={{ width: '100%', maxHeight: '72vh', objectFit: 'contain' }} />
          ) : frame ? (
            <img src={frame} alt="Live Snapshot" style={{ width: '100%', maxHeight: '72vh', objectFit: 'contain' }} />
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
              <CircularProgress size={32} sx={{ color: '#38bdf8' }} />
              <Typography sx={{ color: '#94a3b8' }}>
                Đang nạp luồng {streamMode === 'screen' ? 'màn hình làm bài' : 'camera chất lượng cao'}...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #1e293b', justifyContent: 'space-between' }}>
          <Button
            color="warning"
            variant="outlined"
            startIcon={<GavelIcon />}
            onClick={() => { setFullscreenOpen(false); setActionDialogOpen(true); }}
            sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 700 }}
          >
            Xử lý kỷ luật thí sinh này
          </Button>
          <Button onClick={() => setFullscreenOpen(false)} variant="contained" sx={{ borderRadius: 1, textTransform: 'none' }}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      <DisciplinaryDialog
        open={actionDialogOpen}
        onClose={handleCloseActionDialog}
        student={student}
        examId={examId}
      />
    </Card>
  );
};

export default memo(StudentCard);
