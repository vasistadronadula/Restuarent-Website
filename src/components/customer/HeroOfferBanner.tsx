'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Copy, Pause, Play, TicketPercent } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { toast } from 'sonner';

import { useCoupons } from '@/lib/queries';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import styles from './RestaurantHero.module.css';

export const OFFER_SLIDE_MS = 5000;

/** All live offers, in the cover's reading flow. Selection survives live list edits. */
export default function HeroOfferBanner() {
  const { data: coupons = [] } = useCoupons();
  const user = useAuthStore((state) => state.user);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const reducedMotion = useReducedMotion();
  const offers = useMemo(() => coupons
    .filter((coupon) => coupon.isActive && coupon.discount > 0)
    .sort((a, b) => b.discount - a.discount || a.code.localeCompare(b.code)), [coupons]);
  const activeIndex = Math.max(0, offers.findIndex((coupon) => coupon.code === selectedCode));
  const offer = offers[activeIndex];

  useEffect(() => {
    const syncVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', syncVisibility);
    return () => document.removeEventListener('visibilitychange', syncVisibility);
  }, []);

  useEffect(() => {
    if (offers.length < 2 || paused || hovered || focused || hidden || reducedMotion) return;
    const timer = window.setTimeout(() => {
      setSelectedCode(offers[(activeIndex + 1) % offers.length].code);
    }, OFFER_SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [offers, activeIndex, paused, hovered, focused, hidden, reducedMotion]);

  useEffect(() => {
    if (!copiedCode) return;
    const timer = window.setTimeout(() => setCopiedCode(null), 2400);
    return () => window.clearTimeout(timer);
  }, [copiedCode]);

  if (!offer) return null;

  const copied = copiedCode === offer.code;
  const terms = [
    offer.maxDiscount > 0 ? `Save up to ${formatCurrency(offer.maxDiscount)}` : null,
    offer.minOrder > 0 ? `Min. order ${formatCurrency(offer.minOrder)}` : 'No minimum order',
    !user ? 'Sign in to redeem' : null,
  ].filter(Boolean).join(' · ');

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(offer.code);
      setCopiedCode(offer.code);
      toast.success(`${offer.code} copied — ${user ? 'apply it in your cart' : 'sign in to redeem'}`);
    } catch {
      toast.error(`Could not copy. Use code ${offer.code} in your cart.`);
    }
  };

  return (
    <div
      className={styles.offer}
      role="region"
      aria-roledescription="carousel"
      aria-label="Discount offers"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
    >
      <div className={styles.offerViewport}>
      <div key={offer.code} className={styles.offerSlide} role="group" aria-roledescription="slide" aria-label={`Offer ${activeIndex + 1} of ${offers.length}`}>
      <button
        type="button"
        onClick={copyCode}
        className={styles.offerButton}
        aria-label={`Copy code ${offer.code} for ${offer.discount}% off. ${terms}`}
      >
        <span className={styles.offerDiscount}>
          <TicketPercent size={17} aria-hidden="true" />
          {offer.discount}% OFF
        </span>
        <span className={styles.offerCode}>{offer.code}</span>
        <span className={styles.offerCopy}>
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy'}
        </span>
      </button>
      <p className={styles.offerTerms}>{terms}</p>
      </div>
      </div>
      {offers.length > 1 && (
        <div className={styles.offerControls}>
          <button type="button" aria-label="Previous offer" onClick={() => setSelectedCode(offers[(activeIndex - 1 + offers.length) % offers.length].code)}>
            <ChevronLeft size={15} aria-hidden="true" />
          </button>
          <span className="tabular-nums">{activeIndex + 1} / {offers.length}</span>
          <button type="button" aria-label="Next offer" onClick={() => setSelectedCode(offers[(activeIndex + 1) % offers.length].code)}>
            <ChevronRight size={15} aria-hidden="true" />
          </button>
          {!reducedMotion && (
            <button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? 'Play offer slideshow' : 'Pause offer slideshow'} aria-pressed={paused}>
              {paused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
