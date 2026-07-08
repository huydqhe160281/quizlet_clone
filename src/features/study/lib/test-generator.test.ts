import { describe, expect, it } from 'vitest';
import { generateTestQuestions } from './test-generator';

describe('generateTestQuestions', () => {
  it('uses embedded MCQ options instead of letter distractors', () => {
    const front =
      'Báo cáo thuế GTGT đầu ra được lập từ:\n\na. Hóa đơn bán hàng\nb. Phiếu chi\nc. Phiếu nhập kho\nd. Báo cáo tài chính';

    const questions = generateTestQuestions([
      { id: '1', front, back: 'A' },
      { id: '2', front: 'Other?\n\na. X\nb. Y\nc. Z\nd. W', back: 'B' },
    ]);

    expect(questions[0]?.type).toBe('mc');
    if (questions[0]?.type !== 'mc') {
      return;
    }

    expect(questions[0].front).toBe('Báo cáo thuế GTGT đầu ra được lập từ:');
    expect(questions[0].options).toEqual(
      expect.arrayContaining([
        'a. Hóa đơn bán hàng',
        'b. Phiếu chi',
        'c. Phiếu nhập kho',
        'd. Báo cáo tài chính',
      ])
    );
    expect(questions[0].correctBack).toBe('a. Hóa đơn bán hàng');
  });
});
