import { useEffect, useRef, useState, useCallback } from 'react';
import * as ort from 'onnxruntime-web';

// ONNX Runtime Web cần file .wasm đi kèm — trỏ về CDN chính thức thay vì yêu cầu tự
// bundle thủ công vào thư mục dist (đơn giản hoá triển khai, giống cách MediaPipe làm).
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';

/**
 * Phát hiện vật thể cấm (điện thoại, sách,...) trong khung hình camera bằng YOLOv8n
 * (định dạng ONNX), chạy hoàn toàn trong trình duyệt qua ONNX Runtime Web (WASM) —
 * không gửi hình ảnh lên server, chỉ gửi SỰ KIỆN vi phạm.
 *
 * Model KHÔNG được đóng gói sẵn trong repo (xem frontend/public/models/README.md) —
 * nếu chưa đặt file `/models/yolov8n.onnx`, hook này tự tắt (ready=false, không throw
 * lỗi phá vỡ trang thi), các tính năng giám sát khác vẫn hoạt động bình thường.
 */

export type ObjectViolationType = 'phone_detected' | 'book_detected';

// COCO dataset class index chuẩn — model YOLOv8n gốc (chưa fine-tune) đã có sẵn.
const COCO_CLASS_PHONE = 67; // "cell phone"
const COCO_CLASS_BOOK = 73; // "book"
const MODEL_INPUT_SIZE = 640;
const CONFIDENCE_THRESHOLD = 0.5;

interface UseObjectDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  onViolation: (type: ObjectViolationType, details: Record<string, any>) => void;
  /** Số giây giữa mỗi lần chạy suy luận — YOLO khá nặng, không cần chạy mỗi khung hình */
  intervalSeconds?: number;
  cooldownMs?: number;
  modelUrl?: string;
}

export function useObjectDetection({
  videoRef,
  enabled,
  onViolation,
  intervalSeconds = 3,
  cooldownMs = 15000,
  modelUrl = '/models/yolov8n.onnx',
}: UseObjectDetectionOptions) {
  const [ready, setReady] = useState(false);
  const [available, setAvailable] = useState(true); // false nếu xác nhận model không tồn tại
  const sessionRef = useRef<ort.InferenceSession | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastViolationAtRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const load = async () => {
      try {
        // HEAD-check trước để tránh onnxruntime ném lỗi console ồn ào nếu thiếu file model (hoặc trả về index.html).
        const head = await fetch(modelUrl, { method: 'HEAD' });
        const cType = head.headers.get('content-type') || '';
        if (!head.ok || cType.includes('text/html')) {
          setAvailable(false);
          return;
        }
        const session = await ort.InferenceSession.create(modelUrl, {
          executionProviders: ['wasm'],
        });
        if (cancelled) return;
        sessionRef.current = session;
        canvasRef.current = document.createElement('canvas');
        canvasRef.current.width = MODEL_INPUT_SIZE;
        canvasRef.current.height = MODEL_INPUT_SIZE;
        setReady(true);
      } catch (err) {
        console.warn('Không tải được model phát hiện vật thể (tính năng sẽ bị tắt):', err);
        setAvailable(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      sessionRef.current?.release?.();
      sessionRef.current = null;
    };
  }, [enabled, modelUrl]);

  const preprocess = useCallback((video: HTMLVideoElement): ort.Tensor | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
    const imageData = ctx.getImageData(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
    const { data } = imageData;

    // HWC (RGBA) -> CHW (RGB), chuẩn hoá về [0,1] — đúng format input YOLOv8 export mặc định.
    const floatData = new Float32Array(3 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE);
    const pixelCount = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE;
    for (let i = 0; i < pixelCount; i++) {
      floatData[i] = data[i * 4] / 255; // R
      floatData[pixelCount + i] = data[i * 4 + 1] / 255; // G
      floatData[2 * pixelCount + i] = data[i * 4 + 2] / 255; // B
    }

    return new ort.Tensor('float32', floatData, [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE]);
  }, []);

  const maybeReport = useCallback((type: ObjectViolationType, details: Record<string, any>) => {
    const now = Date.now();
    const lastAt = lastViolationAtRef.current[type] || 0;
    if (now - lastAt < cooldownMs) return;
    lastViolationAtRef.current[type] = now;
    onViolation(type, details);
  }, [onViolation, cooldownMs]);

  useEffect(() => {
    if (!ready || !enabled) return;

    const intervalId = setInterval(async () => {
      const video = videoRef.current;
      const session = sessionRef.current;
      if (!video || !session || video.readyState < 2) return;

      try {
        const inputTensor = preprocess(video);
        if (!inputTensor) return;

        const inputName = session.inputNames[0];
        const outputs = await session.run({ [inputName]: inputTensor });
        const outputName = session.outputNames[0];
        const output = outputs[outputName];

        // Output YOLOv8 chuẩn dạng [1, 84, 8400]: 4 toạ độ box + 80 điểm tin cậy lớp,
        // duyệt tìm điểm tin cậy cao nhất cho riêng 2 lớp cần quan tâm (phone, book).
        const outData = output.data as Float32Array;
        const numBoxes = output.dims[2];

        let maxPhoneConf = 0;
        let maxBookConf = 0;
        for (let i = 0; i < numBoxes; i++) {
          const phoneConf = outData[(4 + COCO_CLASS_PHONE) * numBoxes + i];
          const bookConf = outData[(4 + COCO_CLASS_BOOK) * numBoxes + i];
          if (phoneConf > maxPhoneConf) maxPhoneConf = phoneConf;
          if (bookConf > maxBookConf) maxBookConf = bookConf;
        }

        if (maxPhoneConf > CONFIDENCE_THRESHOLD) {
          maybeReport('phone_detected', { confidence: Number(maxPhoneConf.toFixed(2)) });
        }
        if (maxBookConf > CONFIDENCE_THRESHOLD) {
          maybeReport('book_detected', { confidence: Number(maxBookConf.toFixed(2)) });
        }
      } catch (err) {
        console.error('Lỗi khi chạy suy luận phát hiện vật thể:', err);
      }
    }, intervalSeconds * 1000);

    return () => clearInterval(intervalId);
  }, [ready, enabled, videoRef, preprocess, maybeReport, intervalSeconds]);

  return { ready, available };
}
