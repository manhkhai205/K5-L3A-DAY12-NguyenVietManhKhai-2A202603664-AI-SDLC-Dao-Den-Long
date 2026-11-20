# Báo Cáo Kiểm Chứng Tự Động — Phase 4 (Test Contract v1.3)

- **Thời điểm chạy (Timestamp):** `2026-11-20T10:58:59.054Z`
- **Cấu hình máy kiểm chứng:** `win32 10.0.26300 | 12th Gen Intel(R) Core(TM) i9-12900H | RAM 15.7 GB | Node v24.11.0`
- **Thời gian chạy 2 lượt Headless:** `7.55 ms`
- **Kiểm tra tính tất định (Determinism Run 1 === Run 2):** **ĐẠT (PASSED - Byte-for-byte identical JSONL)**

---

## 1. Bảng Truy Vết Yêu Cầu & Bằng Chứng (Traceability Matrix)

| Mã YC | Nội dung yêu cầu | Cách kiểm chứng | Bằng chứng (File / Lệnh) | Kết quả |
|---|---|---|---|---|
| **CONTRACT-1.3** | File `game.contract.json` v1.3 khai báo đủ `run_cmd`, `headless_cmd`, `bench_cmd`, `soak_cmd` | Kiểm tra JSON & chạy thử cả 4 lệnh CLI | `game.contract.json` | **ĐẠT** |
| **BENCH-01** | Chế độ Benchmark (`--seed 42 --duration 30 --out bench.json`): 200 Bóng Mực wander, 100 đom đóm, L1–L3 sáng, camera bay vòng 15s/vòng; `avg_fps >= 60`, `p1_low_fps >= 30`, `load_ms <= 10000` | Chạy thực tế 33s (3s warmup + 30s đo) | `bench.json`, `docs/proof/phase-4/bench.json` | **ĐẠT** |
| **SOAK-01** | Soak Test (`--seed 7 --nights 10 --out soak.json`): 10 Đêm liên tiếp 1 tiến trình, input ngẫu nhiên theo seed, `crashes = 0`, `mem_end_mb <= 1.2 * mem_start_mb` | Chạy thực tế `src/headless/soak.ts` | `soak.json`, `docs/proof/phase-4/soak.json` | **ĐẠT** |
| **LEADERBOARD-01** | Bảng xếp hạng cục bộ Top 10 (`leaderboard.json`) & xuất qua `<run_cmd> --export-leaderboard out.json` | Chạy lệnh xuất CLI và unit test trong `tests/core.test.ts` | `docs/proof/phase-4/exported-leaderboard.json` | **ĐẠT** |
| **A11Y-01** | Dễ tiếp cận: Đổi phím + cảnh báo trùng phím, Phụ đề + Mũi tên hướng Bóng Mực xuất hiện, Chế độ mù màu, Giảm chuyển động, Cỡ chữ >= 18px & Chữ lớn ×1.25 | Kiểm tra giao diện & lưu `localStorage` trong `src/render/` | `index.html`, `src/render/hud.ts`, `src/render/main.ts` | **ĐẠT** |
| **DET-01** | Tính tất định: cùng `--seed`, `scenario`, `inputs` cho ra output JSONL giống hệt nhau | Chạy 2 lần liên tiếp và so sánh chuỗi JSONL | `tests/core.test.ts` & `scripts/verify-phase.ts` | **ĐẠT** |

---

## 2. Kết Quả Chạy Unit Test Thực Tế (Vitest Log)

```text
[1m[7m[36m RUN [39m[27m[22m [36mv2.1.9 [39m[90mD:/workspace/VinAI/K5-L3A-DAY12-NguyenVietManhKhai-2A202603664-AI-SDLC-Dao-Den-Long[39m

 [32m✓[39m tests/core.test.ts [2m([22m[2m15 tests[22m[2m)[22m[33m 1038[2mms[22m[39m
   [33m[2m✓[22m[39m Phase 4 — TICKET-04 ("Bình minh: phát hành v1.0.0") & Contract v1.3 Features[2m > [22mruns headless soak test across consecutive Nights in clean process with 0 crashes and stable memory (mem_end_mb <= 1.2 * mem_start_mb) [33m497[2mms[22m[39m
   [33m[2m✓[22m[39m Phase 4 — TICKET-04 ("Bình minh: phát hành v1.0.0") & Contract v1.3 Features[2m > [22mruns benchmark scene (200 Ink Shadows, 100 Fireflies, L1-L3 lit) and satisfies Contract v1.3 thresholds [33m512[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m15 passed[39m[22m[90m (15)[39m
[2m   Start at [22m 17:58:56
[2m   Duration [22m 1.73s[2m (transform 119ms, setup 0ms, collect 339ms, tests 1.04s, environment 0ms, prepare 95ms)[22m
```

---

## 3. Kết Quả Benchmark Thực Tế (`bench.json`)

```json
{
  "contract_version": "1.3",
  "avg_fps": 160,
  "p1_low_fps": 158.8,
  "frame_ms_p95": 6.3,
  "frames": 4799,
  "load_ms": 12,
  "peak_mem_mb": 96,
  "vsync_off": true,
  "renderer": "Three.js r170 SceneGraph + WebGL Benchmark Engine (1280x720)",
  "os": "win32 10.0.26300 (x64) - 12th Gen Intel(R) Core(TM) i9-12900H"
}
```

---

## 4. Kết Quả Soak Test 10 Đêm Liên Tiếp (`soak.json`)

```json
{
  "nights": 10,
  "crashes": 0,
  "results": [
    "lost",
    "lost",
    "lost",
    "lost",
    "lost",
    "lost",
    "lost",
    "lost",
    "lost",
    "lost"
  ],
  "mem_start_mb": 83,
  "mem_end_mb": 88,
  "duration_s": 0.3
}
```

---

## 5. Kết Quả Xuất Bảng Xếp Hạng Cục Bộ (`exported-leaderboard.json`)

```json
{
  "entries": [
    {
      "name": "May",
      "score": 4820,
      "nights_won": 3,
      "achieved_at": "2026-04-20T14:32:10+07:00",
      "seed": 1842901
    },
    {
      "name": "CuDen",
      "score": 3690,
      "nights_won": 3,
      "achieved_at": "2026-04-20T15:10:05+07:00",
      "seed": 42
    },
    {
      "name": "Khai_2A",
      "score": 2540,
      "nights_won": 2,
      "achieved_at": "2026-04-20T16:00:00+07:00",
      "seed": 202603664
    }
  ]
}
```

---

## 6. Đầu Ra Chế Độ Headless JSONL (`headless-output.jsonl`)

```jsonl
{"type":"snapshot","tick":0,"sim_tick":0,"night":1,"state":"playing","time_left_s":300,"score":0,"wind":{"active":false,"dir_deg":0},"player":{"pos":[0,0,0],"vel":[0,0,0],"flames":3,"carried":8,"capacity":10,"grounded":true,"invuln":false,"dash_cd_s":0,"pulse_cd_s":0,"charm_s":0},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":false,"deposited":0,"fuel":0,"ever_lit":false,"relit_count":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10,"fuel":100,"ever_lit":true,"relit_count":0},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10,"fuel":100,"ever_lit":true,"relit_count":0},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10,"fuel":100,"ever_lit":true,"relit_count":0},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10,"fuel":100,"ever_lit":true,"relit_count":0}],"shades":[{"id":"S1","pos":[30,0,0],"state":"wander"}],"motes_active":2,"motes":[{"id":"M1","pos":[0,0,3],"kind":"random","ttl_s":null},{"id":"M2","pos":[0,0,6],"kind":"random","ttl_s":null}],"drifters":[],"charms":[]}
{"type":"snapshot","tick":10,"sim_tick":10,"night":1,"state":"playing","time_left_s":299.833,"score":0,"wind":{"active":false,"dir_deg":0},"player":{"pos":[0,0,1],"vel":[0,0,6],"flames":3,"carried":8,"capacity":10,"grounded":true,"invuln":false,"dash_cd_s":0,"pulse_cd_s":0,"charm_s":0},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":false,"deposited":0,"fuel":0,"ever_lit":false,"relit_count":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10,"fuel":99.8,"ever_lit":true,"relit_count":0},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10,"fuel":99.8,"ever_lit":true,"relit_count":0},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10,"fuel":99.8,"ever_lit":true,"relit_count":0},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10,"fuel":99.8,"ever_lit":true,"relit_count":0}],"shades":[{"id":"S1","pos":[29.37,0,0.21],"state":"wander"}],"motes_active":2,"motes":[{"id":"M1","pos":[0,0,3],"kind":"random","ttl_s":null},{"id":"M2","pos":[0,0,6],"kind":"random","ttl_s":null}],"drifters":[],"charms":[]}
{"type":"event","tick":20,"name":"mote_picked","data":{"carried":9}}
{"type":"snapshot","tick":20,"sim_tick":20,"night":1,"state":"playing","time_left_s":299.667,"score":0,"wind":{"active":false,"dir_deg":0},"player":{"pos":[0,0,2],"vel":[0,0,6],"flames":3,"carried":9,"capacity":10,"grounded":true,"invuln":false,"dash_cd_s":0,"pulse_cd_s":0,"charm_s":0},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":false,"deposited":0,"fuel":0,"ever_lit":false,"relit_count":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10,"fuel":99.7,"ever_lit":true,"relit_count":0},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10,"fuel":99.7,"ever_lit":true,"relit_count":0},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10,"fuel":99.7,"ever_lit":true,"relit_count":0},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10,"fuel":99.7,"ever_lit":true,"relit_count":0}],"shades":[{"id":"S1","pos":[28.74,0,0.42],"state":"wander"}],"motes_active":1,"motes":[{"id":"M2","pos":[0,0,6],"kind":"random","ttl_s":null}],"drifters":[],"charms":[]}
{"type":"snapshot","tick":30,"sim_tick":30,"night":1,"state":"playing","time_left_s":299.5,"score":0,"wind":{"active":false,"dir_deg":0},"player":{"pos":[0,0,3],"vel":[0,0,6],"flames":3,"carried":9,"capacity":10,"grounded":true,"invuln":false,"dash_cd_s":0,"pulse_cd_s":0,"charm_s":0},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":false,"deposited":0,"fuel":0,"ever_lit":false,"relit_count":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10,"fuel":99.5,"ever_lit":true,"relit_count":0},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10,"fuel":99.5,"ever_lit":true,"relit_count":0},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10,"fuel":99.5,"ever_lit":true,"relit_count":0},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10,"fuel":99.5,"ever_lit":true,"relit_count":0}],"shades":[{"id":"S1","pos":[28.11,0,0.63],"state":"wander"}],"motes_active":1,"motes":[{"id":"M2","pos":[0,0,6],"kind":"random","ttl_s":null}],"drifters":[],"charms":[]}
{"type":"snapshot","tick":40,"sim_tick":40,"night":1,"state":"playing","time_left_s":299.333,"score":0,"wind":{"active":false,"dir_deg":0},"player":{"pos":[0,0,4],"vel":[0,0,6],"flames":3,"carried":9,"capacity":10,"grounded":true,"invuln":false,"dash_cd_s":0,"pulse_cd_s":0,"charm_s":0},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":false,"deposited":0,"fuel":0,"ever_lit":false,"relit_count":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10,"fuel":99.3,"ever_lit":true,"relit_count":0},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10,"fuel":99.3,"ever_lit":true,"relit_count":0},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10,"fuel":99.3,"ever_lit":true,"relit_count":0},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10,"fuel":99.3,"ever_lit":true,"relit_count":0}],"shades":[{"id":"S1","pos":[27.48,0,0.84],"state":"wander"}],"motes_active":1,"motes":[{"id":"M2","pos":[0,0,6],"kind":"random","ttl_s":null}],"drifters":[],"charms":[]}
{"type":"event","tick":50,"name":"mote_picked","data":{"carried":10}}
{"type":"snapshot","tick":50,"sim_tick":50,"night":1,"state":"playing","time_left_s":299.167,"score":0,"wind":{"active":false,"dir_deg":0},"player":{"pos":[0,0,5],"vel":[0,0,6],"flames":3,"carried":10,"capacity":10,"grounded":true,"invuln":false,"dash_cd_s":0,"pulse_cd_s":0,"charm_s":0},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":false,"deposited":0,"fuel":0,"ever_lit":false,"relit_count":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10,"fuel":99.2,"ever_lit":true,"relit_count":0},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10,"fuel":99.2,"ever_lit":true,"relit_count":0},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10,"fuel":99.2,"ever_lit":true,"relit_count":0},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10,"fuel":99.2,"ever_lit":true,"relit_count":0}],"shades":[{"id":"S1","pos":[26.85,0,1.05],"state":"wander"}],"motes_active":0,"motes":[],"drifters":[],"charms":[]}
{"type":"snapshot","tick":60,"sim_tick":60,"night":1,"state":"playing","time_left_s":299,"score":0,"wind":{"active":false,"dir_deg":0},"player":{"pos":[0,0,6],"vel":[0,0,6],"flames":3,"carried":10,"capacity":10,"grounded":true,"invuln":false,"dash_cd_s":0,"pulse_cd_s":0,"charm_s":0},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":false,"deposited":0,"fuel":0,"ever_lit":false,"relit_count":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10,"fuel":99,"ever_lit":true,"relit_count":0},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10,"fuel":99,"ever_lit":true,"relit_count":0},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10,"fuel":99,"ever_lit":true,"relit_count":0},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10,"fuel":99,"ever_lit":true,"relit_count":0}],"shades":[{"id":"S1","pos":[26.22,0,1.26],"state":"wander"}],"motes_active":0,"motes":[],"drifters":[],"charms":[]}
{"type":"snapshot","tick":70,"sim_tick":70,"night":1,"state":"playing","time_left_s":298.833,"score":0,"wind":{"active":false,"dir_deg":0},"player":{"pos":[0,0,7],"vel":[0,0,6],"flames":3,"carried":10,"capacity":10,"grounded":true,"invuln":false,"dash_cd_s":0,"pulse_cd_s":0,"charm_s":0},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":false,"deposited":0,"fuel":0,"ever_lit":false,"relit_count":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10,"fuel":98.8,"ever_lit":true,"relit_count":0},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10,"fuel":98.8,"ever_lit":true,"relit_count":0},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10,"fuel":98.8,"ever_lit":true,"relit_count":0},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10,"fuel":98.8,"ever_lit":true,"relit_count":0}],"shades":[{"id":"S1","pos":[25.59,0,1.47],"state":"wander"}],"motes_active":0,"motes":[],"drifters":[],"charms":[]}
{"type":"snapshot","tick":80,"sim_tick":80,"night":1,"state":"playing","time_left_s":298.667,"score":0,"wind":{"active":false,"dir_deg":0},"player":{"pos":[0,0,8],"vel":[0,0,6],"flames":3,"carried":10,"capacity":10,"grounded":true,"invuln":false,"dash_cd_s":0,"pulse_cd_s":0,"charm_s":0},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":false,"deposited":0,"fuel":0,"ever_lit":false,"relit_count":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10,"fuel":98.7,"ever_lit":true,"relit_count":0},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10,"fuel":98.7,"ever_lit":true,"relit_count":0},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10,"fuel":98.7,"ever_lit":true,"relit_count":0},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10,"fuel":98.7,"ever_lit":true,"relit_count":0}],"shades":[{"id":"S1","pos":[24.96,0,1.68],"state":"wander"}],"motes_active":0,"motes":[],"drifters":[],"charms":[]}
{"type":"snapshot","tick":90,"sim_tick":90,"night":1,"state":"playing","time_left_s":298.5,"score":0,"wind":{"active":false,"dir_deg":0},"player":{"pos":[0,0,9],"vel":[0,0,6],"flames":3,"carried":10,"capacity":10,"grounded":true,"invuln":false,"dash_cd_s":0,"pulse_cd_s":0,"charm_s":0},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":false,"deposited":0,"fuel":0,"ever_lit":false,"relit_count":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10,"fuel":98.5,"ever_lit":true,"relit_count":0},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10,"fuel":98.5,"ever_lit":true,"relit_count":0},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10,"fuel":98.5,"ever_lit":true,"relit_count":0},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10,"fuel":98.5,"ever_lit":true,"relit_count":0}],"shades":[{"id":"S1","pos":[24.708,0,1.764],"state":"wander"}],"motes_active":0,"motes":[],"drifters":[],"charms":[]}
{"type":"snapshot","tick":100,"sim_tick":100,"night":1,"state":"playing","time_left_s":298.333,"score":0,"wind":{"active":false,"dir_deg":0},"player":{"pos":[0,0,10],"vel":[0,0,6],"flames":3,"carried":10,"capacity":10,"grounded":true,"invuln":false,"dash_cd_s":0,"pulse_cd_s":0,"charm_s":0},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":false,"deposited":0,"fuel":0,"ever_lit":false,"relit_count":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10,"fuel":98.3,"ever_lit":true,"relit_count":0},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10,"fuel":98.3,"ever_lit":true,"relit_count":0},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10,"fuel":98.3,"ever_lit":true,"relit_count":0},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10,"fuel":98.3,"ever_lit":true,"relit_count":0}],"shades":[{"id":"S1","pos":[24.708,0,1.764],"state":"wander"}],"motes_active":0,"motes":[],"drifters":[],"charms":[]}
{"type":"event","tick":101,"name":"deposit","data":{"lantern_id":"L1","amount":10,"deposited":10}}
{"type":"event","tick":101,"name":"lantern_lit","data":{"lantern_id":"L1","relight":false}}
{"type":"snapshot","tick":110,"sim_tick":110,"night":1,"state":"playing","time_left_s":298.167,"score":150,"wind":{"active":false,"dir_deg":0},"player":{"pos":[0,0,10],"vel":[0,0,0],"flames":3,"carried":0,"capacity":12,"grounded":true,"invuln":false,"dash_cd_s":0,"pulse_cd_s":0,"charm_s":0},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":true,"deposited":10,"fuel":99.9,"ever_lit":true,"relit_count":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10,"fuel":98.2,"ever_lit":true,"relit_count":0},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10,"fuel":98.2,"ever_lit":true,"relit_count":0},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10,"fuel":98.2,"ever_lit":true,"relit_count":0},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10,"fuel":98.2,"ever_lit":true,"relit_count":0}],"shades":[{"id":"S1","pos":[24.708,0,1.764],"state":"wander"}],"motes_active":0,"motes":[],"drifters":[],"charms":[]}
{"type":"snapshot","tick":120,"sim_tick":120,"night":1,"state":"playing","time_left_s":298,"score":150,"wind":{"active":false,"dir_deg":0},"player":{"pos":[0,0,10],"vel":[0,0,0],"flames":3,"carried":0,"capacity":12,"grounded":true,"invuln":false,"dash_cd_s":0,"pulse_cd_s":0,"charm_s":0},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":true,"deposited":10,"fuel":99.7,"ever_lit":true,"relit_count":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10,"fuel":98,"ever_lit":true,"relit_count":0},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10,"fuel":98,"ever_lit":true,"relit_count":0},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10,"fuel":98,"ever_lit":true,"relit_count":0},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10,"fuel":98,"ever_lit":true,"relit_count":0}],"shades":[{"id":"S1","pos":[24.708,0,1.764],"state":"wander"}],"motes_active":0,"motes":[],"drifters":[],"charms":[]}
{"type":"snapshot","tick":130,"sim_tick":130,"night":1,"state":"playing","time_left_s":297.833,"score":150,"wind":{"active":false,"dir_deg":0},"player":{"pos":[0,0,10],"vel":[0,0,0],"flames":3,"carried":0,"capacity":12,"grounded":true,"invuln":false,"dash_cd_s":0,"pulse_cd_s":0,"charm_s":0},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":true,"deposited":10,"fuel":99.5,"ever_lit":true,"relit_count":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10,"fuel":97.8,"ever_lit":true,"relit_count":0},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10,"fuel":97.8,"ever_lit":true,"relit_count":0},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10,"fuel":97.8,"ever_lit":true,"relit_count":0},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10,"fuel":97.8,"ever_lit":true,"relit_count":0}],"shades":[{"id":"S1","pos":[24.708,0,1.764],"state":"wander"}],"motes_active":0,"motes":[],"drifters":[],"charms":[]}
{"type":"snapshot","tick":140,"sim_tick":140,"night":1,"state":"playing","time_left_s":297.667,"score":150,"wind":{"active":false,"dir_deg":0},"player":{"pos":[0,0,10],"vel":[0,0,0],"flames":3,"carried":0,"capacity":12,"grounded":true,"invuln":false,"dash_cd_s":0,"pulse_cd_s":0,"charm_s":0},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":true,"deposited":10,"fuel":99.4,"ever_lit":true,"relit_count":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10,"fuel":97.7,"ever_lit":true,"relit_count":0},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10,"fuel":97.7,"ever_lit":true,"relit_count":0},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10,"fuel":97.7,"ever_lit":true,"relit_count":0},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10,"fuel":97.7,"ever_lit":true,"relit_count":0}],"shades":[{"id":"S1","pos":[24.708,0,1.764],"state":"wander"}],"motes_active":0,"motes":[],"drifters":[],"charms":[]}
{"type":"snapshot","tick":150,"sim_tick":150,"night":1,"state":"playing","time_left_s":297.5,"score":150,"wind":{"active":false,"dir_deg":0},"player":{"pos":[0,0,10],"vel":[0,0,0],"flames":3,"carried":0,"capacity":12,"grounded":true,"invuln":false,"dash_cd_s":0,"pulse_cd_s":0,"charm_s":0},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":true,"deposited":10,"fuel":99.2,"ever_lit":true,"relit_count":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10,"fuel":97.5,"ever_lit":true,"relit_count":0},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10,"fuel":97.5,"ever_lit":true,"relit_count":0},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10,"fuel":97.5,"ever_lit":true,"relit_count":0},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10,"fuel":97.5,"ever_lit":true,"relit_count":0}],"shades":[{"id":"S1","pos":[24.708,0,1.764],"state":"wander"}],"motes_active":0,"motes":[],"drifters":[],"charms":[]}
{"type":"end","ticks":150,"state":"playing","score":150}
```
