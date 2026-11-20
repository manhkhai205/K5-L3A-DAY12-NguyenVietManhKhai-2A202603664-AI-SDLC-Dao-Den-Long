# Changelog — Đảo Đèn Lồng (Day 12 AI SDLC)

Mọi thay đổi quan trọng, đặc biệt là các **Thay đổi phá vỡ tương thích (Breaking Changes)** theo yêu cầu của khách hàng qua từng Phase, được ghi nhận tại đây.

---

## [Phase 3 — Contract v1.2] - 2026-11-20 (`tag: phase-3`)

### ⚠️ Thay đổi Phá vỡ Tương thích (Breaking Changes — `TICKET-03: Đèn cạn dầu`)
1. **[THAY THẾ] Luật Thắng Sớm (`all_lit` -> `dawn_survived`):**
   - Thắp sáng toàn bộ Đèn Lồng Lớn không còn kết thúc Đêm ngay lập tức.
   - Người chơi chỉ thắng khi sống sót tới hết giờ (`time_left_s == 0`, bình minh) VÀ số đèn đang sáng tại tick cuối đạt `>= ceil(0.6 * tổng số đèn)` (Đêm 1: `3/5`, Đêm 2: `4/6`, Đêm 3: `5/7`).
   - Mã lý do thắng trong sự kiện `game_over` đổi từ `"all_lit"` sang `"dawn_survived"`.
   - Thời lượng 3 Đêm đổi từ `300 / 330 / 360 s` thành `240 / 270 / 300 s`.
2. **[THAY THẾ] Mô hình Trạng thái Đèn Lồng Lớn (Nhiên liệu & Thắp lại):**
   - Đèn đang sáng không còn sáng vĩnh viễn mà có `fuel` tối đa `100`, tự hao `1.0 fuel/s` (`1/60` mỗi tick) ở Bước 2.
   - Đèn đang sáng nhưng chưa đầy dầu (`fuel < 100`) có thể nhận thêm đom đóm khi bấm Tương tác (`refuel`, mỗi đom đóm `+10 fuel`).
   - Khi `fuel <= 0`, đèn tắt ngay sau Bước 2, phát sự kiện `lantern_out { lantern_id }`, nhớ trạng thái `ever_lit: true`.
   - Đèn đã từng sáng (`ever_lit: true`) khi thắp lại chỉ cần `5` đom đóm (`relight_cost: 5`) thay vì `10`.
3. **[THAY THẾ] Vùng An Toàn & Hành vi Bóng Mực Hút Dầu (`drain`):**
   - Đèn đang sáng nhưng có `fuel < 30` bị mất vùng an toàn `6m`.
   - Bóng Mực ở trạng thái `wander` ưu tiên đi tới đèn đang sáng có `fuel < 30` gần nhất; khi cách `<= 2m` (XZ) sẽ chuyển sang trạng thái mới `"drain"`, đứng yên hút `5 fuel/s` (`5/60` mỗi tick) và phát sự kiện `fuel_drain { lantern_id, shade_id, fuel }` mỗi 60 tick.
4. **[THAY THẾ] Toàn bộ Công thức Tính Điểm:**
   - Nạp đom đóm vào đèn (thắp mới, thắp lại, châm dầu): đổi từ `+10` thành `+5` mỗi đom đóm.
   - Thắp đèn lần đầu: `+100`; Thắp lại đèn (`relight: true`): `+40`.
   - Tỏa Sáng (`pulse`) trúng Bóng Mực: `+5` mỗi con, hoặc `+15` nếu ngay trước đó con đó đang ở trạng thái `"drain"`.
   - Bỏ thưởng thời gian còn lại (`per_second_left: 0`). Thay bằng thưởng Bình Minh khi thắng: mỗi đèn đang sáng cộng `+50 + floor(fuel)`, mỗi Ngọn Lửa còn lại cộng `+50`.

### ✨ Tính năng Mới (Phase 3)
- **Sức chứa đom đóm tăng dần (`player.capacity`):** `capacity = min(20, 10 + 2 * successful_lights)`.
- **Chế độ Mù Màu ("Bảng màu dễ phân biệt"):** Lưu trong `localStorage`, đổi viền/mắt Bóng Mực sang `#00B3FF`, cảnh báo UI sang `#FFFFFF` kèm biểu tượng `⚠`, đèn tắt xẹp `20%` kèm vết rách trên thân đèn, thanh dầu 3D trên đỉnh đèn nhấp nháy `1 Hz` khi `fuel < 30`.

---

## [Phase 2 — Contract v1.1] - 2026-11-20 (`tag: phase-2`)
- Đồng bộ số liệu chuẩn `TICKET-02`, mở rộng 3 Đêm (Đảo Bến, Đảo Cau, Đảo Chuông).
- Thêm kỹ năng Lướt (`dash`), Bùa Gió (`C1`, `C2`), Gió Lạc (`D1`, `D2`), Bục nhảy, Gió mạnh, Tạm dừng (`paused`/`resumed`).
- Hỗ trợ xoay camera 360° bằng chuột (`Pointer Lock` + `Mouse Drag`) và tích hợp bộ tài sản 3D `.glb` & textures CC0/MIT.

---

## [Phase 1 — Contract v1.0] - 2026-11-20 (`tag: phase-1`)
- Bản phát hành đầu tiên theo `PRD-0` và `Test Contract v1.0` (Đêm 1 – Đảo Bến, 5 Đèn Lồng Lớn, Mây đội nón lá treo đèn, Đom Đóm, Bóng Mực, Tỏa Sáng, Headless JSONL).
