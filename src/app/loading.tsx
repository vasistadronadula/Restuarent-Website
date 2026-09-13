export default function Loading() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-1 w-full overflow-hidden bg-transparent">
      <div className="h-full w-full bg-gradient-to-r from-amber-400 via-brand to-amber-500 animate-pulse" />
    </div>
  );
}
