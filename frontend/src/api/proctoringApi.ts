import apiClient from './apiClient';

export interface ViolationEvent {
  exam_id: string;
  exam_session_id?: string;
  type: string;
  severity: string;
  details?: Record<string, any>;
  screenshot_url?: string | null;
  device_info?: Record<string, any>;
}

export const proctoringApi = {
  sendViolationEvent: async (data: ViolationEvent): Promise<void> => {
    const browserInfo =
      typeof window !== 'undefined' && window.navigator
        ? {
            userAgent: window.navigator.userAgent || 'unknown',
            platform: window.navigator.platform || 'unknown',
          }
        : {
            userAgent: 'unknown',
            platform: 'unknown',
          };

    const payload = {
      ...data,
      details: data.details ?? { source: 'browser' },
      screenshot_url: data.screenshot_url ?? null,
      device_info: data.device_info ?? browserInfo,
    };

    await apiClient.post(`/v1/proctoring/events`, payload);
  },
  getViolations: async (examId: string): Promise<any[]> => {
    const response = await apiClient.get(`/v1/proctoring/exams/${examId}/violations`);
    return response.data;
  },
  getRisk: async (examId: string, userId: string): Promise<any> => {
    const response = await apiClient.get(`/v1/proctoring/exams/${examId}/students/${userId}/risk`);
    return response.data;
  }
};
