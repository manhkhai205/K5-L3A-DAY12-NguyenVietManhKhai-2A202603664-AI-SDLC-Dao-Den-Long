# Credits & Nguồn Tài Sản (CREDITS)

## 1. Bản gốc của Dự án (Original Content)
- **Bối cảnh, nhân vật và cốt truyện:** *Đảo Đèn Lồng* (nhân vật **Mây**, **Đom Đóm**, **Đèn Lồng Lớn**, **Bóng Mực** trong sương đen) là bản gốc của bài Lab Day 12 — AI SDLC.
- **Mô hình 3D & Hiệu ứng hình ảnh (100% Procedural Geometry):**
  - Toàn bộ mô hình 3D trong game (`src/render/meshes.ts`) được tạo hoàn toàn bằng thuật toán hình học (Procedural Geometry) sử dụng các khối cơ bản và vật liệu của thư viện mã nguồn mở **Three.js** (MIT License). Không sử dụng bất kỳ mô hình 3D thương mại hay nhân vật có bản quyền bên ngoài nào.
- **Âm thanh & Nhạc hiệu (100% Procedural Web Audio):**
  - Toàn bộ âm thanh hiệu ứng trong game (`src/render/audio.ts`) được tổng hợp trực tiếp theo thời gian thực bằng **Web Audio API** (OscillatorNode & GainNode) trên trình duyệt, không sử dụng tệp âm thanh bên ngoài.

## 2. Thư viện Mã nguồn mở (Open-Source Libraries)
- **Three.js** (`three`): MIT License — Hiển thị đồ họa 3D WebGL.
- **Vite** (`vite`): MIT License — Công cụ chạy dev server và đóng gói bản phát hành tĩnh.
- **Vitest** (`vitest`): MIT License — Khung kiểm thử tự động (Unit & Determinism Tests).
- **TypeScript** (`typescript`) & **tsx**: Apache-2.0 / MIT License — Kiểm tra kiểu tĩnh và thực thi chế độ Headless CLI trên Node.js.

## 3. Công cụ AI đã sử dụng
- **Google Antigravity (Gemini):** Hỗ trợ lập kế hoạch SDLC, thiết kế kiến trúc tách biệt Core Logic (Headless) & 3D Renderer, viết mã nguồn TypeScript, tạo kịch bản kiểm thử và tự động hóa kiểm chứng theo sự điều phối và nghiệm thu của học viên.
- **Trợ giảng AI trên Lab Board (Claude):** Giải đáp và làm rõ yêu cầu trong phạm vi từng Phase của bài lab.
