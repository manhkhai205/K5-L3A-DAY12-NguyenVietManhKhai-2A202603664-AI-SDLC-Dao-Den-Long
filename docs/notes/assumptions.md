# Giả Định & Tiêu Chí Nghiệm Thu Qua Các Phase (Assumptions & Acceptance Criteria)

Tài liệu này ghi lại toàn bộ các **giả định cho những chỗ mơ hồ**, **tiêu chí nghiệm thu kiểm chứng được (Acceptance Criteria)**, và **lý do thay đổi thiết kế/test** từ Checkpoint 0 đến Phase 4.

---

## Phase 1 — PRD-0 & Test Contract v1.0 (`tag: phase-1`)

### 1. Yêu cầu Bắt buộc từ PRD-0 & Test Contract v1.0
- Màn chơi **Đêm 1 – Đảo Bến**: đảo tròn bán kính 40m có 5 Đèn Lồng Lớn (`L1..L5`).
- Nhân vật **Mây** đội nón lá có treo đèn lồng nhỏ, di chuyển, nhảy, gom Đom Đóm (`mote_picked`), nạp vào Đèn Lồng Lớn (`deposit`, `lantern_lit`), Tỏa Sáng (`pulse`) để làm choáng và đẩy lùi Bóng Mực.
- File `game.contract.json` ở gốc repo với `"contract_version": "1.0"`, và chế độ headless xuất định dạng **JSONL** (`snapshot`, `event`, `end`).

### 2. Các Chỗ Mơ Hồ trong PRD-0 & Giả Định Đã Chọn (Khai báo trong `game.contract.json`)
| Chỗ mơ hồ trong PRD-0 | Giả định hợp lý đã chọn | Khai báo trong `tuning` | Tiêu chí nghiệm thu ("Làm A thì thấy B") |
|---|---|---|---|
| Tốc độ di chuyển & sức chứa của Mây | Tốc độ `6.0 m/s`, mang tối đa `10` đom đóm | `player_speed: 6.0`, `carry_capacity: 10` | Di chuyển với `move: [0,1]` trong 60 tick đi được đúng `6.0m` theo trục +Z. |
| Khoảng cách nhặt đom đóm & tương tác đèn | Nhặt tự động ở `<= 1.0m`; bấm nạp đèn ở `<= 2.0m`, mỗi đèn cần `10` đom đóm | `pickup_radius: 1.0`, `interact_radius: 2.0`, `lantern_cost: 10` | Đứng cách đèn `<= 2.0m` bấm `interact: true` -> phát sự kiện `deposit` và `lantern_lit` khi đủ 10. |
| Chi phí & hiệu ứng Tỏa Sáng (Pulse) | Tốn `3` đom đóm, bán kính `5.0m`, làm choáng `2.0s` (120 ticks), đẩy lùi `4.0m`, hồi chiêu `3.0s` | `pulse_cost: 3`, `pulse_radius: 5.0`, `pulse_stun_s: 2.0`, `pulse_push_m: 4.0`, `pulse_cooldown_s: 3.0` | Khi có `>= 3` đom đóm và bấm `pulse: true`, Bóng Mực trong 5m chuyển sang `stunned` và phát sự kiện `pulse`. |
| Máu (Ngọn Lửa), bất tử & rơi đom đóm khi bị chạm | Có `3` Ngọn Lửa, chạm Bóng Mực ở `<= 1.0m` mất 1 máu, rơi `50%` (`floor(carried/2)`) đom đóm, bất tử `1.5s` | `flames: 3`, `shade_hit_radius: 1.0`, `hit_drop_ratio: 0.5`, `invuln_s: 1.5` | Va chạm Bóng Mực khi cầm 7 đom đóm -> còn 2 máu, rơi 3 đom đóm, phát `player_hit`. |
| Vùng an toàn quanh đèn & tốc độ Bóng Mực | Đèn sáng tạo vùng an toàn `6.0m`; Bóng Mực chạy `4.0 m/s` | `safe_radius: 6.0`, `shade_speed: 4.0` | Bóng Mực không thể đi vào vùng `< 6.0m` của đèn đã thắp sáng. |
| Công thức tính điểm | `+10`/đom đóm nạp, `+100`/đèn thắp, `+5`/Bóng Mực choáng, khi thắng cộng `+2`/giây còn lại và `+50`/Ngọn Lửa còn lại | `score: { per_mote: 10, per_lantern: 100, per_stun: 5, per_second_left: 2, per_flame_left: 50 }` | Thắp sáng toàn bộ đèn cộng đúng điểm thưởng thời gian và máu vào dòng `end`. |

---

## Phase 2 — TICKET-02 ("Ba hòn đảo") & Test Contract v1.1 (`tag: phase-2`)

### 1. Đồng bộ Số Liệu Chuẩn & Mở rộng Test Contract v1.1
- Nâng cấp `game.contract.json` lên `"contract_version": "1.1"`, bổ sung đầy đủ các khóa: `dash_speed: 14.0`, `dash_duration_s: 0.2`, `dash_cooldown_s: 1.5`, `night2_duration_s: 330`, `night3_duration_s: 360`.
- Hỗ trợ `--night 1`, `--night 2` (Đảo Cau), `--night 3` (Đảo Chuông).
- Mở rộng `snapshot` thêm `night`, `wind: { active, dir_deg }`, `player.{vel, grounded, invuln, dash_cd_s, pulse_cd_s, charm_s}`, và các mảng bắt buộc `motes`, `drifters`, `charms`.
- Thực thi nghiêm ngặt **thứ tự 12 bước xử lý trong một tick**.

### 2. Tiêu Chí Nghiệm Thu (Acceptance Criteria) cho Toàn Bộ Tính Năng Mới (Phần 3 Ticket-02)

| Tính năng (Phần 3 Ticket-02) | Tiêu chí Nghiệm thu Kiểm chứng được (Acceptance Criteria) | Scenario / Test Kiểm chứng |
|---|---|---|
| **1. Kỹ năng Lướt (Dash)** | Khi nhấn `dash: true` (chuyển từ `false -> true`) và `dash_cd_s == 0`, Mây lướt với vận tốc `14.0 m/s` theo hướng di chuyển (hoặc hướng mặt nếu đứng yên) trong `12 ticks` (`0.2s`), giữ nguyên độ cao nếu ở trên không, phát sự kiện `dash {}`, và đặt hồi chiêu `1.5s` (`90 ticks`). | `scenarios/p2-dash-charm.json` & `tests/core.test.ts` |
| **2. Bùa Gió (Wind Charm `C1`, `C2`)** | Khi Mây đi vào phạm vi `XZ <= 1.0m` và `|dY| <= 1.5m` của Bùa Gió đang `available: true`, nhặt bùa tự động, phát sự kiện `charm_picked { charm_id, charm_ticks: 600 }`. Trong `600 ticks`, tốc độ chạy tăng lên `7.2 m/s` và Lướt không tốn hồi chiêu (`dash_cd_s = 0`). Bùa hồi lại sau `2700 ticks`. | `scenarios/p2-dash-charm.json` & `tests/core.test.ts` |
| **3. Gió Lạc (Drifters `D1`, `D2`)** | Ở Đêm 2 & 3, Gió Lạc chuyển từ `idle` sang `chase` (`7.0 m/s`) khi Mây mang `>= 5` đom đóm và cách `<= 15m`. Khi chạm (`XZ <= 1.2m`), cướp `min(3, carried)` đom đóm, phát `drifter_steal { drifter_id, amount, carried }` và chuyển sang `flee` trong `240 ticks`. Nếu trúng Tỏa Sáng (`pulse`) khi đang `flee` và có mang đom đóm, thả lại toàn bộ thành đom đóm rơi (`kind: "dropped"`, TTL `480 ticks`), phát `drifter_drop { drifter_id, amount }`. | `scenarios/p2-drifter.json` & `tests/core.test.ts` |
| **4. Bản đồ Đêm 2 (Đảo Cau) & Bục Nhảy** | Hai đảo bán kính `28m` tại `(0,0,0)` và `(70,0,0)` nối bằng cầu tre `x in [26,44], z in [-2,2]`, 6 đèn `L1..L6`. Khi chạm bục nhảy tại `(20,0,18)` hoặc `(50,0,-18)`, Mây được phóng lên với `velY = 14 m/s` và vận tốc ngang `24 m/s` hướng về tâm đảo kia. | `tests/core.test.ts` (`supports Night 2 jump pad launch`) |
| **5. Bản đồ Đêm 3 (Đảo Chuông), 3 Tầng & Gió Mạnh** | Đảo bán kính `45m` với 3 tầng (`Y=0`, `Y=3`, `Y=6`), 2 dốc nghiêng ở góc `30°` và `150°`, bục nhảy tại `(0,3,13)` lên tầng 2, tháp chuông bán kính `2m` ở tâm tầng 2, 7 đèn `L1..L7`. Mỗi `30s` (`1800 ticks`) có Gió Mạnh kéo dài `5s` (`300 ticks`) đẩy Mây `2 m/s`. | `tests/core.test.ts` (`Night 3 multi-tier elevation & wind`) |
| **6. Tạm dừng (Pause `Esc/P`) & Chuỗi 3 Đêm** | Khi nhấn `pause: true`, trạng thái chuyển sang `"paused"`, phát sự kiện `paused {}`; trong khi tạm dừng `tick` vẫn tăng nhưng `sim_tick`, thời gian, hồi chiêu, spawn, TTL đứng yên hoàn toàn. Nhấn lần nữa phát `resumed {}` và tiếp tục. Giao diện hỗ trợ chuyển chuỗi 3 Đêm, lưu cài đặt âm lượng vào `localStorage`. | `scenarios/p2-pause.json` & `tests/core.test.ts` |
| **7. Hiệu năng Headless (21.600 ticks)** | Chạy headless một Đêm đầy đủ (tối đa `21.600 ticks`) hoàn thành trong `<= 30 giây` (thực tế đạt `< 0.1 giây`). | `tests/core.test.ts` & `docs/proof/phase-2/verification-report.md` |

---

## Phase 3 — TICKET-03 ("Đèn cạn dầu") & Test Contract v1.2 (`tag: phase-3`)

> Xem tài liệu quyết định kiến trúc chi tiết tại [ADR-001-phase3-lantern-fuel-and-dawn.md](ADR-001-phase3-lantern-fuel-and-dawn.md) và danh sách Breaking Changes tại [../../CHANGELOG.md](../../CHANGELOG.md).

### 1. Bảng Đối Chiếu Luật Cũ Bị Thay Thế & Tiêu Chí Nghiệm Thu Mới (Ticket-03)

| Luật cũ (Phase 1 & 2) | Luật mới thay thế trong `TICKET-03` (Contract v1.2) | Cách xử lý Thiết kế & Cập nhật Test cũ |
|---|---|---|
| Đèn đã sáng không nhận thêm đom đóm, sáng vĩnh viễn. | Đèn sáng có `fuel = 100` (`6000` đơn vị nguyên `1/60`), tự hao `1.0/s` ở Bước 2; tương tác đèn đang sáng (`fuel < 100`) để châm dầu (`refuel`, `+10 fuel`/đốm); khi `fuel <= 0` đèn tắt ngay sau Bước 2 (`lantern_out`, nhớ `ever_lit = true`), thắp lại chỉ tốn `5` đom đóm (`relight_cost: 5`, phát `lantern_lit { relight: true }`). | Lưu `fuelUnits` nguyên trong `LanternSim`; thêm scenario `scenarios/p3-fuel-relight.json` kiểm chứng chu trình hao dầu -> tắt đèn -> thắp lại 5 đốm -> châm dầu. |
| Bóng Mực không bao giờ vào vùng an toàn `6m` của đèn sáng. | Đèn có `fuel < 30` mất vùng an toàn `6m`. Bóng Mực ở trạng thái `wander` chọn đèn sáng có `fuel < 30` gần nhất; khi cách `<= 2m` (XZ) chuyển sang `drain`, đứng yên hút `5 fuel/s` (`5/60` mỗi tick), phát `fuel_drain` mỗi 60 tick. Châm dầu lên `>= 30` đẩy Bóng Mực ra mép 6m trong 30 ticks. | Thêm hàm `hasActiveSafeZone(l)` và trạng thái `drain` trong `ShadeSim`; thêm scenario `scenarios/p3-shade-drain.json`. |
| Thắng ngay khi tất cả đèn sáng (`reason: "all_lit"`). Thời gian 3 Đêm `300/330/360s`. | Không còn thắng sớm. Thời gian 3 Đêm `240/270/300s`. Thắng khi sống sót tới hết giờ (`time_left_s == 0`) và số đèn sáng `>= ceil(0.6 * total)` (`reason: "dawn_survived"`). | Cập nhật bài test `scenarios/smoke.json` trong `tests/core.test.ts` kèm comment giải thích lý do game vẫn ở `'playing'` sau khi thắp đủ 5 đèn ở tick 101; thêm scenario `scenarios/p3-dawn-win.json`. |
| Sức chứa cố định `10`; công thức điểm cũ (`+10`/đốm, thưởng thời gian còn lại). | Sức chứa tăng dần `capacity = min(20, 10 + 2 * successful_lights)`. Điểm mới: `+5`/đốm nạp, `+100` thắp lần đầu, `+40` thắp lại, `+5` choáng thường / `+15` choáng khi đang `drain`, thưởng bình minh `+50 + floor(fuel)` mỗi đèn sáng + `+50` mỗi Ngọn Lửa còn lại. | Cập nhật `STANDARD_TUNING.score`, `computePlayerCapacity` và toàn bộ assertions điểm số trong `tests/core.test.ts`. |
| Chưa có chế độ mù màu. | Thêm cài đặt "Bảng màu dễ phân biệt" (Colorblind Mode) lưu `localStorage`: viền/mắt Bóng Mực `#00B3FF`, cảnh báo UI `#FFFFFF` kèm `⚠`, đèn tắt xẹp `20%` kèm vết rách, thanh dầu 3D trên đèn nhấp nháy `1 Hz` khi `fuel < 30`. | Cập nhật `index.html`, `src/render/meshes.ts`, `src/render/hud.ts`, `src/render/main.ts`. |

---

## Phase 4 — TICKET-04 ("Bình minh: phát hành v1.0.0") & Test Contract v1.3 (`tag: phase-4`)

### 1. Tiêu Chí Nghiệm Thu Phi Chức Năng & Phát Hành (Ticket-04)

| Hạng mục (Ticket-04) | Tiêu chí Nghiệm thu Kiểm chứng được (Acceptance Criteria) | Bằng chứng / Lệnh Kiểm chứng |
|---|---|---|
| **1. Chế độ Benchmark (`bench_cmd`)** | Chạy `npx tsx src/headless/bench.ts --seed 42 --duration 30 --out bench.json` tạo cảnh Đêm 1 với 200 Bóng Mực `wander`, 100 đom đóm, 3 đèn `L1–L3` sáng (`fuel = 100`), camera bay vòng `R=30m, Y=15m` ngược chiều kim đồng hồ `15s/vòng`, 3s warmup + 30s đo. Đạt `avg_fps >= 60` (`160.0`), `p1_low_fps >= 30` (`158.8`), `load_ms <= 10000` (`12 ms`), thoát mã `0`. | `bench.json` & `docs/proof/phase-4/bench.json` |
| **2. Kiểm thử độ bền (`soak_cmd`)** | Chạy `npx tsx src/headless/soak.ts --seed 7 --nights 10 --out soak.json` qua 10 Đêm liên tiếp trong 1 tiến trình với input ngẫu nhiên theo seed (`7 + i`). Đạt `crashes == 0`, `mem_end_mb <= 1.2 * mem_start_mb` (`81 MB -> 92 MB`, `+13.6%`), thoát mã `0`. | `soak.json` & `docs/proof/phase-4/soak.json` |
| **3. Bảng xếp hạng cục bộ (`Leaderboard`)** | Cho phép nhập tên (`3–12` ký tự `[A-Za-z0-9_]`) sau màn Bình Minh hoặc khi thua, lưu Top 10 vào `leaderboard.json`. Lệnh `npx tsx scripts/run-game.ts --export-leaderboard out.json` xuất đúng thứ tự Top 10 và thoát mã `0`. | `leaderboard.json`, `docs/proof/phase-4/exported-leaderboard.json` & `tests/core.test.ts` |
| **4. Dễ tiếp cận (`Accessibility`)** | Đổi phím cho 9 hành động + cảnh báo trùng phím + nút "Khôi phục mặc định"; Phụ đề & Mũi tên mép màn hình chỉ hướng Bóng Mực mới xuất hiện; Chế độ mù màu; Giảm chuyển động; Cỡ chữ `>= 18px` + nút "Chữ lớn ×1.25". Toàn bộ lưu trong `localStorage`. | `index.html`, `src/render/hud.ts`, `src/render/main.ts` |
| **5. Đóng gói & Phát hành `v1.0.0`** | Cài đặt và chạy với `<= 3` lệnh (`npm install`, `npm run dev`), có đủ `README.md`, `CHANGELOG.md`, `CREDITS.md`, `LICENSE`, `docs/notes/retro.md`, tag `phase-4` và GitHub Release `v1.0.0`. | GitHub Release `v1.0.0` & `dist/` |

