import { useRef, useState } from 'react';
import {
  Paper, Typography, RadioGroup, Radio,
  Checkbox, FormGroup, TextField, Button, Box, Chip,
  Select, MenuItem, Alert,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { PhotoCamera, Delete as DeleteIcon } from '@mui/icons-material';
import type { Question, AnswerValue } from '../context/ExamContext';

interface QuestionPanelProps {
  question: Question;
  selectedAnswer: AnswerValue;
  onSelectAnswer: (answer: AnswerValue) => void;
  questionIndex: number;
  totalQuestions?: number;
}

// Nén & resize ảnh trước khi encode base64, tránh payload quá nặng khi thí sinh chụp
// ảnh bài làm tay bằng điện thoại (ảnh gốc có thể vài MB, resize xuống còn vài trăm KB).
function compressImageToDataUrl(file: File, maxDim = 1600, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not supported'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const QuestionPanel: React.FC<QuestionPanelProps> = ({
  question,
  selectedAnswer,
  onSelectAnswer,
  questionIndex,
}) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const renderByType = () => {
    switch (question.type) {
      case 'true_false':
      case 'multiple_choice': {
        if (!question.options || question.options.length === 0) {
          return (
            <Alert severity="warning" sx={{ borderRadius: 2, mt: 1 }}>
              Câu hỏi này hiện chưa có danh sách đáp án lựa chọn.
            </Alert>
          );
        }
        const value = typeof selectedAnswer === 'string' ? selectedAnswer : '';
        return (
          <RadioGroup value={value} onChange={(e) => onSelectAnswer(e.target.value)} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {question.options.map((option) => {
              const isSelected = value === option.id;
              return (
                <Box
                  key={option.id}
                  onClick={() => onSelectAnswer(option.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    border: isSelected ? '2px solid #2563EB' : '1px solid #E2E8F0',
                    borderRadius: 2.5,
                    px: 2.5,
                    py: 1.2,
                    bgcolor: isSelected ? '#EFF6FF' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 2px 4px rgba(37,99,235,0.08)' : '0 1px 2px rgba(0,0,0,0.02)',
                    '&:hover': {
                      borderColor: isSelected ? '#2563EB' : '#94A3B8',
                      bgcolor: isSelected ? '#EFF6FF' : '#F8FAFC',
                    },
                  }}
                >
                  <Radio checked={isSelected} sx={{ p: 0.5, mr: 1.5, color: isSelected ? '#2563EB' : '#94A3B8' }} />
                  <Typography sx={{ fontWeight: isSelected ? 600 : 400, color: isSelected ? '#1E3A8A' : '#1E293B', fontSize: '1rem', flex: 1 }}>
                    {option.text}
                  </Typography>
                </Box>
              );
            })}
          </RadioGroup>
        );
      }

      case 'multiple_select': {
        const selected = Array.isArray(selectedAnswer) ? (selectedAnswer as string[]) : [];
        const toggle = (optionId: string) => {
          const next = selected.includes(optionId)
            ? selected.filter((id) => id !== optionId)
            : [...selected, optionId];
          onSelectAnswer(next);
        };
        return (
          <>
            <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2, bgcolor: '#EFF6FF', color: '#1E40AF', border: '1px solid #DBEAFE' }}>
              Câu hỏi nhiều đáp án đúng — vui lòng chọn tất cả các đáp án bạn cho là chính xác.
            </Alert>
            <FormGroup sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {question.options.map((option) => {
                const isSelected = selected.includes(option.id);
                return (
                  <Box
                    key={option.id}
                    onClick={() => toggle(option.id)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      border: isSelected ? '2px solid #2563EB' : '1px solid #E2E8F0',
                      borderRadius: 2.5,
                      px: 2.5,
                      py: 1.2,
                      bgcolor: isSelected ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 4px rgba(37,99,235,0.08)' : '0 1px 2px rgba(0,0,0,0.02)',
                      '&:hover': {
                        borderColor: isSelected ? '#2563EB' : '#94A3B8',
                        bgcolor: isSelected ? '#EFF6FF' : '#F8FAFC',
                      },
                    }}
                  >
                    <Checkbox checked={isSelected} sx={{ p: 0.5, mr: 1.5, color: isSelected ? '#2563EB' : '#94A3B8' }} />
                    <Typography sx={{ fontWeight: isSelected ? 600 : 400, color: isSelected ? '#1E3A8A' : '#1E293B', fontSize: '1rem', flex: 1 }}>
                      {option.text}
                    </Typography>
                  </Box>
                );
              })}
            </FormGroup>
          </>
        );
      }

      case 'matching': {
        const pairs = Array.isArray(selectedAnswer) ? (selectedAnswer as [string, string][]) : [];
        const pairMap = new Map(pairs);
        const left = question.matching?.left || [];
        const right = question.matching?.right || [];

        const handleChange = (leftId: string) => (e: SelectChangeEvent) => {
          const rightId = e.target.value;
          const nextMap = new Map(pairMap);
          if (rightId) nextMap.set(leftId, rightId);
          else nextMap.delete(leftId);
          onSelectAnswer(Array.from(nextMap.entries()) as [string, string][]);
        };

        return (
          <>
            <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
              Nối mỗi ý ở cột trái với ý tương ứng ở cột phải.
            </Alert>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {left.map((item, idx) => (
                <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
                  <Chip label={idx + 1} size="small" color="primary" sx={{ fontWeight: 700 }} />
                  <Typography sx={{ flex: 1 }}>{item.text}</Typography>
                  <Select
                    size="small"
                    displayEmpty
                    value={pairMap.get(item.id) || ''}
                    onChange={handleChange(item.id)}
                    sx={{ minWidth: 180 }}
                  >
                    <MenuItem value=""><em>-- Chọn --</em></MenuItem>
                    {right.map((r) => (
                      <MenuItem key={r.id} value={r.id}>{r.text}</MenuItem>
                    ))}
                  </Select>
                </Box>
              ))}
            </Box>
          </>
        );
      }

      case 'essay': {
        const currentValue = typeof selectedAnswer === 'string' ? selectedAnswer : '';
        const isImage = currentValue.startsWith('data:image');

        const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUploading(true);
          try {
            const dataUrl = await compressImageToDataUrl(file);
            onSelectAnswer(dataUrl);
          } catch (err) {
            console.error('Failed to process image', err);
          } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        };

        return (
          <Box>
            {isImage ? (
              <Box sx={{ mb: 2 }}>
                <img src={currentValue} alt="Bài làm đã chụp" style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Button startIcon={<DeleteIcon />} color="error" size="small" sx={{ mt: 1 }} onClick={() => onSelectAnswer('')}>
                  Xoá ảnh, làm lại
                </Button>
              </Box>
            ) : (
              <TextField
                fullWidth
                multiline
                minRows={8}
                placeholder="Nhập câu trả lời của bạn tại đây..."
                value={currentValue}
                onChange={(e) => onSelectAnswer(e.target.value)}
                sx={{ mb: 2 }}
              />
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <Button
              variant="outlined"
              startIcon={<PhotoCamera />}
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? 'Đang xử lý ảnh...' : 'Chụp / tải ảnh bài làm tay'}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Câu tự luận sẽ được giáo viên chấm điểm thủ công sau khi bạn nộp bài.
            </Typography>
          </Box>
        );
      }

      default:
        return <Alert severity="warning">Loại câu hỏi này chưa được hỗ trợ hiển thị.</Alert>;
    }
  };

  return (
    <Paper
      sx={{
        p: 4,
        borderRadius: 3.5,
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        bgcolor: '#FFFFFF',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <Chip
          label={`Câu ${questionIndex + 1}`}
          color="primary"
          sx={{ fontWeight: 800, fontSize: '0.85rem', height: 28, bgcolor: '#2563EB', color: '#FFFFFF' }}
        />
        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
          {question.type === 'multiple_select'
            ? 'Trắc nghiệm chọn nhiều'
            : question.type === 'matching'
            ? 'Câu hỏi nối cột'
            : question.type === 'essay'
            ? 'Tự luận'
            : 'Trắc nghiệm'}
        </Typography>
      </Box>

      <Typography variant="body1" sx={{ fontSize: '1.15rem', fontWeight: 600, color: '#0F172A', mb: question.media?.image || question.media?.video || question.media?.audio ? 2 : 3.5, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
        {question.content}
      </Typography>

      {/* Đính kèm Media (Hình ảnh, Video, Audio) của đề bài */}
      {question.media && (question.media.image || question.media.video || question.media.audio) && (
        <Box sx={{ mb: 3.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {question.media.image && (
            <Box sx={{ maxWidth: '100%', overflow: 'hidden', borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: '#F8FAFC', p: 1, display: 'inline-block' }}>
              <img
                src={question.media.image}
                alt="Hình ảnh minh họa câu hỏi"
                style={{ maxWidth: '100%', maxHeight: 420, borderRadius: 6, objectFit: 'contain', display: 'block' }}
              />
            </Box>
          )}

          {question.media.video && (
            <Box sx={{ maxWidth: 640, width: '100%', borderRadius: 2, overflow: 'hidden', border: '1px solid #E2E8F0', bgcolor: '#000' }}>
              {question.media.video.includes('youtube.com') || question.media.video.includes('youtu.be') ? (
                <Box sx={{ position: 'relative', pt: '56.25%' }}>
                  <iframe
                    src={
                      question.media.video.includes('watch?v=')
                        ? question.media.video.replace('watch?v=', 'embed/')
                        : question.media.video.includes('youtu.be/')
                        ? question.media.video.replace('youtu.be/', 'www.youtube.com/embed/')
                        : question.media.video
                    }
                    title="Video minh họa câu hỏi"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </Box>
              ) : (
                <video
                  controls
                  src={question.media.video}
                  style={{ width: '100%', maxHeight: 360, display: 'block' }}
                >
                  Trình duyệt không hỗ trợ phát video này.
                </video>
              )}
            </Box>
          )}

          {question.media.audio && (
            <Box sx={{ p: 1.5, bgcolor: '#F1F5F9', borderRadius: 2, border: '1px solid #E2E8F0', maxWidth: 480 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 0.5 }}>
                🔊 File âm thanh nghe hiểu:
              </Typography>
              <audio controls src={question.media.audio} style={{ width: '100%' }}>
                Trình duyệt không hỗ trợ phát âm thanh này.
              </audio>
            </Box>
          )}
        </Box>
      )}

      {renderByType()}
    </Paper>
  );
};

export default QuestionPanel;
