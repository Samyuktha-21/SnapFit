interface Props {
  className?: string;
}

// SnapFit mark: a person framed inside camera focus-brackets.
// Meaning: scan your body in frame, get your fit. Monochrome, inherits color.
export default function Logo({ className = 'h-6 w-6' }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Viewfinder corner brackets */}
      <path d="M4 8.5V6a2 2 0 0 1 2-2h2.5" />
      <path d="M15.5 4H18a2 2 0 0 1 2 2v2.5" />
      <path d="M20 15.5V18a2 2 0 0 1-2 2h-2.5" />
      <path d="M8.5 20H6a2 2 0 0 1-2-2v-2.5" />
      {/* Figure: head + shoulders */}
      <circle cx="12" cy="10" r="2.1" />
      <path d="M8.4 16.6c0-2.1 1.7-3.4 3.6-3.4s3.6 1.3 3.6 3.4" />
    </svg>
  );
}
