import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ProctorAlert } from '../types/proctoring';

export const useProctorWebSocket = (examId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [alerts, setAlerts] = useState<ProctorAlert[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    // Trước đây thiếu token + sai "path" (chỉ "/ws" thay vì "/ws/socket.io" — phải khớp
    // đúng route nginx và cấu hình phía học sinh trong useWebSocket.ts) khiến kết nối
    // luôn bị backend từ chối ngay từ bước connect() do thiếu token bắt buộc — toàn bộ
    // ProctorDashboard trước giờ chưa từng nhận được cảnh báo vi phạm thời gian thực nào.
    const token = localStorage.getItem('access_token') || '';
    const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    const newSocket = io(wsUrl, {
      path: '/ws/socket.io',
      query: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      newSocket.emit('join_proctor_room', { exam_id: examId });
    });

    newSocket.on('proctor:alert', (alert: ProctorAlert) => {
      setAlerts((prev) => [...prev, alert]);
      setEvents((prev) => [...prev, { type: 'alert', payload: alert }]);
    });

    newSocket.on('proctor:violation', (data) => {
      setEvents((prev) => [...prev, { type: 'violation', payload: data }]);
    });

    newSocket.on('proctor:student_joined', (data) => {
      setEvents((prev) => [...prev, { type: 'student_joined', payload: data }]);
    });

    newSocket.on('proctor:student_left', (data) => {
      setEvents((prev) => [...prev, { type: 'student_left', payload: data }]);
    });

    newSocket.on('proctor:risk_update', (data) => {
      setEvents((prev) => [...prev, { type: 'risk_update', payload: data }]);
    });

    newSocket.on('error', (err) => {
      console.error('Proctor WebSocket error:', err);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [examId]);

  const clearAlerts = () => setAlerts([]);

  return { socket, alerts, clearAlerts, events };
};

/**
 * WebRTC livestream: giám thị yêu cầu xem camera trực tiếp của 1 học sinh cụ thể.
 * Luồng video truyền thẳng peer-to-peer giữa 2 trình duyệt sau khi bắt tay xong — server
 * (realtime_service) chỉ chuyển tiếp (relay) tín hiệu offer/answer/ICE, không xử lý video.
 */
export function useProctorStreamViewer(socket: Socket | null) {
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});
  const [frames, setFrames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!socket) return;

    const handleOffer = async (data: { sdp: RTCSessionDescriptionInit; from_sid: string; user_id: string }) => {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      peersRef.current[data.user_id] = pc;

      pc.ontrack = (event) => {
        setStreams((prev) => ({ ...prev, [data.user_id]: event.streams[0] }));
      };
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_ice_candidate', { target_sid: data.from_sid, candidate: event.candidate });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc_answer', { target_sid: data.from_sid, sdp: answer });
    };

    const handleIceCandidate = async (data: { candidate: RTCIceCandidateInit; from_sid: string }) => {
      Object.values(peersRef.current).forEach((pc) => {
        pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
      });
    };

    const handleStudentFrame = (data: { exam_id: string; user_id: string; frame: string; stream_type?: string }) => {
      if (data?.user_id && data?.frame) {
        setFrames((prev) => ({ ...prev, [data.user_id]: data.frame }));
      }
    };

    socket.on('webrtc_offer', handleOffer);
    socket.on('webrtc_ice_candidate', handleIceCandidate);
    socket.on('proctor:student_frame', handleStudentFrame);

    return () => {
      socket.off('webrtc_offer', handleOffer);
      socket.off('webrtc_ice_candidate', handleIceCandidate);
      socket.off('proctor:student_frame', handleStudentFrame);
      Object.values(peersRef.current).forEach((pc) => pc.close());
      peersRef.current = {};
    };
  }, [socket]);

  const requestStream = useCallback(
    (examId: string, userId: string, streamType: 'camera' | 'screen' | 'both' = 'camera') => {
      socket?.emit('webrtc_request_stream', { exam_id: examId, user_id: userId, stream_type: streamType });
    },
    [socket],
  );

  const stopStream = useCallback((userId: string) => {
    peersRef.current[userId]?.close();
    delete peersRef.current[userId];
    setStreams((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }, []);

  return { streams, frames, requestStream, stopStream };
}
