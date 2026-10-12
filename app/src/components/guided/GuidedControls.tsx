import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { AppButton } from '@/components/ui/AppButton';
import type { GuidedPhase } from '@/components/guided/useGuidedClock';

interface GuidedControlsProps {
  phase: GuidedPhase;
  canGoBack: boolean;
  onTogglePause: () => void;
  onNext: () => void;
  onBack: () => void;
}

export function GuidedControls({ phase, canGoBack, onTogglePause, onNext, onBack }: GuidedControlsProps) {
  const paused = phase === 'paused';
  return (
    <div className="space-y-2">
      <AppButton data-testid="guided-pause" size="lg" className="w-full" onClick={onTogglePause}>
        {paused ? (
          <>
            <Play className="h-5 w-5" aria-hidden /> Nastavi
          </>
        ) : (
          <>
            <Pause className="h-5 w-5" aria-hidden /> Pauza
          </>
        )}
      </AppButton>
      <div className="flex items-center gap-2">
        <AppButton
          data-testid="guided-back"
          variant="secondary"
          className="flex-1"
          disabled={!canGoBack}
          onClick={onBack}
        >
          <SkipBack className="h-4 w-4" aria-hidden /> Nazad
        </AppButton>
        <AppButton data-testid="guided-next" variant="secondary" className="flex-1" onClick={onNext}>
          Dalje <SkipForward className="h-4 w-4" aria-hidden />
        </AppButton>
      </div>
    </div>
  );
}
