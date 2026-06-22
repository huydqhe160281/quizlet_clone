# API Design

## 1. Conventions

- **Base path**: `/api/v1/`
- **Format**: JSON
- **Auth**: Session cookie (NextAuth JWT) — kiểm tra qua `await auth()` (NextAuth v5 API) trong mọi protected endpoint
- **Validation**: Zod schema cho mọi request body và query params
- **Error format**:
  ```json
  {
    "error": "VALIDATION_ERROR",
    "message": "Title is required",
    "details": { "field": "title" }
  }
  ```
- **Pagination**: cursor-based (dùng `cursor` + `limit`, không dùng `offset` — scale tốt hơn)
- **HTTP Status codes**: 200 (OK), 201 (Created), 204 (No Content), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 429 (Rate Limited), 500 (Server Error)

## 2. API Endpoints

### Authentication (NextAuth handles most, custom endpoints cho reset password)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/[...nextauth]` | — | NextAuth handler (login, OAuth callback) |
| `POST` | `/api/v1/auth/register` | — | Đăng ký tài khoản mới (email/password) |
| `POST` | `/api/v1/auth/forgot-password` | — | Gửi reset email (unified path với v1 API) |
| `POST` | `/api/v1/auth/reset-password` | — | Đặt mật khẩu mới (token) |
| `GET` | `/api/v1/auth/me` | ✅ | Lấy current user info |

---

### FlashcardSets

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/sets` | ✅ | Lấy danh sách sets của user |
| `POST` | `/api/v1/sets` | ✅ | Tạo set mới |
| `GET` | `/api/v1/sets/:setId` | ✅/— | Lấy chi tiết set (auth nếu private) |
| `PATCH` | `/api/v1/sets/:setId` | ✅ | Cập nhật set (owner only) |
| `DELETE` | `/api/v1/sets/:setId` | ✅ | Xóa set (owner only) |
| `POST` | `/api/v1/sets/:setId/duplicate` | ✅ | Duplicate set vào account của user |

**GET /api/v1/sets** — Query params:
```typescript
{
  cursor?: string      // cursor for pagination
  limit?: number       // default 20, max 50
  visibility?: 'PUBLIC' | 'PRIVATE'
  language?: string    // ISO 639-1
  folderId?: string
}
```

**POST /api/v1/sets** — Request body:
```typescript
{
  title: string        // required, max 200 chars
  description?: string // max 1000 chars
  language?: string    // ISO 639-1
  visibility: 'PUBLIC' | 'PRIVATE'
  tagIds?: string[]
}
```

---

### Flashcards

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/sets/:setId/cards` | ✅/— | Lấy cards trong set |
| `POST` | `/api/v1/sets/:setId/cards` | ✅ | Thêm card vào set |
| `PATCH` | `/api/v1/sets/:setId/cards/:cardId` | ✅ | Cập nhật card |
| `DELETE` | `/api/v1/sets/:setId/cards/:cardId` | ✅ | Xóa card |
| `POST` | `/api/v1/sets/:setId/cards/reorder` | ✅ | Reorder cards (drag&drop) |

**POST /api/v1/sets/:setId/cards** — Request body:
```typescript
{
  front: string        // required, max 500 chars
  back: string         // required, max 500 chars
  example?: string     // max 1000 chars
  imageUrl?: string    // Supabase Storage path
  audioUrl?: string    // Supabase Storage path
  sortOrder?: number
}
```

---

### Study

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/study/due-cards` | ✅ | Lấy cards due hôm nay (SM-2) |
| `POST` | `/api/v1/study/review` | ✅ | Ghi nhận kết quả review card |
| `POST` | `/api/v1/study/sessions` | ✅ | Tạo study session |
| `PATCH` | `/api/v1/study/sessions/:sessionId` | ✅ | Cập nhật / hoàn thành session |
| `GET` | `/api/v1/study/sessions/:sessionId/cards` | ✅ | Lấy cards cho session |

**POST /api/v1/study/review** — Request body:
```typescript
{
  cardId: string
  grade: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY'
  responseMs?: number  // time to answer in ms
}
```

**Response:**
```typescript
{
  cardId: string
  newInterval: number
  newEaseFactor: number
  nextDueDate: string  // ISO 8601
}
```

---

### Dashboard

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/dashboard/stats` | ✅ | Streak, accuracy, card counts |
| `GET` | `/api/v1/dashboard/activity` | ✅ | Daily activity (heatmap data) |
| `GET` | `/api/v1/dashboard/recent-sessions` | ✅ | 5 recent study sessions |

**GET /api/v1/dashboard/activity** — Response:
```typescript
{
  data: Array<{
    date: string   // YYYY-MM-DD
    count: number  // số cards reviewed
  }>
}
```

---

### Search

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/search` | — | Full-text search sets |

**GET /api/v1/search** — Query params:
```typescript
{
  q: string           // search query, required
  language?: string
  tagId?: string
  cursor?: string
  limit?: number      // default 20
}
```

---

### Public Library

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/library` | — | Danh sách public sets |

**GET /api/v1/library** — Query params:
```typescript
{
  sort?: 'trending' | 'most_studied' | 'newest'  // default: newest
  language?: string
  tagId?: string
  cursor?: string
  limit?: number  // default 20
}
```

---

### Media Upload

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/upload/presigned-url` | ✅ | Lấy presigned URL upload Supabase |

**POST /api/v1/upload/presigned-url** — Request body:
```typescript
{
  fileType: 'image' | 'audio'
  fileName: string
  mimeType: string
  fileSize: number  // bytes — validated server-side (image ≤ 5MB, audio ≤ 10MB)
}
```

**Response:**
```typescript
{
  signedUrl: string  // PUT trực tiếp lên Supabase
  path: string       // lưu vào DB
  publicUrl: string  // để preview ngay sau upload
}
```

---

### Folders & Tags

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/folders` | ✅ | Lấy folders của user |
| `POST` | `/api/v1/folders` | ✅ | Tạo folder |
| `DELETE` | `/api/v1/folders/:folderId` | ✅ | Xóa folder |
| `POST` | `/api/v1/folders/:folderId/sets` | ✅ | Thêm set vào folder |
| `DELETE` | `/api/v1/folders/:folderId/sets/:setId` | ✅ | Xóa set khỏi folder |
| `GET` | `/api/v1/tags` | — | Lấy danh sách tags (public) |

## 3. Pagination Pattern (Cursor-based)

```typescript
// Request
GET /api/v1/sets?cursor=clh3xyz&limit=20

// Response
{
  "data": [...],
  "pagination": {
    "nextCursor": "clh4abc",  // null nếu hết
    "hasMore": true
  }
}

// Prisma query
const sets = await prisma.flashcardSet.findMany({
  where: { userId },
  take: limit + 1,
  skip: cursor ? 1 : 0,      // skip: 1 để bỏ cursor record, tránh duplicate
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { createdAt: 'desc' },
});

const hasMore = sets.length > limit;
const data = hasMore ? sets.slice(0, -1) : sets;
const nextCursor = hasMore ? data[data.length - 1].id : null;
```

## 4. Error Handling

```typescript
// src/lib/api-error.ts
export class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
  }
}

// Route handler wrapper — Next.js 15: dynamic route params are async
type RouteContext = { params: Promise<Record<string, string>> };

export function withErrorHandler(handler: RouteHandler) {
  return async (req: Request, ctx: RouteContext) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      if (error instanceof ApiError) {
        return Response.json(
          { error: error.code, message: error.message, details: error.details },
          { status: error.status }
        );
      }
      if (error instanceof ZodError) {
        return Response.json(
          { error: 'VALIDATION_ERROR', message: 'Invalid input', details: error.flatten() },
          { status: 400 }
        );
      }
      console.error(error);
      return Response.json({ error: 'INTERNAL_ERROR', message: 'Something went wrong' }, { status: 500 });
    }
  };
}
```

**Next.js 15 dynamic Route Handler pattern** (required for `[setId]`, `[cardId]`, `[sessionId]`, `[folderId]`):

```typescript
// src/app/api/v1/sets/[setId]/route.ts
export const GET = withErrorHandler(async (req, { params }) => {
  const { setId } = await params;
  const session = await auth();
  // ...
});
```
