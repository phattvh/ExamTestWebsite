import apiClient from './apiClient';
import type { AnswerValue } from '../context/ExamContext';

export interface Exam {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  max_attempts: number;
  passing_score?: number;
  status?: string;
  created_at?: string;
  has_password?: boolean;
  enable_proctoring?: boolean;
}

export async function getPublishedExams(): Promise<Exam[]> {
  const response = await apiClient.get('/v1/exams/', {
    params: { status: 'published' }
  });
  return response.data;
}

export async function getExamById(examId: string): Promise<Exam> {
  const response = await apiClient.get(`/v1/exams/${examId}`);
  return response.data;
}

// Shape thật trả về từ backend (đã "làm giàu" nội dung câu hỏi từ question_service) —
// khớp với schemas.ExamQuestionDetail phía exam_service.
export interface ExamQuestionDetail {
  id: string;
  question_id: string;
  question_order?: number;
  point_value: number;
  type: 'multiple_choice' | 'true_false' | 'multiple_select' | 'matching' | 'essay';
  content: { text?: string; image?: string; latex?: string };
  options: { id: string; text: string; is_correct?: boolean }[];
  correct_answer: string | string[] | null; // luôn null với học sinh
}

export async function getExamQuestions(examId: string): Promise<ExamQuestionDetail[]> {
  const response = await apiClient.get(`/v1/exams/${examId}/questions`);
  return response.data;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  user_id: string;
  attempt_number: number;
  status: string;
  started_at: string;
  expires_at: string;
}

export async function startExam(examId: string, password?: string): Promise<ExamAttempt> {
  const response = await apiClient.post(`/v1/exams/${examId}/start`, password ? { password } : {});
  return response.data;
}

/**
 * Lưu đáp án. Backend chỉ lưu chuỗi (Text) nên đáp án dạng mảng (chọn nhiều đáp án,
 * nối cột) được JSON-encode trước khi gửi — grading_engine.py sẽ JSON-decode lại khi chấm.
 */
export async function saveAnswer(attemptId: string, questionId: string, answer: AnswerValue) {
  const encoded = typeof answer === 'string' ? answer : JSON.stringify(answer);
  const response = await apiClient.post(`/v1/exams/attempts/${attemptId}/answers`, {
    question_id: questionId,
    selected_answer: encoded
  });
  return response.data;
}

export async function submitExam(attemptId: string) {
  const response = await apiClient.post(`/v1/exams/attempts/${attemptId}/submit`);
  return response.data;
}

export const examApi = {
  getPublishedExams,
  getExamById,
  getExamQuestions,
  startExam,
  saveAnswer,
  submitExam,
};
