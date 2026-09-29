import apiClient from './apiClient';

export interface QuestionResult {
  question_id: string;
  is_correct: boolean;
  user_answer: string;
  point_earned: number;
  point_possible: number;
  needs_manual_grading?: boolean;
}

export interface ExamResult {
  exam_id: string;
  score: number;
  total_possible: number;
  percentage: number;
  correct_count: number;
  incorrect_count: number;
  has_pending_manual_grading?: boolean;
  question_results: QuestionResult[];
}

export interface PendingManualGradeItem {
  result_id: string;
  attempt_id: string;
  exam_id: string;
  user_id: string;
  question_id: string;
  user_answer: string | null;
  point_possible: number;
}

export const gradingApi = {
  getMyResults: async (): Promise<any[]> => {
    const response = await apiClient.get('/v1/results/user/my-results');
    return response.data;
  },
  getExamResult: async (attemptId: string): Promise<ExamResult> => {
    const response = await apiClient.get(`/v1/grading/result/${attemptId}`);
    return response.data;
  },
  getPendingManualGrading: async (examId?: string): Promise<PendingManualGradeItem[]> => {
    const response = await apiClient.get('/v1/grading/pending-manual', { params: examId ? { exam_id: examId } : {} });
    return response.data;
  },
  manualGradeQuestion: async (resultId: string, questionId: string, pointEarned: number, note?: string) => {
    const response = await apiClient.post(`/v1/grading/manual-grade/${resultId}/${questionId}`, {
      point_earned: pointEarned,
      note,
    });
    return response.data;
  },
};
