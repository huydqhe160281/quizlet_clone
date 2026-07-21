# Design Brief: UI/UX Responsive Audit

**Change:** `ui-ux-responsive-audit`  
**Schema:** `brainstorm`  
**Date:** 2026-07-21  

## 1. Mục tiêu

Rà soát toàn bộ layout và responsive behavior của ứng dụng Quizlet Clone, xác định các điểm vỡ layout, thiếu breakpoint, và trải nghiệm kém trên mobile/tablet. Đề xuất phương hướng xử lý cụ thể cho từng component.

---

## 2. Kiến trúc Layout hiện tại

```
AppLayout (app/(app)/layout.tsx)
├── Sidebar (hidden md:flex, w-64, sticky top-0 h-screen)
├── div.flex-1.flex-col.pb-16.md:pb-0
│   ├── Navbar (sticky top-0 z-40)
│   └── main.flex-1.p-4.md:p-6
│       └── {children}
└── MobileNav (fixed inset-x-0 bottom-0, md:hidden)
```

**Breakpoints Tailwind mặc định:**
- `sm` = 640px, `md` = 768px, `lg` = 1024px, `xl` = 1280px

---

## 3. Các vấn đề đã phát hiện (Code Audit)

### 🔴 Critical Issues

#### 3.1 ActivityHeatmap — Overflow trên mobile
**File:** `src/features/dashboard/components/ActivityHeatmap.tsx` (L161–168)

```tsx
// Hiện tại: 53 cột grid KHÔNG có overflow scroll
<div
  className="grid min-w-0 flex-1 gap-[3px]"
  style={{
    gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))`,
    gridTemplateRows: 'repeat(7, auto)',
    gridAutoFlow: 'column',
  }}
>
```

**Vấn đề:** `WEEKS = 53` → grid 53 cột với `minmax(0, 1fr)`. Trên màn hình nhỏ, các cell trở nên quá nhỏ (< 4px) và không thể đọc được. Container cha có `min-w-0 flex-1` nhưng không có scroll ngang, khiến heatmap bị méo mó hoặc tràn.

**Fix:** Bọc trong `overflow-x-auto`, đặt `min-w` cố định cho grid cells, hoặc giảm số tuần hiển thị trên mobile (ví dụ: 26 tuần thay vì 53).

---

#### 3.2 StatsCards — Thiếu breakpoint md
**File:** `src/features/dashboard/components/StatsCards.tsx` (L50)

```tsx
// Hiện tại
<div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
```

**Vấn đề:** Khoảng từ `sm` (640px) đến `lg` (1024px) = **384px rộng không có breakpoint**, bao gồm phần lớn tablet landscape. Trên iPad (768px), grid vẫn là 2 cột trong khi có đủ không gian cho 4 cột.

**Fix:**
```tsx
<div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
```
Hoặc progressive: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`.

---

### 🟡 Medium Issues

#### 3.3 SetDetailClient — Action buttons overflow mobile
**File:** `src/features/sets/components/SetDetailClient.tsx` (L80–155)

```tsx
// 4 buttons: Edit, Import, Duplicate, Delete — tất cả flex-1 sm:flex-none
<div className="flex flex-wrap gap-2">
  <Button className="flex-1 sm:flex-none">...</Button>
  <Button className="flex-1 sm:flex-none">...</Button>
  <Button className="flex-1 sm:flex-none">...</Button>
  <Button className="flex-1 sm:flex-none">...</Button>
</div>
```

**Vấn đề:** Trên mobile, 4 button với `flex-1` sẽ có 2 button/row (vì `flex-wrap`) — nhưng nếu label dài, text có thể wrap bên trong button gây ra UI xấu. Destructive action (Delete) nằm cạnh các action thường.

**Fix:** Sử dụng icon-only buttons với tooltip trên mobile, hoặc nhóm destructive action tách biệt với dropdown menu.

---

#### 3.4 SetsListClient — Header bị ép chật trên mobile nhỏ
**File:** `src/features/sets/components/SetsListClient.tsx` (L59–81)

```tsx
<div className="flex items-start justify-between">
  <div className="flex flex-col gap-1">
    <h1 className="text-3xl font-bold ...">...</h1>
  </div>
  <div className="flex flex-wrap gap-2">
    {/* 3 buttons */}
  </div>
</div>
```

**Vấn đề:** `justify-between` với `text-3xl` heading + 3 buttons bên phải → trên mobile nhỏ (< 400px), heading và buttons chen nhau, không có wrap fallback. `flex-wrap` chỉ có trong button container, không phải outer flex.

**Fix:**
```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
```

---

#### 3.5 StudyLauncher — Grid layout suboptimal
**File:** `src/features/study/components/StudyLauncher.tsx` (L138)

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
```

**Vấn đề:** Trên tablet (640–767px), grid vẫn là 1 cột mặc dù có đủ không gian cho 2 cột.

**Fix:**
```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
```

---

#### 3.6 Navbar — Mobile logo vs action items
**File:** `src/components/layout/Navbar.tsx` (L16–66)

```tsx
<header className="glass-nav flex h-20 items-center justify-between px-4 md:px-8">
  <div className="flex items-center gap-3 md:hidden">
    {/* Logo mobile */}
  </div>
  <div className="hidden md:block" /> {/* spacer */}
  <div className="flex items-center gap-3">
    <LanguageSwitcher />
    <ThemeToggle />
    {/* Auth buttons + email */}
  </div>
</header>
```

**Vấn đề:**
- `h-20` (80px) trên cả mobile và desktop — hơi cao cho mobile
- Email user (`session.user.email`) visible trên `md:inline` — nên truncate khi email dài
- `LanguageSwitcher` + `ThemeToggle` + `StreakBadge` + `email` + `SignOut` = 5 elements đồng thời có thể overflow trên tablet nhỏ

**Fix:**
- Reduce height on mobile: `h-16 md:h-20`  
- Email: thêm `max-w-[120px] truncate`
- Trên mobile: ẩn email, giữ StreakBadge + ThemeToggle

---

### 🟢 Minor Issues

#### 3.7 DashboardClient — Heading font size không scale
**File:** `src/features/dashboard/components/DashboardClient.tsx` (L50)

```tsx
<h1 className="... text-4xl font-extrabold ...">
```

`text-4xl` (36px) không responsive. Trên mobile, 36px quá lớn.  
**Fix:** `text-3xl sm:text-4xl`

---

#### 3.8 AppLayout — Không có sm breakpoint cho layout
**File:** `src/app/(app)/layout.tsx`

```tsx
<div className="flex min-h-screen relative overflow-clip">
  <Sidebar /> {/* hidden md:flex */}
  <div className="flex flex-1 flex-col pb-16 md:pb-0 z-10">
```

**Vấn đề:** Thiếu tablet portrait mode (sm: 640–767px) — hiện tại giống mobile hoàn toàn. Không có collapsed/icon-only sidebar cho intermediate screen sizes.

**Fix (Progressive Enhancement):**
- Option A (simple): Giữ nguyên 2 mode (mobile bottom nav vs desktop sidebar)
- Option B (full): Thêm icon-only sidebar cho `sm`–`md` breakpoint

---

## 4. Phương hướng xử lý đề xuất

### Tier 1 — Critical Fixes (nên làm ngay)

| # | Component | Fix | Effort |
|---|-----------|-----|--------|
| 1 | `ActivityHeatmap` | Thêm `overflow-x-auto` container, set `min-w` cho cells, responsive week count (26 mobile / 53 desktop) | Medium |
| 2 | `StatsCards` | `grid-cols-2 sm:grid-cols-4` | XS |
| 3 | `DashboardClient` | `text-3xl sm:text-4xl` heading | XS |

### Tier 2 — UX Improvements

| # | Component | Fix | Effort |
|---|-----------|-----|--------|
| 4 | `SetsListClient` | `flex-col sm:flex-row` header | XS |
| 5 | `StudyLauncher` | `sm:grid-cols-2` thay vì `md:grid-cols-2` | XS |
| 6 | `Navbar` | `h-16 md:h-20`, email truncation, compact mobile | Small |

### Tier 3 — Enhancement (tùy chọn)

| # | Component | Fix | Effort |
|---|-----------|-----|--------|
| 7 | `SetDetailClient` | Icon-only mobile buttons + DropdownMenu cho destructive | Medium |
| 8 | `AppLayout` | Icon-only sidebar cho sm breakpoint | Large |

---

## 5. Approach tổng thể

**Nguyên tắc:**
1. **Mobile-first**: Viết mobile styles trước, override lên dần theo breakpoint
2. **Content-driven**: Breakpoints theo nội dung cần hiển thị, không phải device cụ thể
3. **No layout shift**: Tránh thay đổi chiều cao/vị trí đột ngột khi thay đổi viewport
4. **Surgical changes**: Không refactor toàn bộ, chỉ sửa đúng điểm vỡ

**Thứ tự ưu tiên triển khai:**
1. Tier 1 critical fixes → không ảnh hưởng logic, risk thấp
2. Tier 2 UX fixes → cải thiện trải nghiệm đáng kể
3. Tier 3 enhancement → cần design decision rõ ràng hơn

---

## 6. Files cần chỉnh sửa

```
src/features/dashboard/components/ActivityHeatmap.tsx    ← Tier 1
src/features/dashboard/components/StatsCards.tsx         ← Tier 1
src/features/dashboard/components/DashboardClient.tsx    ← Tier 1
src/features/sets/components/SetsListClient.tsx          ← Tier 2
src/features/study/components/StudyLauncher.tsx          ← Tier 2
src/components/layout/Navbar.tsx                         ← Tier 2
src/features/sets/components/SetDetailClient.tsx         ← Tier 3 (optional)
src/app/(app)/layout.tsx                                 ← Tier 3 (optional)
```
