"use client";

import React, { useState } from "react";

export default function DashboardLayout({ children }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex max-h-screen pt-16">
      <main className="flex-1 p-4 md:p-6">
        <h1 className="text-4xl font-bold mb-4">Dashboard</h1>
        {children}
      </main>
    </div>
  );
}
