import { BrandScreen } from '@/components/customer/BrandScreen';

export default function Loading() {
  return (
    <BrandScreen title="Setting your table…" message="One moment while we prepare everything for you.">
      <span aria-hidden className="bg-brand/70 size-3 animate-ping rounded-full" />
      <span className="sr-only" role="status">Loading</span>
    </BrandScreen>
  );
}
