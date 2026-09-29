import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * Phía học sinh: lắng nghe yêu cầu livestream từ giám thị, khi có yêu cầu thì tạo
 * RTCPeerConnection gửi luồng camera (đã xin quyền sẵn từ useProctoring) tới giám thị.
 * Không tự chủ động gửi video cho ai — chỉ phản hồi khi CÓ yêu cầu cụ thể, và học sinh
 * đã được thông báo rõ đang bị giám sát camera (khung camera hiện trong ExamRoom).
 */
export function useProctorStreamBroadcaster(
  examId: string,
  stream: MediaStream | null,
  onProctorAction?: (data: { action: string; reason?: string; penalty_percent?: number; penalty_minutes?: number }) => void
) {
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const screenStreamRef = useRef<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(stream);
  const onProctorActionRef = useRef(onProctorAction);

  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  useEffect(() => {
    onProctorActionRef.current = onProctorAction;
  }, [onProctorAction]);

  useEffect(() => {
    if (!examId) return;

    const token = localStorage.getItem('access_token') || '';
    let userId = '';
    try {
      if (token) {
        const payload = JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1]))));
        userId = String(payload.sub || payload.id || payload.user_id || '');
      }
    } catch {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = String(payload.sub || payload.id || payload.user_id || '');
      } catch {}
    }

    const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    const socket = io(wsUrl, {
      path: '/ws/socket.io',
      query: { token },
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    const sendJoin = () => {
      socket.emit('join_exam', { exam_id: examId });
    };

    socket.on('connect', sendJoin);
    if (socket.connected) {
      sendJoin();
    }

    const captureStreamSnapshot = (mediaStream: MediaStream | null): string | null => {
      if (!mediaStream || !mediaStream.active) return null;
      try {
        const video = document.createElement('video');
        video.srcObject = mediaStream;
        video.muted = true;
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(video, 0, 0, 320, 240);
        return canvas.toDataURL('image/jpeg', 0.6);
      } catch {
        return null;
      }
    };

    const handleStreamRequested = async (data: { proctor_sid: string; stream_type?: string; target_user_id?: string }) => {
      if (data.target_user_id && userId && data.target_user_id !== userId) {
        return;
      }

      let activeStream: MediaStream | null = streamRef.current;
      const reqType = data.stream_type || 'camera';

      if (reqType === 'screen' || reqType === 'both') {
        try {
          if (!screenStreamRef.current || !screenStreamRef.current.active) {
            if (window.electronAPI) {
              const sources = await window.electronAPI.getDesktopSources();
              const primarySource = sources[0];
              if (primarySource) {
                screenStreamRef.current = await (navigator.mediaDevices as any).getUserMedia({
                  audio: false,
                  video: {
                    mandatory: {
                      chromeMediaSource: 'desktop',
                      chromeMediaSourceId: primarySource.id,
                      maxFrameRate: 15,
                    },
                  },
                });
              }
            }
            if (!screenStreamRef.current || !screenStreamRef.current.active) {
              screenStreamRef.current = await navigator.mediaDevices.getDisplayMedia({
                video: { frameRate: 15 },
                audio: false,
              });
            }
          }
          if (reqType === 'screen') {
            activeStream = screenStreamRef.current;
          }
        } catch (e) {
          console.warn('Screen share cancelled or not allowed, falling back to camera', e);
          activeStream = streamRef.current;
        }
      }

      if (!activeStream) {
        try {
          activeStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
          streamRef.current = activeStream;
        } catch (err) {
          console.error('Failed to get fallback camera stream:', err);
        }
      }

      if (!activeStream) return;

      // Broadcast an immediate snapshot frame
      const snap = captureStreamSnapshot(activeStream);
      if (snap) {
        socket.emit('student_live_frame', {
          exam_id: examId,
          user_id: userId,
          frame: snap,
          stream_type: reqType,
        });
      }

      if (peersRef.current[data.proctor_sid]) {
        peersRef.current[data.proctor_sid].close();
      }

      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] });
      peersRef.current[data.proctor_sid] = pc;

      activeStream.getTracks().forEach((track) => pc.addTrack(track, activeStream!));
      if (reqType === 'both' && streamRef.current && activeStream !== streamRef.current) {
        streamRef.current.getTracks().forEach((track) => pc.addTrack(track, streamRef.current!));
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_ice_candidate', { target_sid: data.proctor_sid, candidate: event.candidate });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc_offer', { target_sid: data.proctor_sid, sdp: offer, user_id: userId });
    };

    const handleAnswer = async (data: { sdp: RTCSessionDescriptionInit; from_sid: string }) => {
      const pc = peersRef.current[data.from_sid];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    };

    const handleIceCandidate = (data: { candidate: RTCIceCandidateInit; from_sid: string }) => {
      const pc = peersRef.current[data.from_sid];
      pc?.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
    };

    const handleProctorAction = (data: any) => {
      if (!data) return;
      console.log('[Student Broadcaster] Nhận lệnh kỷ luật từ Giám thị:', data);
      onProctorActionRef.current?.(data);
    };

    let isBroadcasting = false;
    const frameInterval = setInterval(async () => {
      if (!socket.connected || isBroadcasting) return;
      isBroadcasting = true;

      try {
        // Ưu tiên chụp trực tiếp toàn bộ màn hình máy tính thật từ Electron desktopCapturer
        if (window.electronAPI?.captureScreenFrame) {
          try {
            const screenSnap = await window.electronAPI.captureScreenFrame();
            if (screenSnap) {
              socket.emit('student_live_frame', {
                exam_id: examId,
                user_id: userId,
                frame: screenSnap,
                stream_type: 'screen',
              });
              return;
            }
          } catch (err) {
            console.warn('Lỗi chụp màn hình Electron:', err);
          }
        }

        // Fallback khi chạy web thông thường
        const active = streamRef.current || screenStreamRef.current;
        if (active && active.active) {
          const snap = captureStreamSnapshot(active);
          if (snap) {
            socket.emit('student_live_frame', {
              exam_id: examId,
              user_id: userId,
              frame: snap,
              stream_type: 'camera',
            });
          }
        }
      } finally {
        isBroadcasting = false;
      }
    }, 1200);

    socket.on('webrtc_stream_requested', handleStreamRequested);
    socket.on('webrtc_answer', handleAnswer);
    socket.on('webrtc_ice_candidate', handleIceCandidate);
    socket.on('student:proctor_action', handleProctorAction);

    return () => {
      clearInterval(frameInterval);
      Object.values(peersRef.current).forEach((pc) => pc.close());
      peersRef.current = {};
      socket.disconnect();
    };
  }, [examId]);
}
