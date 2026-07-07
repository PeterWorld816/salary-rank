export default function Spinner({
  className = "w-5 h-5 border-2 border-border-strong border-t-text",
}: {
  className?: string;
}) {
  return <span className={`inline-block rounded-full animate-spin ${className}`} />;
}
