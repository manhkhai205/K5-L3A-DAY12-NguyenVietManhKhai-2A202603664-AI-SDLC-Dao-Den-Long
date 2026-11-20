# AGENTS.md — Đảo Đèn Lồng (AI Harness & Guardrails — Updated for Phase 3 / Contract v1.2)

## 1. Kiến trúc Bắt buộc (Strict Boundaries)
- `src/core/`: **Thuần TypeScript**. TUYỆT ĐỐI KHÔNG import `three`, `window`, `document` hoặc gọi `Math.random()`, `Date.now()`.
- Mọi yếu tố ngẫu nhiên trong `src/core/` PHẢI dùng `PRNG` có seed (`src/core/prng.ts`) để đảm bảo **100% tính tất định (determinism)**.
- `src/core/engine.ts`: Tuân thủ chính xác **thứ tự 12 bước trong 1 tick** (60 tick/giây) của `TICKET-02` & `TICKET-03` (`Test Contract v1.2`):
  - Nhiên liệu đèn tính bằng đơn vị nguyên `1/60` (`fuelUnits`, `100 fuel = 6000 units`) để tránh sai số số thực; trừ dầu ở Bước 2 (`1/60` tự hao + `5/60` mỗi Bóng Mực đang `drain`); tắt đèn ngay sau Bước 2 nếu `fuelUnits <= 0` (`lantern_out`).
  - Không còn thắng sớm khi thắp hết đèn; chỉ thắng ở Bước 11 khi hết giờ (`dawn_survived`) và số đèn sáng `>= ceil(0.6 * totalLanterns)`.
- `src/headless/cli.ts`: Xuất định dạng **JSONL** (`snapshot`, `event`, `end`), làm tròn tọa độ 3 chữ số thập phân (`round3`), `fuel` làm tròn 1 chữ số thập phân (`round1`), trả mã thoát `2` nếu file scenario/inputs sai định dạng.
- `src/render/`: Hiển thị 3D bằng Three.js + GLB assets + Web Audio API + HUD đầy đủ + Chế độ Mù màu (Colorblind Mode). Mọi tính năng **"Sáng tạo của tôi"** không được làm đổi đầu ra headless.

## 2. Lệnh Chuẩn (Commands)
- Cài đặt: `npm install`
- Chạy game 3D (Web): `npm run dev`
- Đóng gói bản phát hành tĩnh: `npm run build`
- Chạy Headless CLI: `npx tsx src/headless/cli.ts --seed <int> --night <1|2|3> --scenario <file> --inputs <file> --ticks <int> --out <file.jsonl>`
- Kiểm tra kiểu tĩnh: `npm run typecheck`
- Chạy Unit, Regression & Determinism Tests: `npm test`
- Tự động kiểm chứng & xuất bằng chứng: `npm run verify -- --phase <1|2|3|4>`

## 3. Quy trình SDLC Mỗi Phase (Workflow)
1. **Requirements & ADR:** Đọc PRD/Ticket, ghi quyết định thiết kế vào `docs/notes/ADR-*.md`, `CHANGELOG.md`, `docs/notes/assumptions.md` và `game.contract.json`.
2. **Plan & Test First:** Viết scenario headless mới trong `scenarios/` và cập nhật test cũ bị luật mới thay thế trong `tests/core.test.ts` kèm chú thích rõ lý do.
3. **Build & Verify:** Cập nhật code và chạy `npm run verify -- --phase <N>` để lưu log thật và output JSONL vào `docs/proof/phase-<N>/`.
4. **Evaluate & Release:** Cập nhật `docs/notes/ai-log-and-tokens.md`, `docs/notes/retro.md`, commit nhỏ, gắn tag `phase-N` và push trước hạn.
