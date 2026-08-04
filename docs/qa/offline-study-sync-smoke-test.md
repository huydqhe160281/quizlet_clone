# Kịch bản test UI: Offline Study Sync

Hướng dẫn thao tác tay trên trình duyệt. Locale khuyến nghị: **Tiếng Việt**.

## Chuẩn bị (1 lần)

1. Chạy app local (hoặc mở bản deploy):
   ```bash
   pnpm dev
   ```
2. Đăng nhập tài khoản test.
3. Chọn locale **VI** (Language switcher trên Navbar).
4. Có sẵn **1 bộ thẻ ≥ 6 thẻ** (để đủ 1 vòng Learn/Flashcard). Ghi lại:
   - Tên bộ: `________________`
   - URL set: `/sets/<setId>` → `________________`
5. Mở DevTools (F12):
   - Tab **Application** → **IndexedDB** → sẽ xuất hiện `quizfree-study-offline`
   - Tab **Network** → sẽ dùng **Offline**
   - (Tuỳ chọn) Tab **Console** để xem lỗi đỏ

### ⚠️ Quan trọng — đừng Refresh khi Offline

Phase 1 SW giữ **document = NetworkOnly** → fallback `/offline.html`.  
Phase 2 **không** đổi rule đó (chỉ cấm đổi `/api/**`).

| Thao tác khi Offline                            | Kết quả                                                                                            |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Ở nguyên trang study đã load → tiếp tục trả lời | ✅ Phase 2 (queue / badge)                                                                         |
| **F5 / Refresh / dán URL / mở tab mới**         | ❌ Màn **You're offline** (`/offline.html`) — React không chạy → IndexedDB fallback **không** chạy |

Màn “You're offline” trên URL `.../learn?sessionId=...` là **đúng Phase 1**, không phải bug Phase 2.

---

## Scenario A — Cache nội dung khi học online

**Mục tiêu:** Session load online sẽ ghi vào IndexedDB `sets`.

| Bước | Thao tác                                                                         | Kết quả mong đợi                                              |
| ---- | -------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| A1   | Vào set → chọn **Thẻ ghi nhớ** (`/sets/<setId>/flashcard`)                       | Session load, thấy thẻ đầu tiên                               |
| A2   | Lật / trả lời **ít nhất 1 thẻ** (online)                                         | Không lỗi; tiến độ tăng                                       |
| A3   | DevTools → Application → IndexedDB → `quizfree-study-offline` → store **`sets`** | Có 1 row: `setId`, `userId`, `sessionId`, `setTitle`, `cards` |
| A4   | Ghi lại `sessionId` trong cache: `________________`                              | Dùng cho Scenario C                                           |

**Pass:** Có row trong `sets` với `sessionId` khớp URL/session hiện tại.

---

## Scenario B — Học giữa chừng mất mạng → queue

**Mục tiêu:** Câu trả lời offline không mất; badge sync hiện pending.

| Bước | Thao tác                                                                        | Kết quả mong đợi                                                       |
| ---- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| B1   | Tiếp tục session Flashcard/Learn đang mở (online)                               | —                                                                      |
| B2   | Network → tick **Offline**                                                      | Tab offline                                                            |
| B3   | Trả lời thêm **2–3 thẻ** (và/hoặc hoàn thành 1 vòng nếu app hiện Round Summary) | UI vẫn đi tiếp, **không** treo trên thẻ hiện tại                       |
| B4   | Nhìn vùng dưới header study (gần “Thoát học”)                                   | Thấy badge dạng: **`N thay đổi chờ đồng bộ`** + nút **`Đồng bộ ngay`** |
| B5   | IndexedDB → store **`mutations`**                                               | Có row `kind: session-answer`, `status: pending`, mỗi answer 1 row     |
| B6   | (Tuỳ chọn) Bấm **Đồng bộ ngay** khi vẫn Offline                                 | Pending **không** hết (hoặc vẫn còn); không crash                      |

**Pass:** Pending > 0; mutations còn `pending`; UI học được tiếp.

---

## Scenario C — Đóng tab offline → mở lại khi đã online → auto replay

**Mục tiêu:** Mount-time replay khi reopen đã có mạng.

| Bước | Thao tác                                                                                   | Kết quả mong đợi                                          |
| ---- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| C1   | Đang Offline, còn pending (sau Scenario B)                                                 | —                                                         |
| C2   | **Đóng tab** (hoặc đóng cửa sổ)                                                            | —                                                         |
| C3   | Network bỏ Offline (online lại) **trước** khi mở app                                       | —                                                         |
| C4   | Mở lại app, đăng nhập nếu cần, vào lại bất kỳ trang study (Flashcard set cũ hoặc `/study`) | Trong vài giây: pending giảm về 0                         |
| C5   | Quan sát badge                                                                             | Hiện ngắn **`✓ Đã đồng bộ`** rồi biến mất                 |
| C6   | IndexedDB → `mutations`                                                                    | Các row đã sync **bị xoá** (không còn pending của lần đó) |
| C7   | Vào lại session / Dashboard                                                                | Tiến độ trả lời đã lên server (không “mất” câu offline)   |

**Pass:** Reopen online → sync tự chạy; `✓ Đã đồng bộ`; mutations cleared.

---

## Scenario D — Spaced Repetition offline (không treo UI)

**Mục tiêu:** Grade card offline enqueue `srs-review`, UI vẫn next card.

| Bước | Thao tác                                                     | Kết quả mong đợi                                                    |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| D1   | Online → Navbar/menu vào **`/study`** (“Lặp lại ngắt quãng”) | Có thẻ due (nếu không có due: học vài thẻ Learn trước rồi quay lại) |
| D2   | Network → **Offline**                                        | —                                                                   |
| D3   | Chấm điểm 1–2 thẻ (GOOD/AGAIN/…)                             | UI **sang thẻ tiếp** hoặc round summary; **không** stuck            |
| D4   | IndexedDB → `mutations`                                      | Row `kind: srs-review`, `status: pending`                           |
| D5   | Online lại → đợi / bấm **Đồng bộ ngay**                      | Pending giảm; `✓ Đã đồng bộ`                                        |

**Pass:** Offline grade không crash; replay xong không nhân đôi lịch sử review (xem Scenario F).

---

## Scenario E — Resume từ cache (không qua full navigation Offline)

**Mục tiêu:** Khi fetch resume `GET` fail **trong app đã load**, chỉ dùng cache nếu `sessionId` khớp.

> **Không** test bằng Offline + F5 — sẽ ra `/offline.html`.  
> Cách test thực tế với DevTools:

### E1 — Soft re-mount trong SPA (khuyến nghị)

| Bước | Thao tác                                                                                                                                                                          | Kết quả mong đợi                                  |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| E1.1 | Online: mở Learn/Flashcard, trả lời 1 thẻ (Scenario A — đã có `sets`)                                                                                                             | Có cache                                          |
| E1.2 | Ghi `sessionId` từ IndexedDB `sets`                                                                                                                                               | —                                                 |
| E1.3 | **Không** Offline. Dùng React Router / click sang set khác rồi quay lại URL có `?sessionId=...` (hoặc đổi query rồi quay lại) khi **đã Online** trước — xác nhận resume online OK | Session load bình thường                          |
| E1.4 | Để test nhánh cache: mở session online → Network **Offline** → trong Console gọi lại logic bằng cách **không refresh**, chỉ để round-flush fail (Scenario B)                      | UI study vẫn còn; không nhảy sang `/offline.html` |

### E2 — Full reload Offline (kỳ vọng hiện tại = offline shell)

| Bước | Thao tác                                          | Kết quả mong đợi                                               |
| ---- | ------------------------------------------------- | -------------------------------------------------------------- |
| E2.1 | Offline → F5 trên `/sets/.../learn?sessionId=...` | Màn **You're offline** + nút Try again — **PASS theo Phase 1** |

Muốn F5 Offline vẫn vào được Learn từ IndexedDB → cần change OpenSpec mới (cache app shell / đổi document strategy), **ngoài** scope `offline-study-sync`.

---

## Scenario F — Không nhân đôi khi sync 2 lần

**Mục tiêu:** Cùng `clientMutationId` replay lại vẫn an toàn.

| Bước | Thao tác                                                                                                                                                                       | Kết quả mong đợi        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| F1   | Làm Scenario B → có pending answers                                                                                                                                            | —                       |
| F2   | Online → bấm **Đồng bộ ngay**                                                                                                                                                  | Pending → 0             |
| F3   | (DevTools) Nếu còn cách: tạo lại tình huống gửi trùng khó trên UI thuần — thay vào đó: trong Network, filter `/api/v1/study/` lúc sync, xác nhận request có `clientMutationId` | Body PATCH/POST có UUID |
| F4   | Sau sync, vào DB (Prisma Studio / SQL) hoặc UI tiến độ: số câu đúng / review history **không nhảy gấp đôi** khi bấm Sync lần 2 (không còn pending thì Sync no-op)              | Không duplicate         |

**Pass:** Sync lần 2 khi queue trống không tạo thêm history.

---

## Scenario G — Sign-out flush + xoá content cache

**Mục tiêu:** Flush trước `signOut`; `sets` user này bị xoá; queue không bị xoá bởi bước clear cache.

| Bước | Thao tác                                       | Kết quả mong đợi                                                                                                                |
| ---- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| G1   | Online: học 1 thẻ để có `sets` row             | Có cache                                                                                                                        |
| G2   | Offline: trả lời thêm 1–2 thẻ (tạo pending)    | Có `mutations`                                                                                                                  |
| G3   | **Online lại** (để flush có cơ hội thành công) | —                                                                                                                               |
| G4   | Navbar → **Đăng xuất**                         | Đăng xuất về `/`                                                                                                                |
| G5   | IndexedDB → `sets`                             | Row của user vừa logout **không còn**                                                                                           |
| G6   | IndexedDB → `mutations`                        | Có thể còn row nếu flush timeout; **không** bị xoá chỉ vì logout clear cache. Nếu online + flush OK thì pending đã hết trước đó |

**Pass:** Logout không crash; content cache user đó sạch.

---

## Scenario H — (Nâng cao) Thông báo session-complete failed

Khó tái hiện thuần UI (cần session đã complete trên server bằng thiết bị khác). Nếu test được:

| Bước                                                          | Kỳ vọng UI                                                                                                   |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Có row `mutations` `kind: session-complete`, `status: failed` | Banner đỏ: **“Không đồng bộ được lần hoàn thành phiên học…”** + **Đồng bộ ngay** (khác badge pending thường) |

Có thể bỏ qua nếu không setup 2 thiết bị.

---

## Checklist tổng

- [ ] A — Cache `sets` sau học online
- [ ] B — Offline mid-session → pending badge + queue
- [ ] C — Đóng tab offline → mở lại online → auto sync + `✓ Đã đồng bộ`
- [ ] D — `/study` offline grade không treo
- [ ] E — Resume offline đúng/sai `sessionId`
- [ ] F — Không nhân đôi sau sync
- [ ] G — Sign-out: clear `sets`, flush best-effort
- [ ] H — (Optional) banner session-complete failed

## Ghi chú nhanh DevTools

| Store       | Key ý nghĩa                                                      |
| ----------- | ---------------------------------------------------------------- |
| `sets`      | `[setId, userId]` — snapshot thẻ + `sessionId`                   |
| `mutations` | `localId` — `session-answer` / `session-complete` / `srs-review` |

API study vẫn **không** cache trong Service Worker (`/api/**` = NetworkOnly) — khi Offline, Network tab sẽ thấy fetch fail/queue, không thấy SW serve JSON API.
