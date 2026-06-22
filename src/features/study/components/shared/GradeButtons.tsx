import { Button } from '@/components/ui/button';

type GradeButtonsProps = {
  onAgain: () => void;
  onHard: () => void;
  onGood: () => void;
  onEasy: () => void;
};

export function GradeButtons({ onAgain, onHard, onGood, onEasy }: GradeButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Button variant="destructive" onClick={onAgain}>
        Again
      </Button>
      <Button variant="outline" onClick={onHard}>
        Hard
      </Button>
      <Button variant="secondary" onClick={onGood}>
        Good
      </Button>
      <Button onClick={onEasy}>Easy</Button>
    </div>
  );
}
