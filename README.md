# Đảo Đèn Lồng — Day 12 AI SDLC

> **Video Demo (< 5 phút):** [Xem Video Demo (Release v1.0.0 / docs/demo/demo.mp4)](docs/demo/demo.mp4) *(Đính kèm ở Phase 4 / Release v1.0.0)*
> **Học viên:** Nguyễn Viết Mạnh Khải · **MSSV:** `2A202603664` · **Lớp:** `K5-L3A`

**Đảo Đèn Lồng** là game 3D góc nhìn thứ ba kết hợp với **Headless Deterministic Engine** (60 tick/giây) phát triển qua 4 Phase. Người chơi điều khiển **Mây** (người giữ đèn nhỏ tuổi đội nón lá có treo chiếc đèn lồng nhỏ) chạy khắp đảo thu thập **Đom Đóm**, thắp sáng các **Đèn Lồng Lớn**, dùng **Tỏa Sáng (Pulse)** và **Lướt (Dash)** để xua đuổi **Bóng Mực** trong sương đen.

---

## 1. Cài đặt & Chạy Game (Tối đa 3 lệnh)

Yêu cầu môi trường: **Node.js >= 20** (chạy đa nền tảng trên **macOS, Linux, Windows**).

```bash
# 1. Cài đặt dependencies
npm install

# 2. Chạy game 3D trên trình duyệt (http://localhost:5173)
npm run dev

# 3. Chạy chế độ Headless theo Test Contract (xuất JSONL)
npx tsx src/headless/cli.ts --seed 42 --night 1 --scenario scenarios/smoke.json --inputs scenarios/smoke-inputs.json --ticks 150 --out out.jsonl
```

---

## 2. Điều khiển trong Game 3D

| Phím / Thao tác | Chức năng |
|---|---|
| `W`, `A`, `S`, `D` hoặc `Phím mũi tên` | Di chuyển nhân vật **Mây** |
| `Space` | Nhảy (`7.0 m/s`, trọng lực `-20 m/s²`) |
| `Shift` | Lướt nhanh (`14.0 m/s` trong `0.2s`, hồi chiêu `1.5s`) |
| `E` | Nạp đom đóm đang mang vào **Đèn Lồng Lớn** gần nhất (trong bán kính `2.0m`) |
| `Q` hoặc `F` | **Tỏa Sáng (Pulse)**: tốn `3` đom đóm, làm choáng và đẩy lùi Bóng Mực trong bán kính `5.0m` |
| `Esc` hoặc `P` | Tạm dừng game / Mở bảng Cài đặt âm lượng & độ nhạy |
| `R` | Chơi lại Đêm hiện tại |

---

## 3. Cách Tính Điểm & Tham số `tuning` (`game.contract.json`)

- **Nạp đom đóm vào đèn (`per_mote`):** `+10 điểm` cho mỗi đom đóm được nạp vào Đèn Lồng Lớn.
- **Thắp sáng Đèn Lồng Lớn (`per_lantern`):** `+100 điểm` mỗi khi một Đèn Lồng Lớn nhận đủ `10` đom đóm và bừng sáng.
- **Tỏa Sáng trúng Bóng Mực (`per_stun`):** `+5 điểm` cho mỗi Bóng Mực bị làm choáng bởi kỹ năng Tỏa Sáng.
- **Thưởng Chiến Thắng khi thắp hết đèn:**
  - `+2 điểm` × `floor(số giây còn lại của Đêm)` (`per_second_left: 2`).
  - `+50 điểm` × `số Ngọn Lửa (máu) còn lại` (`per_flame_left: 50`).

---

## 4. Kiểm thử Tự động & Bằng chứng Kiểm chứng

```bash
# Kiểm tra kiểu tĩnh TypeScript
npm run typecheck

# Chạy Unit Tests & Kiểm tra tính tất định (Vitest)
npm test

# Chạy quy trình tự động kiểm chứng & xuất báo cáo bằng chứng thật vào docs/proof/phase-N/
npm run verify -- --phase 1
```

---

## 5. Sáng tạo của tôi (Hạng mục F — Không ảnh hưởng đầu ra Headless)

Toàn bộ các tính năng sáng tạo được đặt cô lập ở tầng hiển thị `src/render/`, **tuyệt đối không làm thay đổi trạng thái hay đầu ra JSONL của chế độ Headless Test Contract**:

1. **Tạo hình Mây Đội Nón Lá Treo Đèn & Quỹ Đạo Đom Đóm Hộ Mệnh (`src/render/meshes.ts`, `src/render/main.ts`):** Mây được dựng bằng khối 3D đội nón lá truyền thống có treo chiếc đèn lồng nhỏ phát sáng trước vành nón; các đom đóm nhặt được bay thành vòng quỹ đạo phát sáng quanh người Mây.
2. **La Bàn Ánh Sáng (Lantern Compass HUD - `src/render/hud.ts`):** Kim la bàn trên HUD tự động xoay chỉ hướng và đo khoảng cách tới **Đèn Lồng Lớn** chưa sáng gần nhất.
3. **Hệ Thống Âm Thanh Tổng Hợp Thời Gian Thực (Procedural Web Audio Synthesizer - `src/render/audio.ts`):** Tổng hợp bằng thuật toán Web Audio API cho toàn bộ sự kiện: nhặt đom đóm, thắp đèn, tỏa sáng, nhảy, lướt, bị chạm, Bóng Mực xuất hiện, đếm ngược 10 giây cuối, thắng và thua.

---

## 6. Truy vết Bằng chứng, Ghi chép SDLC & Harness AI

- **Hợp đồng kiểm thử tự động:** [game.contract.json](game.contract.json)
- **AI Harness:** [AGENTS.md](AGENTS.md) · [.agents/skills/verify-phase/SKILL.md](.agents/skills/verify-phase/SKILL.md) · [.githooks/pre-commit](.githooks/pre-commit) · [.github/workflows/verify.yml](.github/workflows/verify.yml)
- **Giả định & Tiêu chí nghiệm thu:** [docs/notes/assumptions.md](docs/notes/assumptions.md)
- **Nhật ký dùng AI, Lỗi AI & Token:** [docs/notes/ai-log-and-tokens.md](docs/notes/ai-log-and-tokens.md)
- **Đánh giá & Retrospective:** [docs/notes/retro.md](docs/notes/retro.md)
- **Bằng chứng Kiểm chứng từng Phase:** `docs/proof/phase-1/` · `docs/proof/phase-2/` · `docs/proof/phase-3/` · `docs/proof/phase-4/`
- **Nguồn tài sản & Giấy phép:** [CREDITS.md](CREDITS.md) · [LICENSE](LICENSE)
