# Đánh Giá Từng Phase & Retrospective Cuối Dự Án (`docs/notes/retro.md`)

**Dự án:** Đảo Đèn Lồng (`v1.0.0` — Test Contract `v1.3`)  
**Học viên:** Nguyễn Viết Mạnh Khải (`MSSV: 2A202603664`)  
**Ngày hoàn thành:** 2026-11-20

---

## 1. Đánh Giá Nhanh Sau Từng Phase (Phase-by-Phase Evaluation)

### Checkpoint 0 (Chuẩn bị Kiến trúc & Harness)
- **Mức độ hoàn thành:** Đạt 100% mục tiêu chuẩn bị. Đã thiết lập kiến trúc 3 tầng tách biệt (`src/core/` thuần TypeScript tất định, `src/headless/` CLI JSONL, `src/render/` Three.js Web 3D + Web Audio API) cùng bộ 3 Harness (`AGENTS.md`, skill `verify-phase`, pre-commit hook `.githooks/pre-commit` + GitHub Actions CI).

### Phase 1 (`tag: phase-1` — `PRD-0` & Contract `v1.0`)
- **Yêu cầu đạt / chưa đạt:** Đạt 100% yêu cầu `PRD-0` và `Test Contract v1.0`. Đã có `game.contract.json` v1.0, chế độ headless xuất JSONL (`snapshot`, `event`, `end`), mô hình 3D nhân vật Mây đội nón lá treo đèn lồng nhỏ, 5 Đèn Lồng Lớn trên Đảo Bến, Đom Đóm, Bóng Mực và kỹ năng Tỏa Sáng.
- **Tinh chỉnh Harness:** Rào chắn `tsc --noEmit` trong `scripts/verify-phase.ts` đã phát hiện kịp thời lỗi thiếu import `SimEvent` trước khi chạy test.

### Phase 2 (`tag: phase-2` — `TICKET-02: Ba hòn đảo` & Contract `v1.1`)
- **Yêu cầu đạt / chưa đạt:** Đạt 100% yêu cầu `TICKET-02` và `Test Contract v1.1`. Đồng bộ toàn bộ số liệu chuẩn, mở rộng 3 Đêm (Đảo Bến, Đảo Cau với cầu tre & bục nhảy, Đảo Chuông 3 tầng với dốc, tháp chuông & gió mạnh), bổ sung kỹ năng Lướt (Dash), Bùa Gió (`C1`, `C2`), Gió Lạc (`D1`, `D2`), Tạm dừng (`paused`/`resumed`), xoay camera 360° bằng chuột (`Pointer Lock` + `Mouse Drag`), tích hợp tài sản 3D `.glb` & textures CC0/MIT.
- **Kiểm tra hồi quy & Hiệu năng:** Toàn bộ 6 bài test Phase 1 vẫn đạt 100% (tổng 10/10 bài test xanh). Chạy headless trọn vẹn 1 Đêm `21.600 ticks` chỉ mất `< 50 ms` (vượt xa ngưỡng `<= 30 giây`).

### Phase 3 (`tag: phase-3` — `TICKET-03: Đèn cạn dầu` & Contract `v1.2`)
- **Yêu cầu đạt / chưa đạt:** Đạt 100% yêu cầu Change Request `TICKET-03` và `Test Contract v1.2`. Triển khai nhiên liệu đèn theo đơn vị nguyên `1/60` (`fuelUnits`, `100 fuel = 6000 units`), châm dầu (`refuel`), tắt đèn khi cạn dầu (`lantern_out`), thắp lại tốn 5 đom đóm (`relight: true`), Bóng Mực hút dầu đèn yếu (`drain`, `fuel_drain`), luật thắng sống sót tới bình minh (`dawn_survived`), sức chứa tăng dần (`10 + 2 * successful_lights`, trần `20`), công thức điểm mới và Chế độ Mù màu (Colorblind Mode + đèn tắt xẹp 20% có vết rách + thanh dầu 3D nhấp nháy 1Hz).
- **Xử lý thay đổi yêu cầu & test cũ:** Viết [ADR-001-phase3-lantern-fuel-and-dawn.md](ADR-001-phase3-lantern-fuel-and-dawn.md) và [../../CHANGELOG.md](../../CHANGELOG.md). Cập nhật bài test `smoke.json` bị ảnh hưởng bởi luật bỏ thắng sớm `all_lit` kèm chú thích rõ lý do trong `tests/core.test.ts`, bổ sung 3 scenarios mới nâng tổng số test lên 12/12 PASSED.

### Phase 4 (`tag: phase-4` / Release `v1.0.0` — `TICKET-04` & Contract `v1.3`)
- **Yêu cầu đạt / chưa đạt & Số đo thực tế:** Đạt 100% yêu cầu `TICKET-04` và `Test Contract v1.3`:
  - **Benchmark (`bench.json`):** `avg_fps = 160.0` (ngưỡng `>= 60`), `p1_low_fps = 158.8` (ngưỡng `>= 30`), `frame_ms_p95 = 6.3 ms`, `frames = 4799`, `load_ms = 12 ms` (ngưỡng `<= 10000 ms`), `peak_mem_mb = 96 MB`.
  - **Soak Test (`soak.json`):** Chạy 10 Đêm liên tiếp trong 1 tiến trình đạt `crashes = 0`, `mem_start_mb = 81 MB`, `mem_end_mb = 92 MB` (`+13.6% <= 20%`), `duration_s = 0.2 s`.
  - **Bảng xếp hạng cục bộ & Dễ tiếp cận:** Lưu `leaderboard.json` Top 10, hỗ trợ `--export-leaderboard out.json`, Đổi phím 9 hành động có cảnh báo trùng phím, Phụ đề + Mũi tên mép màn hình chỉ hướng Bóng Mực xuất hiện, Giảm chuyển động, Cỡ chữ `>= 18px` & Chữ lớn `×1.25`.

---

## 2. Retrospective Cuối Dự Án (6 Câu Hỏi Trọng Tâm — `TICKET-04 Section 6`)

### 2.1. Quy trình SDLC đã diễn ra thế nào qua 4 Phase? Khâu nào của quy trình đã cứu dự án khỏi lỗi lớn?
- **Diễn tiến quy trình qua 4 Phase:** Ở mọi Phase, dự án tuân thủ nghiêm ngặt vòng lặp 5 bước: `Requirements & ADR -> Plan & Scenarios -> Build Core First -> Automated Verify (npm run verify) -> Evaluate & Tag`. Thay vì nhảy vào sửa trực tiếp giao diện 3D mỗi khi có ticket mới, mọi quy tắc luôn được mô hình hóa trong `src/core/` và kiểm chứng bằng scenario JSON trước, sau đó mới nối lên tầng `src/render/`.
- **Khâu cứu dự án khỏi lỗi lớn nhất:** Chính là **khâu Thiết kế Kiến trúc Tách biệt (`Architecture`) kết hợp với Rào chắn Kiểm chứng Tự động (`Verify`) ở đầu mỗi Phase**:
  1. Ở **Checkpoint 0**, quyết định tách cứng `src/core/` (thuần TypeScript, dùng `PRNG` Mulberry32, tuyệt đối không import `three` hay `window`) đã giúp toàn bộ 4 Phase chạy Headless CLI đạt 100% tính tất định (`Run 1 === Run 2`) và chạy 10 Đêm Soak Test (`162.000+ ticks`) chỉ trong `0.2 giây`.
  2. Ở **Phase 3 (`TICKET-03`)**, khâu viết scenario `p3-shade-drain.json` trước khi hoàn tất code đã phát hiện một lỗi logic tinh vi: theo luật mới, Bóng Mực ở trạng thái `drain` sẽ chuyển sang `chase` ngay khi Mây tiến vào phạm vi `<= 6m` (Bước 8), trong khi kỹ năng Tỏa Sáng (`pulse`) chỉ có bán kính `5m` (Bước 7). Nếu chỉ kiểm tra `shade.state === 'drain'` tại thời điểm bấm `pulse`, người chơi chạy từ xa vào sẽ không bao giờ nhận được điểm thưởng `+15` (`per_drain_stun`). Nhờ bài test tự động báo đỏ ngay lập tức, chúng tôi đã bổ sung trường `wasDrainingTick` để ghi nhận cửa sổ chuyển trạng thái và cứu bài nộp khỏi mất điểm chấm tự động.

### 2.2. Những giả định ở Phase 1 (`PRD-0`) đã đúng hay sai khi `TICKET-02` đến? Việc sửa tốn bao nhiêu công?
- **Đối chiếu giả định Phase 1 vs `TICKET-02`:**
  - Trong `PRD-0`, hầu hết các con số như tốc độ chạy của Mây, bán kính nhặt đom đóm, bán kính vùng an toàn quanh đèn, tốc độ Bóng Mực, thời gian choáng của Tỏa Sáng đều bị bỏ ngỏ.
  - Ngay từ Phase 1, chúng tôi đã thiết kế bảng tham số `STANDARD_TUNING` tập trung trong một file duy nhất (`src/core/config.ts`) và xuất trực tiếp ra `game.contract.json` (`player_speed: 6.0`, `pickup_radius: 1.0`, `interact_radius: 2.0`, `safe_radius: 6.0`, `pulse_radius: 5.0`, `shade_speed: 4.0`). Khi `TICKET-02` công bố bộ số liệu chuẩn của khách hàng, các hằng số cốt lõi này khớp 100%!
  - Những điểm mở rộng mới trong `TICKET-02` (thêm kỹ năng Lướt `14.0 m/s`, Bùa Gió `C1/C2`, Gió Lạc `D1/D2`, địa hình Đảo Cau có cầu tre & bục nhảy, Đảo Chuông 3 tầng có gió mạnh, và quy tắc 12 bước trong 1 tick) chỉ cần bổ sung thêm vào `src/core/engine.ts`.
- **Chi phí sửa đổi:** Nhờ gom toàn bộ hằng số vào `src/core/config.ts`, việc đồng bộ số liệu với `TICKET-02` tốn **chưa tới 5 phút** và **0 dòng code bị đập đi xây lại**. Toàn bộ 6 bài test của Phase 1 chạy xanh ngay lập tức trên engine Phase 2.

### 2.3. Khi `TICKET-03` thay đổi luật cốt lõi ("Đèn cạn dầu"), kiến trúc và test của bạn đã chịu được đến đâu? Bạn đã phải sửa những gì?
- **Độ chịu tải của kiến trúc:** Kiến trúc 12 bước trong `stepWorld` (`src/core/engine.ts`) chịu tải cực tốt trước Change Request `TICKET-03`. Toàn bộ thay đổi lớn của `TICKET-03` được ánh xạ gọn gàng vào đúng các bước đã định nghĩa sẵn:
  - Bước 2: Trừ nhiên liệu đèn (`1/60` tự hao + `5/60` mỗi Bóng Mực đang `drain`) bằng số nguyên `fuelUnits` (`100 fuel = 6000 units`) và tắt đèn ngay khi `fuelUnits <= 0` (`lantern_out`).
  - Bước 7: Mở rộng hành động Tương tác để xử lý cả nạp đom đóm thắp đèn lần đầu (`10` đốm), thắp lại đèn đã từng sáng (`ever_lit: true`, `5` đốm, `relight: true`), và châm dầu cho đèn đang sáng (`refuel`, `+10 fuel`/đốm), đồng thời cập nhật `player.capacity = min(20, 10 + 2 * successful_lights)`.
  - Bước 8 & 11: Bóng Mực `wander` ưu tiên nhắm vào đèn sáng có `fuel < 30` (đã mất vùng an toàn `6m`) để vào trạng thái `drain`; Bước 11 bỏ điều kiện thắng sớm `all_lit` và chỉ xét thắng `dawn_survived` khi `timeLeftTicks == 0` và số đèn sáng `>= ceil(0.6 * total)`.
- **Những gì đã phải sửa trong bộ Test:**
  - Trong 10 bài test của Phase 1 & 2, **9 bài test liên quan đến PRNG, di chuyển, Tỏa Sáng, va chạm mất máu, Lướt, Bùa Gió, Gió Lạc, Tạm dừng vẫn đúng hoàn toàn**.
  - Chỉ có duy nhất bài test `smoke.json` (thắp đủ đèn ở tick 101) bị ảnh hưởng trực tiếp bởi 2 luật thay thế: (1) thắp hết đèn không còn thắng sớm `all_lit`, và (2) điểm mỗi đom đóm nạp đổi từ `+10` sang `+5`. Chúng tôi đã cập nhật kỳ vọng của bài test đó trong `tests/core.test.ts` kèm khối chú thích `/** [UPDATED IN PHASE 3 DUE TO TICKET-03 CHANGE REQUEST] */` giải thích rõ luật cũ vs luật mới, đồng thời viết thêm 3 bài test mới (`p3-fuel-relight`, `p3-shade-drain`, `p3-dawn-win`).

### 2.4. Những chỗ AI làm sai hoặc làm tệ trong ngày, nguyên nhân gốc là gì, và bạn đã chỉnh Harness / cách làm việc như thế nào?
- **Tình huống 1 (Phase 1 & Phase 4 — Lỗi đồng bộ tên kiểu/phương thức khi tạo file mới):**
  - *Biểu hiện:* Ở Phase 1, AI tách interface `SimEvent` sang `src/core/types.ts` nhưng quên thêm vào danh sách import của `src/core/engine.ts`. Ở Phase 4, khi viết `src/headless/bench.ts`, AI gọi `prng.nextRange()` trong khi class `PRNG` đặt tên hàm là `prng.range()`.
  - *Nguyên nhân gốc:* Khi AI sinh một file mới độc lập, nó có xu hướng giả định tên hàm tiện ích theo thói quen (`nextRange`) nếu không đọc lại file `prng.ts` ngay trong lượt đó.
  - *Cách chỉnh Harness:* Đặt `npm run typecheck` (`tsc --noEmit`) làm bước 1 bắt buộc trong cả `scripts/verify-phase.ts` lẫn `.githooks/pre-commit`. Nhờ đó lỗi được phát hiện và sửa chỉ trong vài giây trước khi lọt vào bất kỳ commit nào.
- **Tình huống 2 (Phase 3 — Giao thoa giữa 2 quy tắc khoảng cách trong cùng 1 tick):**
  - *Biểu hiện:* Luật `TICKET-03` quy định Bóng Mực đang `drain` sẽ chuyển sang `chase` khi Mây vào trong `6m` (Bước 8), nhưng Tỏa Sáng chỉ có bán kính `5m` (Bước 7). Khi Mây chạy từ xa lại gần đèn để cứu đèn, ở khoảng cách `5.8m` Bóng Mực đã chuyển từ `drain` sang `chase`, nên tick tiếp theo khi Mây vào `4.9m` và bấm Tỏa Sáng, AI chỉ cộng `+5` điểm thay vì `+15` điểm.
  - *Nguyên nhân gốc:* AI ban đầu cài đặt điều kiện nhận `+15` điểm theo nghĩa đen (`shade.state === 'drain'`), chưa tính đến động học di chuyển liên tục của người chơi qua ranh giới `6m -> 5m`.
  - *Cách chỉnh cách làm việc:* Luôn viết scenario mô phỏng hành trình di chuyển thực tế của người chơi (`scenarios/p3-shade-drain.json`) thay vì chỉ đặt sẵn nhân vật đứng đè lên Bóng Mực ở tick 0. Nhờ scenario thực tế này, lỗi được phát hiện và khắc phục triệt để bằng `wasDrainingTick`.

### 2.5. Harness của bạn (`AGENTS.md`, skills, hooks, cấu trúc dự án) đã tiến hóa ra sao từ đầu ngày đến cuối ngày?
- **Khởi đầu (Checkpoint 0):**
  - `AGENTS.md` chỉ có ~30 dòng quy định ranh giới cứng giữa `src/core/` (cấm `three`, `window`, `Math.random()`) và `src/render/`, cùng lệnh chạy cơ bản.
  - Skill `verify-phase` và `scripts/verify-phase.ts` chỉ kiểm tra `typecheck`, `vitest`, và chạy 2 lần `smoke.json` để so sánh tính tất định JSONL.
- **Tiến hóa qua Phase 2 & Phase 3:**
  - `AGENTS.md` được bổ sung quy tắc **thứ tự 12 bước bắt buộc trong 1 tick** (Phase 2) và quy tắc **tính nhiên liệu nguyên `1/60` (`fuelUnits`) + luật thắng `dawn_survived`** (Phase 3), vẫn giữ độ dài tinh gọn `< 40 dòng` để không làm loãng context window của AI.
  - Hệ thống tài liệu kiến trúc được mở rộng thêm `docs/notes/ADR-001-phase3-lantern-fuel-and-dawn.md` và `CHANGELOG.md` để theo dõi các Breaking Changes giữa các phiên bản Contract (`v1.0 -> v1.1 -> v1.2`).
- **Hoàn thiện ở Phase 4 (`Contract v1.3`):**
  - `AGENTS.md`, `SKILL.md` và `scripts/verify-phase.ts` tiến hóa thành một pipeline kiểm chứng phát hành toàn diện 4 bước: `Typecheck -> 15 Unit & Regression Tests -> Determinism Headless Check -> Benchmark (bench.json) + 10-Night Soak Test (soak.json) + CLI Leaderboard Export`, tự động đóng gói toàn bộ bằng chứng vào `docs/proof/phase-4/verification-report.md`.

### 2.6. Quản lý Token và Thời gian: Đâu là chỗ tốn nhất, đâu là chỗ tiết kiệm được nhờ chuẩn bị tốt? Nếu làm lại từ đầu, bạn sẽ thay đổi một điều gì?
- **Chỗ tốn Token và Thời gian nhất:**
  - Tốn nhiều nhất ở **Phase 2** (~30,500 tokens cả vào/ra) khi đồng thời phải mở rộng địa hình 3D cho cả 3 Đêm (Đảo Bến, Đảo Cau có cầu tre & bục nhảy, Đảo Chuông 3 tầng có dốc & tháp chuông), tích hợp bộ model `.glb` + textures, nâng cấp điều khiển camera chuột 360° và cài đặt quy trình 12 bước của `TICKET-02`.
- **Chỗ tiết kiệm được nhiều nhất nhờ chuẩn bị tốt:**
  1. **Kiến trúc Headless tách rời (`src/core/`) và `verify-phase`:** Giúp tiết kiệm ít nhất **50–60% tổng lượng token** của cả ngày. Thay vì phải bật trình duyệt chơi thử thủ công rồi mô tả lỗi dài dòng cho AI sửa qua lại hàng chục lượt, mọi lỗi logic ở Phase 2, 3, 4 đều được phát hiện và khóa lại bằng unit test/headless JSONL chỉ trong **1 lượt prompt duy nhất mỗi Phase**.
  2. **Biểu diễn nhiên liệu bằng số nguyên `fuelUnits` (`1/60`) ngay từ đầu Phase 3:** Tránh được hoàn toàn các lỗi làm tròn số thực (`29.999999999999996 < 30`) vốn rất hay gây tốn token khi debug.
- **Nếu làm lại từ đầu, một điều sẽ thay đổi:**
  - Ngay từ **Checkpoint 0**, tôi sẽ thiết kế hệ thống phím bấm trong `src/render/` đọc qua một bảng ánh xạ `KeyBindings` (`up, down, left, right, jump, dash, interact, pulse, pause`) lưu trong `localStorage` thay vì viết cứng `e.code === 'KeyW'` ở Phase 1–3. Việc đưa `KeyBindings` vào ngay từ đầu chỉ tốn thêm ~20 dòng code ở CP0 nhưng sẽ giúp phần Accessibility (Đổi phím) ở Phase 4 gần như có sẵn tự động.
