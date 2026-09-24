import { TODAY, getNextOccurrenceDate, formatOccurrence } from "@/lib/booking-helpers";
import { gymClasses } from "@/lib/data/classes";
import type { Lead, LeadStatus, LeadSource, LeadLostReason } from "@/lib/data/types";

export { TODAY };

export const LEAD_SOURCES: LeadSource[] = ["Website", "Instagram", "Referral", "Walk-in", "Advertisement"];

export const LEAD_LOST_REASONS: LeadLostReason[] = [
  "No response",
  "Not interested",
  "Price",
  "Chose another gym",
  "Bad timing",
  "Other",
];

export const FUNNEL_STAGES: { status: LeadStatus; label: string }[] = [
  { status: "new", label: "New" },
  { status: "contacted", label: "Contacted" },
  { status: "trial-booked", label: "Trial Booked" },
  { status: "trial-attended", label: "Trial Attended" },
  { status: "converted", label: "Converted" },
];

/** A lead is still "in play" — not yet won or definitively lost. */
export function isActiveLead(lead: Lead): boolean {
  return lead.status !== "converted" && lead.status !== "lost";
}

export function isFollowUpDue(lead: Lead, today: string = TODAY): boolean {
  return isActiveLead(lead) && !!lead.nextFollowUp && lead.nextFollowUp <= today;
}

export function isFollowUpOverdue(lead: Lead, today: string = TODAY): boolean {
  return isActiveLead(lead) && !!lead.nextFollowUp && lead.nextFollowUp < today;
}

export interface TrialClassOption {
  id: string;
  label: string;
  nextDate: string;
}

/** Bookable classes a trial could be scheduled into, each with its computed next occurrence. */
export function getTrialClassOptions(today: string = TODAY): TrialClassOption[] {
  return gymClasses
    .map((c) => ({
      id: c.id,
      label: `${c.name} · ${formatOccurrence(c.day, today)}, ${c.startTime}`,
      nextDate: getNextOccurrenceDate(c.day, today),
    }))
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate));
}

export function getClassLabel(classId?: string): string | null {
  if (!classId) return null;
  const c = gymClasses.find((cls) => cls.id === classId);
  return c ? `${c.name} (${c.day} ${c.startTime})` : null;
}

export interface LeadStats {
  total: number;
  active: number;
  newCount: number;
  followUpsDue: number;
  followUpsOverdue: number;
  upcomingTrials: number;
  converted: number;
  lost: number;
  conversionRate: number;
}

export function getLeadStats(leads: Lead[], today: string = TODAY): LeadStats {
  const converted = leads.filter((l) => l.status === "converted");
  const lost = leads.filter((l) => l.status === "lost");
  return {
    total: leads.length,
    active: leads.filter(isActiveLead).length,
    newCount: leads.filter((l) => l.status === "new").length,
    followUpsDue: leads.filter((l) => isFollowUpDue(l, today)).length,
    followUpsOverdue: leads.filter((l) => isFollowUpOverdue(l, today)).length,
    upcomingTrials: leads.filter((l) => l.status === "trial-booked" && l.trialDate && l.trialDate >= today).length,
    converted: converted.length,
    lost: lost.length,
    conversionRate: leads.length > 0 ? Math.round((converted.length / leads.length) * 100) : 0,
  };
}

export interface SourcePerformance {
  source: LeadSource;
  total: number;
  converted: number;
  rate: number;
}

export function getSourcePerformance(leads: Lead[]): SourcePerformance[] {
  return LEAD_SOURCES.map((source) => {
    const fromSource = leads.filter((l) => l.source === source);
    const converted = fromSource.filter((l) => l.status === "converted").length;
    return {
      source,
      total: fromSource.length,
      converted,
      rate: fromSource.length > 0 ? Math.round((converted / fromSource.length) * 100) : 0,
    };
  })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total);
}

export interface StaffWorkload {
  assignee: string;
  activeLeads: number;
  followUpsDue: number;
  converted: number;
}

export function getStaffWorkload(leads: Lead[], today: string = TODAY): StaffWorkload[] {
  const assignees = Array.from(new Set(leads.map((l) => l.assignedTo)));
  return assignees
    .map((assignee) => {
      const mine = leads.filter((l) => l.assignedTo === assignee);
      return {
        assignee,
        activeLeads: mine.filter(isActiveLead).length,
        followUpsDue: mine.filter((l) => isFollowUpDue(l, today)).length,
        converted: mine.filter((l) => l.status === "converted").length,
      };
    })
    .sort((a, b) => b.activeLeads - a.activeLeads);
}

/** Of leads who ever had a trial scheduled, what share went on to convert. */
export function getTrialConversionRate(leads: Lead[]): { rate: number; everTrialed: number; converted: number } {
  const everTrialed = leads.filter((l) => !!l.trialClassId || l.status === "trial-booked" || l.status === "trial-attended");
  const converted = everTrialed.filter((l) => l.status === "converted").length;
  return {
    rate: everTrialed.length > 0 ? Math.round((converted / everTrialed.length) * 100) : 0,
    everTrialed: everTrialed.length,
    converted,
  };
}
