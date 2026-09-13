'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight, Clock3, MapPin, Sparkles, Star, UtensilsCrossed } from 'lucide-react';

import { restaurantInfo } from '@/data/restaurantInfo';
import { Container } from './Container';
import HeroOfferBanner from './HeroOfferBanner';
import styles from './RestaurantHero.module.css';

interface Props {
  rating: { average: number; reviews: number } | null;
}

const CUISINES = ['Telangana', 'Andhra', 'Hyderabadi'];
const COVER_IMAGE = 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1200&q=85';

function HeroFoodPortrait() {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className={styles.portrait}>
      <div className={styles.portraitOutline} aria-hidden="true" />
      <figure className={styles.photo}>
        <Image
          src={imageFailed ? '/hyderabad-hero.jpg' : COVER_IMAGE}
          alt="A bowl of fragrant biryani with long-grain rice and aromatic spices"
          fill
          sizes="(max-width: 639px) 90vw, (max-width: 1023px) 70vw, 540px"
          loading="eager"
          fetchPriority="high"
          onError={() => setImageFailed(true)}
          className={styles.photoImage}
        />
        <div className={styles.photoShade} aria-hidden="true" />
        <figcaption className={styles.photoCaption}>
          <span className={styles.photoEyebrow}>The heart of a good feast</span>
          <span className={styles.photoTitle}>Big flavour.<br />Every grain.</span>
          <span className={styles.photoFootnote}>Biryani &amp; so much more</span>
        </figcaption>
      </figure>
      <div className={styles.seal}>
        <Sparkles size={21} strokeWidth={1.5} aria-hidden="true" />
        <span>Telugu<br />at heart</span>
      </div>
      <div className={styles.photoLabel}>
        <UtensilsCrossed size={18} aria-hidden="true" />
        <span>Made for your<br /><strong>next craving.</strong></span>
      </div>
    </div>
  );
}

/** The same component serves both the home route and the menu landing page. */
export default function RestaurantHero({ rating }: Props) {
  return (
    <section className={styles.hero} aria-labelledby="restaurant-title">
      <Container className={styles.layout}>
        <div className={styles.intro}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowLine} aria-hidden="true" />
            A little spice. A lot of home.
          </div>

          <HeroOfferBanner />

          <h1 id="restaurant-title" className={styles.title}>
            <span>Pala Pitta</span>{' '}
            <span className={styles.titleLast}>Ruchulu<span className={styles.titleDot}>.</span></span>
          </h1>
          <p className={styles.tagline}>{restaurantInfo.tagline}.</p>
          <p className={styles.description}>
            From the spice of Telangana to the soul of Andhra and the richness of Hyderabad.
            Your favourite Telugu flavours, all at one table.
          </p>

          <div className={styles.actions}>
            <a href="#menu-section" className={styles.primaryAction}>
              Explore the menu <ArrowUpRight size={20} aria-hidden="true" />
            </a>
            <Link href="/contact" className={styles.secondaryAction}>
              <MapPin size={17} aria-hidden="true" /> Visit us
            </Link>
          </div>

          <div className={styles.cuisines} aria-label="Our cuisines">
            {CUISINES.map((cuisine, index) => (
              <span key={cuisine} className={styles.cuisine}>
                <span className={styles.cuisineNumber}>0{index + 1}</span>
                {cuisine}
              </span>
            ))}
          </div>
        </div>

        <HeroFoodPortrait />
      </Container>

      <div className={styles.detailsBar}>
        <Container className={styles.details}>
          {rating && (
            <div className={styles.detail}>
              <Star size={17} className={styles.ratingStar} aria-hidden="true" />
              <span><strong>{rating.average.toFixed(1)}</strong> dish rating
                {rating.reviews > 0 && <span className={styles.ratingCount}> · {rating.reviews.toLocaleString('en-IN')} reviews</span>}
              </span>
            </div>
          )}
          <div className={styles.detail}>
            <Clock3 size={17} aria-hidden="true" />
            <span>Every day <strong>{restaurantInfo.openingHours}</strong></span>
          </div>
          <div className={styles.detail}>
            <MapPin size={17} aria-hidden="true" />
            <span>{restaurantInfo.locality}, Hyderabad</span>
          </div>
          <a href="#menu-section" className={styles.scrollHint}>
            Find your favourite <ArrowDown size={16} aria-hidden="true" />
          </a>
        </Container>
      </div>
    </section>
  );
}
