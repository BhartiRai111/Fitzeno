import { gymProfile } from "@/lib/data/gym";

export function StatsBar() {
  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-8">
        {gymProfile.stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="font-display text-2xl font-bold tabular text-foreground sm:text-3xl">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
