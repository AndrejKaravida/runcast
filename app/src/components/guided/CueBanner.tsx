interface CueBannerProps {
  text: string;
}

export function CueBanner({ text }: CueBannerProps) {
  return (
    <p
      data-testid="guided-cue"
      role="status"
      aria-live="polite"
      className="min-h-11 rounded-full border border-border bg-surface-elevated/80 px-4 py-2.5 text-center text-sm font-medium backdrop-blur-xl"
    >
      {text}
    </p>
  );
}
