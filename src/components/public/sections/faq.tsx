import { SectionHeading } from "@/components/shared/section-heading";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { faqs } from "@/lib/data/testimonials";

export function Faq() {
  return (
    <section id="faq" className="bg-muted/30 py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="FAQ" title="Questions, answered." align="center" />
        <Accordion type="single" collapsible className="mt-10">
          {faqs.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
