/**
 * flyToCart.ts — the dish visibly travels to the cart.
 *
 * With the floating cart bar gone, adding something has to be legible on its
 * own. A toast alone doesn't do it: it appears in a corner unrelated to either
 * the button that was tapped or the cart the item went into, so nothing tells
 * you *where* the thing you just added now lives. Sending a small copy of the
 * dish photo from the button to the cart icon answers that question in the one
 * way that needs no reading, which is why every large delivery app does it.
 *
 * Implementation notes that matter:
 *
 * · The flyer is a plain DOM node appended to <body> and animated with the Web
 *   Animations API, not a React element. It exists for 700ms and has no state
 *   worth reconciling; routing it through React would re-render the whole menu
 *   grid twice per tap for a purely decorative node.
 *
 * · The path is a two-keyframe arc, not a straight line. A linear tween across
 *   a long diagonal reads as a glitch; lifting the midpoint and easing out
 *   reads as a throw. `offset` places that midpoint above the straight line
 *   between the two points.
 *
 * · The cart target is looked up at flight time by attribute rather than held
 *   in a ref. Two different elements are the cart depending on viewport — the
 *   navbar icon on desktop, the bottom-nav tab on phones — and both mount and
 *   unmount as the layout changes. Querying when the animation starts always
 *   finds whichever one is actually on screen.
 *
 * · `prefers-reduced-motion` skips the flight entirely. Something crossing the
 *   screen is exactly the kind of motion that setting exists to suppress.
 */

/** Marks whatever element currently represents the cart. */
export const CART_TARGET_ATTR = 'data-cart-target';

const FLIGHT_MS = 700;
const BUMP_MS = 400;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * The visible cart icon, or null when none is mounted.
 *
 * When both the navbar and the bottom nav are present the last one in document
 * order wins, which is the bottom nav — correct, because that is the one on
 * screen at the phone widths where both exist in the DOM.
 */
function findCartTarget(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(`[${CART_TARGET_ATTR}]`)
  ).filter((el) => {
    const rect = el.getBoundingClientRect();
    // A hidden nav still occupies the DOM; a zero box means it isn't the one
    // the customer can see, and flying to it would send the dish off-screen.
    return rect.width > 0 && rect.height > 0;
  });
  return candidates[candidates.length - 1] ?? null;
}

/** A short squash on the cart icon, so the arrival lands rather than stops. */
export function bumpCartTarget() {
  const target = findCartTarget();
  if (!target || prefersReducedMotion()) return;

  target.animate(
    [
      { transform: 'scale(1)' },
      { transform: 'scale(1.28)', offset: 0.4 },
      { transform: 'scale(0.94)', offset: 0.7 },
      { transform: 'scale(1)' },
    ],
    { duration: BUMP_MS, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
  );
}

export interface FlyToCartOptions {
  /** The button or card that was activated — the flight's origin. */
  source: HTMLElement | null | undefined;
  /** Dish photo. Falls back to a filled dot when missing or broken. */
  imageUrl?: string;
}

/**
 * Sends a copy of the dish to the cart icon. Safe to call from anywhere: it
 * no-ops when there is no source, no target, or no motion budget.
 */
export function flyToCart({ source, imageUrl }: FlyToCartOptions) {
  if (typeof document === 'undefined') return;
  if (prefersReducedMotion()) {
    bumpCartTarget();
    return;
  }

  const target = findCartTarget();
  if (!source || !target) return;

  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (from.width === 0 || to.width === 0) return;

  const startX = from.left + from.width / 2;
  const startY = from.top + from.height / 2;
  const endX = to.left + to.width / 2;
  const endY = to.top + to.height / 2;

  const SIZE = 52;

  const flyer = document.createElement('div');
  flyer.setAttribute('aria-hidden', 'true');
  Object.assign(flyer.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: `${SIZE}px`,
    height: `${SIZE}px`,
    borderRadius: '50%',
    overflow: 'hidden',
    // Above the sticky navbar (z-40) so it stays visible for the whole
    // flight, but never interactive — a node under the cursor mid-flight
    // would swallow the next tap.
    zIndex: '100',
    pointerEvents: 'none',
    boxShadow: '0 10px 28px rgba(0,0,0,0.28)',
    background: 'var(--primary, #C62828)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    willChange: 'transform, opacity',
    contain: 'paint',
  });

  if (imageUrl) flyer.style.backgroundImage = `url("${imageUrl}")`;

  document.body.appendChild(flyer);

  // Translate from the origin rather than setting left/top: transform is
  // composited, so the flight never triggers layout on the list behind it.
  const offset = -SIZE / 2;
  const dx = endX - startX;
  const dy = endY - startY;

  // The apex sits above the straight line, and higher for longer throws —
  // a fixed lift looks like an arc across the page and like a twitch across
  // a card.
  const lift = Math.min(160, Math.max(60, Math.abs(dx) * 0.35 + Math.abs(dy) * 0.15));

  const animation = flyer.animate(
    [
      {
        transform: `translate(${startX + offset}px, ${startY + offset}px) scale(1)`,
        opacity: 1,
      },
      {
        transform: `translate(${startX + dx / 2 + offset}px, ${startY + dy / 2 - lift + offset}px) scale(0.78)`,
        opacity: 1,
        offset: 0.55,
      },
      {
        transform: `translate(${endX + offset}px, ${endY + offset}px) scale(0.22)`,
        opacity: 0.35,
      },
    ],
    {
      duration: FLIGHT_MS,
      easing: 'cubic-bezier(0.35, 0.05, 0.25, 1)',
      fill: 'forwards',
    }
  );

  const cleanup = () => {
    flyer.remove();
    bumpCartTarget();
  };

  animation.addEventListener('finish', cleanup, { once: true });
  // A navigation mid-flight cancels the animation without firing `finish`,
  // which would leave the node parked on the page forever.
  animation.addEventListener('cancel', () => flyer.remove(), { once: true });
}
