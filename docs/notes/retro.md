# Đánh Giá Từng Phase & Retrospective Cuối Dự Án (Evaluation & Retro)

---

## 1. Đánh Giá Nhanh Sau Từng Phase (Phase Evaluations)

### Checkpoint 0 (Chuẩn bị)
- **Mức độ hoàn thành:** Đạt 100% mục tiêu chuẩn bị. Đã có khung Core Logic tất định, Headless CLI, 3D Web Renderer bằng Three.js Procedural Geometry + Web Audio API, cùng bộ 3 Harness (`AGENTS.md`, skill `verify-phase`, pre-commit hook + GitHub Actions CI).
- **Hồi quy:** Chưa có phase trước; bộ smoke test xanh 100%.
- **Điều chỉnh cho Phase 1:** Sẵn sàng nạp đặc tả `PRD-0` và `Test Contract` ngay khi mở đề.

### Phase 1 (`tag: phase-1`)
- **Yêu cầu đạt / chưa đạt:** *(Cập nhật cuối Phase 1)*
- **Cần chỉnh gì ở Harness:** *(Cập nhật cuối Phase 1)*

### Phase 2 (`tag: phase-2`)
- **Yêu cầu đạt / chưa đạt:** *(Cập nhật cuối Phase 2)*
- **Kiểm tra hồi quy Phase 1:** *(Cập nhật cuối Phase 2)*
- **Cần chỉnh gì ở Harness:** *(Cập nhật cuối Phase 2)*

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
1. **Tách kiến trúc Core Logic (`src/core/`) và Renderer (`src/render/`) ngay từ Checkpoint 0:** Giúp AI viết và kiểm thử mọi quy tắc gameplay bằng Vitest và Headless CLI chỉ trong vài trăm mili-giây mà không cần mở trình duyệt 3D để mò lỗi.
2. **Thiết kế cách kiểm chứng (`scripts/verify-phase.ts`) trước khi viết tính năng:** Bắt buộc mọi thay đổi phải vượt qua kiểm tra `Run 1 === Run 2` (tính tất định) và tự động xuất bằng chứng thật vào `docs/proof/phase-N/`.
3. **Sử dụng Procedural Geometry & Web Audio API:** Loại bỏ hoàn toàn thời gian tìm kiếm/tải model 3D bên ngoài, tránh rủi ro lỗi đường dẫn asset hoặc vi phạm bản quyền.

### B. Harness nào đã giúp ích nhiều nhất?
- **`AGENTS.md` ngắn gọn (< 45 dòng):** Giữ ngữ cảnh sạch, nhắc AI ranh giới cứng giữa `src/core/` và `src/render/`.
- **Skill `verify-phase` + Script `scripts/verify-phase.ts`:** Tự động hóa toàn bộ chuỗi `typecheck -> unit test -> determinism headless check -> markdown report`, đảm bảo không bao giờ quên lưu bằng chứng khớp với tag.
- **Pre-commit Hook (`.githooks/pre-commit`):** Chặn đứng mọi commit nếu `tsc --noEmit` hoặc `vitest run` bị đỏ.

### C. Nếu làm lại từ đầu thì sẽ thay đổi điều gì?
- *(Sẽ bổ sung tổng kết thực tế sau khi hoàn thành Phase 4)*
