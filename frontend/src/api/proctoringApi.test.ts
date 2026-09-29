import { describe, expect, it, vi, beforeEach } from 'vitest';
import { proctoringApi } from './proctoringApi';
import apiClient from './apiClient';

vi.mock('./apiClient', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('proctoringApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a payload that matches the backend proctoring schema', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });

    await proctoringApi.sendViolationEvent({
      exam_id: '11111111-1111-1111-1111-111111111111',
      type: 'tab_switch',
      severity: 'medium',
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/v1/proctoring/events',
      expect.objectContaining({
        exam_id: '11111111-1111-1111-1111-111111111111',
        type: 'tab_switch',
        severity: 'medium',
        details: expect.objectContaining({ source: 'browser' }),
        screenshot_url: null,
        device_info: expect.objectContaining({ userAgent: expect.any(String) }),
      }),
    );
  });
});
