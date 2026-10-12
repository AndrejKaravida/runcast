import { Pause, Play, SkipBack, SkipForward, Square } from 'lucide-react';
import { AppButton } from '@/components/ui/AppButton';
import type { GuidedPhase } from '@/components/guided/useGuidedClock';

interface GuidedControlsProps {
  phase: GuidedPhase;
  muted: boolean;
  canGoBack: boolean;
  onTogglePause: () => void;
  onNext: () => void;
  onBack: () => void;
  onFinish: () => void;
  onToggleMute: () => void;
}

export function GuidedControls({
  phase,
  muted,
  canGoBack,
  onTogglePause,
  onNext,
  onBack,
  onFinish,
  onToggleMute,
}: GuidedControlsProps) {
  const paused = phase === 'paused';
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <AppButton data-testid="guided-pause" className="flex-1" onClick={onTogglePause}>
          {paused ? (
            <>
              <Play className="h-4 w-4" aria-hidden /> Nastavi
            </>
          ) : (
            <>
              <Pause className="h-4 w-4" aria-hidden /> Pauza
            </>
          )}
        </AppButton>
        <AppButton
          data-testid="guided-mute"
          variant="secondary"
          aria-pressed={muted}
          onClick={onToggleMute}
          className="flex-1"
        >
          {muted ? 'Zvuk isključen' : 'Zvuk uključen'}
        </AppButton>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <AppButton data-testid="guided-back" variant="secondary" disabled={!canGoBack} onClick={onBack}>
          <SkipBack className="h-4 w-4" aria-hidden /> Nazad
        </AppButton>
        <AppButton data-testid="guided-next" variant="secondary" onClick={onNext}>
          Dalje <SkipForward className="h-4 w-4" aria-hidden />
        </AppButton>
        <AppButton data-testid="guided-finish" variant="ghost" onClick={onFinish}>
          <Square className="h-4 w-4" aria-hidden /> Završi
        </AppButton>
      </div>
    </div>
  );
}
