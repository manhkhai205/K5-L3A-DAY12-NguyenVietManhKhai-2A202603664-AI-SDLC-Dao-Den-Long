# AGENTS.md — Đảo Đèn Lồng (AI Harness & Guardrails — Updated for Phase 4 / Contract v1.3)

## 1. Kiến trúc Bắt buộc (Strict Boundaries)
- `src/core/`: **Thuần TypeScript**. TUYỆT ĐỐI KHÔNG import `three`, `window`, `document`, `node:fs` hoặc gọi `Math.random()`, `Date.now()`.
- Mọi yếu tố ngẫu nhiên trong `src/core/` PHẢI dùng `PRNG` có seed (`src/core/prng.ts`) để đảm bảo **100% tính tất định (determinism)**.
- `src/core/engine.ts`: Tuân thủ chính xác **thứ tự 12 bước trong 1 tick** (60 tick/giây) của `TICKET-02` & `TICKET-03` (`Test Contract v1.3`):
  - Nhiên liệu đèn tính bằng đơn vị nguyên `1/60` (`fuelUnits`, `100 fuel = 6000 units`) để tránh sai số số thực; trừ dầu ở Bước 2 (`1/60` tự hao + `5/60` mỗi Bóng Mực đang `drain`); tắt đèn ngay sau Bước 2 nếu `fuelUnits <= 0` (`lantern_out`).
  - Không thắng sớm khi thắp hết đèn; chỉ thắng ở Bước 11 khi hết giờ (`dawn_survived`) và số đèn sáng `>= ceil(0.6 * totalLanterns)`.
- `src/headless/cli.ts`: Xuất định dạng **JSONL** (`snapshot`, `event`, `end`), làm tròn tọa độ 3 chữ số thập phân (`round3`), `fuel` làm tròn 1 chữ số thập phân (`round1`), trả mã thoát `2` nếu file scenario/inputs sai định dạng.
- `src/headless/bench.ts` & `src/headless/soak.ts`: Chạy cảnh benchmark chuẩn (200 Bóng Mực wander, 100 đom đóm, L1–L3 sáng, camera bay vòng 15s/vòng) và soak test 10 Đêm liên tiếp (`crashes = 0`, `mem_end_mb <= 1.2 * mem_start_mb`).
- `src/render/`: Hiển thị 3D bằng Three.js + GLB assets + Web Audio API + HUD đầy đủ + Bảng xếp hạng cục bộ + Dễ tiếp cận (Đổi phím, Phụ đề & Mũi tên chỉ báo hướng Bóng Mực, Mù màu, Giảm chuyển động, Cỡ chữ >= 18px & Chữ lớn ×1.25).

## 2. Lệnh Chuẩn (Commands — Contract v1.3)
- Cài đặt & chạy game: `npm install && npm run dev` (`run_cmd`: `npx tsx scripts/run-game.ts`)
- Xuất bảng xếp hạng cục bộ: `npx tsx scripts/run-game.ts --export-leaderboard out.json`
- Chạy Headless CLI: `npx tsx src/headless/cli.ts --seed <int> --night <1|2|3> --scenario <file> --inputs <file> --ticks <int> --out <file.jsonl>`
- Chạy Benchmark: `npx tsx src/headless/bench.ts --seed 42 --duration 30 --out bench.json`
- Chạy Soak Test: `npx tsx src/headless/soak.ts --seed 7 --nights 10 --out soak.json`
- Kiểm tra kiểu tĩnh & Unit Tests: `npm run typecheck && npm test`
- Tự động kiểm chứng & xuất bằng chứng: `npm run verify -- --phase <1|2|3|4>`
