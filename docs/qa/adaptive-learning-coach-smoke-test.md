# Hướng dẫn test UI — Adaptive Learning Coach (Phase 1 + Phase 2)

Tài liệu này tổng hợp **những gì bạn sẽ thấy trên màn hình** sau khi implement Phase 1 + Phase 2, và checklist smoke test thủ công.

- **App**: đăng nhập → mở trình duyệt local / preview
- **Trang chính**: `/today`
- **Ngôn ngữ**: VI / EN / JA (copy Today đã có đủ 3 locale)

---

## 1. Tổng hợp thay đổi (user-facing)

### Phase 1 — Today planner (đã ship)

| #   | Thay đổi                  | Ở đâu                       | Bạn thấy gì                                                                            |
| --- | ------------------------- | --------------------------- | -------------------------------------------------------------------------------------- |
| 1   | Trang **Hôm nay**         | Nav → **Today** / `/today`  | Kế hoạch trong ngày: mục tiêu, CTA, hàng đợi, insights                                 |
| 2   | Mục tiêu ngày (số thẻ)    | Section **Mục tiêu ngày**   | Progress `completed / target`, nút **Sửa mục tiêu**, thanh %                           |
| 3   | Hàng đợi xếp hạng         | Section **Hàng đợi học**    | Thẻ `due` / `weak` / `new` (badge), preview + tên bộ                                   |
| 4   | Gợi ý hành động tiếp theo | Nút CTA lớn phía trên queue | Spaced **hoặc** Learn 1 bộ **hoặc** “Tới Bộ thẻ” khi trống                             |
| 5   | Insights 7 ngày           | Section **Gợi ý ghi nhớ**   | Số review 7d, % đúng, streak, bộ yếu                                                   |
| 6   | Dashboard due → Today     | Dashboard                   | Alert “có thẻ đến hạn” → link **`/today`** (không còn nhảy thẳng review cũ nếu đã đổi) |

**Phase 1 còn theo UTC** cho ranh giới ngày mục tiêu / insights.

### Phase 2 — Timezone + LEARN tập trung (mới)

| #   | Thay đổi                              | Ở đâu                    | Bạn thấy gì                                                                       |
| --- | ------------------------------------- | ------------------------ | --------------------------------------------------------------------------------- |
| 1   | **Múi giờ ưu tiên**                   | Mục tiêu ngày + form sửa | Label **Múi giờ**, select (UTC, `Asia/Ho_Chi_Minh`, Tokyo, …)                     |
| 2   | Note streak UTC                       | Dưới múi giờ             | “Chuỗi ngày có thể vẫn theo UTC; mục tiêu và insights dùng múi giờ của bạn.”      |
| 3   | Ngày mục tiêu / insights theo múi giờ | Logic phía sau UI        | Đổi sang VN → “ngày học” tính theo nửa đêm VN, không phải UTC                     |
| 4   | LEARN **subset** từ Today             | CTA khi đề xuất 1 bộ     | Copy kiểu **“Học N thẻ trọng tâm (Learn)”** (`N` = số card trong queue của bộ đó) |
| 5   | Session chỉ gồm thẻ queue             | Sau khi bấm CTA Learn    | Vào Learn với `sessionId`; số thẻ session ≈ `N`, **không** full set               |

---

## 2. Chuẩn bị trước khi test

1. Đăng nhập account có **ít nhất 1 bộ thẻ** (nên có ≥ 5–10 thẻ).
2. Ideal: có thẻ **đến hạn** / đã ôn sai (weak) để queue không trống.
3. Dev server chạy (`pnpm dev` hoặc URL deploy bạn đang dùng).
4. Migration đã apply (DB có `preferredTimezone`) — nếu form múi giờ lỗi 500, kiểm tra migrate lại.

**Gợi ý data nhanh**

- Tạo 1 bộ A với nhiều thẻ → ôn một phần HARD/AGAIN.
- (Tuỳ chọn) Tạo bộ B khác có thẻ due → CTA sẽ chuyển sang **spaced** (multi-set).

---

## 3. Checklist Phase 1

### T1. Nav + trang Today

1. Mở app đã login.
2. Trong nav thấy mục **Today** / **Hôm nay**.
3. Click → URL `/today`, title “Hôm nay”.

**Pass:** trang load, không blank / không “loadFailed” kéo dài.

### T2. Mục tiêu ngày

1. Xem `completed / target` và remaining / “Đã đạt…”.
2. **Sửa mục tiêu** → đổi số (vd. 10 → 30) → **Lưu**.
3. Reload `/today` → target vẫn 30.

**Pass:** PATCH thành công, UI cập nhật sau save/refetch.

### T3. Hàng đợi

1. Nếu có thẻ: list có badge Due / Yếu / Mới.
2. Nếu trống: empty state + link tới bộ thẻ.

**Pass:** không crash; empty state rõ ràng.

### T4. CTA đề xuất

| Tình huống queue | CTA kỳ vọng             | Sau click                                          |
| ---------------- | ----------------------- | -------------------------------------------------- |
| Trống            | Tới Bộ thẻ              | `/sets`                                            |
| Nhiều bộ         | Ôn thẻ đến hạn (spaced) | `/study?source=today` (hoặc spaced flow)           |
| Một bộ           | Học… Learn              | Tạo session Learn → `/sets/{id}/learn?sessionId=…` |

**Pass:** đúng nhánh theo data hiện tại.

### T5. Insights

1. Section reviews 7d / accuracy / streak / weak sets hiển thị số hợp lý.
2. Weak sets trống → copy “Không có bộ thẻ yếu…”.

### T6. Dashboard alert

1. Dashboard khi `dueCount > 0` → banner/alert.
2. Nút bắt đầu ôn → đi **`/today`**.

**Pass:** không link thẳng chế độ cũ nếu spec đã đổi sang Today.

---

## 4. Checklist Phase 2 (ưu tiên)

### P2-1. Đổi múi giờ sang Việt Nam

1. `/today` → **Sửa mục tiêu**.
2. Select **Múi giờ** → `Asia/Ho_Chi_Minh`.
3. Có thể giữ nguyên số thẻ → **Lưu**.
4. Reload: label hiển thị `Asia/Ho_Chi_Minh`.
5. Đọc note streak UTC vẫn hiện.

**Pass:** timezone lưu được; không lỗi validation.

**Cách cảm nhận “ngày theo VN”**

- Goal `completed` đếm review trong **ngày lịch VN** (00:00–24:00 `Asia/Ho_Chi_Minh`).
- Buổi tối VN sau 07:00 UTC ngày hôm sau vẫn thuộc “hôm nay” VN (ví dụ ~00:30 VN = vẫn cùng ngày VN).
- Đổi lại `UTC` → ranh giới ngày trở về UTC midnight.

### P2-2. Chỉ sửa số thẻ — không đụng timezone

1. Đặt múi giờ `Asia/Ho_Chi_Minh`.
2. Mở sửa → **chỉ** đổi số thẻ → Lưu (không đụng select múi giờ).
3. Reload: múi giờ **vẫn** `Asia/Ho_Chi_Minh`.

**Pass:** không bị reset về UTC.

### P2-3. LEARN tập trung (cardIds)

**Điều kiện:** queue chỉ thuộc **một** bộ → CTA dạng **“Học N thẻ trọng tâm”**.

1. Ghi nhớ `N` trên nút và số item trong hàng đợi (cùng bộ).
2. Bấm CTA.
3. Vào Learn: session có khoảng **N** thẻ (không phải toàn bộ set nếu set lớn hơn N).
4. Thoát giữa chừng (incomplete) → bấm lại CTA Today cùng bộ.
5. Kỳ vọng: **resume** cùng subset (cùng `sessionId` hoặc cùng tập thẻ), **không** resume session full-set cũ (nếu trước đó bạn từng Learn full set từ trang set).

**Pass:** focused Learn; full-set incomplete ≠ resume khi vào từ Today.

### P2-4. Multi-set → spaced (không cardIds)

1. Làm queue có thẻ từ **≥ 2 bộ**.
2. CTA = spaced (không hiện “N thẻ trọng tâm”).
3. Click → vào spaced / study, **không** tạo Learn subset.

### P2-5. i18n

1. Đổi locale VI → EN → JA trên Today.
2. Kiểm tra: timezone label, streak note, CTA focus (`startSetSessionFocus`).

**Pass:** không key thô / thiếu chuỗi.

---

## 5. Ma trận nhanh “pass / fail”

| ID   | Hạng mục          | Pass khi…                   |
| ---- | ----------------- | --------------------------- |
| T1   | `/today` mở được  | Có title + các section      |
| T2   | Sửa goal cards    | Persist sau reload          |
| T3   | Queue             | List hoặc empty state       |
| T4   | CTA nhánh         | Đúng empty / spaced / learn |
| T5   | Insights          | Số + weak sets              |
| T6   | Dashboard → Today | Link `/today`               |
| P2-1 | Timezone VN       | Lưu + hiển thị đúng         |
| P2-2 | Cards-only save   | Không mất timezone          |
| P2-3 | Focus Learn       | Session ≈ N thẻ queue       |
| P2-4 | Multi-set         | Spaced, không focus Learn   |
| P2-5 | VI/EN/JA          | Copy Today đủ               |

---

## 6. Bug hay gặp / không phải bug

| Hiện tượng                               | Giải thích                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| Streak không đổi theo múi giờ            | **Cố ý** Phase 2 — streak vẫn UTC; UI có note                                    |
| CTA “N thẻ” < tổng thẻ trong set         | **Cố ý** — chỉ học thẻ trong queue (cap)                                         |
| Vào Learn từ trang Set vẫn full set      | **Cố ý** — subset chỉ khi CTA từ Today gửi `cardIds`                             |
| Queue trống                              | Cần thẻ due/weak/new thuộc bộ của bạn                                            |
| Đổi timezone không thấy “completed” nhảy | Có thể chưa có review đúng cửa sổ ngày mới — ôn 1 thẻ (spaced grade) rồi refresh |

---

## 7. Gợi ý thứ tự test 10 phút

1. Dashboard due → `/today` (T6)
2. Sửa goal + timezone VN (T2, P2-1, P2-2)
3. Xem queue + insights (T3, T5)
4. Single-set → Focus Learn N thẻ (P2-3)
5. (Nếu kịp) multi-set → spaced (P2-4)
6. Đổi EN/JA nhìn copy (P2-5)

---

## 8. Liên quan kỹ thuật (tham khảo, không bắt buộc khi test UI)

| Khái niệm                                          | Phase                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------------- |
| `GET /api/v1/today`                                | 1 + 2 (`goal.preferredTimezone`, `recommendation.cardIds`)            |
| `PATCH /api/v1/user/study-goals`                   | 1 (cards) + 2 (timezone)                                              |
| `POST /api/v1/study/sessions` + optional `cardIds` | 2                                                                     |
| Specs / design                                     | `openspec/changes/adaptive-learning-coach-phase-2/` + archive Phase 1 |
| System doc                                         | `docs/system-design/quizlet_clone/learning/today-coach.md`            |

---

_Cập nhật: 2026-07-29 — Phase 1 + Phase 2 Adaptive Learning Coach._
