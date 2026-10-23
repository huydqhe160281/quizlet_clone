import { cn } from '@/lib/utils';

type StudyCardTextProps = {
  text: string;
  side?: 'front' | 'back';
  className?: string;
};

/** Past this length a single line no longer fits the big display type on a phone card. */
const DENSE_TEXT_LENGTH = 60;

/** Multi-line or long text: render small, left-aligned and scrollable instead of display-size. */
export function isDenseStudyText(text: string): boolean {
  return text.includes('\n') || text.length > DENSE_TEXT_LENGTH;
}

export function StudyCardText({ text, side = 'front', className }: StudyCardTextProps) {
  const multiline = isDenseStudyText(text);

  if (side === 'front') {
    return (
      <p
        className={cn(
          'whitespace-pre-line break-words',
          multiline
            ? 'w-full text-left text-sm font-semibold leading-relaxed md:text-base'
            : 'text-center text-3xl font-extrabold tracking-tight md:text-4xl',
          className
        )}
      >
        {text}
      </p>
    );
  }

  return (
    <p
      className={cn(
        'whitespace-pre-line break-words',
        multiline
          ? 'w-full text-left text-sm font-medium leading-relaxed md:text-base'
          : 'text-center text-xl font-medium leading-relaxed md:text-2xl',
        className
      )}
    >
      {text}
    </p>
  );
}
