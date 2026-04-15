"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Wallet, ClipboardList, Clock, ChevronDown, Tag } from "lucide-react";
import EarningsSection from "./EarningsSection";
import AppointmentsSection from "./AppointmentsSection";
import AvailabilitySection from "./AvailabilitySection";

export default function DashboardControls({
  appointments,
  availability,
  stats,
  withdrawalHistory,
}) {
  const [activeTab, setActiveTab] = useState("earnings");
  const [isOpen, setIsOpen] = useState(false);

  const tabs = [
    {
      id: "earnings",
      label: "Earnings",
      icon: <Wallet size={16} className="text-amber-400" />,
      component: <EarningsSection stats={stats} history={withdrawalHistory} />,
    },
    {
      id: "appointments",
      label: "Appointments",
      icon: <ClipboardList size={18} className="text-amber-400" />,
      component: <AppointmentsSection appointments={appointments} />,
    },
    {
      id: "availability",
      label: "Availability",
      icon: <Clock size={18} className="text-amber-400" />,
      component: <AvailabilitySection initial={availability} />,
    },
  ];

  const currentTab = tabs.find((t) => t.id === activeTab);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Mobile Dropdown */}
        <div className="sm:hidden mb-6 relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between bg-[#0f0f11] border border-white/10 rounded-xl px-5 py-4 text-stone-200"
          >
            <div className="flex items-center gap-3">
              {currentTab.icon}
              <span className="font-medium">{currentTab.label}</span>
            </div>
            <ChevronDown
              size={18}
              className={`text-stone-500 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-[#0f0f11] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors ${
                    activeTab === tab.id
                      ? "bg-amber-400/10 text-amber-400"
                      : "text-stone-400 hover:bg-white/5"
                  }`}
                >
                  {tab.icon}
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Tabs */}
        <TabsList className="hidden sm:flex bg-[#0f0f11] border border-white/10 mb-8 w-full h-auto p-1.5 gap-1">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex-1 py-4 text-sm gap-2"
            >
              {tab.icon}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id}>
            {tab.component}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
