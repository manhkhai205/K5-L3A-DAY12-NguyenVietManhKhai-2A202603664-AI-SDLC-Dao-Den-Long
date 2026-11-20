---
name: verify-phase
description: Quy trình tự động kiểm chứng, kiểm tra tính tất định (determinism), kiểm tra benchmark & soak test, xuất báo cáo bằng chứng thật vào docs/proof/phase-N/ và đối chiếu hồi quy trước khi gắn tag phase.
---

# Skill: Verify Phase (`verify-phase`)

Khi kết thúc bất kỳ Phase nào (`Phase 1`, `Phase 2`, `Phase 3`, `Phase 4`), Agent PHẢI thực hiện đúng quy trình 5 bước sau:

1. **Kiểm tra Biên Kiến Trúc & Kiểu Tĩnh (`Typecheck`):**
   - Chạy `npm run typecheck` (`tsc --noEmit`).
   - Đảm bảo không có bất kỳ tham chiếu nào tới `three`, `window`, `document`, `Math.random()` trong `src/core/`.

2. **Chạy Bộ Kiểm Thử Đơn Vị & Hồi Quy (`Vitest`):**
   - Chạy `npm test` (`npx vitest run`).
   - Kiểm tra 15/15 bài test bao gồm PRNG determinism, toàn bộ cơ chế Phase 1–3, và các tính năng Phase 4 (Leaderboard Top 10, Soak Test 0 crash, Benchmark Contract v1.3).

3. **Chạy Benchmark, Soak Test & Xuất Bảng Xếp Hạng (Phase 4 / Contract v1.3):**
   - Chạy `npx tsx src/headless/bench.ts --seed 42 --duration 30 --out bench.json` (kiểm tra `avg_fps >= 60`, `p1_low_fps >= 30`, `load_ms <= 10000`).
   - Chạy `npx tsx src/headless/soak.ts --seed 7 --nights 10 --out soak.json` (kiểm tra `crashes == 0`, `mem_end_mb <= 1.2 * mem_start_mb`).
   - Chạy `npx tsx scripts/run-game.ts --export-leaderboard docs/proof/phase-4/exported-leaderboard.json`.

4. **Xuất Báo Cáo Kiểm Chứng Thực Tế (`scripts/verify-phase.ts`):**
   - Chạy `npm run verify -- --phase <N>` để lưu log thật (`headless-output.jsonl`, `bench.json`, `soak.json`, `exported-leaderboard.json`, `verification-report.md`) vào `docs/proof/phase-<N>/`.

5. **Kiểm Tra Đóng Gói Web 3D & Gắn Tag:**
   - Chạy `npm run build` để đảm bảo bản Web 3D đóng gói sạch ra `dist/`.
   - Cập nhật `CHANGELOG.md`, `docs/notes/retro.md`, `docs/notes/ai-log-and-tokens.md`, commit, gắn tag `phase-<N>` và push.
