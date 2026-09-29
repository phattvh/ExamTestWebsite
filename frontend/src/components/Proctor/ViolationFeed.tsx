import { Box, Typography, List, ListItem, ListItemText, Chip } from '@mui/material';
import type { Violation } from '../../types/proctoring';

interface ViolationFeedProps {
  violations: Violation[];
}

// Nhãn tiếng Việt dễ hiểu cho giám thị — trước đây hiện thẳng mã kỹ thuật (VD: "tab_switch").
const VIOLATION_LABELS: Record<string, string> = {
  tab_switch: 'Chuyển sang tab khác',
  window_blur: 'Mất focus cửa sổ thi',
  no_face_detected: 'Không thấy khuôn mặt',
  multiple_faces_detected: 'Phát hiện nhiều người',
  face_turned_away: 'Quay mặt khỏi màn hình',
  gaze_away_from_screen: 'Ánh mắt lệch khỏi màn hình',
  suspicious_camera_device: 'Nghi ngờ dùng camera ảo',
  phone_detected: 'Phát hiện điện thoại',
  book_detected: 'Phát hiện sách/tài liệu',
};

const SEVERITY_COLOR: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  critical: 'error',
  high: 'error',
  medium: 'warning',
  low: 'info',
};

const ViolationFeed = ({ violations }: ViolationFeedProps) => {
  const sortedViolations = [...violations].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', bgcolor: '#162032', color: '#f8fafc' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid #1e293b' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#f8fafc' }}>
          Vi phạm gần đây
        </Typography>
      </Box>
      <List sx={{ p: 0 }}>
        {sortedViolations.map((violation, index) => (
          <Box key={`${violation.id || 'violation'}-${violation.timestamp || ''}-${index}`} sx={{ borderBottom: '1px solid #1e293b' }}>
            <ListItem alignItems="flex-start" sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#f1f5f9' }}>
                  {VIOLATION_LABELS[violation.type] || violation.type}
                </Typography>
                <Chip
                  label={violation.severity}
                  size="small"
                  color={SEVERITY_COLOR[violation.severity] || 'default'}
                  sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', height: 20 }}
                />
              </Box>
              <Box sx={{ width: '100%', color: '#94a3b8', fontSize: '0.8rem' }}>
                <Box sx={{ color: '#e2e8f0', fontWeight: 600 }}>
                  {violation.full_name || violation.username || 'Thí sinh'}{' '}
                  <Box component="span" sx={{ color: '#38bdf8', fontWeight: 500 }}>
                    (@{violation.username || 'student'})
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', mt: 0.3 }}>
                  <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8' }}>
                    IP: {violation.ip || '127.0.0.1'}
                  </Box>
                  <Box component="span">
                    {new Date(violation.timestamp).toLocaleTimeString('vi-VN')}
                  </Box>
                </Box>
              </Box>
            </ListItem>
          </Box>
        ))}
        {sortedViolations.length === 0 && (
          <ListItem sx={{ py: 4 }}>
            <ListItemText primary={<Typography sx={{ color: '#64748b', textAlign: 'center' }}>Chưa có vi phạm nào</Typography>} />
          </ListItem>
        )}
      </List>
    </Box>
  );
};

export default ViolationFeed;
