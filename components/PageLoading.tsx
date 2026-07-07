import Spinner from "@/components/Spinner";

export default function PageLoading() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Spinner className="w-8 h-8 border-[3px] border-border-strong border-t-accent" />
    </div>
  );
}
