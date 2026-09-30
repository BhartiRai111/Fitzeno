"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateMembershipPlan, useUpdateMembershipPlan } from "@/hooks/use-membership-plans";
import { ApiError, NetworkError } from "@/lib/api/types";
import type { MembershipPlan } from "@/lib/data/types";

interface PlanDialogProps {
  plan?: MembershipPlan;
  trigger?: React.ReactNode;
}

export function PlanDialog({ plan, trigger }: PlanDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [billingPeriod, setBillingPeriod] = React.useState<"month" | "year">(plan?.billingPeriod ?? "month");
  const createPlan = useCreateMembershipPlan();
  const updatePlan = useUpdateMembershipPlan();
  const isEdit = !!plan;
  const submitting = createPlan.isPending || updatePlan.isPending;

  React.useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBillingPeriod(plan?.billingPeriod ?? "month");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input = {
      name: String(formData.get("name") ?? "").trim(),
      price: Number(formData.get("price") ?? 0),
      billingPeriod: billingPeriod === "year" ? ("YEAR" as const) : ("MONTH" as const),
      description: String(formData.get("description") ?? "").trim() || undefined,
      perks: String(formData.get("perks") ?? "")
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean),
    };

    try {
      if (isEdit) {
        await updatePlan.mutateAsync({ id: plan.id, input });
      } else {
        await createPlan.mutateAsync(input);
      }
      setOpen(false);
      toast.success(isEdit ? "Plan updated" : "Plan created");
    } catch (err) {
      toast.error(
        err instanceof ApiError || err instanceof NetworkError
          ? err.message
          : `Couldn't ${isEdit ? "update" : "create"} this plan. Please try again.`
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="size-4" />
            Create Plan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit plan" : "Create a membership plan"}</DialogTitle>
          <DialogDescription>
            {isEdit ? `Update pricing and perks for ${plan?.name}.` : "Set up a new plan for members to choose from."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="plan-name">Plan name</Label>
              <Input id="plan-name" name="name" defaultValue={plan?.name} placeholder="Growth" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-price">Price (£)</Label>
              <Input id="plan-price" name="price" type="number" min="0" defaultValue={plan?.price} placeholder="69" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Billing period</Label>
            <Select value={billingPeriod} onValueChange={(v) => setBillingPeriod(v as "month" | "year")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-description">Description</Label>
            <Textarea
              id="plan-description"
              name="description"
              defaultValue={plan?.description}
              placeholder="Full access plus unlimited classes."
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-perks">Perks (one per line)</Label>
            <Textarea
              id="plan-perks"
              name="perks"
              defaultValue={plan?.perks.join("\n")}
              placeholder={"Unlimited classes\nPriority booking"}
              rows={4}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save Changes" : "Create Plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
