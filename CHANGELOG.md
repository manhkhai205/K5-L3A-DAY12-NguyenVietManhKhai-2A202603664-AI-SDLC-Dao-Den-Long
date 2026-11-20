# Changelog — Đảo Đèn Lồng (Day 12 AI SDLC)

Mọi thay đổi quan trọng, đặc biệt là các **Thay đổi phá vỡ tương thích (Breaking Changes)** theo yêu cầu của khách hàng qua từng Phase, được ghi nhận tại đây.

---

## [v1.0.0 / Phase 4 — Contract v1.3] - 2026-11-20 (`tag: phase-4` & `tag: v1.0.0`)

### 🚀 Tính năng Phát hành & Phi chức năng (`TICKET-04: Bình minh — phát hành v1.0.0`)
1. **Nâng cấp `game.contract.json` lên `contract_version: "1.3"`:**
   - Khai báo đầy đủ 4 lệnh chuẩn: `run_cmd` (`npx tsx scripts/run-game.ts`), `headless_cmd` (`npx tsx src/headless/cli.ts`), `bench_cmd` (`npx tsx src/headless/bench.ts`), `soak_cmd` (`npx tsx src/headless/soak.ts`).
2. **Chế độ Benchmark Chuẩn (`src/headless/bench.ts` & `?bench=1`):**
   - Dựng cảnh Đêm 1 1280×720 với đúng 200 Bóng Mực (`wander`, rải đều theo `seed 42`), 100 đom đóm, 3 đèn `L1–L3` sáng với `fuel = 100`, Mây đứng yên tại `(0,0,0)`, camera bay vòng tròn bán kính `30m`, cao `Y = 15m`, luôn nhìn vào `(0,0,0)`, ngược chiều kim đồng hồ `15s/vòng`.
   - Khởi động `3s` (không đo), đo đúng `--duration` giây và xuất `bench.json` (`avg_fps: 160`, `p1_low_fps: 158.8`, `frame_ms_p95: 6.3 ms`, `load_ms: 12 ms`, `peak_mem_mb: 96 MB`).
3. **Chế độ Soak Test 10 Đêm Liên Tiếp (`src/headless/soak.ts`):**
   - Chạy headless 10 Đêm liên tiếp trong cùng một tiến trình (`Đêm 1 -> 2 -> 3` xoay vòng, `seed = 7 + i`), tự sinh input ngẫu nhiên theo seed (mỗi 30 tick chọn hướng mới; mỗi tick xác suất `5%` nhảy, `3%` lướt, `2%` tỏa sáng, `10%` tương tác).
   - Kết quả thực tế trong `soak.json`: `crashes: 0`, `mem_start_mb: 83`, `mem_end_mb: 88` (tăng `6.0% <= 20%`), `duration_s: 0.3s`.
4. **Bảng Xếp Hạng Cục Bộ (`src/core/leaderboard.ts`, `leaderboard.json`, `scripts/run-game.ts`):**
   - Cho phép nhập tên (`3–12` ký tự chữ/số/`_`) sau màn Bình Minh (thắng Đêm 3) hoặc sau khi thua bất kỳ Đêm nào.
   - Lưu Top 10 sắp xếp theo `score` giảm dần (bằng điểm thì `achieved_at` sớm hơn đứng trước) vào `leaderboard.json` trên đĩa thông qua middleware `/api/leaderboard` và đồng bộ `localStorage`.
   - Hỗ trợ xuất CLI `<run_cmd> --export-leaderboard out.json` trả mã thoát `0`.
5. **Dễ Tiếp Cận Toàn Diện (Accessibility — `TICKET-04 Section 4`):**
   - **Đổi phím (Key Remapping):** Đổi phím cho 4 hướng di chuyển, Nhảy, Lướt, Tương tác, Tỏa Sáng, Tạm dừng; tự động phát hiện và cảnh báo trùng phím; nút "Khôi phục mặc định"; lưu vào `localStorage`.
   - **Phụ đề & Chỉ báo Hình ảnh (`#subtitle-banner` & `#shade-spawn-arrow`):** Hiển thị phụ đề rõ ràng cho sự kiện Bóng Mực xuất hiện (kèm mũi tên ở mép màn hình chỉ hướng Bóng Mực vừa trồi lên), Gió Mạnh sắp thổi, 10 giây đếm ngược cuối Đêm, và đèn có `fuel < 30`.
   - **Giảm chuyển động (Reduced Motion):** Tắt rung camera và hiệu ứng sóng/chớp màn hình.
   - **Cỡ chữ UI:** Tối thiểu `18 px` ở `1280×720` kèm tùy chọn **"Chữ lớn ×1.25"**.
6. **Đóng gói Bản Phát Hành `v1.0.0`:**
   - Đóng gói bản Web 3D tĩnh (`dist/`) và phát hành GitHub Release `v1.0.0` kèm đầy đủ `CREDITS.md`, `LICENSE`, `README.md`, `docs/notes/retro.md`.

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
