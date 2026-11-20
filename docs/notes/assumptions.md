# Giả Định & Tiêu Chí Nghiệm Thu Qua Các Phase (Assumptions & Acceptance Criteria)

Tài liệu này ghi lại toàn bộ các **giả định cho những chỗ mơ hồ**, **tiêu chí nghiệm thu kiểm chứng được**, và **lý do thay đổi thiết kế/test** từ Checkpoint 0 đến Phase 4.

---

## Phase 1 — PRD-0 & Test Contract v1.0

### 1. Yêu cầu Bắt buộc từ PRD-0 & Test Contract v1.0
- Màn chơi **Đêm 1 – Đảo Bến**: đảo tròn bán kính 40m có 5 Đèn Lồng Lớn (`L1..L5`).
- Nhân vật **Mây** đội nón lá có treo đèn lồng nhỏ, di chuyển, nhảy, gom Đom Đóm (`mote_picked`), nạp vào Đèn Lồng Lớn (`deposit`, `lantern_lit`), Tỏa Sáng (`pulse`) để làm choáng và đẩy lùi Bóng Mực.
- File `game.contract.json` ở gốc repo với `"contract_version": "1.0"`, và chế độ headless xuất định dạng **JSONL** (`snapshot`, `event`, `end`).

### 2. Các Chỗ Mơ Hồ trong PRD-0 & Giả Định Đã Chọn (Khai báo trong `game.contract.json`)
| Chỗ mơ hồ trong PRD-0 | Giả định hợp lý đã chọn | Khai báo trong `tuning` | Tiêu chí nghiệm thu ("Làm A thì thấy B") |
|---|---|---|---|
| Tốc độ di chuyển & sức chứa của Mây | Tốc độ `6.0 m/s`, mang tối đa `10` đom đóm | `player_speed: 6.0`, `carry_capacity: 10` | Di chuyển với `move: [0,1]` trong 60 tick đi được đúng `6.0m` theo trục +Z. |
| Khoảng cách nhặt đom đóm & tương tác đèn | Nhặt tự động ở `<= 1.0m`; bấm nạp đèn ở `<= 2.0m`, mỗi đèn cần `10` đom đóm | `pickup_radius: 1.0`, `interact_radius: 2.0`, `lantern_cost: 10` | Đứng cách đèn `<= 2.0m` bấm `interact: true` -> phát sự kiện `deposit` và `lantern_lit` khi đủ 10. |
| Chi phí & hiệu ứng Tỏa Sáng (Pulse) | Tốn `3` đom đóm, bán kính `5.0m`, làm choáng `2.0s` (120 ticks), đẩy lùi `4.0m`, hồi chiêu `3.0s` | `pulse_cost: 3`, `pulse_radius: 5.0`, `pulse_stun_s: 2.0`, `pulse_push_m: 4.0`, `pulse_cooldown_s: 3.0` | Khi có `>= 3` đom đóm và bấm `pulse: true`, Bóng Mực trong 5m chuyển sang `stunned` và phát sự kiện `pulse`. |
| Máu (Ngọn Lửa), bất tử & rơi đom đóm khi bị chạm | Có `3` Ngọn Lửa, chạm Bóng Mực ở `<= 1.0m` mất 1 máu, rơi `50%` (`floor(carried/2)`) đom đóm, bất tử `1.5s` | `flames: 3`, `shade_hit_radius: 1.0`, `hit_drop_ratio: 0.5`, `invuln_s: 1.5` | Va chạm Bóng Mực khi cầm 7 đom đóm -> còn 2 máu, rơi 3 đom đóm, phát `player_hit`. |
| Vùng an toàn quanh đèn & tốc độ Bóng Mực | Đèn sáng tạo vùng an toàn `6.0m`; Bóng Mực chạy `4.0 m/s` | `safe_radius: 6.0`, `shade_speed: 4.0` | Bóng Mực không thể đi vào vùng `< 6.0m` của đèn đã thắp sáng. |
| Công thức tính điểm | `+10`/đom đóm nạp, `+100`/đèn thắp, `+5`/Bóng Mực choáng, khi thắng cộng `+2`/giây còn lại và `+50`/Ngọn Lửa còn lại | `score: { per_mote: 10, per_lantern: 100, per_stun: 5, per_second_left: 2, per_flame_left: 50 }` | Thắp sáng toàn bộ đèn cộng đúng điểm thưởng thời gian và máu vào dòng `end`. |
