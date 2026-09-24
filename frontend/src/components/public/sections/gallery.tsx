import { Dumbbell, Users, Flame, HeartPulse, Trophy, Waves } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";

interface GalleryTile {
  caption: string;
  icon: LucideIcon;
  gradient: string;
}

const tiles: GalleryTile[] = [
  {
    caption: "Strength floor, early session",
    icon: Dumbbell,
    gradient: "from-brand-indigo-500 to-brand-indigo-800",
  },
  {
    caption: "Saturday group conditioning",
    icon: Flame,
    gradient: "from-brand-lime-400/70 to-brand-lime-600/40",
  },
  {
    caption: "Coached warm-up",
    icon: Users,
    gradient: "from-brand-indigo-200 to-brand-indigo-400 dark:from-brand-indigo-800 dark:to-brand-indigo-600",
  },
  {
    caption: "Studio A — mobility session",
    icon: HeartPulse,
    gradient: "from-brand-indigo-100 to-brand-lime-400/40 dark:from-brand-indigo-900 dark:to-brand-indigo-700",
  },
  {
    caption: "Recovery lounge",
    icon: Waves,
    gradient: "from-brand-indigo-300 to-brand-indigo-600 dark:from-brand-indigo-700 dark:to-brand-indigo-900",
  },
  {
    caption: "Member PB on the platform",
    icon: Trophy,
    gradient: "from-brand-lime-500/60 to-brand-indigo-300/40 dark:to-brand-indigo-700/60",
  },
];

export function Gallery() {
  return (
    <section id="gallery" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Inside Fitzeno"
        title="A look at the club."
        description="A few moments from a normal week on the floor — no stock photography, just the club as it actually looks."
        align="center"
      />
      <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div
              key={tile.caption}
              className={`group relative aspect-square overflow-hidden rounded-xl bg-gradient-to-br sm:aspect-[4/3] ${tile.gradient}`}
            >
              <Icon className="absolute -bottom-3 -right-3 size-20 text-white/15 transition-transform duration-300 group-hover:scale-110" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-3 pt-8">
                <p className="text-xs font-medium text-white sm:text-sm">{tile.caption}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
