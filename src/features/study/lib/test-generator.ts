import { parseEmbeddedMcq, shuffleOptions } from '@/features/study/lib/mcq-parser';

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

export type LearnMcqView = {
  prompt: string;
  options: string[];
  correctAnswer: string;
  embedded: boolean;
};

const pickDistractors = (cards: StudyCardInput[], correctId: string, count: number) => {
  const pool = cards.filter((card) => card.id !== correctId).map((card) => card.back);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

const pickFrontDistractors = (cards: StudyCardInput[], correctId: string, count: number) => {
  const pool = cards.filter((item) => item.id !== correctId).map((item) => item.front);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

/** Resolve MC prompt/options, preferring embedded a/b/c/d options in front when present. */
export function resolveLearnMcq(
  cards: StudyCardInput[],
  card: StudyCardInput,
  direction: 'front_to_back' | 'back_to_front' = 'front_to_back'
): LearnMcqView {
  const embedded = parseEmbeddedMcq(card.front, card.back);
  if (embedded) {
    return {
      prompt: embedded.stem,
      options: shuffleOptions(embedded.options.map((option) => option.label)),
      correctAnswer: embedded.correctLabel,
      embedded: true,
    };
  }

  if (direction === 'back_to_front') {
    return {
      prompt: card.back,
      options: shuffleOptions([...pickFrontDistractors(cards, card.id, 3), card.front]),
      correctAnswer: card.front,
      embedded: false,
    };
  }

  return {
    prompt: card.front,
    options: shuffleOptions([...pickDistractors(cards, card.id, 3), card.back]),
    correctAnswer: card.back,
    embedded: false,
  };
}

export function generateTestQuestions(cards: StudyCardInput[]): TestQuestion[] {
  if (cards.length === 0) {
    return [];
  }

  const questions: TestQuestion[] = cards.map((card, index) => {
    const embedded = parseEmbeddedMcq(card.front, card.back);
    if (embedded) {
      return {
        type: 'mc',
        cardId: card.id,
        front: embedded.stem,
        options: shuffleOptions(embedded.options.map((option) => option.label)),
        correctBack: embedded.correctLabel,
      };
    }

    if (cards.length >= 4 && index % 3 === 0) {
      const distractors = pickDistractors(cards, card.id, 3);
      const options = shuffleOptions([...distractors, card.back]);
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
  const embedded = parseEmbeddedMcq(card.front, card.back);
  if (embedded) {
    return shuffleOptions(embedded.options.map((option) => option.label));
  }
  const distractors = pickDistractors(cards, card.id, 3);
  return shuffleOptions([...distractors, card.back]);
}

/** MC options where the correct answer is the card front (term). */
export function generateLearnTermOptions(cards: StudyCardInput[], card: StudyCardInput): string[] {
  const embedded = parseEmbeddedMcq(card.front, card.back);
  if (embedded) {
    return shuffleOptions(embedded.options.map((option) => option.label));
  }
  const distractors = pickFrontDistractors(cards, card.id, 3);
  return shuffleOptions([...distractors, card.front]);
}
