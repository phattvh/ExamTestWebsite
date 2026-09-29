# Frontend — Exam Test Website

Giao diện người dùng (React 18 + TypeScript + Vite + Material UI) cho hệ thống thi trực tuyến. Xem tài liệu tổng thể toàn dự án tại [`../README.md`](../README.md).

## Cài đặt & chạy dev

```bash
npm install
cp .env.example .env   # rồi chỉnh VITE_API_URL nếu cần — xem lưu ý bên dưới
npm run dev
```

Mặc định chạy tại `http://localhost:5173`, tự động proxy các request `/api` và `/ws` sang `http://localhost` (nginx gateway) — cấu hình trong `vite.config.ts`.

## Biến môi trường

| Biến | Mô tả | Giá trị đúng |
|---|---|---|
| `VITE_API_URL` | Base URL gọi API | `/api` |

⚠️ Không đặt `VITE_API_URL=/api/v1` — các module trong `src/api/*.ts` đã tự thêm `/v1/...` vào sau baseURL, đặt sai sẽ gây lỗi 404 hàng loạt (double `/v1/v1/`). Chi tiết: [`../docs/ENV_VARS.md`](../docs/ENV_VARS.md).

## Scripts

| Lệnh | Mục đích |
|---|---|
| `npm run dev` | Chạy dev server (HMR) |
| `npm run build` | Type-check (`tsc -b`) rồi build production vào `dist/` |
| `npm run preview` | Xem thử bản build production |
| `npm run lint` | Lint bằng Oxlint |
| `npx vitest run` | Chạy toàn bộ unit test |
| `npx vitest` | Chạy test ở chế độ watch |

## Cấu trúc thư mục

```
src/
├── api/            # Các module gọi API (axios instances + hàm gọi từng service)
├── components/      # Component dùng chung (Route guard, Timer, Proctor UI,...)
│   └── Proctor/      # Component riêng cho tính năng giám sát chống gian lận
├── context/         # React Context (AuthContext, ExamContext)
├── hooks/           # Custom hooks (useTimer, useWebSocket, useProctoring,...)
├── pages/           # Từng trang ứng với 1 route (Login, Dashboard, ExamRoom, Admin*,...)
├── theme/           # Cấu hình theme Material UI dùng chung toàn app
└── types/           # Type definitions dùng chung
```

### Quy ước quan trọng

- **Theme:** dùng chung `theme/index.ts` (palette Indigo/Emerald, nền sáng) cho toàn bộ trang sau khi đăng nhập (Dashboard, ExamRoom, Admin*, ExamList,...). Riêng `Login.tsx`/`Register.tsx` cố ý dùng theme tối gradient riêng cho màn hình xác thực — đây là lựa chọn thiết kế có chủ đích (dark auth screen, light in-app), không phải thiếu đồng bộ.
- **Gọi API:** luôn import từ `src/api/apiClient.ts` (hoặc các module `examApi.ts`, `gradingApi.ts`,... build trên nó) thay vì tự tạo instance `axios` mới — `apiClient` đã có sẵn interceptor tự gắn token và tự refresh khi hết hạn (`src/api/authInterceptors.ts`).
- **Route guard:** `RoleRoute.tsx` / `AdminRoute.tsx` bọc quanh route cần đăng nhập/phân quyền, tự động điều hướng tới `/change-password` nếu tài khoản bị bắt buộc đổi mật khẩu.

## Test

Test đặt cạnh file được test (`*.test.tsx`, `*.test.ts`), chạy bằng Vitest + Testing Library (cấu hình trong `vite.config.ts` → `test.setupFiles: src/setupTests.ts`):

```bash
npx vitest run
```
