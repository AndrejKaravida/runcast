import { Dumbbell, Flag, Footprints, Gauge, Moon, Route, Timer, Zap } from 'lucide-react';

interface WorkoutTypeIconProps {
  type: string;
  className?: string;
  strokeWidth?: number;
}

export function WorkoutTypeIcon({ type, className, strokeWidth = 2 }: WorkoutTypeIconProps) {
  const props = { className, strokeWidth, 'aria-hidden': true } as const;
  switch (type) {
    case 'LONG':
      return <Route {...props} />;
    case 'TEMPO':
      return <Gauge {...props} />;
    case 'INTERVALS':
      return <Timer {...props} />;
    case 'REPETITIONS':
      return <Zap {...props} />;
    case 'STRENGTH':
      return <Dumbbell {...props} />;
    case 'REST':
      return <Moon {...props} />;
    case 'RACE':
      return <Flag {...props} />;
    default:
      return <Footprints {...props} />;
  }
}
