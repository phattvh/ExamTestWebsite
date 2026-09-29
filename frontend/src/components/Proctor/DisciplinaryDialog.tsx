import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Button, Typography,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import apiClient from '../../api/apiClient';

interface DisciplinaryDialogProps {
  open: boolean;
  onClose: () => void;
  student: {
    user_id: string;
    full_name?: string;
    username?: string;
  };
  examId?: string;
}

const DisciplinaryDialog: React.FC<DisciplinaryDialogProps> = ({
  open,
  onClose,
  student,
  examId,
}) => {
  const [actionType, setActionType] = useState<'penalty_score' | 'penalty_time' | 'warning' | 'terminate'>('warning');
  const [penaltyPercent, setPenaltyPercent] = useState(10);
  const [penaltyMinutes, setPenaltyMinutes] = useState(5);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  if (!open) return null;

  const displayName = student.full_name || student.username || 'Thí sinh';

  const handleSend = async () => {
    if (!examId) return;
    setSubmitting(true);
    setStatusMsg(null);
    try {
      let actionName = 'warning';
      if (actionType === 'terminate') actionName = 'terminate';
      else if (actionType === 'penalty_time') actionName = 'time_penalty';
      else if (actionType === 'penalty_score') actionName = 'score_penalty';

      await apiClient.post(`/v1/realtime/exams/${examId}/proctor/action`, {
        user_id: student.user_id,
        action: actionName,
        reason: reason || (actionType === 'terminate' ? 'Vi phạm quy chế phòng thi nghiêm trọng' : 'Nhắc nhở tập trung làm bài'),
        penalty_percent: actionType === 'penalty_score' ? penaltyPercent : 0,
        penalty_minutes: actionType === 'penalty_time' ? penaltyMinutes : 0,
      });

      setStatusMsg({ text: 'Đã gửi lệnh xử lý kỷ luật thành công!' });
      setTimeout(() => {
        setStatusMsg(null);
        setReason('');
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Failed to send proctor action:', err);
      setStatusMsg({ text: err?.response?.data?.detail || 'Gửi lệnh thất bại.', isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 1.5, p: 0.5 } } }}
    >
      <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, color: '#0F172A' }}>
        <GavelIcon color="warning" /> Xử lý kỷ luật: {displayName}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <TextField
          select
          label="Hình thức kỷ luật"
          size="small"
          fullWidth
          value={actionType}
          onChange={(e) => setActionType(e.target.value as any)}
        >
          <MenuItem value="warning">🚨 Gửi cảnh cáo trực tiếp lên màn hình</MenuItem>
          <MenuItem value="penalty_time">⏱️ Phạt trừ thời gian làm bài thi</MenuItem>
          <MenuItem value="penalty_score">📉 Trừ % điểm thi trực tiếp vào bài</MenuItem>
          <MenuItem value="terminate" sx={{ color: 'error.main', fontWeight: 700 }}>🚫 Cấm thi / Đuổi khỏi phòng thi</MenuItem>
        </TextField>

        {actionType === 'penalty_score' && (
          <TextField
            select
            label="Số % điểm bị trừ"
            size="small"
            fullWidth
            value={penaltyPercent}
            onChange={(e) => setPenaltyPercent(Number(e.target.value))}
          >
            <MenuItem value={10}>Trừ 10% điểm</MenuItem>
            <MenuItem value={20}>Trừ 20% điểm</MenuItem>
            <MenuItem value={30}>Trừ 30% điểm</MenuItem>
            <MenuItem value={50}>Trừ 50% điểm (Vi phạm nặng)</MenuItem>
            <MenuItem value={100}>Trừ 100% điểm (0 điểm)</MenuItem>
          </TextField>
        )}

        {actionType === 'penalty_time' && (
          <TextField
            select
            label="Số phút bị phạt trừ"
            size="small"
            fullWidth
            value={penaltyMinutes}
            onChange={(e) => setPenaltyMinutes(Number(e.target.value))}
          >
            <MenuItem value={5}>Trừ 5 phút</MenuItem>
            <MenuItem value={10}>Trừ 10 phút</MenuItem>
            <MenuItem value={15}>Trừ 15 phút</MenuItem>
            <MenuItem value={30}>Trừ 30 phút</MenuItem>
          </TextField>
        )}

        <TextField
          label="Lý do xử lý kỷ luật"
          size="small"
          fullWidth
          multiline
          rows={2}
          placeholder="Ví dụ: Rời khỏi tầm camera nhiều lần, sử dụng tài liệu..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        {statusMsg && (
          <Typography variant="body2" sx={{ fontWeight: 700, color: statusMsg.isError ? 'error.main' : 'success.main' }}>
            {statusMsg.text}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={onClose} sx={{ borderRadius: 1, textTransform: 'none' }}>Huỷ</Button>
        <Button
          variant="contained"
          color={actionType === 'terminate' ? 'error' : 'warning'}
          onClick={handleSend}
          disabled={submitting}
          sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 700 }}
        >
          {actionType === 'terminate' ? 'Xác nhận Đuổi thi' : 'Áp dụng kỷ luật'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default React.memo(DisciplinaryDialog);
