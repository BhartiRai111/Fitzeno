import { Hero } from "@/components/public/sections/hero";
import { StatsBar } from "@/components/public/sections/stats-bar";
import { About } from "@/components/public/sections/about";
import { Facilities } from "@/components/public/sections/facilities";
import { Gallery } from "@/components/public/sections/gallery";
import { PlansTeaser } from "@/components/public/sections/plans-teaser";
import { ClassesTeaser } from "@/components/public/sections/classes-teaser";
import { TrainersTeaser } from "@/components/public/sections/trainers-teaser";
import { Testimonials } from "@/components/public/sections/testimonials";
import { Offers } from "@/components/public/sections/offers";
import { Faq } from "@/components/public/sections/faq";
import { FinalCta } from "@/components/public/sections/final-cta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <StatsBar />
      <About />
      <Facilities />
      <Gallery />
      <PlansTeaser />
      <ClassesTeaser />
      <TrainersTeaser />
      <Testimonials />
      <Offers />
      <Faq />
      <FinalCta />
    </>
  );
}
