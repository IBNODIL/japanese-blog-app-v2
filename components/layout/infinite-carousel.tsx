"use client";

import { ReactNode } from "react";
import "./carousel-animation.css";

interface InfiniteCarouselProps {
  children: ReactNode;
  speed?: "slow" | "normal" | "fast";
}

/**
 * Infinite Horizontal Scrolling Carousel
 *
 * IMPORTANT: Children must be duplicated in your parent component!
 * 
 * Example usage:
 * items.map((item) => <Card key={`${item.id}-1`}>{item.name}</Card>)
 * items.map((item) => <Card key={`${item.id}-2`}>{item.name}</Card>)
 */
export function InfiniteCarousel({ children, speed = "normal" }: InfiniteCarouselProps) {
  const speedClass = speed === "slow" ? "carousel-animate-slow" : 
                     speed === "fast" ? "carousel-animate-fast" : 
                     "carousel-animate";

  return (
    <div className="overflow-hidden w-full">
      <div className={`flex gap-6 ${speedClass}`}>
        {children}
      </div>
    </div>
  );
}
