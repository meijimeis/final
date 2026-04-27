"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import AnalyticsHeader from "@/components/analytics/AnalyticsHeader";
import { AnalyticsDataProvider } from "@/components/analytics/AnalyticsDataProvider";
import PerformanceOverview from "@/components/analytics/PerformanceOverview";
import RouteEfficiencyChart from "@/components/analytics/RouteEfficiencyChart";
import ParcelDemand from "@/components/analytics/ParcelDemand";
import RiderPerformance from "@/components/analytics/RiderPerformance";
import CostBreakdown from "@/components/analytics/CostBreakdown";
import ProfitabilityByRegion from "@/components/analytics/ProfitabilityByRegion";
import RiskAlerts from "@/components/analytics/RiskAlerts";

export default function AnalyticsPage() {
  return (
    <DashboardLayout>
      <AnalyticsDataProvider>
      {/* PAGE HEADER */}
      <div className="grid grid-cols-3 gap-6 mb-4 items-center">
        <h1 className="text-2xl font-bold text-gray-900 col-span-2 lg:col-span-2">
          Analytics
        </h1>

        <div className="col-span-1">
          <div className="flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
          <AnalyticsHeader />
        </div>
        </div>
      </div>

      {/* ANALYTICS GRID */}
      <div className="space-y-6">
        {/* TOP ROW - KEY METRICS (3 COLUMNS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* LEFT - PERFORMANCE */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <PerformanceOverview />
          </div>

          {/* CENTER - ROUTE EFFICIENCY */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <RouteEfficiencyChart />
          </div>

          {/* RIGHT - PARCEL DEMAND */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <ParcelDemand />
          </div>
        </div>

        {/* MIDDLE ROW - DETAILED METRICS (3 COLUMNS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* LEFT - RIDER PERFORMANCE */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <RiderPerformance />
          </div>

          {/* CENTER - COST BREAKDOWN */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <CostBreakdown />
          </div>

          {/* RIGHT - PROFITABILITY */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <ProfitabilityByRegion />
          </div>
        </div>

        {/* BOTTOM - ALERTS & WARNINGS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <RiskAlerts />
        </div>
      </div>
      </AnalyticsDataProvider>
    </DashboardLayout>
  );
}