/**
 * Phát hiện camera ảo (virtual/fake camera) bằng heuristic: đối chiếu tên thiết bị
 * camera đang dùng với danh sách phần mềm camera ảo phổ biến (OBS Virtual Camera,
 * ManyCam, ChromaCam, XSplit VCam, Snap Camera, pyvirtualcam,...).
 *
 * GIỚI HẠN QUAN TRỌNG (cần hiểu rõ để không đánh giá quá cao độ tin cậy):
 * - Đây CHỈ là kiểm tra dựa trên nhãn (label) thiết bị do hệ điều hành/driver báo lên,
 *   không phải phân tích nội dung hình ảnh. Người dùng có thể đổi tên thiết bị ảo để
 *   né được, hoặc dùng phần mềm không có trong danh sách.
 * - KHÔNG phát hiện được deepfake/face-swap thời gian thực (VD: Deep-Live-Cam) nếu nó
 *   chạy qua một camera ảo được đặt tên giống camera thật — việc đó cần mô hình phân
 *   tích khung hình video (liveness/deepfake detection), chưa được xây trong dự án này.
 * - Đây là lớp phòng thủ đầu tiên, rẻ và tức thời — nên kết hợp thêm với giám sát của
 *   con người (giám thị) qua ProctorDashboard, không nên dựa hoàn toàn vào tự động.
 */

const SUSPICIOUS_DEVICE_KEYWORDS = [
  'obs virtual camera',
  'obs-camera',
  'manycam',
  'chromacam',
  'xsplit vcam',
  'xsplit broadcaster',
  'snap camera',
  'nvidia broadcast',
  'droidcam',
  'iriun',
  'epoccam',
  'camtwist',
  'pyvirtualcam',
  'virtual-cam',
  'virtualcam',
  'v4l2loopback',
  'unity video capture',
  'e2esoft',
  'splitcam',
];

export interface CameraCheckResult {
  suspicious: boolean;
  deviceLabel: string;
  matchedKeyword?: string;
}

export async function checkForVirtualCamera(stream: MediaStream): Promise<CameraCheckResult> {
  const videoTrack = stream.getVideoTracks()[0];
  const label = (videoTrack?.label || '').toLowerCase();

  for (const keyword of SUSPICIOUS_DEVICE_KEYWORDS) {
    if (label.includes(keyword)) {
      return { suspicious: true, deviceLabel: videoTrack.label, matchedKeyword: keyword };
    }
  }

  return { suspicious: false, deviceLabel: videoTrack?.label || 'unknown' };
}

/** Kiểm tra toàn bộ danh sách thiết bị camera hệ thống báo có (không chỉ thiết bị đang dùng) */
export async function listAllCameraDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === 'videoinput');
}
