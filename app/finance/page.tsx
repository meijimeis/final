import DashboardLayout from "@/components/layout/DashboardLayout";
import { FinanceDataProvider } from "@/components/finance/FinanceDataProvider";

import FinanceHeader from "@/components/finance/FinanceHeader";
import FinanceOverview from "@/components/finance/FinanceOverview";
import CostBreakdown from "@/components/finance/CostBreakdown";
import RouteProfitAnalysis from "@/components/finance/RouteProfitAnalysis";
import RiderPayouts from "@/components/finance/RiderPayouts";
import RiderEarnings from "@/components/finance/RiderEarnings";
import FuelEfficiency from "@/components/finance/FuelEfficiency";
import Trends from "@/components/finance/Trends";
import BillingStatus from "@/components/finance/BillingStatus";

export default function FinancePage() {
  return (
    <DashboardLayout>
      <FinanceDataProvider>
          <div className="mb-4">
            <FinanceHeader />

            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
              {/* TOP LEFT - KEY METRICS */}
              <div className="col-span-12 xl:col-span-7">
                <div className="min-h-[300px] rounded-xl bg-white shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
                  <FinanceOverview />
                </div>
              </div>

              {/* TOP RIGHT - PROFIT TREND */}
              <div className="col-span-12 xl:col-span-5">
                <div className=" max-h-[300px] rounded-xl bg-white shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
                  <RouteProfitAnalysis />
                </div>
              </div>

              {/* MIDDLE LEFT - COST BREAKDOWN */}
              <div className="col-span-12 lg:col-span-6 xl:col-span-4">
                <div className="h-full rounded-xl bg-white shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
                  <CostBreakdown />
                </div>
              </div>

              {/* MIDDLE CENTER - RIDER PAYOUTS */}
              <div className="col-span-12 lg:col-span-6 xl:col-span-3">
                <div className="h-full rounded-xl bg-white shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
                  <RiderPayouts />
                </div>
              </div>

              {/* MIDDLE RIGHT - RIDER EARNINGS */}
              <div className="col-span-12 xl:col-span-5">
                <div className="h-full rounded-xl bg-white shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
                  <RiderEarnings />
                </div>
              </div>

              {/* BOTTOM LEFT */}
              <div className="col-span-12 xl:col-span-6 grid gap-4">
                <div className="rounded-xl bg-white shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
                  <FuelEfficiency />
                </div>

                <div className=" rounded-xl bg-white shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
                  <Trends />
                </div>
              </div>

              {/* BOTTOM RIGHT */}
              <div className="col-span-12 xl:col-span-6">
                <div className="h-full rounded-xl bg-white shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
                  <BillingStatus />
                </div>
              </div>
            </div>
          </div>
      </FinanceDataProvider>
    </DashboardLayout>
  );
}