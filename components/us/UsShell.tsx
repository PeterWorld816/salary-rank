// Shared dark/neon page shell for the whole /us section — deliberately not
// using the light-theme `bg-bg` tokens from app/globals.css so this section
// can look completely different from /quiz and /result without touching them.
export default function UsShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen font-sans text-white"
      style={{ background: "linear-gradient(160deg, #08090A 0%, #101316 55%, #08090A 100%)" }}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-48 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(52,211,153,0.10) 0%, transparent 70%)" }}
        />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
