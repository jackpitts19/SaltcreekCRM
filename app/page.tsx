import React from "react";
import { prisma } from "@/lib/db";
import TopBar from "@/components/layout/TopBar";
import StatsCard from "@/components/ui/StatsCard";
import Card, { CardHeader } from "@/components/ui/Card";
import {
  Users,
  Building2,
  TrendingUp,
  DollarSign,
  Mail,
  Phone,
  Clock,
  StickyNote,
  ArrowRightLeft,
  UserPlus,
  CalendarDays,
} from "lucide-react";
import { formatCurrency, formatRelativeTime, getDealStage, getDealType } from "@/lib/utils";
import Link from "next/link";

async function getDashboardData() {
  const [
    contactCount,
    companyCount,
    dealCount,
    deals,
    recentActivities,
    emailCount,
    callCount,
    openDealsValue,
  ] = await Promise.all([
    prisma.contact.count(),
    prisma.company.count(),
    prisma.deal.count({ where: { stage: { notIn: ["closed_won", "closed_lost"] } } }),
    prisma.deal.findMany({
      where: { stage: { notIn: ["closed_won", "closed_lost"] } },
      include: {
        company: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.activity.findMany({
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        deal: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.emailLog.count(),
    prisma.callLog.count(),
    prisma.deal.aggregate({
      where: { stage: { notIn: ["closed_won", "closed_lost"] } },
      _sum: { value: true },
    }),
  ]);

  return {
    contactCount,
    companyCount,
    dealCount,
    deals,
    recentActivities,
    emailCount,
    callCount,
    pipelineValue: openDealsValue._sum.value ?? 0,
  };
}

const activityIconMap: Record<string, React.ElementType> = {
  email: Mail,
  call: Phone,
  note: StickyNote,
  deal_created: TrendingUp,
  deal_stage_change: ArrowRightLeft,
  contact_created: UserPlus,
  meeting: CalendarDays,
};

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Dashboard" subtitle={`Good morning · ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`} />

      <div className="flex-1 p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Contacts" value={data.contactCount.toLocaleString()} icon={Users} iconColor="text-blue-600" subtitle="Total tracked" />
          <StatsCard title="Companies" value={data.companyCount.toLocaleString()} icon={Building2} iconColor="text-indigo-600" subtitle="Tracked accounts" />
          <StatsCard title="Open Deals" value={data.dealCount.toLocaleString()} icon={TrendingUp} iconColor="text-orange-600" subtitle="Active pipeline" />
          <StatsCard title="Pipeline Value" value={formatCurrency(data.pipelineValue)} icon={DollarSign} iconColor="text-emerald-600" subtitle="Open deal total" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline */}
          <div className="lg:col-span-2">
            <Card padding={false}>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">Active Pipeline</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Most recently updated</p>
                </div>
                <Link href="/deals" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View all →
                </Link>
              </div>

              {data.deals.length === 0 ? (
                <div className="py-12 text-center">
                  <TrendingUp size={32} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No deals yet</p>
                  <Link href="/deals" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
                    Add your first deal
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.deals.map((deal: any) => {
                    const stage = getDealStage(deal.stage);
                    const type = getDealType(deal.dealType);
                    return (
                      <Link key={deal.id} href={`/deals/${deal.id}`}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{deal.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {deal.company?.name ?? "No company"} · {type.label}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-sm font-semibold text-slate-700">
                            {formatCurrency(deal.value)}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: stage.color + "20", color: stage.color }}>
                            {stage.label}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Activity Feed */}
          <div>
            <Card padding={false}>
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Recent Activity</h3>
                <p className="text-sm text-slate-500 mt-0.5">Latest across all records</p>
              </div>
              {data.recentActivities.length === 0 ? (
                <div className="py-8 text-center">
                  <Clock size={24} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No activity yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                  {data.recentActivities.map((activity: any) => (
                    <div key={activity.id} className="px-5 py-3 flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {React.createElement(activityIconMap[activity.type] ?? Clock, { size: 12, className: "text-slate-500" })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 leading-snug">{activity.description}</p>
                        {(activity.contact || activity.company || activity.deal) && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            {activity.contact
                              ? `${activity.contact.firstName} ${activity.contact.lastName}`
                              : activity.company?.name ?? activity.deal?.name}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-0.5">{formatRelativeTime(activity.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Quick Actions + Comms Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Communications" subtitle="All logged interactions" />
            <div className="flex gap-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50">
                  <Mail size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{data.emailCount}</p>
                  <p className="text-xs text-slate-500">Emails logged</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-50">
                  <Phone size={18} className="text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{data.callCount}</p>
                  <p className="text-xs text-slate-500">Calls logged</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Quick Actions" subtitle="Jump to key tasks" />
            <div className="grid grid-cols-3 gap-2">
              {[
                { href: "/contacts", label: "Add Contact", icon: Users, bg: "bg-blue-50 hover:bg-blue-100", iconColor: "text-blue-600", textColor: "text-blue-800" },
                { href: "/companies", label: "Add Company", icon: Building2, bg: "bg-indigo-50 hover:bg-indigo-100", iconColor: "text-indigo-600", textColor: "text-indigo-800" },
                { href: "/deals", label: "New Deal", icon: TrendingUp, bg: "bg-orange-50 hover:bg-orange-100", iconColor: "text-orange-600", textColor: "text-orange-800" },
                { href: "/emails", label: "Log Email", icon: Mail, bg: "bg-sky-50 hover:bg-sky-100", iconColor: "text-sky-600", textColor: "text-sky-800" },
                { href: "/calls", label: "Log Call", icon: Phone, bg: "bg-green-50 hover:bg-green-100", iconColor: "text-green-600", textColor: "text-green-800" },
                { href: "/sequences", label: "Sequences", icon: ArrowRightLeft, bg: "bg-purple-50 hover:bg-purple-100", iconColor: "text-purple-600", textColor: "text-purple-800" },
              ].map((action: any) => (
                <Link key={action.href} href={action.href}
                  className={`flex flex-col items-center gap-2 px-3 py-3.5 rounded-xl text-center transition-colors ${action.bg}`}>
                  <action.icon size={18} className={action.iconColor} />
                  <span className={`text-xs font-medium ${action.textColor}`}>{action.label}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
