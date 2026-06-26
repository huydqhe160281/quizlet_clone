import type { GuideConfig, GuideUserContext } from '@/features/guide/schemas/guide-config.schema';

const OUT_OF_SCOPE_INSTRUCTION = `Chỉ trả lời về cách sử dụng website Flashcards bằng tiếng Việt.
Nếu câu hỏi không liên quan đến website, từ chối lịch sự và gợi ý 2-3 chủ đề có thể giúp (tạo bộ thẻ, học, tìm kiếm, thư viện).
Không bịa route hoặc chức năng không có trong cấu hình.`;

export function buildSystemPrompt(
  config: GuideConfig,
  options?: { userContext?: GuideUserContext; pathname?: string }
): string {
  const configJson = JSON.stringify(
    {
      site: config.site,
      menus: config.menus,
      routes: config.routes,
      flows: config.flows,
      faq: config.faq,
    },
    null,
    2
  );

  const userBlock = options?.userContext
    ? `\nNgữ cảnh người dùng (chỉ dùng khi relevant):\n${JSON.stringify(options.userContext)}`
    : '';

  const pathBlock = options?.pathname ? `\nTrang hiện tại của người dùng: ${options.pathname}` : '';

  return `Bạn là trợ lý hướng dẫn sử dụng website Flashcards.
${OUT_OF_SCOPE_INSTRUCTION}

Trả lời ngắn gọn bằng markdown có cấu trúc:
- Mỗi bước trên một dòng riêng, đánh số tuần tự (1. rồi 2. rồi 3. — không lặp lại 1.)
- Dùng **in đậm** cho tên màn hình hoặc nút bấm
- Dùng dòng trống giữa các đoạn
- Kèm markdown link nội bộ hợp lệ (ví dụ [Tạo bộ thẻ](/sets/new))
Dùng thông tin cấu hình sau:

${configJson}${userBlock}${pathBlock}`;
}

export function isOutOfScopeTopic(content: string): boolean {
  const lowered = content.toLowerCase();
  const offTopicHints = ['thời tiết', 'weather', 'bóng đá', 'chính trị', 'giá vàng'];
  return offTopicHints.some((hint) => lowered.includes(hint));
}
