import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Box, IconButton, Typography,
  FormControlLabel, Checkbox, RadioGroup, Radio, Alert
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, EditNote as EditIcon, PermMedia, Image as ImageIcon, VideoLibrary, Audiotrack } from '@mui/icons-material';
import { adminApi } from '../api/adminApi';

interface ManualQuestionDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (question: any) => Promise<void>;
  initialQuestion?: any;
}

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Trắc nghiệm (1 đáp án)' },
  { value: 'multiple_select', label: 'Trắc nghiệm (Nhiều đáp án)' },
  { value: 'true_false', label: 'Đúng/Sai' },
  { value: 'matching', label: 'Nối cột' },
  { value: 'essay', label: 'Tự luận / Chụp ảnh' },
];

let optionIdCounter = 0;
const genId = (prefix: string) => `${prefix}${Date.now()}_${optionIdCounter++}`;

export default function ManualQuestionDialog({ open, onClose, onSave, initialQuestion }: ManualQuestionDialogProps) {
  const [type, setType] = useState('multiple_choice');
  const [text, setText] = useState('');
  const [subject, setSubject] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const difficulty = 'medium';
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [showMediaSection, setShowMediaSection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // multiple_choice / multiple_select
  const [options, setOptions] = useState([
    { id: genId('opt_'), text: '', isCorrect: false },
    { id: genId('opt_'), text: '', isCorrect: false },
  ]);
  const [trueFalseAnswer, setTrueFalseAnswer] = useState('true');

  // matching: 2 cột độc lập
  const [leftItems, setLeftItems] = useState([{ id: genId('L_'), text: '' }, { id: genId('L_'), text: '' }]);
  const [rightItems, setRightItems] = useState([{ id: genId('R_'), text: '' }, { id: genId('R_'), text: '' }]);
  const [pairs, setPairs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      adminApi.getCategories().then(setCategories).catch((err) => console.error('Failed to load categories', err));

      if (initialQuestion) {
        setText(initialQuestion.content?.text || '');
        setImageUrl(initialQuestion.content?.image || '');
        setVideoUrl(initialQuestion.content?.video || '');
        setAudioUrl(initialQuestion.content?.audio || '');
        setShowMediaSection(Boolean(initialQuestion.content?.image || initialQuestion.content?.video || initialQuestion.content?.audio));
        setSubject(initialQuestion.metadata?.subject || '');
        setCategoryId(initialQuestion.category_id || '');
        const qType = initialQuestion.type || 'multiple_choice';
        setType(qType);

        if (qType === 'multiple_choice' || qType === 'multiple_select') {
          const rawOpts = initialQuestion.options || [];
          const correct = initialQuestion.correct_answer;
          if (rawOpts.length > 0) {
            setOptions(rawOpts.map((o: any) => ({
              id: o.id || genId('opt_'),
              text: o.text || '',
              isCorrect: Boolean(o.is_correct || (Array.isArray(correct) ? correct.includes(o.id) : correct === o.id)),
            })));
          }
        } else if (qType === 'true_false') {
          const corr = initialQuestion.correct_answer;
          setTrueFalseAnswer(corr === 'opt_true' || corr === 'true' ? 'true' : 'false');
        } else if (qType === 'matching') {
          const rawOpts = initialQuestion.options || [];
          const left = rawOpts.filter((o: any) => o.id?.startsWith('L_') || o.id?.startsWith('left'));
          const right = rawOpts.filter((o: any) => o.id?.startsWith('R_') || o.id?.startsWith('right'));
          if (left.length > 0 && right.length > 0) {
            setLeftItems(left.map((l: any) => ({ id: l.id, text: l.text })));
            setRightItems(right.map((r: any) => ({ id: r.id, text: r.text })));
          }
          const pairMap: Record<string, string> = {};
          if (Array.isArray(initialQuestion.correct_answer)) {
            initialQuestion.correct_answer.forEach((p: string) => {
              const [l, r] = p.split(':');
              if (l && r) pairMap[l] = r;
            });
          }
          setPairs(pairMap);
        }
      } else {
        resetForm();
      }
    }
  }, [open, initialQuestion]);

  const resetForm = () => {
    setText('');
    setImageUrl('');
    setVideoUrl('');
    setAudioUrl('');
    setShowMediaSection(false);
    setSubject('');
    setCategoryId('');
    setType('multiple_choice');
    setError('');
    setOptions([{ id: genId('opt_'), text: '', isCorrect: false }, { id: genId('opt_'), text: '', isCorrect: false }]);
    setLeftItems([{ id: genId('L_'), text: '' }, { id: genId('L_'), text: '' }]);
    setRightItems([{ id: genId('R_'), text: '' }, { id: genId('R_'), text: '' }]);
    setPairs({});
  };

  const handleAddOption = () => setOptions([...options, { id: genId('opt_'), text: '', isCorrect: false }]);
  const handleRemoveOption = (index: number) => setOptions(options.filter((_, i) => i !== index));
  const handleOptionTextChange = (index: number, val: string) => {
    const next = [...options];
    next[index] = { ...next[index], text: val };
    setOptions(next);
  };
  const handleOptionCorrectChange = (index: number, isCorrect: boolean) => {
    const next = [...options];
    if (type === 'multiple_choice') next.forEach((o) => (o.isCorrect = false));
    next[index] = { ...next[index], isCorrect };
    setOptions(next);
  };

  const validate = (): string | null => {
    if (!text.trim()) return 'Vui lòng nhập nội dung câu hỏi.';
    if (!subject.trim()) return 'Vui lòng nhập môn học.';
    if (type === 'multiple_choice' || type === 'multiple_select') {
      if (options.some((o) => !o.text.trim())) return 'Vui lòng điền đủ nội dung các đáp án.';
      if (!options.some((o) => o.isCorrect)) return 'Vui lòng chọn ít nhất 1 đáp án đúng.';
    }
    if (type === 'matching') {
      if (leftItems.some((i) => !i.text.trim()) || rightItems.some((i) => !i.text.trim())) {
        return 'Vui lòng điền đủ nội dung 2 cột.';
      }
      if (leftItems.some((i) => !pairs[i.id])) return 'Vui lòng nối đủ cặp đáp án đúng cho mọi ý ở cột trái.';
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSaving(true);

    let payloadOptions: { id: string; text: string; is_correct: boolean }[] = [];
    let correctAnswer: string | string[] = '';

    if (type === 'multiple_choice' || type === 'multiple_select') {
      payloadOptions = options.map((o) => ({ id: o.id, text: o.text, is_correct: o.isCorrect }));
      correctAnswer = options.filter((o) => o.isCorrect).map((o) => o.id);
    } else if (type === 'true_false') {
      const trueId = 'opt_true';
      const falseId = 'opt_false';
      payloadOptions = [
        { id: trueId, text: 'Đúng', is_correct: trueFalseAnswer === 'true' },
        { id: falseId, text: 'Sai', is_correct: trueFalseAnswer === 'false' },
      ];
      correctAnswer = trueFalseAnswer === 'true' ? trueId : falseId;
    } else if (type === 'matching') {
      payloadOptions = [
        ...leftItems.map((i) => ({ id: i.id, text: i.text, is_correct: true })),
        ...rightItems.map((i) => ({ id: i.id, text: i.text, is_correct: true })),
      ];
      correctAnswer = Object.entries(pairs).map(([l, r]) => `${l}:${r}`);
    } else {
      payloadOptions = [];
      correctAnswer = '';
    }

    const payload = {
      content: {
        text,
        image: imageUrl.trim() || undefined,
        video: videoUrl.trim() || undefined,
        audio: audioUrl.trim() || undefined,
      },
      type,
      options: payloadOptions,
      correct_answer: correctAnswer,
      metadata: { subject, difficulty, tags: [] },
      category_id: categoryId || null,
    };

    try {
      await onSave(payload);
      resetForm();
    } catch (err: any) {
      console.error('Failed to save question', err);
      setError(err.response?.data?.detail || 'Lưu câu hỏi thất bại. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 1.5 } } }}>
      <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, color: '#0F172A' }}>
        {initialQuestion ? <EditIcon color="primary" /> : null}
        {initialQuestion ? 'Chỉnh sửa câu hỏi' : 'Tạo câu hỏi thủ công'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          {error && <Alert severity="error" sx={{ borderRadius: 1.5 }}>{error}</Alert>}

          <TextField
            label="Nội dung câu hỏi"
            multiline
            rows={3}
            variant="outlined"
            fullWidth
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField select label="Loại câu hỏi" variant="outlined" fullWidth value={type} onChange={(e) => setType(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}>
              {QUESTION_TYPES.map((qt) => (
                <MenuItem key={qt.value} value={qt.value}>{qt.label}</MenuItem>
              ))}
            </TextField>
            <TextField label="Môn học / Chủ đề" variant="outlined" fullWidth required value={subject} onChange={(e) => setSubject(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
          </Box>

          <TextField select label="Danh mục (tuỳ chọn)" variant="outlined" fullWidth value={categoryId} onChange={(e) => setCategoryId(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}>
            <MenuItem value=""><em>-- Không thuộc danh mục nào --</em></MenuItem>
            {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>

          {/* Media Attachments Section (Image, Video, Audio) */}
          <Box sx={{ border: '1px solid #E2E8F0', borderRadius: 1.5, p: 2, bgcolor: '#F8FAFC' }}>
            <Box
              onClick={() => setShowMediaSection(!showMediaSection)}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PermMedia sx={{ color: '#2563EB', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                  Đính kèm Media (Hình ảnh, Video, Audio) — Tùy chọn
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#2563EB', fontWeight: 700 }}>
                {showMediaSection ? 'Ẩn bớt ▲' : (imageUrl || videoUrl || audioUrl ? 'Đang có đính kèm (Mở) ▼' : 'Thêm đính kèm ▼')}
              </Typography>
            </Box>

            {showMediaSection && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, pt: 2, borderTop: '1px solid #E2E8F0' }}>
                <TextField
                  label="URL Hình ảnh (hoặc link ảnh trực tiếp .png, .jpg, .webp)"
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.png"
                  slotProps={{
                    input: {
                      startAdornment: <ImageIcon sx={{ fontSize: 18, color: '#64748B', mr: 1 }} />,
                    },
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.2 } }}
                />

                {imageUrl && (
                  <Box sx={{ p: 1, border: '1px dashed #CBD5E1', borderRadius: 1, textAlign: 'center', bgcolor: '#FFFFFF' }}>
                    <img src={imageUrl} alt="Xem trước ảnh" style={{ maxHeight: 160, maxWidth: '100%', objectFit: 'contain' }} onError={() => {}} />
                  </Box>
                )}

                <TextField
                  label="URL Video (Link MP4 hoặc link YouTube)"
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... hoặc https://example.com/video.mp4"
                  slotProps={{
                    input: {
                      startAdornment: <VideoLibrary sx={{ fontSize: 18, color: '#64748B', mr: 1 }} />,
                    },
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.2 } }}
                />

                <TextField
                  label="URL File Audio (Link nghe hiểu .mp3, .wav)"
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  placeholder="https://example.com/audio.mp3"
                  slotProps={{
                    input: {
                      startAdornment: <Audiotrack sx={{ fontSize: 18, color: '#64748B', mr: 1 }} />,
                    },
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.2 } }}
                />
              </Box>
            )}
          </Box>

          <Typography variant="subtitle1" sx={{ mt: 0.5, fontWeight: 700, color: '#0F172A' }}>Cấu hình đáp án</Typography>

          {(type === 'multiple_choice' || type === 'multiple_select') && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {options.map((opt, idx) => (
                <Box key={opt.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {type === 'multiple_select' ? (
                    <Checkbox checked={opt.isCorrect} onChange={(e) => handleOptionCorrectChange(idx, e.target.checked)} />
                  ) : (
                    <Radio checked={opt.isCorrect} onChange={(e) => handleOptionCorrectChange(idx, e.target.checked)} />
                  )}
                  <TextField size="small" fullWidth label={`Đáp án ${idx + 1}`} value={opt.text} onChange={(e) => handleOptionTextChange(idx, e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.2 } }} />
                  <IconButton color="error" size="small" onClick={() => handleRemoveOption(idx)} disabled={options.length <= 2}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Button startIcon={<AddIcon />} variant="outlined" sx={{ alignSelf: 'flex-start', borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }} onClick={handleAddOption}>
                Thêm đáp án
              </Button>
            </Box>
          )}

          {type === 'true_false' && (
            <RadioGroup row value={trueFalseAnswer} onChange={(e) => setTrueFalseAnswer(e.target.value)}>
              <FormControlLabel value="true" control={<Radio />} label="Đúng" />
              <FormControlLabel value="false" control={<Radio />} label="Sai" />
            </RadioGroup>
          )}

          {type === 'matching' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Typography variant="body2" color="text.secondary">
                Nhập nội dung 2 cột, sau đó chọn đáp án đúng (ý cột trái nối với ý nào ở cột phải) bên dưới.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 700, mb: 1, fontSize: '0.9rem' }}>Cột trái</Typography>
                  {leftItems.map((item, idx) => (
                    <Box key={item.id} sx={{ display: 'flex', gap: 1, mb: 1.2 }}>
                      <TextField size="small" fullWidth label={`Vế trái ${idx + 1}`} value={item.text}
                        onChange={(e) => setLeftItems(leftItems.map((it) => it.id === item.id ? { ...it, text: e.target.value } : it))}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.2 } }} />
                      <IconButton color="error" size="small" disabled={leftItems.length <= 2}
                        onClick={() => setLeftItems(leftItems.filter((it) => it.id !== item.id))}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setLeftItems([...leftItems, { id: genId('L_'), text: '' }])} sx={{ borderRadius: 1.2, textTransform: 'none' }}>Thêm vế trái</Button>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 700, mb: 1, fontSize: '0.9rem' }}>Cột phải</Typography>
                  {rightItems.map((item, idx) => (
                    <Box key={item.id} sx={{ display: 'flex', gap: 1, mb: 1.2 }}>
                      <TextField size="small" fullWidth label={`Vế phải ${idx + 1}`} value={item.text}
                        onChange={(e) => setRightItems(rightItems.map((it) => it.id === item.id ? { ...it, text: e.target.value } : it))}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.2 } }} />
                      <IconButton color="error" size="small" disabled={rightItems.length <= 2}
                        onClick={() => setRightItems(rightItems.filter((it) => it.id !== item.id))}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setRightItems([...rightItems, { id: genId('R_'), text: '' }])} sx={{ borderRadius: 1.2, textTransform: 'none' }}>Thêm vế phải</Button>
                </Box>
              </Box>

              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Đáp án đúng (nối cặp)</Typography>
              {leftItems.map((item, idx) => (
                <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography sx={{ minWidth: 140, fontWeight: 600 }}>{item.text || `Vế trái ${idx + 1}`}</Typography>
                  <Typography>→</Typography>
                  <TextField select size="small" sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: 1.2 } }} value={pairs[item.id] || ''}
                    onChange={(e) => setPairs({ ...pairs, [item.id]: e.target.value })}>
                    <MenuItem value=""><em>-- Chọn --</em></MenuItem>
                    {rightItems.map((r, i) => <MenuItem key={r.id} value={r.id}>{r.text || `Vế phải ${i + 1}`}</MenuItem>)}
                  </TextField>
                </Box>
              ))}
            </Box>
          )}

          {type === 'essay' && (
            <Alert severity="info" sx={{ borderRadius: 1.5 }}>
              Học sinh sẽ gõ trực tiếp câu trả lời hoặc chụp/tải ảnh bài làm tay. Câu tự luận cần giáo viên chấm điểm thủ công sau khi thí sinh nộp bài.
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, pt: 0 }}>
        <Button onClick={() => { resetForm(); onClose(); }} sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}>Hủy</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving} sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 700, px: 3 }}>
          {saving ? 'Đang lưu...' : (initialQuestion ? 'Lưu thay đổi' : 'Tạo câu hỏi')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
