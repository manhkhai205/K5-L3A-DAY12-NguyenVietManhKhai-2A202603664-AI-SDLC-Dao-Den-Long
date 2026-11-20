# Báo Cáo Kiểm Chứng Tự Động — Phase 1 (Test Contract v1.0)

- **Thời điểm chạy (Timestamp):** `2026-11-20T08:21:54.414Z`
- **Cấu hình máy kiểm chứng:** `win32 10.0.26300 | 12th Gen Intel(R) Core(TM) i9-12900H | RAM 15.7 GB | Node v24.11.0`
- **Thời gian chạy 2 lượt Headless:** `5.40 ms`
- **Kiểm tra tính tất định (Determinism Run 1 === Run 2):** **ĐẠT (PASSED - Byte-for-byte identical JSONL)**

---

## 1. Bảng Truy Vết Yêu Cầu & Bằng Chứng (Traceability Matrix)

| Mã YC | Nội dung yêu cầu | Cách kiểm chứng | Bằng chứng (File / Lệnh) | Kết quả |
|---|---|---|---|---|
| **CONTRACT-A** | File `game.contract.json` ở gốc repo đúng cấu trúc & tham số `tuning` | Kiểm tra JSON & đối chiếu với `src/core/config.ts` | `game.contract.json` | **ĐẠT** |
| **CONTRACT-B** | Headless CLI chạy 60 tick/s, nhận `--seed --night --scenario --inputs --ticks --out --snapshot-every` | Chạy CLI và unit test trong `tests/core.test.ts` | `src/headless/cli.ts` | **ĐẠT** |
| **CONTRACT-E** | Output JSONL gồm `snapshot`, `event` (`mote_picked`, `deposit`, `lantern_lit`, `pulse`, `player_hit`, `game_over`) và `end` | Kiểm tra từng dòng trong `headless-output.jsonl` | `docs/proof/phase-1/headless-output.jsonl` | **ĐẠT** |
| **DET-01** | Tính tất định: cùng `--seed`, `scenario`, `inputs` cho ra output JSONL giống hệt nhau | Chạy 2 lần liên tiếp và so sánh chuỗi JSONL | `tests/core.test.ts` & `scripts/verify-phase.ts` | **ĐẠT** |
| **GAME-3D** | Game 3D Đảo Đèn Lồng (Mây đội nón lá treo đèn, Đom đóm, Đèn Lồng Lớn, Bóng Mực, Tỏa Sáng, HUD, Chơi lại) | Build Web 3D bằng `npm run build` & chạy trên trình duyệt | `src/render/` & `index.html` | **ĐẠT** |

---

## 2. Kết Quả Chạy Unit Test Thực Tế (Vitest Log)

```text
[1m[7m[36m RUN [39m[27m[22m [36mv2.1.9 [39m[90mD:/workspace/VinAI/K5-L3A-DAY12-NguyenVietManhKhai-2A202603664-AI-SDLC-Dao-Den-Long[39m

 [32m✓[39m tests/core.test.ts [2m([22m[2m6 tests[22m[2m)[22m[90m 12[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m6 passed[39m[22m[90m (6)[39m
[2m   Start at [22m 15:21:53
[2m   Duration [22m 557ms[2m (transform 89ms, setup 0ms, collect 188ms, tests 12ms, environment 0ms, prepare 99ms)[22m
```

---

## 3. Đầu Ra Chế Độ Headless JSONL (`headless-output.jsonl`)

```jsonl
{"type":"snapshot","tick":0,"sim_tick":0,"state":"playing","time_left_s":300,"score":0,"player":{"pos":[0,0,0],"flames":3,"carried":8},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":false,"deposited":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10}],"shades":[{"id":"S1","pos":[30,0,0],"state":"wander"}],"motes_active":2,"motes":[{"id":"M1","pos":[0,0,3]},{"id":"M2","pos":[0,0,6]}]}
{"type":"snapshot","tick":10,"sim_tick":10,"state":"playing","time_left_s":299.833,"score":0,"player":{"pos":[0,0,1],"flames":3,"carried":8},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":false,"deposited":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10}],"shades":[{"id":"S1","pos":[30,0,0],"state":"wander"}],"motes_active":2,"motes":[{"id":"M1","pos":[0,0,3]},{"id":"M2","pos":[0,0,6]}]}
{"type":"event","tick":20,"name":"mote_picked","data":{"carried":9}}
{"type":"snapshot","tick":20,"sim_tick":20,"state":"playing","time_left_s":299.667,"score":0,"player":{"pos":[0,0,2],"flames":3,"carried":9},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":false,"deposited":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10}],"shades":[{"id":"S1","pos":[30,0,0],"state":"wander"}],"motes_active":1,"motes":[{"id":"M2","pos":[0,0,6]}]}
{"type":"snapshot","tick":30,"sim_tick":30,"state":"playing","time_left_s":299.5,"score":0,"player":{"pos":[0,0,3],"flames":3,"carried":9},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":false,"deposited":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10}],"shades":[{"id":"S1","pos":[30,0,0],"state":"wander"}],"motes_active":1,"motes":[{"id":"M2","pos":[0,0,6]}]}
{"type":"snapshot","tick":40,"sim_tick":40,"state":"playing","time_left_s":299.333,"score":0,"player":{"pos":[0,0,4],"flames":3,"carried":9},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":false,"deposited":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10}],"shades":[{"id":"S1","pos":[30,0,0],"state":"wander"}],"motes_active":1,"motes":[{"id":"M2","pos":[0,0,6]}]}
{"type":"event","tick":50,"name":"mote_picked","data":{"carried":10}}
{"type":"snapshot","tick":50,"sim_tick":50,"state":"playing","time_left_s":299.167,"score":0,"player":{"pos":[0,0,5],"flames":3,"carried":10},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":false,"deposited":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10}],"shades":[{"id":"S1","pos":[30,0,0],"state":"wander"}],"motes_active":0,"motes":[]}
{"type":"snapshot","tick":60,"sim_tick":60,"state":"playing","time_left_s":299,"score":0,"player":{"pos":[0,0,6],"flames":3,"carried":10},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":false,"deposited":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10}],"shades":[{"id":"S1","pos":[30,0,0],"state":"wander"}],"motes_active":0,"motes":[]}
{"type":"snapshot","tick":70,"sim_tick":70,"state":"playing","time_left_s":298.833,"score":0,"player":{"pos":[0,0,7],"flames":3,"carried":10},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":false,"deposited":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10}],"shades":[{"id":"S1","pos":[30,0,0],"state":"wander"}],"motes_active":0,"motes":[]}
{"type":"snapshot","tick":80,"sim_tick":80,"state":"playing","time_left_s":298.667,"score":0,"player":{"pos":[0,0,8],"flames":3,"carried":10},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":false,"deposited":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10}],"shades":[{"id":"S1","pos":[30,0,0],"state":"wander"}],"motes_active":0,"motes":[]}
{"type":"snapshot","tick":90,"sim_tick":90,"state":"playing","time_left_s":298.5,"score":0,"player":{"pos":[0,0,9],"flames":3,"carried":10},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":false,"deposited":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10}],"shades":[{"id":"S1","pos":[30,0,0],"state":"wander"}],"motes_active":0,"motes":[]}
{"type":"snapshot","tick":100,"sim_tick":100,"state":"playing","time_left_s":298.333,"score":0,"player":{"pos":[0,0,10],"flames":3,"carried":10},"lanterns":[{"id":"L1","pos":[0,0,10],"lit":false,"deposited":0},{"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":10},{"id":"L3","pos":[14.7,0,-20.2],"lit":true,"deposited":10},{"id":"L4","pos":[-14.7,0,-20.2],"lit":true,"deposited":10},{"id":"L5","pos":[-23.8,0,7.7],"lit":true,"deposited":10}],"shades":[{"id":"S1","pos":[30,0,0],"state":"wander"}],"motes_active":0,"motes":[]}
{"type":"event","tick":101,"name":"deposit","data":{"lantern_id":"L1","amount":10,"deposited":10}}
{"type":"event","tick":101,"name":"lantern_lit","data":{"lantern_id":"L1"}}
{"type":"event","tick":101,"name":"game_over","data":{"result":"won","reason":"all_lit"}}
{"type":"end","ticks":101,"state":"won","score":946}
```
