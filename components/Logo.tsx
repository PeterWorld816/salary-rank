export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="App logo"
    >
      {/* Eyes */}
      <circle cx="11" cy="13" r="1.5" fill="#00C805" />
      <circle cx="21" cy="13" r="1.5" fill="#00C805" />
      {/* Smile + rising arrow — one continuous path */}
      <path
        d="M 7 21 Q 16 27 25 21 L 29 11"
        stroke="#00C805"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Arrowhead */}
      <path
        d="M 23 9 L 29 11 L 27 17"
        stroke="#00C805"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
