import React, { createContext, useState, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';

export type QuestionType = 'multiple_choice' | 'true_false' | 'multiple_select' | 'matching' | 'essay';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface MatchingColumns {
  left: QuestionOption[];
  right: QuestionOption[];
}

export interface QuestionMedia {
  image?: string;
  video?: string;
  audio?: string;
}

export interface Question {
  id: string;
  content: string;
  type: QuestionType;
  options: QuestionOption[];
  /** Chỉ dùng với type === 'matching': 2 cột trái/phải để nối. */
  matching?: MatchingColumns;
  /** Gợi ý cho câu tự luận: cho phép chụp ảnh bài làm tay hay chỉ nhập text. */
  essayMode?: 'text' | 'photo' | 'both';
  /** Hình ảnh, video, audio đính kèm vào đề bài. */
  media?: QuestionMedia;
}

/**
 * Đáp án lưu trong state:
 * - multiple_choice / true_false: string (id đáp án được chọn)
 * - multiple_select: string[] (danh sách id đáp án được chọn)
 * - matching: [string, string][] (danh sách cặp [left_id, right_id])
 * - essay: string (nội dung text) hoặc data-URL/đường dẫn ảnh đã upload
 */
export type AnswerValue = string | string[] | [string, string][];

export interface ExamState {
  examId: string | null;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, AnswerValue>;
  status: 'idle' | 'joining' | 'in_progress' | 'submitting' | 'submitted' | 'error';
  totalQuestions: number;
  sessionId: string | null;
  attemptId: string | null;
}

interface ExamContextType {
  state: ExamState;
  setQuestions: (questions: Question[]) => void;
  setAnswer: (questionId: string, answer: AnswerValue) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  goToQuestion: (index: number) => void;
  setStatus: (status: ExamState['status']) => void;
  setExamId: (examId: string) => void;
  setAttemptId: (attemptId: string) => void;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

export const ExamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ExamState>({
    examId: null,
    questions: [],
    currentQuestionIndex: 0,
    answers: {},
    status: 'idle',
    totalQuestions: 0,
    sessionId: null,
    attemptId: null,
  });

  const setQuestions = useCallback((questions: Question[]) => {
    setState((prev) => ({ ...prev, questions, totalQuestions: questions.length }));
  }, []);

  const setAnswer = useCallback((questionId: string, answer: AnswerValue) => {
    setState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: answer }
    }));
  }, []);

  const nextQuestion = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentQuestionIndex: Math.min(prev.currentQuestionIndex + 1, prev.totalQuestions - 1)
    }));
  }, []);

  const prevQuestion = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentQuestionIndex: Math.max(prev.currentQuestionIndex - 1, 0)
    }));
  }, []);

  const goToQuestion = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      currentQuestionIndex: Math.max(0, Math.min(index, prev.totalQuestions - 1))
    }));
  }, []);

  const setStatus = useCallback((status: ExamState['status']) => {
    setState((prev) => ({ ...prev, status }));
  }, []);

  const setExamId = useCallback((examId: string) => {
    setState((prev) => ({ ...prev, examId }));
  }, []);

  const setAttemptId = useCallback((attemptId: string) => {
    setState((prev) => ({ ...prev, attemptId }));
  }, []);

  return (
    <ExamContext.Provider value={{ state, setQuestions, setAnswer, nextQuestion, prevQuestion, goToQuestion, setStatus, setExamId, setAttemptId }}>
      {children}
    </ExamContext.Provider>
  );
};

export const useExamContext = () => {
  const context = useContext(ExamContext);
  if (!context) {
    throw new Error('useExamContext must be used within an ExamProvider');
  }
  return context;
};
