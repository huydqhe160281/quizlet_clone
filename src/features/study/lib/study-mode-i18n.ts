import type { StudyModeValue } from '@/features/study/schemas/study.schema';

export const STUDY_MODE_LABEL_KEY: Record<StudyModeValue, string> = {
  FLASHCARD: 'study.modes.flashcard',
  LEARN: 'study.modes.learn',
  WRITE: 'study.modes.write',
  TEST: 'study.modes.test',
  DRAW: 'study.modes.draw',
};

export const STUDY_MODE_SHORT_LABEL_KEY: Record<StudyModeValue, string> = {
  FLASHCARD: 'study.modes.flashcard',
  LEARN: 'study.modes.learn',
  WRITE: 'study.modes.write',
  TEST: 'study.modes.test',
  DRAW: 'study.modes.drawShort',
};

export const STUDY_MODE_DESC_KEY: Record<StudyModeValue, string> = {
  FLASHCARD: 'study.modes.flashcardDesc',
  LEARN: 'study.modes.learnDesc',
  WRITE: 'study.modes.writeDesc',
  TEST: 'study.modes.testDesc',
  DRAW: 'study.modes.drawDesc',
};
