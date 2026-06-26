# Guide Knowledge Base

File cấu hình trợ lý AI được generate tự động và merge với nội dung thủ công.

## Cấu trúc

| Path                              | Mô tả                     |
| --------------------------------- | ------------------------- |
| `docs/guide/faq.vi.json`          | FAQ tiếng Việt            |
| `docs/guide/flows/*.json`         | Luồng hướng dẫn từng bước |
| `src/generated/guide-config.json` | Output build (committed)  |

## Commands

```bash
npm run generate:guide        # Generate config
npm run generate:guide:check  # Fail nếu output khác file committed
```

## Thêm flow mới

1. Tạo `docs/guide/flows/<id>.json` với `id`, `title`, `steps[]`.
2. Chạy `npm run generate:guide`.
3. Commit `src/generated/guide-config.json`.

## Schema

Xem `src/features/guide/schemas/guide-config.schema.ts`.

## Future: Guide Actions

Phase 2 sẽ parse JSON action blocks trong response (`navigate`, `highlight`, `openModal`, `execute`).
