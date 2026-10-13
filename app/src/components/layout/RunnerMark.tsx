interface RunnerMarkProps {
  className?: string;
}

export function RunnerMark({ className }: RunnerMarkProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" aria-hidden className={className}>
      <g stroke="#ff6b4a" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="40.5" cy="12.25" r="4.75" fill="#ff6b4a" stroke="none" />
        <path d="M37.5 19.5 31 34.5" />
        <path d="M31 34.5l10.5 6-0.5 12.5" />
        <path d="M31 34.5l-7.5 8-9 5" />
      </g>
      <g stroke="#ff6b4a" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M37 22.5l8.5 6.5-2.5 8" />
        <path d="M37 22.5l-9.5 7-6.5-4" />
      </g>
      <g stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
        <path d="M7 23h9" strokeOpacity="0.9" className="runner-mark__speed" />
        <path d="M2.5 32.5h11" strokeOpacity="0.6" className="runner-mark__speed" />
        <path d="M7.5 42h8.5" strokeOpacity="0.35" className="runner-mark__speed" />
      </g>
    </svg>
  );
}
