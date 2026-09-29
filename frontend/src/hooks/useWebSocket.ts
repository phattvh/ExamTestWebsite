import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  examId: string;
  token: string;
  onQuestion: (data: any) => void;
  onAnswerSaved: (data: any) => void;
  onExamSubmitted: (data: any) => void;
  onError: (data: any) => void;
}

export const useWebSocket = ({
  examId,
  token,
  onQuestion,
  onAnswerSaved,
  onExamSubmitted,
  onError,
}: UseWebSocketOptions) => {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    setStatus('connecting');
    const socket = io(window.location.origin, {
      path: '/ws/socket.io',
      query: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connected');
    });

    socket.on('disconnect', () => {
      setStatus('disconnected');
    });

    socket.on('connect_error', (err) => {
      setStatus('error');
      onError(err);
    });

    socket.on('question', onQuestion);
    socket.on('answer_saved', onAnswerSaved);
    socket.on('exam_submitted', onExamSubmitted);
    socket.on('error', onError);

    return () => {
      socket.disconnect();
    };
  }, [examId, token, onQuestion, onAnswerSaved, onExamSubmitted, onError]);

  const joinExam = useCallback(() => {
    socketRef.current?.emit('join_exam', { exam_id: examId });
  }, [examId]);

  const startExam = useCallback(() => {
    socketRef.current?.emit('start_exam', { exam_id: examId });
  }, [examId]);

  const submitAnswer = useCallback((questionId: string, answer: string) => {
    socketRef.current?.emit('submit_answer', { exam_id: examId, question_id: questionId, answer });
  }, [examId]);

  const submitExam = useCallback(() => {
    socketRef.current?.emit('submit_exam', { exam_id: examId });
  }, [examId]);

  return { status, joinExam, startExam, submitAnswer, submitExam };
};
