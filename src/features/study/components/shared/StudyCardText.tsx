import { cn } from '@/lib/utils';

type StudyCardTextProps = {
  text: string;
  side?: 'front' | 'back';
  className?: string;
};

function isMultiline(text: string): boolean {
  return text.includes('\n');
}

export function StudyCardText({ text, side = 'front', className }: StudyCardTextProps) {
  const multiline = isMultiline(text);

  if (side === 'front') {
    return (
      <p
        className={cn(
          'whitespace-pre-line',
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
        'whitespace-pre-line',
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
