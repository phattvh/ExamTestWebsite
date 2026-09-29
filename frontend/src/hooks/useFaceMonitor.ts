import { useEffect, useRef, useState, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

/**
 * Giám sát khuôn mặt thời gian thực bằng MediaPipe Face Landmarker (chạy hoàn toàn
 * trong trình duyệt, không gửi hình ảnh lên server nào — chỉ gửi SỰ KIỆN vi phạm).
 *
 * Model + file WASM được MediaPipe tự tải từ CDN chính thức của Google lúc chạy
 * (không cần tự host) — đây là cách dùng chuẩn của gói @mediapipe/tasks-vision.
 *
 * Phát hiện được:
 * - Không có mặt nào trong khung hình (rời khỏi màn hình / che camera)
 * - Nhiều hơn 1 mặt trong khung hình (có người khác trong phòng)
 * - Quay mặt đi khỏi màn hình quá lâu (ước lượng góc quay đầu từ landmark 3D)
 * - Hướng nhìn lệch khỏi màn hình (ước lượng thô từ vị trí tâm mống mắt so với
 *   khoé mắt — MediaPipe Face Landmarker có sẵn 4 điểm mống mắt khi bật
 *   outputFaceBlendshapes, đủ để ước lượng hướng nhìn tương đối, KHÔNG phải
 *   eye-tracking chính xác cấp nghiên cứu như các thiết bị chuyên dụng).
 */

export type FaceViolationType =
  | 'no_face_detected'
  | 'multiple_faces_detected'
  | 'face_turned_away'
  | 'gaze_away_from_screen';

interface UseFaceMonitorOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  onViolation: (type: FaceViolationType, details: Record<string, any>) => void;
  /** Số khung hình liên tiếp vi phạm mới báo (tránh báo giả do rung/chớp mắt 1 frame) */
  sustainedFrames?: number;
  /** Khoảng cách tối thiểu (ms) giữa 2 lần báo cùng loại vi phạm */
  cooldownMs?: number;
}

const YAW_THRESHOLD_DEG = 15; // Quay đầu sang trái/phải quá 15 độ
const PITCH_THRESHOLD_DEG = 14; // Cúi đầu nhìn xuống tài liệu/điện thoại hoặc ngửa đầu quá 14 độ
const GAZE_THRESHOLD_RATIO = 0.16; // Liếc mắt sang bên cạnh/nhìn lệch màn hình

export function useFaceMonitor({
  videoRef,
  enabled,
  onViolation,
  sustainedFrames = 3,
  cooldownMs = 3000,
}: UseFaceMonitorOptions) {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'running' | 'error'>('idle');
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastViolationAtRef = useRef<Record<string, number>>({});
  const consecutiveCountRef = useRef<Record<string, number>>({});

  const maybeReport = useCallback((type: FaceViolationType, details: Record<string, any>) => {
    const now = Date.now();
    const count = (consecutiveCountRef.current[type] || 0) + 1;
    consecutiveCountRef.current[type] = count;

    if (count < sustainedFrames) return;

    const lastAt = lastViolationAtRef.current[type] || 0;
    if (now - lastAt < cooldownMs) return;

    lastViolationAtRef.current[type] = now;
    onViolation(type, details);
  }, [onViolation, sustainedFrames, cooldownMs]);

  const resetCounter = useCallback((type: FaceViolationType) => {
    consecutiveCountRef.current[type] = 0;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const init = async () => {
      try {
        setStatus('loading');
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: 'VIDEO',
          numFaces: 2, // dò tối đa 2 mặt là đủ để phát hiện "có người thứ 2"
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setReady(true);
        setStatus('running');
      } catch (err) {
        console.error('Không khởi tạo được Face Landmarker:', err);
        setStatus('error');
      }
    };

    init();

    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      setReady(false);
    };
  }, [enabled]);

  useEffect(() => {
    if (!ready || !enabled) return;

    let lastVideoTime = -1;

    const loop = () => {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;

      if (video && landmarker && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const result = landmarker.detectForVideo(video, performance.now());

        const faceCount = result.faceLandmarks?.length || 0;

        if (faceCount === 0) {
          maybeReport('no_face_detected', {});
          resetCounter('multiple_faces_detected');
          resetCounter('face_turned_away');
          resetCounter('gaze_away_from_screen');
        } else {
          resetCounter('no_face_detected');

          if (faceCount > 1) {
            maybeReport('multiple_faces_detected', { face_count: faceCount });
          } else {
            resetCounter('multiple_faces_detected');
          }

          // Ước lượng góc quay đầu (yaw) và cúi đầu (pitch) từ ma trận biến đổi khuôn mặt
          const matrix = result.facialTransformationMatrixes?.[0]?.data;
          if (matrix && matrix.length >= 16) {
            const yawRad = Math.atan2(-matrix[2], matrix[0]);
            const yawDeg = Math.abs((yawRad * 180) / Math.PI);

            const pitchRad = Math.atan2(matrix[6], matrix[10]);
            const pitchDeg = Math.abs((pitchRad * 180) / Math.PI);

            if (yawDeg > YAW_THRESHOLD_DEG || pitchDeg > PITCH_THRESHOLD_DEG) {
              maybeReport('face_turned_away', {
                yaw_degrees: Math.round(yawDeg),
                pitch_degrees: Math.round(pitchDeg),
                direction: pitchDeg > PITCH_THRESHOLD_DEG ? 'Cúi đầu nhìn xuống' : 'Quay mặt sang bên',
              });
            } else {
              resetCounter('face_turned_away');
            }
          }

          // Ước lượng hướng liếc mắt (gaze) từ vị trí mống mắt trái & phải
          const lm = result.faceLandmarks[0];
          if (lm && lm.length > 473) {
            // Mắt trái: mống mắt 468, khóe mắt 33, 133
            const leftIrisX = lm[468]?.x;
            const leftEyeInner = lm[133]?.x;
            const leftEyeOuter = lm[33]?.x;

            // Mắt phải: mống mắt 473, khóe mắt 362, 263
            const rightIrisX = lm[473]?.x;
            const rightEyeInner = lm[362]?.x;
            const rightEyeOuter = lm[263]?.x;

            let isGazingAway = false;
            let maxOffset = 0;

            if (leftIrisX !== undefined && leftEyeInner !== undefined && leftEyeOuter !== undefined) {
              const eyeWidth = Math.abs(leftEyeOuter - leftEyeInner) || 1;
              const irisOffset = (leftIrisX - (leftEyeInner + leftEyeOuter) / 2) / eyeWidth;
              if (Math.abs(irisOffset) > GAZE_THRESHOLD_RATIO) {
                isGazingAway = true;
                maxOffset = Math.abs(irisOffset);
              }
            }

            if (rightIrisX !== undefined && rightEyeInner !== undefined && rightEyeOuter !== undefined) {
              const eyeWidth = Math.abs(rightEyeOuter - rightEyeInner) || 1;
              const irisOffset = (rightIrisX - (rightEyeInner + rightEyeOuter) / 2) / eyeWidth;
              if (Math.abs(irisOffset) > GAZE_THRESHOLD_RATIO) {
                isGazingAway = true;
                maxOffset = Math.max(maxOffset, Math.abs(irisOffset));
              }
            }

            if (isGazingAway) {
              maybeReport('gaze_away_from_screen', { offset_ratio: Number(maxOffset.toFixed(2)) });
            } else {
              resetCounter('gaze_away_from_screen');
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ready, enabled, videoRef, maybeReport, resetCounter]);

  return { ready, status };
}
