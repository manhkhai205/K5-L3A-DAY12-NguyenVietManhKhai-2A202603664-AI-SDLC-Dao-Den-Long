# AGENTS.md — Đảo Đèn Lồng (AI Harness & Guardrails)

## 1. Kiến trúc Bắt buộc (Strict Boundaries)
- `src/core/`: **Thuần TypeScript**. TUYỆT ĐỐI KHÔNG import `three`, `window`, `document` hoặc gọi `Math.random()`, `Date.now()`.
- Mọi yếu tố ngẫu nhiên trong `src/core/` PHẢI dùng `PRNG` có seed (`src/core/prng.ts`) để đảm bảo **100% tính tất định (determinism)**.
- `src/headless/cli.ts`: Chạy `src/core/` không cần cửa sổ đồ họa, tuân thủ chính xác định dạng đầu vào/đầu ra của **Test Contract** từng Phase.
- `src/render/`: Hiển thị 3D bằng Three.js + Web Audio API + HUD. Mọi tính năng thuộc mục **"Sáng tạo của tôi"** chỉ được đặt ở `src/render/` và không làm thay đổi trạng thái hay output của `src/headless/`.

## 2. Lệnh Chuẩn (Commands)
- Cài đặt: `npm install`
- Chạy game 3D (Web): `npm run dev`
- Đóng gói bản phát hành tĩnh: `npm run build`
- Chạy Headless CLI: `npm run headless -- --scenario <path>`
- Kiểm tra kiểu tĩnh: `npm run typecheck`
- Chạy Unit & Determinism Tests: `npm test`
- Tự động kiểm chứng & xuất bằng chứng: `npm run verify -- --phase <1|2|3|4>`

## 3. Quy trình SDLC Mỗi Phase (Workflow)
1. **Requirements:** Đọc PRD/Ticket, tách yêu cầu bắt buộc và chỗ mơ hồ. Ghi giả định vào `docs/notes/assumptions.md` và khai báo hằng số trong `src/core/config.ts`.
2. **Plan & Test First:** Viết/cập nhật unit test trong `tests/` và scenario trong `scenarios/` TRƯỚC khi sửa logic.
3. **Build:** Cập nhật `src/core/`, `src/headless/` rồi đồng bộ lên `src/render/`.
4. **Verify (Cấm bằng chứng giả):** Chạy skill `verify-phase` (`npm run verify -- --phase <N>`). Không bao giờ sửa tay output trong `docs/proof/` hoặc viết test luôn pass.
5. **Regression & Change Handling:** Khi Phase sau thay đổi luật của Phase trước, KHÔNG xóa/tắt test cũ âm thầm; phải cập nhật test kèm comment ghi rõ lý do theo Ticket mới.
6. **Evaluate & Release:** Cập nhật `docs/notes/ai-log-and-tokens.md`, commit nhỏ rõ nghĩa, gắn tag `phase-N` và push trước hạn.
