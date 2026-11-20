# AGENTS.md — Đảo Đèn Lồng (AI Harness & Guardrails — Updated for Phase 2 / Contract v1.1)

## 1. Kiến trúc Bắt buộc (Strict Boundaries)
- `src/core/`: **Thuần TypeScript**. TUYỆT ĐỐI KHÔNG import `three`, `window`, `document` hoặc gọi `Math.random()`, `Date.now()`.
- Mọi yếu tố ngẫu nhiên trong `src/core/` PHẢI dùng `PRNG` có seed (`src/core/prng.ts`) để đảm bảo **100% tính tất định (determinism)**.
- `src/core/engine.ts`: Tuân thủ chính xác **thứ tự 12 bước trong 1 tick** (60 tick/giây) của `TICKET-02` và `Test Contract v1.1` (hỗ trợ cả 3 Đêm: Đảo Bến, Đảo Cau, Đảo Chuông; Lướt, Bùa Gió, Gió Lạc, Bục nhảy, Gió mạnh, Tạm dừng).
- `src/headless/cli.ts`: Xuất định dạng **JSONL** (`snapshot`, `event`, `end`), làm tròn tọa độ 3 chữ số thập phân (`round3`), trả mã thoát `2` nếu file scenario/inputs sai định dạng.
- `src/render/`: Hiển thị 3D bằng Three.js (đúng bảng màu chuẩn Hex của `TICKET-02`) + Web Audio API + HUD đầy đủ. Mọi tính năng thuộc mục **"Sáng tạo của tôi"** không được làm đổi đầu ra headless.

## 2. Lệnh Chuẩn (Commands)
- Cài đặt: `npm install`
- Chạy game 3D (Web): `npm run dev`
- Đóng gói bản phát hành tĩnh: `npm run build`
- Chạy Headless CLI: `npx tsx src/headless/cli.ts --seed <int> --night <1|2|3> --scenario <file> --inputs <file> --ticks <int> --out <file.jsonl>`
- Kiểm tra kiểu tĩnh: `npm run typecheck`
- Chạy Unit, Regression & Determinism Tests: `npm test`
- Tự động kiểm chứng & xuất bằng chứng: `npm run verify -- --phase <1|2|3|4>`

## 3. Quy trình SDLC Mỗi Phase (Workflow)
1. **Requirements:** Đọc PRD/Ticket, cập nhật tiêu chí nghiệm thu vào `docs/notes/assumptions.md` và `game.contract.json`.
2. **Plan & Test First:** Viết scenario headless mới trong `scenarios/` và unit test trong `tests/core.test.ts` cho mọi tính năng mới.
3. **Build & Regression:** Cập nhật `src/core/`, `src/headless/`, `src/render/` và đảm bảo toàn bộ test của Phase trước vẫn xanh.
4. **Verify (Cấm bằng chứng giả):** Chạy `npm run verify -- --phase <N>` để lưu log thật và output JSONL vào `docs/proof/phase-<N>/`.
5. **Evaluate & Release:** Cập nhật `docs/notes/ai-log-and-tokens.md`, `docs/notes/retro.md`, commit nhỏ, gắn tag `phase-N` và push trước hạn.
