# Nhật Ký Điều Phối AI, Phân Tích Lỗi & Quản Lý Token (AI Log & Token Usage)

---

## 1. Thống Kê Token & Chi Phí Ước Tính Theo Phase

| Phase | Công việc chính giao cho AI | Số lượt Prompt | Token Đầu Vào (Ước tính) | Token Đầu Ra (Ước tính) | Chi phí ước tính (USD) | Chiến lược tiết kiệm Token đã áp dụng |
|---|---|---:|---:|---:|---:|---|
| **CP0 (Chuẩn bị)** | Đọc tài liệu lab, hỏi đáp chốt kiến trúc (`/plan` + `/grill-me`), dựng khung `src/core/`, `src/render/`, bộ 3 Harness & script `verify-phase.ts`. | 3 | ~18,000 | ~6,500 | ~$0.12 | Chốt kiến trúc trước khi viết code; giữ `AGENTS.md` dưới 45 dòng; gộp việc tạo file theo batch thay vì chạy vòng lặp sửa lỗi. |
| **Phase 1 (`PRD-0`)** | Triển khai `game.contract.json` v1.0, chuẩn hóa 60 tick/s JSONL (`snapshot`, `event`, `end`), tạo hình Mây đội nón lá treo đèn, chạy `verify-phase` cho Phase 1. | 1 | ~14,000 | ~8,000 | ~$0.13 | Dùng trực tiếp bộ số chuẩn cho `tuning` của Phase 1 để tương thích ngược luôn với Phase 2; bắt lỗi thiếu import `SimEvent` ngay bằng guardrail `npm run typecheck`. |
| **Phase 2 (`Ticket-02`)** | *(Cập nhật khi kết thúc Phase 2)* | - | - | - | - | |
| **Phase 3 (`Ticket-03`)** | *(Cập nhật khi kết thúc Phase 3)* | - | - | - | - | |
| **Phase 4 (`Ticket-04`)** | *(Cập nhật khi kết thúc Phase 4)* | - | - | - | - | |

---

## 2. Nhật Ký Lỗi Của AI & Cách Tinh Chỉnh Harness (AI Failure Analysis)

> Nguyên tắc: Khi phát hiện AI có nguy cơ mắc lỗi hoặc mắc lỗi, sửa ngay ở nơi chắc chắn nhất (TypeScript strict check, unit test, hook, hoặc thêm quy tắc ngắn vào `AGENTS.md`).

| Phase | Tình huống / Lỗi hoặc Nguy cơ lỗi của AI | Cách phát hiện | Hành động khắc phục & Tinh chỉnh Harness |
|---|---|---|---|
| **CP0** | Nguy cơ AI dùng `Math.random()` hoặc import `three` trực tiếp vào logic game làm hỏng chế độ Headless và tính tất định trên máy chấm Linux/macOS. | Phân tích yêu cầu Test Contract trong `GUIDE.md` mục 8 trước khi code. | 1. Tách cứng `src/core/` và viết class `PRNG` (`Mulberry32`) tại `src/core/prng.ts`.<br>2. Ghi điều cấm tuyệt đối vào mục 1 của `AGENTS.md`.<br>3. Thêm test kiểm tra tính tất định chạy 2 lần so sánh JSON trong `tests/core.test.ts` và script `scripts/verify-phase.ts`. |
| **Phase 1** | Khi tách `SimEvent` sang `src/core/types.ts`, AI quên import `SimEvent` trong `src/core/engine.ts` (TypeScript báo `Cannot find name 'SimEvent'`). | Bước 1 của script `npm run verify -- --phase 1` (`tsc --noEmit`) chặn ngay lập tức. | Sửa import trong `src/core/engine.ts`. Chứng minh rào chắn `tsc --noEmit` trong `verify-phase` và `.githooks/pre-commit` hoạt động hiệu quả 100%. |
| **Phase 2** | *(Cập nhật trong Phase 2)* | | |
| **Phase 3** | *(Cập nhật trong Phase 3)* | | |
| **Phase 4** | *(Cập nhật trong Phase 4)* | | |
