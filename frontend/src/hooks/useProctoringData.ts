import { useState, useEffect } from 'react';
import { proctoringApi } from '../api/proctoringApi';
import apiClient from '../api/apiClient';
import { adminApi } from '../api/adminApi';
import type { StudentSession, Violation } from '../types/proctoring';
import { useProctorWebSocket } from './useProctorWebSocket';

export const useProctoringData = (examId: string) => {
  const [students, setStudents] = useState<StudentSession[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userMap, setUserMap] = useState<Record<string, { full_name?: string; username?: string }>>({});

  const { socket, alerts, clearAlerts, events } = useProctorWebSocket(examId);

  // Tải trước danh sách người dùng để tra tên thật theo user_id — trước đây hiển thị
  // tên giả "Student xxxx" (và field "name" còn không khớp với field StudentCard đọc
  // là "full_name"/"username", nên trước giờ luôn hiện thẳng user_id thô cho giám thị).
  useEffect(() => {
    adminApi.getUsers()
      .then((users) => {
        const map: Record<string, { full_name?: string; username?: string }> = {};
        (users || []).forEach((u: any) => {
          map[u.id] = { full_name: u.full_name, username: u.username };
        });
        setUserMap(map);
      })
      .catch((err) => console.error('Không tải được danh sách người dùng để hiện tên học sinh:', err));
  }, []);

  const [refreshing, setRefreshing] = useState(false);

  const fetchInitialData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      // Fetch violations first
      const violationsData = await proctoringApi.getViolations(examId);
      setViolations(violationsData);

      // Calculate violation counts and risk scores per user
      const violationCounts: Record<string, number> = {};
      const riskScores: Record<string, number> = {};
      const severityWeights: Record<string, number> = { critical: 10, high: 5, medium: 2, low: 1 };

      (violationsData || []).forEach((v) => {
        violationCounts[v.user_id] = (violationCounts[v.user_id] || 0) + 1;
        const w = severityWeights[v.severity] || 0;
        riskScores[v.user_id] = (riskScores[v.user_id] || 0) + w;
      });

      // Fetch online students
      let serverStudents: any[] = [];
      let userIds: string[] = [];
      try {
        const studentsRes = await apiClient.get(`/v1/realtime/exams/${examId}/students`);
        serverStudents = studentsRes.data.students || [];
        userIds = studentsRes.data.online_students || [];
      } catch (err) {
        console.warn('Could not fetch realtime students, falling back to violations roster:', err);
      }

      // Hợp nhất toàn bộ thí sinh: từ danh sách online thực tế + từ các bản ghi vi phạm trong bài thi
      const allUserIds = Array.from(new Set([
        ...userIds,
        ...Object.keys(violationCounts),
        ...Object.keys(riskScores)
      ]));

      const mappedStudents: StudentSession[] = allUserIds.map((id: string) => {
        const found = serverStudents.find((s: any) => s.user_id === id);
        const isOnline = userIds.includes(id);
        return {
          user_id: id,
          full_name: found?.full_name || userMap[id]?.full_name || 'Thí sinh',
          username: found?.username || userMap[id]?.username || 'student',
          ip: found?.ip || '127.0.0.1',
          is_online: isOnline,
          risk_score: riskScores[id] || 0,
          violations_count: violationCounts[id] || 0,
        };
      });
      
      setStudents(mappedStudents);
    } catch (error: any) {
      if (error.response && error.response.status === 403) {
        setUnauthorized(true);
      } else {
        setError('Failed to establish connection to the proctoring server. Please refresh and try again.');
      }
      console.error('Error fetching proctoring data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (examId) {
      fetchInitialData();
    }
  }, [examId]);

  useEffect(() => {
    if (events.length > 0) {
      const lastEvent = events[events.length - 1];
      if (lastEvent.type === 'student_joined') {
        const payload = lastEvent.payload;
        setStudents((prev) => {
          const exists = prev.find((s) => s.user_id === payload.user_id);
          if (exists) {
            return prev.map((s) => s.user_id === payload.user_id ? {
              ...s,
              is_online: true,
              full_name: payload.full_name || userMap[payload.user_id]?.full_name || s.full_name,
              username: payload.username || userMap[payload.user_id]?.username || s.username,
              ip: payload.ip || s.ip,
            } : s);
          }
          return [
            ...prev,
            {
              user_id: payload.user_id,
              full_name: payload.full_name || userMap[payload.user_id]?.full_name || 'Thí sinh',
              username: payload.username || userMap[payload.user_id]?.username || 'student',
              ip: payload.ip || '127.0.0.1',
              is_online: true,
              risk_score: 0,
              violations_count: 0,
            }
          ];
        });
      } else if (lastEvent.type === 'student_left') {
        setStudents((prev) => prev.map((s) => s.user_id === lastEvent.payload.user_id ? { ...s, is_online: false } : s));
      } else if (lastEvent.type === 'violation') {
        const payload = lastEvent.payload;
        const studentInfo = students.find((s) => s.user_id === payload.user_id);
        const newViolation: Violation = {
          id: payload.violation_id || String(Date.now()),
          exam_id: payload.exam_id,
          exam_session_id: payload.exam_session_id || '',
          user_id: payload.user_id,
          full_name: payload.full_name || userMap[payload.user_id]?.full_name || studentInfo?.full_name,
          username: payload.username || userMap[payload.user_id]?.username || studentInfo?.username,
          ip: payload.ip || studentInfo?.ip || '127.0.0.1',
          type: payload.type || 'violation',
          severity: payload.severity || 'medium',
          timestamp: payload.timestamp || new Date().toISOString(),
          details: payload.details || {},
        };
        setViolations((prev) => [newViolation, ...prev]);
        setStudents((prev) => {
          const exists = prev.find((s) => s.user_id === payload.user_id);
          if (!exists) {
            return [
              ...prev,
              {
                user_id: payload.user_id,
                full_name: payload.full_name || userMap[payload.user_id]?.full_name || 'Thí sinh',
                username: payload.username || userMap[payload.user_id]?.username || 'student',
                ip: payload.ip || '127.0.0.1',
                is_online: true,
                risk_score: payload.risk_score || 0,
                violations_count: 1,
              }
            ];
          }
          return prev.map((s) =>
            s.user_id === payload.user_id
              ? {
                  ...s,
                  violations_count: (s.violations_count || 0) + 1,
                  risk_score: payload.risk_score !== undefined ? payload.risk_score : (s.risk_score || 0),
                }
              : s
          );
        });
      } else if (lastEvent.type === 'risk_update') {
        setStudents((prev) =>
          prev.map((s) =>
            s.user_id === lastEvent.payload.user_id
              ? { ...s, risk_score: lastEvent.payload.risk_score }
              : s
          )
        );
      }
    }
  }, [events, userMap, students]);

  return {
    students,
    violations,
    alerts,
    clearAlerts,
    loading,
    refreshing,
    refetch: () => fetchInitialData(true),
    unauthorized,
    error,
    socket,
  };
};
