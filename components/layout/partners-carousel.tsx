"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import "./carousel-animation.css";

interface Partner {
  id: string;
  name: string;
  image: string;
  text: string | null;
  link: string | null;
}

interface PartnerTranslations {
  ourPartners: string;
  partnersDescription: string;
}

interface PartnersCarouselProps {
  translations: PartnerTranslations;
}

export function PartnersCarousel({ translations }: PartnersCarouselProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPartners() {
      try {
        const res = await fetch("/api/partners");
        if (!res.ok) {
          throw new Error("Failed to fetch partners");
        }
        const data = await res.json();
        setPartners(data);
      } catch (error) {
        console.error("Failed to fetch partners:", error);
        setPartners([]);
      } finally {
        setLoading(false);
      }
    }

    fetchPartners();
  }, []);

  if (loading) {
    return (
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  if (partners.length === 0) {
    return null;
  }

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {translations.ourPartners}
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            {translations.partnersDescription}
          </p>
        </div>

        {/* Carousel Container - overflow-hidden clips the animation */}
        <div className="overflow-hidden rounded-lg">
          {/* Carousel Track - CSS animation applied here */}
          <div className="flex gap-6 carousel-animate">
            
            {/* First Set - Original items */}
            {partners.map((partner) => (
              <a
                key={`${partner.id}-original`}
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
                <h3 className="font-semibold text-center text-foreground text-sm line-clamp-2">
                  {partner.name}
                </h3>
                {partner.text && (
                  <p className="text-xs text-muted-foreground text-center mt-2 line-clamp-2">
                    {partner.text}
                  </p>
                )}
              </a>
            ))}

            {/* Second Set - Duplicate items for seamless loop */}
            {partners.map((partner) => (
              <a
                key={`${partner.id}-duplicate`}
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
                <h3 className="font-semibold text-center text-foreground text-sm line-clamp-2">
                  {partner.name}
                </h3>
                {partner.text && (
                  <p className="text-xs text-muted-foreground text-center mt-2 line-clamp-2">
                    {partner.text}
                  </p>
                )}
              </a>
            ))}

          </div>
        </div>
      </div>
    </section>
  );
}
