"use client";

import React from "react";
import { InvestDashBar } from "@/components/InvestDashBar";

export default function LoanGuideLayout({ children }) {
  const [open, setOpen] = React.useState(true);

  return (
    <>
      <div className="flex h-screen pt-16 " suppressHydrationWarning>
        <InvestDashBar open={open} setOpen={setOpen} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </>
  );
}
