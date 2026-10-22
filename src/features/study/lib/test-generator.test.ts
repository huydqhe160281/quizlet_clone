import { describe, expect, it } from 'vitest';
import { generateLearnOptions, generateTestQuestions } from './test-generator';

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

describe('cards that share an answer', () => {
  const shared = [
    { id: 'a', front: 'big', back: 'lớn' },
    { id: 'b', front: 'large', back: 'Lớn ' },
    { id: 'c', front: 'huge', back: 'lớn' },
    { id: 'd', front: 'small', back: 'nhỏ' },
    { id: 'e', front: 'tiny', back: 'nhỏ' },
  ];

  it('never repeats an option or offers the right answer as a distractor', () => {
    for (let run = 0; run < 50; run += 1) {
      for (const card of shared) {
        const options = generateLearnOptions(shared, card);
        const keys = options.map((option) => option.trim().toLowerCase());
        expect(new Set(keys).size).toBe(keys.length);
        expect(keys.filter((key) => key === card.back.trim().toLowerCase())).toHaveLength(1);
      }
    }
  });

  it('never marks a true/false pair false when the shown back is also correct', () => {
    for (let run = 0; run < 50; run += 1) {
      for (const question of generateTestQuestions(shared)) {
        if (question.type !== 'tf') continue;
        const card = shared.find((item) => item.id === question.cardId)!;
        const sameAnswer =
          question.shownBack.trim().toLowerCase() === card.back.trim().toLowerCase();
        expect(question.isPairCorrect).toBe(sameAnswer);
      }
    }
  });

  it('shows the pair as true when no other answer exists', () => {
    const allSame = [
      { id: 'x', front: 'one', back: 'A' },
      { id: 'y', front: 'two', back: 'a' },
    ];
    for (let run = 0; run < 20; run += 1) {
      const tf = generateTestQuestions(allSame).find((question) => question.type === 'tf');
      expect(tf).toMatchObject({ isPairCorrect: true, shownBack: 'a' });
    }
  });
});
