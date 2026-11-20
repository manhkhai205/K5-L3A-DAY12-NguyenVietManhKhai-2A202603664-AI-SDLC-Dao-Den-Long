---
name: verify-phase
description: Quy trình tự động kiểm chứng, kiểm tra tính tất định (determinism), kiểm tra hiệu năng headless 21.600 ticks <= 30s, xuất báo cáo bằng chứng thật vào docs/proof/phase-N/ và đối chiếu hồi quy trước khi gắn tag phase.
---

# Skill: Verify Phase & Generate Authentic Proof (`verify-phase` — Updated for Phase 2 / Contract v1.1)

Sử dụng skill này ở bước **Verify** của mỗi Phase để đảm bảo mọi bằng chứng trong `docs/proof/phase-<N>/` là **thật 100%, khớp mã nguồn tại commit chuẩn bị gắn tag**.

## Các bước thực hiện

1. **Kiểm tra ranh giới kiến trúc & kiểu dữ liệu:**
   - Đảm bảo không có lệnh `Math.random()`, `window`, `document`, hay `three` nào lọt vào `src/core/`.
   - Kiểm tra `game.contract.json` khớp phiên bản contract của Phase hiện tại (`1.0` cho Phase 1, `1.1` cho Phase 2).
   - Chạy `npm run typecheck`.

2. **Chạy Unit Tests, Regression Tests & Scenarios Mới:**
   - Chạy `npm test` (bao gồm cả bộ test hồi quy Phase 1 và các scenarios mới của Phase 2: Lướt & Bùa Gió, Gió Lạc cướp & rơi đom đóm, Tạm dừng/Tiếp tục, Bục nhảy Đêm 2, Đảo 3 tầng & Gió mạnh Đêm 3, và benchmark 21.600 ticks).

3. **Chạy Script Tự động Kiểm chứng & Xuất Bằng chứng:**
   - Thực thi lệnh:
     ```bash
     npm run verify -- --phase <N>
     ```
   - Script `scripts/verify-phase.ts` sẽ tự động:
     - Chạy `tsc --noEmit` và `vitest run`.
     - Chạy các scenario headless **2 lần liên tiếp với cùng đầu vào** và so sánh byte-for-byte (`run1 === run2`) để chứng minh **tính tất định (Determinism)**.
     - Lưu kết quả đầu ra JSONL thật vào `docs/proof/phase-<N>/headless-output.jsonl` và báo cáo tổng hợp vào `docs/proof/phase-<N>/verification-report.md`.
