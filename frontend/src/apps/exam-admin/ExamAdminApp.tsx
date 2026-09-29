import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar, Avatar, Box, Button, Chip, Container, Divider, Grid, IconButton,
  LinearProgress, List, ListItem, ListItemAvatar, ListItemText, Paper,
  Snackbar, Stack, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Toolbar, Tooltip,
  Typography,
} from '@mui/material';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import SpeedIcon from '@mui/icons-material/Speed';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

import BoltIcon from '@mui/icons-material/Bolt';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../../api/client';
import type { Exam } from './store';
import { deleteExam, flushQueue, loadExams, newId, pendingCount, upsertExam } from './store';

type TabValue = 'dashboard' | 'exams' | 'speedtest';

const STATUS_COLOR: Record<Exam['status'], 'default' | 'warning' | 'success' | 'info'> = {
  draft: 'default', scheduled: 'info', live: 'success', ended: 'warning',
};

const fmtDate = (ts: number) => new Date(ts).toLocaleString('vi-VN');

export default function ExamAdminApp() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabValue>('dashboard');
  const [exams, setExams] = useState<Exam[]>(loadExams);
  const [snack, setSnack] = useState<string | null>(null);
  const [pending, setPending] = useState(pendingCount);

  // Background sync: push offline queue to gateway every 5s while app is open.
  const sync = useCallback(() => {
    const n = flushQueue(async (item) => {
      await api.post('/exam-admin/sync', item); // 404 -> queue giữ lại, không mất dữ liệu
    });
    if (n > 0) setTimeout(() => setPending(pendingCount()), 1200);
  }, []);
  useEffect(() => {
    sync();
    const t = setInterval(sync, 5000);
    return () => clearInterval(t);
  }, [sync]);

  const stats = useMemo(() => ({
    total: exams.length,
    live: exams.filter((e) => e.status === 'live').length,
    questions: exams.reduce((s, e) => s + e.questions.length, 0),
  }), [exams]);

  const createExam = () => {
    const exam: Exam = {
      id: newId(), title: `Đề thi mới ${exams.length + 1}`, durationMin: 45,
      shuffle: true, status: 'draft', questions: [], updatedAt: Date.now(), syncStatus: 'pending',
    };
    setExams(upsertExam(exam));
    setPending(pendingCount());
    setSnack('Đã tạo đề (lưu tức thì, tự đồng bộ nền)');
  };

  const patchExam = (id: string, patch: Partial<Exam>) => {
    const target = exams.find((e) => e.id === id);
    if (!target) return;
    setExams(upsertExam({ ...target, ...patch }));
    setPending(pendingCount());
  };

  const removeExam = (id: string) => {
    setExams(deleteExam(id));
    setPending(pendingCount());
    setSnack('Đã xoá đề thi');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100' }}>
      <AppBar position="sticky" color="primary">
        <Toolbar>
          <BoltIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            VJP Pro — App Quản Lý Siêu Cấp
          </Typography>
          <Tooltip title={`Đồng bộ: ${pending} thay đổi chờ đẩy lên server`}>
            <Chip size="small" color={pending ? 'warning' : 'success'}
              icon={<CloudSyncIcon />} label={pending ? `${pending} pending` : 'Đã đồng bộ'}
              sx={{ mr: 2, bgcolor: pending ? undefined : 'rgba(255,255,255,.2)', color: '#fff' }} />
          </Tooltip>
          <Button color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')}>
            Về trang cá nhân
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
          <Tab value="dashboard" label="Tổng quan" />
          <Tab value="exams" label="Quản lý đề thi" />
          <Tab value="speedtest" label="Speed Test" />
        </Tabs>

        {tab === 'dashboard' && (
          <Grid container spacing={3}>
            {[
              { label: 'Tổng số đề', value: stats.total },
              { label: 'Đang diễn ra', value: stats.live },
              { label: 'Tổng câu hỏi', value: stats.questions },
              { label: 'Thao tác chờ đồng bộ', value: pending },
            ].map((c) => (
              <Grid key={c.label} size={{ xs: 6, md: 3 }}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h3">{c.value}</Typography>
                  <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                </Paper>
              </Grid>
            ))}
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>Hoạt động gần đây</Typography>
                <List dense>
                  {exams.slice(0, 5).map((e) => (
                    <ListItem key={e.id}>
                      <ListItemAvatar><Avatar>{e.title[0]}</Avatar></ListItemAvatar>
                      <ListItemText primary={e.title} secondary={`${fmtDate(e.updatedAt)} • ${e.questions.length} câu`} />
                      <Chip size="small" color={STATUS_COLOR[e.status]} label={e.status} />
                    </ListItem>
                  ))}
                  {!exams.length && <ListItem><ListItemText secondary="Chưa có đề thi. Sang tab “Quản lý đề thi” để tạo." /></ListItem>}
                </List>
              </Paper>
            </Grid>
          </Grid>
        )}

        {tab === 'exams' && (
          <Stack spacing={2}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="h6">Ngân hàng đề ({exams.length})</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={createExam}>Tạo đề nhanh</Button>
            </Stack>
            {exams.map((e) => (
              <Paper key={e.id} sx={{ p: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: "center" }}>
                  <TextField size="small" label="Tên đề" value={e.title} sx={{ minWidth: 260 }}
                    onChange={(ev) => patchExam(e.id, { title: ev.target.value })} />
                  <TextField size="small" type="number" label="Thời gian (phút)" value={e.durationMin}
                    slotProps={{ htmlInput: { min: 5, max: 180 } }} sx={{ width: 140 }}
                    onChange={(ev) => patchExam(e.id, { durationMin: Number(ev.target.value) || 5 })} />
                  <ToggleButtonGroup exclusive size="small" value={e.status}
                    onChange={(_, v) => v && patchExam(e.id, { status: v })}>
                    {(['draft', 'scheduled', 'live', 'ended'] as const).map((s) => (
                      <ToggleButton key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                  <Chip size="small" color={STATUS_COLOR[e.status]} label={`${e.questions.length} câu`} />
                  <Box sx={{ flexGrow: 1 }} />
                  <Tooltip title="Xoá đề">
                    <IconButton color="error" onClick={() => removeExam(e.id)}><DeleteIcon /></IconButton>
                  </Tooltip>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}

        {tab === 'speedtest' && <SpeedTest onStart={() => setTab('exams')} />}
      </Container>

      <Snackbar open={!!snack} autoHideDuration={2500} onClose={() => setSnack(null)}
        message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}

function SpeedTest({ onStart }: { onStart: () => void }) {
  const [results, setResults] = useState<{ url: string; ms: number | null }[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    const targets = ['/health', '/openapi.json'];
    const out: { url: string; ms: number | null }[] = [];
    for (const path of targets) {
      const t0 = performance.now();
      try {
        await api.get(path, { timeout: 5000 });
        out.push({ url: path, ms: Math.round(performance.now() - t0) });
      } catch {
        out.push({ url: path, ms: null });
      }
    }
    setResults(out);
    setRunning(false);
  };

  const best = results.filter((r) => r.ms !== null).map((r) => r.ms as number).sort((a, b) => a - b)[0];

  return (
    <Paper sx={{ p: 3, maxWidth: 560, mx: 'auto' }}>
      <Stack spacing={2} sx={{ alignItems: "center" }}>
        <SpeedIcon fontSize="large" color="primary" />
        <Typography variant="h6">Kiểm tra tốc độ kết nối tới server thi</Typography>
        <Typography variant="body2" color="text.secondary" align="center">
          Đo RTT qua API Gateway. Dưới 150ms: sẵn sàng vào thi. Trên mức này nên dùng chế độ dự phòng.
        </Typography>
        <Button variant="contained" onClick={run} disabled={running}>{running ? 'Đang đo…' : 'Đo tốc độ'}</Button>
        {running && <LinearProgress sx={{ width: '100%' }} />}
        {results.map((r) => (
          <Typography key={r.url} variant="body2">
            {r.url}: {r.ms === null ? 'không phản hồi' : `${r.ms} ms`}
          </Typography>
        ))}
        {best !== undefined && (
          <Chip color={best < 150 ? 'success' : 'warning'}
            label={best < 150 ? `Tốt — RTT ${best}ms` : `Chậm — RTT ${best}ms, cân nhắc chia ca thi`} />
        )}
        <Divider sx={{ width: '100%' }} />
        <Button onClick={onStart}>Vào quản lý đề thi ngay</Button>
      </Stack>
    </Paper>
  );
}
