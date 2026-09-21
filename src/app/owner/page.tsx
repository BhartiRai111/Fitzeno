import Link from "next/link";
import {
  Wallet,
  Users,
  UserPlus,
  QrCode,
  Plus,
  ArrowRight,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RevenueChart } from "@/components/dashboard/charts/revenue-chart";
import {
  MembershipStatusBadge,
  PaymentStatusBadge,
} from "@/components/shared/status-badge";
import { members } from "@/lib/data/members";
import { leads } from "@/lib/data/leads";
import { payments, revenueByMonth } from "@/lib/data/payments";
import { gymClasses } from "@/lib/data/classes";
import { trainers } from "@/lib/data/trainers";
import { formatCurrency, formatDate } from "@/lib/utils-data";

export default function OwnerOverviewPage() {
  const revenueThisMonth = revenueByMonth[revenueByMonth.length - 1].revenue;
  const revenueLastMonth = revenueByMonth[revenueByMonth.length - 2].revenue;
  const revenueTrend = (((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100).toFixed(1);

  const activeMembers = members.filter((m) => m.status === "active").length;
  const expiringMembers = members.filter((m) => m.status === "expiring");
  const inactiveMembers = members.filter((m) => m.status === "expired" || m.status === "frozen");
  const newLeadsThisWeek = leads.filter((l) => new Date(l.createdOn) >= new Date("2026-09-14"));
  const outstandingPayments = payments.filter((p) => p.status === "pending" || p.status === "failed");

  const todaysClasses = gymClasses.filter((c) => c.day === "Mon");

  const funnelStages: { label: string; count: number }[] = [
    { label: "New", count: leads.filter((l) => l.status === "new").length },
    { label: "Contacted", count: leads.filter((l) => l.status === "contacted").length },
    { label: "Trial Booked", count: leads.filter((l) => l.status === "trial-booked").length },
    { label: "Trial Attended", count: leads.filter((l) => l.status === "trial-attended").length },
    { label: "Converted", count: leads.filter((l) => l.status === "converted").length },
  ];
  const funnelMax = Math.max(...funnelStages.map((s) => s.count), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Good morning, Sam"
        description="Here's how Fitzeno is doing today, Monday Sep 21."
        actions={
          <>
            <Button variant="outline" size="sm">
              <UserPlus className="size-4" />
              Add Lead
            </Button>
            <Button size="sm">
              <Plus className="size-4" />
              Add Member
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue (MTD)"
          value={formatCurrency(revenueThisMonth)}
          icon={Wallet}
          trend={{ value: `${revenueTrend}%`, direction: Number(revenueTrend) >= 0 ? "up" : "down" }}
          helpText="vs last month"
        />
        <StatCard
          label="Active Members"
          value={activeMembers.toString()}
          icon={Users}
          trend={{ value: "+4.2%", direction: "up" }}
          helpText="vs last month"
        />
        <StatCard
          label="New Leads"
          value={newLeadsThisWeek.length.toString()}
          icon={UserPlus}
          helpText="in the last 7 days"
        />
        <StatCard
          label="Check-ins Today"
          value="86"
          icon={QrCode}
          trend={{ value: "+12", direction: "up" }}
          helpText="vs this time yesterday"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Revenue trend</CardTitle>
              <CardDescription>Last 6 months</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/owner/reports">
                Full report
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <RevenueChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Expiring soon</CardTitle>
            <Badge variant="warning">{expiringMembers.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-1">
            {expiringMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">{member.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{member.name}</p>
                    <p className="text-xs text-muted-foreground">Expires {formatDate(member.expiresOn)}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  Remind
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="mt-1 w-full" asChild>
              <Link href="/owner/members">
                View all members
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s schedule</CardTitle>
            <CardDescription>Monday, September 21</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {todaysClasses.map((gymClass) => {
              const trainer = trainers.find((t) => t.id === gymClass.trainerId);
              return (
                <div
                  key={gymClass.id}
                  className="flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <div className="flex w-16 shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Clock className="size-3.5" />
                    {gymClass.startTime}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{gymClass.name}</p>
                    <p className="truncate text-xs text-muted-foreground">with {trainer?.name}</p>
                  </div>
                  <Badge variant={gymClass.booked >= gymClass.capacity ? "danger" : "default"}>
                    {gymClass.booked}/{gymClass.capacity}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead funnel</CardTitle>
            <CardDescription>This month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnelStages.map((stage) => (
              <div key={stage.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{stage.label}</span>
                  <span className="font-medium tabular text-foreground">{stage.count}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(stage.count / funnelMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full" asChild>
              <Link href="/owner/leads">
                View leads &amp; enquiries
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Needs attention</CardTitle>
          <CardDescription>Inactive members and outstanding payments</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="inactive">
            <TabsList>
              <TabsTrigger value="inactive">Inactive Members ({inactiveMembers.length})</TabsTrigger>
              <TabsTrigger value="payments">Outstanding Payments ({outstandingPayments.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="inactive">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 font-medium">Member</th>
                      <th className="py-2 font-medium">Plan</th>
                      <th className="py-2 font-medium">Status</th>
                      <th className="py-2 font-medium">Last check-in</th>
                      <th className="py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {inactiveMembers.map((member) => (
                      <tr key={member.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-8">
                              <AvatarFallback className="text-xs">{member.initials}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">{member.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-muted-foreground">{member.plan}</td>
                        <td className="py-2.5"><MembershipStatusBadge status={member.status} /></td>
                        <td className="py-2.5 text-muted-foreground">{formatDate(member.lastCheckIn)}</td>
                        <td className="py-2.5 text-right">
                          <Button size="sm" variant="ghost">Send win-back offer</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            <TabsContent value="payments">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 font-medium">Member</th>
                      <th className="py-2 font-medium">Amount</th>
                      <th className="py-2 font-medium">Plan</th>
                      <th className="py-2 font-medium">Status</th>
                      <th className="py-2 font-medium">Date</th>
                      <th className="py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {outstandingPayments.map((payment) => (
                      <tr key={payment.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-8">
                              <AvatarFallback className="text-xs">{payment.memberInitials}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">{payment.memberName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 tabular text-foreground">{formatCurrency(payment.amount)}</td>
                        <td className="py-2.5 text-muted-foreground">{payment.plan}</td>
                        <td className="py-2.5"><PaymentStatusBadge status={payment.status} /></td>
                        <td className="py-2.5 text-muted-foreground">{formatDate(payment.date)}</td>
                        <td className="py-2.5 text-right">
                          <Button size="sm" variant="ghost">Send reminder</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
