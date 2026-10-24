/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { GravityMode } from './GravityMode';
import { useStudySession } from '@/features/study/hooks/useStudySession';
import { useStudyStore, type StudyCard } from '@/features/study/store';
import { renderWithLocale } from '@/test/render-with-locale';

vi.mock('@/features/study/hooks/useStudySession', () => ({
  useStudySession: vi.fn(),
}));

const mockUseStudySession = useStudySession as Mock<typeof useStudySession>;

const SAMPLE_CARDS: StudyCard[] = [
  {
    sessionCardId: 'sc-1',
    cardId: 'c-1',
    front: '姓',
    back: 'họ',
    example: null,
    imageUrl: null,
  },
  {
    sessionCardId: 'sc-2',
    cardId: 'c-2',
    front: '叫',
    back: 'gọi là',
    example: null,
    imageUrl: null,
  },
];

function setupSession(cards: StudyCard[] = SAMPLE_CARDS) {
  const recordAnswer = vi.fn();
  const completeSession = vi.fn().mockResolvedValue(undefined);

  useStudyStore.getState().initSession({
    sessionId: 'session-gravity-1',
    setId: 'set-1',
    mode: 'GRAVITY',
    cards,
    settings: {
      randomize: false,
      cardsPerRound: cards.length,
      requeueWrong: false,
      presentation: 'multiple_choice',
      mcDirection: 'front_to_back',
    },
  });

  mockUseStudySession.mockImplementation(() => {
    const state = useStudyStore();
    return {
      ...state,
      recordAnswer,
      completeSession,
    } as unknown as ReturnType<typeof useStudySession>;
  });

  return { recordAnswer, completeSession };
}

describe('GravityMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStudyStore.getState().reset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders HUD (title, 5 hearts, score, combo, replay), rotating planet horizon, and initial falling meteor', () => {
    setupSession();
    renderWithLocale(<GravityMode setId="set-1" />);

    expect(screen.getByText('Bắn thiên thạch')).toBeInTheDocument();
    expect(screen.getByLabelText('5 mạng còn lại')).toBeInTheDocument();
    expect(screen.getByLabelText('Điểm: 0')).toBeInTheDocument();
    expect(screen.getByLabelText('Chuỗi đúng: 0')).toBeInTheDocument();
    const replayBtn = screen.getByRole('button', { name: /Chơi lại/i });
    expect(replayBtn).toBeInTheDocument();

    const spaceship = screen.getByTestId('gravity-spaceship');
    const initialSkin = Number(spaceship.getAttribute('data-ship-skin'));
    expect(initialSkin).toBeGreaterThanOrEqual(1);
    expect(initialSkin).toBeLessThanOrEqual(12);

    // Clicking Replay spawns a different random spaceship skin from the 12-ship fleet
    fireEvent.click(replayBtn);
    const nextSkin = Number(screen.getByTestId('gravity-spaceship').getAttribute('data-ship-skin'));
    expect(nextSkin).toBeGreaterThanOrEqual(1);
    expect(nextSkin).toBeLessThanOrEqual(12);
    expect(nextSkin).not.toBe(initialSkin);

    const meteor = screen.getByTestId('gravity-meteor');
    expect(meteor).toHaveTextContent('họ');
    expect(meteor).toHaveAttribute('data-hit-seq', '0');
  });

  it('shoots and shakes the meteor while typing without exploding, then explodes when pressing Enter', () => {
    setupSession();
    renderWithLocale(<GravityMode setId="set-1" />);

    const input = screen.getByPlaceholderText('Gõ đáp án để bắn thiên thạch…');

    expect(screen.getByTestId('gravity-spaceship')).toHaveAttribute('data-ship-shot-seq', '0');

    // Typing shoots chip-laser at the meteor, recoils the spaceship (`giật giật`), displays the typed text directly under the meteor, and shakes it
    fireEvent.change(input, { target: { value: '姓x' } });
    expect(screen.getByTestId('gravity-meteor')).toHaveAttribute('data-hit-seq', '1');
    expect(screen.getByTestId('gravity-spaceship')).toHaveAttribute('data-ship-shot-seq', '1');
    expect(screen.getByTestId('gravity-meteor-typed')).toHaveTextContent('姓x');

    // Backspace deletes the wrong character without firing an extra chip shot, showing exact match under the meteor
    fireEvent.change(input, { target: { value: '姓' } });

    const meteorBeforeEnter = screen.getByTestId('gravity-meteor');
    expect(meteorBeforeEnter).toHaveTextContent('họ');
    expect(meteorBeforeEnter).toHaveAttribute('data-hit-seq', '1');
    expect(meteorBeforeEnter).toHaveAttribute('data-primed', 'true');
    expect(screen.getByTestId('gravity-meteor-typed')).toHaveTextContent('姓');
    expect(screen.getByLabelText('Chuỗi đúng: 0')).toBeInTheDocument();

    // Pressing Enter triggers the explosion, recoils the spaceship again, increments score/combo, and spawns the next meteor
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(screen.getByTestId('gravity-spaceship')).toHaveAttribute('data-ship-shot-seq', '2');
    expect(screen.getByLabelText('Chuỗi đúng: 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Điểm: 16')).toBeInTheDocument();

    // Feedback pill shows front = back
    expect(screen.getByText('=')).toBeInTheDocument();
    // Next card's meteor spawned immediately
    expect(screen.getByTestId('gravity-meteor')).toHaveTextContent('gọi là');
  });

  it('reveals hint on active meteor and shows feedback pill when clicking Hint button', () => {
    setupSession();
    renderWithLocale(<GravityMode setId="set-1" />);

    const hintBtn = screen.getByRole('button', { name: /Gợi ý/i });
    fireEvent.click(hintBtn);

    expect(screen.getByTestId('gravity-meteor')).toHaveTextContent('💡 姓');
    expect(screen.getByText('=')).toBeInTheDocument();
  });

  it('switches meteor prompt side when toggling direction (汉 / A -> A → B)', () => {
    setupSession();
    renderWithLocale(<GravityMode setId="set-1" />);

    expect(screen.getByTestId('gravity-meteor')).toHaveTextContent('họ');

    const dirBtn = screen.getByRole('button', { name: '汉 / A' });
    fireEvent.click(dirBtn);

    expect(screen.getByRole('button', { name: 'A → B' })).toBeInTheDocument();
    expect(screen.getByTestId('gravity-meteor')).toHaveTextContent('姓');
  });

  it('transitions to SessionComplete after typing and pressing Enter on all cards in a single-round session', () => {
    const { recordAnswer } = setupSession([SAMPLE_CARDS[0]!]);
    renderWithLocale(<GravityMode setId="set-1" />);

    const input = screen.getByPlaceholderText('Gõ đáp án để bắn thiên thạch…');
    fireEvent.change(input, { target: { value: '姓' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(recordAnswer).toHaveBeenCalledWith('c-1', true);
    expect(screen.getByText('Hoàn thành phiên học!')).toBeInTheDocument();
  });

  it('keeps a hinted card marked as missed after the wave restarts', () => {
    const { recordAnswer } = setupSession([SAMPLE_CARDS[0]!]);
    renderWithLocale(<GravityMode setId="set-1" />);

    fireEvent.click(screen.getByRole('button', { name: /Gợi ý/i }));
    // Switching direction restarts the wave with a fresh, un-hinted meteor
    fireEvent.click(screen.getByRole('button', { name: '汉 / A' }));
    expect(screen.getByTestId('gravity-meteor')).not.toHaveTextContent('💡');

    const input = screen.getByPlaceholderText('Gõ đáp án để bắn thiên thạch…');
    fireEvent.change(input, { target: { value: 'họ' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(recordAnswer).toHaveBeenCalledTimes(1);
    expect(recordAnswer).toHaveBeenCalledWith('c-1', false);
  });

  it('records each card once, when it is first destroyed', () => {
    const { recordAnswer } = setupSession();
    renderWithLocale(<GravityMode setId="set-1" />);

    const input = screen.getByPlaceholderText('Gõ đáp án để bắn thiên thạch…');
    fireEvent.change(input, { target: { value: '姓' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(recordAnswer).toHaveBeenCalledWith('c-1', true);

    // Replaying the wave does not record the same card again
    fireEvent.click(screen.getByRole('button', { name: /Chơi lại/i }));
    fireEvent.change(input, { target: { value: '姓' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(recordAnswer).toHaveBeenCalledTimes(1);
  });

  it('does not prime or fire on an unfinished answer', () => {
    setupSession([{ ...SAMPLE_CARDS[0]!, front: 'học sinh viên', back: 'student' }]);
    renderWithLocale(<GravityMode setId="set-1" />);

    const input = screen.getByPlaceholderText('Gõ đáp án để bắn thiên thạch…');
    fireEvent.change(input, { target: { value: 'học sinh' } });
    expect(screen.getByTestId('gravity-meteor')).toHaveAttribute('data-primed', 'false');

    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(screen.getByTestId('gravity-meteor')).toHaveTextContent('student');
    expect(screen.getByLabelText('Điểm: 0')).toBeInTheDocument();
  });

  it('leaves keystrokes in other text fields alone', () => {
    setupSession();
    renderWithLocale(<GravityMode setId="set-1" />);

    const otherField = document.createElement('textarea');
    document.body.appendChild(otherField);
    otherField.focus();
    fireEvent.keyDown(otherField, { key: 'h', code: 'KeyH' });

    expect(document.activeElement).toBe(otherField);
    otherField.remove();
  });

  it('allows selecting speed multipliers (x1, x1.25, x1.5, x1.75, x2) and scales earned score by the selected multiplier', () => {
    setupSession();
    renderWithLocale(<GravityMode setId="set-1" />);

    expect(screen.getByTestId('gravity-speed-1')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('gravity-speed-1.25')).toBeInTheDocument();
    expect(screen.getByTestId('gravity-speed-1.5')).toBeInTheDocument();
    expect(screen.getByTestId('gravity-speed-1.75')).toBeInTheDocument();

    const speed2Btn = screen.getByTestId('gravity-speed-2');
    fireEvent.click(speed2Btn);
    expect(speed2Btn).toHaveAttribute('aria-pressed', 'true');

    const input = screen.getByPlaceholderText('Gõ đáp án để bắn thiên thạch…');
    fireEvent.change(input, { target: { value: '姓' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // Base score at progress=0, combo=1 is 16 -> with x2 speed multiplier = 32
    expect(screen.getByLabelText('Điểm: 32')).toBeInTheDocument();
  });
});
