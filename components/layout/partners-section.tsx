"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

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

interface ParnersSectionProps {
  translations: PartnerTranslations;
}

export function PartnersSection({ translations }: ParnersSectionProps) {
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

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            <div className="col-span-full flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            partners.map((partner) => (
            <a
              key={partner.id}
              href={partner.link || "#"}
              target={partner.link ? "_blank" : undefined}
              rel={partner.link ? "noopener noreferrer" : undefined}
              className="flex flex-col items-center justify-center p-8 bg-card rounded-lg border border-border hover:border-primary/50 hover:shadow-lg transition-all"
            >
              <img 
                src={partner.image} 
                alt={partner.name}
                className="h-16 w-16 mb-4 object-contain"
              />
              <h3 className="font-semibold text-center text-foreground">
                {partner.name}
              </h3>
            </a>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
