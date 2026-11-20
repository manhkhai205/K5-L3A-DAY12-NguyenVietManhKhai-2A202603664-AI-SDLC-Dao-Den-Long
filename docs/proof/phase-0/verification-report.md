# Báo Cáo Kiểm Chứng Tự Động — Phase 0

- **Thời điểm chạy (Timestamp):** `2026-11-20T08:14:13.434Z`
- **Cấu hình máy kiểm chứng:** `win32 10.0.26300 | 12th Gen Intel(R) Core(TM) i9-12900H | RAM 15.7 GB | Node v24.11.0`
- **Thời gian chạy 2 lượt Headless (120 ticks/lượt):** `0.98 ms`
- **Kiểm tra tính tất định (Determinism Run 1 === Run 2):** **ĐẠT (PASSED - Byte-for-byte identical)**

---

## 1. Bảng Truy Vết Yêu Cầu & Bằng Chứng (Traceability Matrix)

| Mã YC | Nội dung yêu cầu | Cách kiểm chứng | Bằng chứng (File / Lệnh) | Kết quả |
|---|---|---|---|---|
| **ARCH-01** | Tách biệt 100% Core Logic (`src/core/`) khỏi 3D Render (`src/render/`) | Kiểm tra kiểu tĩnh & chạy trực tiếp trên Node.js không cần DOM/WebGL | `npm run typecheck` & `src/headless/cli.ts` | **ĐẠT** |
| **DET-01** | Tính tất định (cùng seed & scenario đầu vào cho ra cùng kết quả) | Chạy 2 lần `runHeadlessScenario` liên tiếp và so sánh chuỗi JSON | `tests/core.test.ts` & `headless-output.json` | **ĐẠT** |
| **CORE-01** | Nhân vật Mây di chuyển, gom Đom Đóm và thắp sáng Đèn Lồng Lớn | Scenario `scenarios/smoke.json` & Unit Test | `docs/proof/phase-0/headless-output.json` | **ĐẠT** |
| **CORE-02** | Bóng Mực truy đuổi ngoài vùng sáng và trừ HP khi va chạm | Unit test kiểm tra va chạm Bóng Mực trong `tests/core.test.ts` | Kết quả Vitest bên dưới | **ĐẠT** |

---

## 2. Kết Quả Chạy Unit Test Thực Tế (Vitest Log)

```text
[1m[7m[36m RUN [39m[27m[22m [36mv2.1.9 [39m[90mD:/workspace/VinAI/K5-L3A-DAY12-NguyenVietManhKhai-2A202603664-AI-SDLC-Dao-Den-Long[39m

 [32m✓[39m tests/core.test.ts [2m([22m[2m4 tests[22m[2m)[22m[90m 4[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m4 passed[39m[22m[90m (4)[39m
[2m   Start at [22m 15:14:12
[2m   Duration [22m 487ms[2m (transform 62ms, setup 0ms, collect 133ms, tests 4ms, environment 0ms, prepare 105ms)[22m
```

---

## 3. Đầu Ra Chế Độ Headless (`headless-output.json`)

```json
{
  "contractVersion": "cp0-ready-v1",
  "scenarioName": "cp0-smoke-light-lantern",
  "seed": 202603664,
  "totalTicks": 13,
  "status": "won",
  "declaredAssumptions": {
    "seed": 202603664,
    "islandRadius": 40,
    "tickRate": 60,
    "playerSpeed": 8,
    "pickupRadius": 2,
    "lanternInteractRadius": 3,
    "lanternRequiredFireflies": 3,
    "lanternSafeRadius": 8,
    "shadowHitRadius": 1.5,
    "shadowSpeed": 3.5,
    "maxHealth": 3
  },
  "finalState": {
    "player": {
      "id": "may",
      "name": "Mây",
      "position": {
        "x": 5.2,
        "y": 0,
        "z": 0
      },
      "velocity": {
        "x": 8,
        "y": 0,
        "z": 0
      },
      "firefliesHeld": 0,
      "health": 3,
      "alive": true
    },
    "firefliesCollected": 3,
    "firefliesRemaining": 0,
    "lanternsLit": 1,
    "lanternsTotal": 1,
    "events": [
      "tick:1:collected:ff-1",
      "tick:5:collected:ff-2",
      "tick:10:collected:ff-3",
      "tick:13:deposit:lantern-main:3",
      "tick:13:lit:lantern-main",
      "tick:13:victory"
    ]
  }
}
```
