import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import PageHeader from "@/components/reusables";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAvailability,
  getInterviewerAppointments,
  getInterviewerStats,
  getWithdrawalHistory,
} from "@/actions/dashboard";
import AvailabilitySection from "./components/AvailabilitySection";
import AppointmentsSection from "./components/AppointmentsSection";
import EarningsSection from "./components/EarningsSection";
import DashboardControls from "./components/DashboardControls";
import { ClipboardList, Clock, Wallet } from "lucide-react";
import { getCurrentUser } from "@/actions/user";

export default async function InterviewerDashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/");

  const dbUser = await getCurrentUser();

  const [availability, appointments, stats, withdrawalHistory] =
    await Promise.all([
      getAvailability(),
      getInterviewerAppointments(),
      getInterviewerStats(),
      getWithdrawalHistory(),
    ]);

  return (
    <main className="min-h-screen bg-black">
      {/* Page header */}
      <PageHeader
        label="Interviewer dashboard"
        gray="Welcome back,"
        gold={dbUser.name?.split(" ")[0] ?? "Interviewer"}
        description={
          dbUser.title && dbUser.company
            ? `${dbUser.title} · ${dbUser.company}`
            : undefined
        }
        right={
          <div>
            <p className="text-xs text-stone-600 border-b border-white/10 pb-1 mb-1">Credit balance</p>
            <p className="font-serif text-3xl leading-none bg-linear-to-br from-amber-300 to-amber-500 bg-clip-text text-transparent text-right">
              {stats?.creditBalance ?? 0}
            </p>
          </div>
        }
      />

      <DashboardControls
        appointments={appointments}
        availability={availability}
        stats={stats}
        withdrawalHistory={withdrawalHistory}
      />
    </main>
  );
}
