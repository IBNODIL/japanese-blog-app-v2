"use client";

/**
 * MINIMAL EXAMPLE: Infinite Horizontal Scroll Animation
 * 
 * This shows how to attach pure CSS animation to an existing carousel layout
 * No external libraries - just CSS @keyframes and React
 */

import "./carousel-animation.css";

interface Partner {
  id: string;
  name: string;
  image: string;
  link?: string;
}

interface PartnersInfiniteScrollProps {
  partners: Partner[];
  speed?: "slow" | "normal" | "fast";
}

export function PartnersInfiniteScroll({
  partners,
  speed = "normal",
}: PartnersInfiniteScrollProps) {
  // Map speed to animation class
  const speedClass = 
    speed === "slow" ? "carousel-animate-slow" :
    speed === "fast" ? "carousel-animate-fast" :
    "carousel-animate";

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Our Partners
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Trusted organizations collaborating with us
          </p>
        </div>

        {/* Carousel Container - IMPORTANT: overflow-hidden clips the animation */}
        <div className="overflow-hidden rounded-lg">
          {/* Carousel Track - Apply animation class here */}
          <div className={`flex gap-6 ${speedClass}`}>
            
            {/* FIRST SET - Original items */}
            {partners.map((partner) => (
              <PartnerCard 
                key={`${partner.id}-original`}
                partner={partner}
              />
            ))}

            {/* SECOND SET - Duplicate items for seamless loop */}
            {partners.map((partner) => (
              <PartnerCard 
                key={`${partner.id}-duplicate`}
                partner={partner}
              />
            ))}

          </div>
        </div>

        {/* Optional: Info text */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Hover to pause • Infinite scroll • Smooth animation
        </p>
      </div>
    </section>
  );
}

/* Partner Card Component */
function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <a
      href={partner.link || "#"}
      target={partner.link ? "_blank" : undefined}
      rel={partner.link ? "noopener noreferrer" : undefined}
      className="flex-shrink-0 w-64 flex flex-col items-center justify-center p-8 bg-card rounded-lg border border-border hover:border-primary/50 hover:shadow-lg transition-all"
    >
      <img
        src={partner.image}
        alt={partner.name}
        className="h-20 w-20 mb-4 object-contain"
      />
      <h3 className="font-semibold text-center text-foreground">
        {partner.name}
      </h3>
    </a>
  );
}

export default PartnersInfiniteScroll;
