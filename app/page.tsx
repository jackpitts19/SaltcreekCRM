import React from "react";
import { prisma } from "@/lib/db";
import TopBar from "@/components/layout/TopBar";
import AiChatBox from "@/components/home/AiChatBox";
import TaskCompleteButton from "@/components/home/TaskCompleteButton";
import MotivationalQuote from "@/components/home/MotivationalQuote";
import Link from "next/link";
import {
  CheckCircle2,
  TrendingUp,
  Clock,
  Mail,
  Phone,
  StickyNote,
  ArrowRightLeft,
  UserPlus,
  CalendarDays,
  PhoneForwarded,
  Mic,
  Users,
  BarChart2,
  PlusCircle,
} from "lucide-react";
import { formatCurrency, formatRelativeTime, getDealStage } from "@/lib/utils";

async function getHomeData() {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [user, todayTasks, overdueTasks, activeDeals, recentActivities, totalContacts, pipelineAgg, emailsThisWeek] = await Promise.all([
    prisma.user.findFirst({ orderBy: { createdAt: "asc" } }),
    prisma.task.findMany({
      where: { status: "pending", dueDate: { gte: startOfDay, lte: endOfDay } },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        deal: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
    }),
    prisma.task.findMany({
      where: { status: "pending", dueDate: { lt: startOfDay } },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        deal: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.deal.findMany({
      where: { stage: { notIn: ["closed_won", "closed_lost"] } },
      include: {
        company: { select: { id: true, name: true } },
        contacts: {
          include: { contact: { select: { id: true, firstName: true, lastName: true } } },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
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
    prisma.contact.count({ where: { status: { not: "inactive" } } }),
    prisma.deal.aggregate({
      where: { stage: { notIn: ["closed_won", "closed_lost"] } },
      _sum: { value: true },
      _count: true,
    }),
    prisma.emailLog.count({ where: { direction: "outbound", sentAt: { gte: startOfWeek } } }),
  ]);

  return { user, todayTasks, overdueTasks, activeDeals, recentActivities, totalContacts, pipelineAgg, emailsThisWeek };
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
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

const activityIconColor: Record<string, string> = {
  email: "text-blue-500 bg-blue-50",
  call: "text-green-600 bg-green-50",
  note: "text-amber-500 bg-amber-50",
  deal_created: "text-emerald-600 bg-emerald-50",
  deal_stage_change: "text-violet-500 bg-violet-50",
  contact_created: "text-indigo-500 bg-indigo-50",
  meeting: "text-rose-500 bg-rose-50",
};

export default async function HomePage() {
  const { user, todayTasks, overdueTasks, activeDeals, recentActivities, totalContacts, pipelineAgg, emailsThisWeek } =
    await getHomeData();

  const greeting = getGreeting();
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const focusTasks = [...overdueTasks, ...todayTasks].slice(0, 8);

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="" />

      <div className="flex-1 px-8 py-8 max-w-6xl mx-auto w-full space-y-6">
        {/* Greeting + Quote */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
          <div className="lg:col-span-2">
            <h1 className="text-3xl font-semibold text-slate-900">
              {greeting}, {firstName}.
            </h1>
            <p className="text-slate-500 mt-1 text-sm">{dateStr}</p>
          </div>
          <MotivationalQuote />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/deals" className="relative overflow-hidden bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-md transition-all group">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-400 rounded-t-xl" />
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pipeline Value</p>
              <div className="w-8 h-8 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                <TrendingUp size={14} className="text-blue-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {pipelineAgg._sum.value
                ? `$${(pipelineAgg._sum.value / 1_000_000).toFixed(1)}M`
                : "—"}
            </p>
            <p className="text-xs text-slate-400 mt-1">{pipelineAgg._count} open deal{pipelineAgg._count !== 1 ? "s" : ""}</p>
          </Link>
          <Link href="/contacts" className="relative overflow-hidden bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-md transition-all group">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-400 rounded-t-xl" />
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Active Contacts</p>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                <Users size={14} className="text-indigo-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{totalContacts}</p>
            <p className="text-xs text-slate-400 mt-1">in your network</p>
          </Link>
          <Link href="/tasks" className="relative overflow-hidden bg-white rounded-xl border border-slate-200 p-4 hover:border-amber-300 hover:shadow-md transition-all group">
            <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-xl ${todayTasks.length + overdueTasks.length > 0 ? "bg-gradient-to-r from-amber-500 to-orange-400" : "bg-gradient-to-r from-slate-300 to-slate-200"}`} />
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tasks Due</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${todayTasks.length + overdueTasks.length > 0 ? "bg-amber-50 group-hover:bg-amber-100" : "bg-slate-50"} transition-colors`}>
                <Clock size={14} className={todayTasks.length + overdueTasks.length > 0 ? "text-amber-500" : "text-slate-400"} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${todayTasks.length + overdueTasks.length > 0 ? "text-amber-600" : "text-slate-900"}`}>
              {todayTasks.length + overdueTasks.length}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : "all on track"}
            </p>
          </Link>
          <Link href="/emails" className="relative overflow-hidden bg-white rounded-xl border border-slate-200 p-4 hover:border-emerald-300 hover:shadow-md transition-all group">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-green-400 rounded-t-xl" />
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Emails Sent</p>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                <Mail size={14} className="text-emerald-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{emailsThisWeek}</p>
            <p className="text-xs text-slate-400 mt-1">this week</p>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/calls/dialer"
            className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl transition-all shadow-md hover:shadow-lg"
          >
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <PhoneForwarded size={17} />
            </div>
            <div>
              <p className="font-semibold text-sm">Start Dialing</p>
              <p className="text-blue-200 text-xs">Power dialer</p>
            </div>
          </Link>
          <Link
            href="/meetings/record"
            className="flex items-center gap-3 p-4 bg-gradient-to-br from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white rounded-xl transition-all shadow-md hover:shadow-lg"
          >
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <Mic size={17} />
            </div>
            <div>
              <p className="font-semibold text-sm">Record Meeting</p>
              <p className="text-violet-200 text-xs">AI transcription</p>
            </div>
          </Link>
          <Link
            href="/contacts?new=1"
            className="flex items-center gap-3 p-4 bg-white hover:bg-slate-50 text-slate-800 rounded-xl transition-all shadow-sm hover:shadow-md border border-slate-200 hover:border-slate-300"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <UserPlus size={17} className="text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">New Contact</p>
              <p className="text-slate-400 text-xs">Add to CRM</p>
            </div>
          </Link>
          <Link
            href="/deals?new=1"
            className="flex items-center gap-3 p-4 bg-white hover:bg-slate-50 text-slate-800 rounded-xl transition-all shadow-sm hover:shadow-md border border-slate-200 hover:border-slate-300"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <PlusCircle size={17} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">New Deal</p>
              <p className="text-slate-400 text-xs">Add to pipeline</p>
            </div>
          </Link>
        </div>

        {/* AI Chat */}
        <AiChatBox />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Focus + Pipeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Focus */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">Today's Focus</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {todayTasks.length} due today
                    {overdueTasks.length > 0 ? `, ${overdueTasks.length} overdue` : ""}
                  </p>
                </div>
                <Link
                  href="/tasks"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  All tasks →
                </Link>
              </div>

              {focusTasks.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 size={28} className="text-green-400 mx-auto mb-2" />
                  <p className="text-slate-600 text-sm font-medium">You're all caught up!</p>
                  <p className="text-slate-400 text-xs mt-1">No tasks due today</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {focusTasks.map((task: any) => {
                    const isOverdue =
                      task.dueDate &&
                      new Date(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
                    return (
                      <div key={task.id} className="flex items-start gap-3 px-5 py-3.5">
                        <TaskCompleteButton taskId={task.id} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">{task.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {task.contact && (
                              <Link
                                href={`/contacts/${task.contact.id}`}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                {task.contact.firstName} {task.contact.lastName}
                              </Link>
                            )}
                            {task.company && !task.contact && (
                              <Link
                                href={`/companies/${task.company.id}`}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                {task.company.name}
                              </Link>
                            )}
                            {task.deal && (
                              <Link
                                href={`/deals/${task.deal.id}`}
                                className="text-xs text-slate-400 hover:underline"
                              >
                                {task.deal.name}
                              </Link>
                            )}
                            {isOverdue && task.dueDate && (
                              <span className="text-xs text-red-500 font-medium">
                                Overdue ·{" "}
                                {new Date(task.dueDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                            task.priority === "high"
                              ? "bg-red-50 text-red-600"
                              : task.priority === "medium"
                              ? "bg-yellow-50 text-yellow-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active Pipeline */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">Active Pipeline</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Most recently updated</p>
                </div>
                <Link
                  href="/deals"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View pipeline →
                </Link>
              </div>

              {activeDeals.length === 0 ? (
                <div className="py-12 text-center">
                  <TrendingUp size={28} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No active deals</p>
                  <Link
                    href="/deals"
                    className="mt-1 inline-block text-sm text-blue-600 hover:underline"
                  >
                    Add your first deal
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {activeDeals.map((deal: any) => {
                    const stage = getDealStage(deal.stage);
                    const primaryContact = deal.contacts?.[0]?.contact;
                    return (
                      <Link
                        key={deal.id}
                        href={`/deals/${deal.id}`}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {deal.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {deal.company?.name ?? "No company"}
                            {primaryContact &&
                              ` · ${primaryContact.firstName} ${primaryContact.lastName}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {deal.value != null && (
                            <span className="text-sm font-semibold text-slate-700">
                              {formatCurrency(deal.value)}
                            </span>
                          )}
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: stage.color + "20",
                              color: stage.color,
                            }}
                          >
                            {stage.label}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Activity Feed */}
          <div>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden sticky top-6">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Recent Activity</h3>
                <p className="text-sm text-slate-500 mt-0.5">Latest across all records</p>
              </div>

              {recentActivities.length === 0 ? (
                <div className="py-10 text-center">
                  <Clock size={24} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No activity yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {recentActivities.map((activity: any) => {
                    const activityHref = activity.contact
                      ? `/contacts/${activity.contact.id}`
                      : activity.deal
                      ? `/deals/${activity.deal.id}`
                      : activity.company
                      ? `/companies/${activity.company.id}`
                      : null;
                    const iconColor = activityIconColor[activity.type] ?? "text-slate-500 bg-slate-100";
                    const content = (
                      <>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${iconColor}`}>
                          {React.createElement(
                            activityIconMap[activity.type] ?? Clock,
                            { size: 11 }
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700 leading-snug">
                            {activity.description}
                          </p>
                          {(activity.contact || activity.company || activity.deal) && (
                            <p className="text-xs text-slate-400 mt-0.5 truncate">
                              {activity.contact
                                ? `${activity.contact.firstName} ${activity.contact.lastName}`
                                : activity.deal?.name ?? activity.company?.name}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 mt-0.5">
                            {formatRelativeTime(activity.createdAt)}
                          </p>
                        </div>
                      </>
                    );
                    return activityHref ? (
                      <Link key={activity.id} href={activityHref} className="px-5 py-3 flex gap-3 hover:bg-slate-50 transition-colors">
                        {content}
                      </Link>
                    ) : (
                      <div key={activity.id} className="px-5 py-3 flex gap-3">
                        {content}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
