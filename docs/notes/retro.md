# Đánh Giá Từng Phase & Retrospective Cuối Dự Án (Evaluation & Retro)

---

## 1. Đánh Giá Nhanh Sau Từng Phase (Phase Evaluations)

### Checkpoint 0 (Chuẩn bị)
- **Mức độ hoàn thành:** Đạt 100% mục tiêu chuẩn bị. Đã có khung Core Logic tất định, Headless CLI, 3D Web Renderer bằng Three.js Procedural Geometry + Web Audio API, cùng bộ 3 Harness (`AGENTS.md`, skill `verify-phase`, pre-commit hook + GitHub Actions CI).

### Phase 1 (`tag: phase-1`)
- **Yêu cầu đạt / chưa đạt:** Đạt 100% yêu cầu `PRD-0` và `Test Contract v1.0`. Đã có `game.contract.json` v1.0, chế độ headless xuất JSONL (`snapshot`, `event`, `end`), mô hình 3D nhân vật Mây đội nón lá treo đèn lồng nhỏ, 5 Đèn Lồng Lớn trên Đảo Bến, Đom đóm, Bóng Mực và kỹ năng Tỏa Sáng.
- **Cần chỉnh gì ở Harness:** Rào chắn `tsc --noEmit` trong `scripts/verify-phase.ts` đã phát hiện kịp thời lỗi thiếu import `SimEvent`.

### Phase 2 (`tag: phase-2`)
- **Yêu cầu đạt / chưa đạt:** Đạt 100% yêu cầu `TICKET-02` ("Ba hòn đảo") và `Test Contract v1.1`. Đã đồng bộ toàn bộ số liệu chuẩn, mở rộng 3 Đêm (Đảo Bến, Đảo Cau với cầu tre & bục nhảy, Đảo Chuông 3 tầng với dốc, tháp chuông & gió mạnh), bổ sung kỹ năng Lướt (Dash), Bùa Gió (`C1`, `C2`), Gió Lạc (`D1`, `D2`), Tạm dừng (`paused`/`resumed`), bảng màu chuẩn Hex và HUD đầy đủ.
- **Kiểm tra hồi quy Phase 1:** Toàn bộ 6 bài test của Phase 1 vẫn đạt 100% khi chạy với số liệu chuẩn và Contract v1.1 (tổng cộng 10/10 bài test trong `tests/core.test.ts` xanh).
- **Hiệu năng Headless:** Chạy trọn vẹn 1 Đêm 360 giây (`21.600 ticks`) chỉ mất `< 50 ms` (vượt xa yêu cầu `<= 30 giây` của DoD).
- **Cần chỉnh gì ở Harness:** Đã cập nhật `AGENTS.md` và `.agents/skills/verify-phase/SKILL.md` để ghi nhận quy tắc 12 bước trong 1 tick và bộ scenarios của Contract v1.1.

### Phase 3 (`tag: phase-3`)
- **Yêu cầu đạt / chưa đạt:** *(Cập nhật cuối Phase 3)*
- **Xử lý thay đổi yêu cầu & test cũ:** *(Cập nhật cuối Phase 3)*
- **Cần chỉnh gì ở Harness:** *(Cập nhật cuối Phase 3)*

### Phase 4 (`tag: phase-4` / Release `v1.0.0`)
- **Yêu cầu đạt / chưa đạt & Số đo hiệu năng:** *(Cập nhật cuối Phase 4)*
- **Kiểm tra đóng gói & chạy sạch (`<= 3 lệnh`):** *(Cập nhật cuối Phase 4)*

---

## 2. Retrospective Tổng Hợp Dự Án (Project Retro)

### A. Điều gì đã hoạt động hiệu quả khi làm việc cùng AI?
1. **Tách kiến trúc Core Logic (`src/core/`) và Renderer (`src/render/`) ngay từ Checkpoint 0:** Giúp AI viết và kiểm thử mọi quy tắc gameplay bằng Vitest và Headless CLI chỉ trong vài chục mili-giây mà không cần mở trình duyệt 3D để mò lỗi.
2. **Thiết kế cách kiểm chứng (`scripts/verify-phase.ts`) trước khi viết tính năng:** Bắt buộc mọi thay đổi phải vượt qua kiểm tra `Run 1 === Run 2` (tính tất định) và tự động xuất bằng chứng thật vào `docs/proof/phase-N/`.
3. **Sử dụng Procedural Geometry & Web Audio API:** Loại bỏ hoàn toàn thời gian tìm kiếm/tải model 3D bên ngoài, dễ dàng áp dụng chính xác bảng màu chuẩn Hex của `TICKET-02`.

### B. Harness nào đã giúp ích nhiều nhất?
- **`AGENTS.md` ngắn gọn (< 45 dòng):** Giữ ngữ cảnh sạch, nhắc AI ranh giới cứng giữa `src/core/` và `src/render/`.
- **Skill `verify-phase` + Script `scripts/verify-phase.ts`:** Tự động hóa toàn bộ chuỗi `typecheck -> unit test -> determinism headless check -> markdown report`, đảm bảo không bao giờ quên lưu bằng chứng khớp với tag.
- **Pre-commit Hook (`.githooks/pre-commit`):** Chặn đứng mọi commit nếu `tsc --noEmit` hoặc `vitest run` bị đỏ.
