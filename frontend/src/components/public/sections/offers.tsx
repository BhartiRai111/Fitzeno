import { Tag, ArrowRight } from "lucide-react";
import Link from "next/link";
import { SectionHeading } from "@/components/shared/section-heading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { offers } from "@/lib/data/testimonials";

export function Offers() {
  return (
    <section id="offers" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Offers" title="Current promotions" align="center" />
      <div className="mx-auto mt-12 grid max-w-4xl gap-5 sm:grid-cols-2">
        {offers.map((offer) => (
          <Card
            key={offer.id}
            className="relative overflow-hidden p-6 bg-gradient-to-br from-primary/5 to-transparent"
          >
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <Tag className="size-4" />
              </div>
              <Badge variant="primary">{offer.discount}</Badge>
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
              {offer.title}
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{offer.description}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Code: <span className="font-mono font-medium text-foreground">{offer.code}</span>
              </span>
              <span>Valid until {new Date(offer.validUntil).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
            <Button asChild variant="ghost" size="sm" className="mt-3 -ml-2">
              <Link href={`/register?offer=${offer.code}`}>
                Claim offer
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
}
