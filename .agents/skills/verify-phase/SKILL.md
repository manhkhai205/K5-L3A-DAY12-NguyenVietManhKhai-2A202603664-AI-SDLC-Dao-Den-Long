---
name: verify-phase
description: Quy trình tự động kiểm chứng, kiểm tra tính tất định (determinism), xuất báo cáo bằng chứng thật vào docs/proof/phase-N/ và đối chiếu hồi quy trước khi gắn tag phase.
---

# Skill: Verify Phase & Generate Authentic Proof (`verify-phase`)

Sử dụng skill này ở bước **Verify** của mỗi Phase (từ Checkpoint 0 đến Phase 4) để đảm bảo mọi bằng chứng trong `docs/proof/phase-<N>/` là **thật 100%, khớp mã nguồn tại commit chuẩn bị gắn tag**.

## Các bước thực hiện

1. **Kiểm tra ranh giới kiến trúc & kiểu dữ liệu:**
   - Đảm bảo không có lệnh `Math.random()`, `window`, `document`, hay `three` nào lọt vào `src/core/`.
   - Chạy `npm run typecheck`. Nếu lỗi, phải sửa triệt để trước khi đi tiếp.

2. **Chạy Unit Tests & Regression Tests:**
   - Chạy `npm test`.
   - Nếu có test của Phase trước bị đỏ do **luật mới của Ticket hiện tại thay thế**, phải ghi rõ lý do trong `docs/notes/assumptions.md` và cập nhật test kèm chú thích `// Updated in Phase N due to Ticket-0N: <lý do>`.

3. **Chạy Script Tự động Kiểm chứng & Xuất Bằng chứng:**
   - Thực thi lệnh:
     ```bash
     npm run verify -- --phase <N>
     ```
   - Script `scripts/verify-phase.ts` sẽ tự động:
     - Chạy `tsc --noEmit` và `vitest run`.
     - Chạy các scenario headless **2 lần liên tiếp với cùng đầu vào** và so sánh byte-for-byte (`run1 === run2`) để chứng minh **tính tất định (Determinism)**.
     - Lưu kết quả đầu ra thật vào `docs/proof/phase-<N>/headless-output.json` và báo cáo tổng hợp vào `docs/proof/phase-<N>/verification-report.md`.

4. **Cập nhật Bảng Truy vết Yêu cầu (Traceability Matrix):**
   - Kiểm tra file `docs/proof/phase-<N>/verification-report.md`, đảm bảo mỗi yêu cầu chính của Phase có đầy đủ: `Mã YC | Mô tả | Cách kiểm chứng | File bằng chứng | Kết quả (Đạt / Chưa đạt + Lý do trung thực)`.

5. **Đánh giá Độc lập (Independent Review):**
   - Trước khi gắn tag `phase-<N>`, rà soát lại `git diff` và bảng truy vết dưới góc nhìn người chấm độc lập (hoặc gọi subagent review) để chắc chắn không có yêu cầu nào bị bỏ sót hoặc ghi nhận sai trạng thái.
