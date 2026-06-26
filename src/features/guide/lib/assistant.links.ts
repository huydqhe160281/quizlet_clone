const MARKDOWN_LINK = /\[([^\]]+)\]\(((?:[^()]|\([^)]*\))*)\)/g;

function stripUnsafeMarkdownLinks(text: string): string {
  return text.replace(MARKDOWN_LINK, (match, label: string, href: string) => {
    const lower = href.toLowerCase();
    if (
      lower.startsWith('javascript:') ||
      lower.startsWith('data:') ||
      lower.startsWith('http://') ||
      lower.startsWith('https://')
    ) {
      return label;
    }
    return match;
  });
}

export function sanitizeAssistantLinks(text: string, allowedPaths: readonly string[]): string {
  const allowed = new Set(allowedPaths);

  return stripUnsafeMarkdownLinks(text).replace(
    MARKDOWN_LINK,
    (match, label: string, href: string) => {
      const normalized = href.split('?')[0] ?? href;
      if (href.startsWith('/') && !href.includes('://') && allowed.has(normalized)) {
        return match;
      }
      if (!href.startsWith('/')) {
        return label;
      }
      return label;
    }
  );
}

export function stripExternalAndUnsafeLinks(text: string, allowedPaths: readonly string[]): string {
  return sanitizeAssistantLinks(text, allowedPaths);
}

export function containsConfigExfiltration(text: string): boolean {
  return text.includes('"guideTargets"') || text.includes('"generatedAt"');
}

export function sanitizeAssistantOutput(text: string, allowedPaths: readonly string[]): string {
  if (containsConfigExfiltration(text)) {
    return 'Xin lỗi, tôi chỉ có thể hướng dẫn cách dùng website. Bạn muốn tạo bộ thẻ mới hay bắt đầu học?';
  }
  return stripExternalAndUnsafeLinks(text, allowedPaths);
}
