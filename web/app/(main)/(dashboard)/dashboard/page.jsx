import { getDashboardData, getUserAccounts } from "@/actions/dashboard";
import { getFinancialContext } from "@/actions/aiInsights";
import { CreateAccountDrawer } from "@/components/create-account-drawer";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import React, { Suspense } from "react";
import AccountCard from "./_components/account-card";
import { getCurrentBudget } from "@/actions/budget";
import { BudgetProgress } from "./_components/budget-progress";
import { DashboardOverview } from "./_components/transaction-overview";
import AiInsightWidget from "@/components/AiInsightWidget";

const Page = async () => {
  const accounts = await getUserAccounts();
  const defaultAccount = accounts?.find((account) => account.isDefault);

  let budgetData = null;
  if (defaultAccount) {
    budgetData = await getCurrentBudget(defaultAccount.id);
  }

  const transactions = await getDashboardData();

  // Fetch financial context for AI widgets (fail silently)
  let financialData = null;
  try {
    financialData = await getFinancialContext();
  } catch {
    // widgets will still render, just with no pre-loaded data
  }

  return (
    <div className="space-y-8">
      {/* Budget Progress */}
      {defaultAccount && (
        <BudgetProgress
          initialBudget={budgetData?.budget}
          currentExpenses={budgetData?.currentExpenses || 0}
        />
      )}

      {/* Overview */}
      <Suspense fallback={"Loading Overview..."}>
        <DashboardOverview accounts={accounts} transactions={transactions || []} />
      </Suspense>

      {/* AI Insights row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AiInsightWidget title="Spending Analysis" insightType="spending_analysis" data={financialData} />
        <AiInsightWidget title="Budget Prediction" insightType="budget_prediction" data={financialData} />
        <AiInsightWidget title="Subscription Audit" insightType="subscription_audit" data={financialData} />
        <AiInsightWidget title="Anomaly Detection" insightType="anomaly_detection" data={financialData} />
      </div>

      {/* Accounts grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CreateAccountDrawer>
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed">
            <CardContent className="flex flex-col items-center justify-center text-muted-foreground h-full pt-5">
              <Plus className="h-10 w-10 mb-2" />
              <p className="text-sm font-medium">Add New Account</p>
            </CardContent>
          </Card>
        </CreateAccountDrawer>

        {accounts.length > 0 &&
          accounts.map((account) => (
            <AccountCard
              key={account.id}
              id={account.id}
              name={account.name}
              balance={account.balance}
              type={account.type}
              isDefault={account.isDefault}
            />
          ))}
      </div>
    </div>
  );
};

export default Page;
