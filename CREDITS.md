# Credits & Nguồn Tài Sản (CREDITS)

## 1. Bản gốc của Dự án (Original Content)
- **Bối cảnh, nhân vật và cốt truyện:** *Đảo Đèn Lồng* (nhân vật **Mây** đội nón lá treo đèn lồng nhỏ, **Ông Đăng**, **Đom Đóm**, **Đèn Lồng Lớn**, **Bóng Mực**, **Gió Lạc**, **Bùa Gió** trên 3 hòn đảo Đảo Bến, Đảo Cau, Đảo Chuông) là bản gốc của bài Lab Day 12 — AI SDLC.
- **Mô hình 3D & Hiệu ứng hình ảnh (Procedural Geometry + Custom Shaders/Particles):**
  - Các thực thể chính trong game (`src/render/meshes.ts`) được dựng bằng thuật toán hình học (Procedural Geometry) của thư viện **Three.js** theo đúng bảng màu chuẩn Hex của `TICKET-02`.
- **Âm thanh & Nhạc hiệu (100% Procedural Web Audio):**
  - Toàn bộ âm thanh hiệu ứng trong game (`src/render/audio.ts`) được tổng hợp trực tiếp theo thời gian thực bằng **Web Audio API** (OscillatorNode & GainNode) trên trình duyệt.

## 2. Tài sản 3D & Texture Mã nguồn mở (CC0 / MIT / CC-BY)
Tuân thủ mục 8 của `RULES.md`, các tài sản 3D (`.glb`) và texture môi trường (`.jpg`/`.png`) trong thư mục `public/assets/` được tải từ kho ví dụ chính thức của **Three.js (`mrdoob/three.js`)** dưới giấy phép **MIT / CC0 / CC-BY**:
- `public/assets/models/spirit_bird.glb` (*Flamingo.glb* — Three.js examples / mirada.com, MIT/CC-BY): Chim linh thú bay lượn trên biển mây quanh Đảo Đèn Lồng.
- `public/assets/models/guardian_figure.glb` (*RobotExpressive.glb* — Three.js examples / Tomás Laulhé, CC0): Tượng hộ pháp Ông Đăng đặt tại điểm xuất phát trên đảo.
- `public/assets/textures/grasslight.jpg`, `wood.jpg`, `waternormals.jpg`, `spark1.png` (Three.js examples textures — MIT License): Texture mặt cỏ đảo, cầu gỗ/tháp chuông, sóng biển mây và quầng sáng đom đóm/bầu trời sao.

## 3. Thư viện Mã nguồn mở (Open-Source Libraries)
- **Three.js** (`three`): MIT License — Hiển thị đồ họa 3D WebGL & GLTFLoader.
- **Vite** (`vite`): MIT License — Công cụ chạy dev server và đóng gói bản phát hành tĩnh.
- **Vitest** (`vitest`): MIT License — Khung kiểm thử tự động (Unit, Regression & Determinism Tests).
- **TypeScript** (`typescript`) & **tsx**: Apache-2.0 / MIT License — Kiểm tra kiểu tĩnh và thực thi chế độ Headless CLI trên Node.js.

## 4. Công cụ AI đã sử dụng
- **Google Antigravity (Gemini):** Hỗ trợ lập kế hoạch SDLC, thiết kế kiến trúc tách biệt Core Logic (Headless) & 3D Renderer, viết mã nguồn TypeScript, tạo kịch bản kiểm thử và tự động hóa kiểm chứng theo sự điều phối và nghiệm thu của học viên.
- **Trợ giảng AI trên Lab Board (Claude):** Giải đáp và làm rõ yêu cầu trong phạm vi từng Phase của bài lab.
