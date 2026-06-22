export type StudyCardInput = {
  id: string;
  front: string;
  back: string;
};

export type McQuestion = {
  type: 'mc';
  cardId: string;
  front: string;
  options: string[];
  correctBack: string;
};

export type TfQuestion = {
  type: 'tf';
  cardId: string;
  front: string;
  shownBack: string;
  isPairCorrect: boolean;
};

export type TypingQuestion = {
  type: 'typing';
  cardId: string;
  front: string;
  back: string;
};

export type TestQuestion = McQuestion | TfQuestion | TypingQuestion;

const pickDistractors = (cards: StudyCardInput[], correctId: string, count: number) => {
  const pool = cards.filter((card) => card.id !== correctId).map((card) => card.back);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

export function generateTestQuestions(cards: StudyCardInput[]): TestQuestion[] {
  if (cards.length === 0) {
    return [];
  }

  const questions: TestQuestion[] = cards.map((card, index) => {
    if (cards.length >= 4 && index % 3 === 0) {
      const distractors = pickDistractors(cards, card.id, 3);
      const options = [...distractors, card.back].sort(() => Math.random() - 0.5);
      return { type: 'mc', cardId: card.id, front: card.front, options, correctBack: card.back };
    }

    if (cards.length >= 2 && index % 3 === 1) {
      const other = cards[(index + 1) % cards.length];
      const isPairCorrect = Math.random() >= 0.5;
      return {
        type: 'tf',
        cardId: card.id,
        front: card.front,
        shownBack: isPairCorrect ? card.back : other.back,
        isPairCorrect,
      };
    }

    return { type: 'typing', cardId: card.id, front: card.front, back: card.back };
  });

  return questions;
}

export function generateLearnOptions(cards: StudyCardInput[], card: StudyCardInput): string[] {
  const distractors = pickDistractors(cards, card.id, 3);
  return [...distractors, card.back].sort(() => Math.random() - 0.5);
}
