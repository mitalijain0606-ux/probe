interface ProbeLogoProps {
  className?: string;
}

export function ProbeLogo({ className }: ProbeLogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M2 13h4.5l2-6 3.5 12 2.5-9 1.5 3H22"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
