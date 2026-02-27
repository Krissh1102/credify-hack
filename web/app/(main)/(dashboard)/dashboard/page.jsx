import { getDashboardData, getUserAccounts } from "@/actions/dashboard";
import { getSetuConsentStatus } from "@/actions/setu";
import { CreateAccountDrawer } from "@/components/create-account-drawer";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Link2, Trash2 } from "lucide-react";
import React, { Suspense } from "react";
import Link from "next/link";
import AccountCard from "./_components/account-card";
import { getCurrentBudget } from "@/actions/budget";
import { BudgetProgress } from "./_components/budget-progress";
import { DashboardOverview } from "./_components/transaction-overview";

const Page = async ({ searchParams }) => {
  const accounts = await getUserAccounts();
  const defaultAccount = accounts?.find((account) => account.isDefault);

  const resolvedSearchParams = await searchParams;
  const isSetuConnected = resolvedSearchParams?.setu_connected === "true";
  const consentId = resolvedSearchParams?.consent_id || resolvedSearchParams?.id; // Fallbacks for ID

  let setuAccounts = [];
  if (isSetuConnected && consentId) {
    const setuStatus = await getSetuConsentStatus(consentId);
    if (setuStatus.success && setuStatus.accounts) {
      setuAccounts = setuStatus.accounts;
    }
  }

  let budgetData = null;
  if (defaultAccount) {
    budgetData = await getCurrentBudget(defaultAccount.id);
  }

  const transactions = await getDashboardData();

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

        {!isSetuConnected && (
          <Link href="/setu">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed h-full">
              <CardContent className="flex flex-col items-center justify-center text-muted-foreground h-full pt-5">
                <Link2 className="h-10 w-10 mb-2" />
                <p className="text-sm font-medium text-center">Connect Setu<br />Account Aggregator</p>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Dynamically Rendered Live AA Accounts from Setu API */}
        {isSetuConnected && setuAccounts.length === 0 && (
          <Card className="hover:shadow-md transition-shadow h-full border-primary shadow-sm bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-background">
            <CardContent className="flex flex-col items-center justify-center text-muted-foreground h-full pt-5 text-center px-4">
              <Link2 className="h-10 w-10 mb-2 text-indigo-500 animate-pulse" />
              <p className="text-sm font-medium text-indigo-700 dark:text-indigo-400">Processing Setu Data...</p>
              <p className="text-xs mt-2">Connecting to Account Aggregator</p>
            </CardContent>
          </Card>
        )}

        {isSetuConnected && setuAccounts.map((aaAcc, idx) => {
          // Map Setu account structure to AccountCard expected props
          // In a real app the balance is fetched via FI Data request. For now we parse or mock.
          const accountName = `${aaAcc.fipId || "Bank"} ${aaAcc.accType || "Account"}`;
          const accountId = aaAcc.id || `setu-${idx}`;
          // Setu Sandbox accounts often have 0 balance initially until transactions are synced
          const balance = aaAcc.balance ? aaAcc.balance.toString() : "0";

          return (
            <div key={accountId} className="relative group">
              {/* Live AA Badge */}
              <div className="absolute -top-3 -right-3 z-10 text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-2 py-1 rounded-full flex items-center gap-1 border border-green-200 dark:border-green-800 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> SETU AA
              </div>

              <AccountCard
                id={accountId}
                name={accountName}
                balance={balance}
                type={aaAcc.accType || "SAVINGS"}
                isDefault={false}
              />

              {/* Disconnect Button Overlay for Setu Accounts */}
              <div className="absolute bottom-4 right-4 z-20">
                <Link
                  href="/dashboard"
                  className="bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/60 p-2 rounded-full flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                  title="Disconnect Setu Account"
                >
                  <Trash2 className="h-4 w-4" />
                </Link>
              </div>
            </div>
          );
        })}

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