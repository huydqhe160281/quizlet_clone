import { describe, expect, it } from 'vitest';
import { parseEmbeddedMcq } from './mcq-parser';

describe('parseEmbeddedMcq', () => {
  it('parses multiline front with letter back', () => {
    const front =
      'Danh mục tài khoản được khai báo ở menu nào?\n\na. Tổng hợp\nb. Danh mục và số dư\nc. Báo cáo\nd. Công cụ';
    const result = parseEmbeddedMcq(front, 'B');

    expect(result).not.toBeNull();
    expect(result?.stem).toBe('Danh mục tài khoản được khai báo ở menu nào?');
    expect(result?.options).toHaveLength(4);
    expect(result?.correctLabel).toBe('b. Danh mục và số dư');
  });

  it('parses inline options on one line', () => {
    const front =
      'Khi nhập liệu phiếu chi mua dịch vụ sửa chữa TSCĐ, tài khoản nào thường được ghi Nợ? a. 642 b. 641 c. 211 d. 627';
    const result = parseEmbeddedMcq(front, 'A');

    expect(result).not.toBeNull();
    expect(result?.stem).toContain('ghi Nợ?');
    expect(result?.options.map((option) => option.label)).toEqual([
      'a. 642',
      'b. 641',
      'c. 211',
      'd. 627',
    ]);
    expect(result?.correctLabel).toBe('a. 642');
  });

  it('returns null when back is not a letter key', () => {
    const front = 'Question?\n\na. One\nb. Two';
    expect(parseEmbeddedMcq(front, '641')).toBeNull();
  });

  it('returns null for plain flashcards without embedded options', () => {
    expect(parseEmbeddedMcq('Hello', 'Xin chào')).toBeNull();
  });
});
