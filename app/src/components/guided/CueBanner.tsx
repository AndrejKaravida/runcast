interface CueBannerProps {
  text: string;
}

export function CueBanner({ text }: CueBannerProps) {
  return (
    <p
      data-testid="guided-cue"
      role="status"
      aria-live="polite"
      className="min-h-11 rounded-xl bg-surface-elevated px-3 py-2 text-center text-sm font-medium"
    >
      {text}
    </p>
  );
}
