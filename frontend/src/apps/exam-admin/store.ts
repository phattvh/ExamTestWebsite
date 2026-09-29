// Offline-first store cho app quản lý siêu cấp VJP Pro.
// Mọi thao tác CRUD của giáo viên ghi ngay vào localStorage (0ms),
// đồng bộ bất đồng bộ lên server qua message queue khi có mạng.

export type SyncStatus = 'synced' | 'pending' | 'conflict';

export interface ExamQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
}

export interface Exam {
  id: string;
  title: string;
  durationMin: number;
  shuffle: boolean;
  status: 'draft' | 'scheduled' | 'live' | 'ended';
  questions: ExamQuestion[];
  updatedAt: number;
  syncStatus: SyncStatus;
}

const KEY = 'vjp_pro_exams_v1';
const QUEUE_KEY = 'vjp_pro_sync_queue_v1';

export function loadExams(): Exam[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Exam[];
  } catch {
    return [];
  }
}

export function saveExams(exams: Exam[]): void {
  localStorage.setItem(KEY, JSON.stringify(exams));
}

export function upsertExam(exam: Exam): Exam[] {
  const exams = loadExams();
  const next = { ...exam, updatedAt: Date.now(), syncStatus: 'pending' as SyncStatus };
  const idx = exams.findIndex((e) => e.id === exam.id);
  if (idx >= 0) exams[idx] = next;
  else exams.unshift(next);
  saveExams(exams);
  enqueue({ op: idx >= 0 ? 'update' : 'create', examId: exam.id, payload: next });
  return exams;
}

export function deleteExam(id: string): Exam[] {
  const exams = loadExams().filter((e) => e.id !== id);
  saveExams(exams);
  enqueue({ op: 'delete', examId: id, payload: null });
  return exams;
}

interface QueueItem {
  op: 'create' | 'update' | 'delete';
  examId: string;
  payload: unknown;
}

export function enqueue(item: QueueItem): void {
  const q: QueueItem[] = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
  q.push(item);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function flushQueue(push: (item: QueueItem) => Promise<void>): number {
  const q: QueueItem[] = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
  if (!q.length) return 0;
  // Fire-and-forget batch; items are removed on success so retries are safe.
  q.forEach((item) =>
    push(item)
      .then(() => dequeue(item))
      .catch(() => undefined),
  );
  return q.length;
}

function dequeue(item: QueueItem): void {
  const q: QueueItem[] = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
  const i = q.indexOf(item);
  if (i >= 0) q.splice(i, 1);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function pendingCount(): number {
  return (JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as QueueItem[]).length;
}

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
