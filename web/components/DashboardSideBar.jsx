"use client";

import { cn } from "@/lib/utils";
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLayoutDashboard, IconArrowBack } from "@tabler/icons-react";
import { FileTextIcon ,CalendarDays, ReceiptIcon} from "lucide-react";

// --- Desktop Sidebar ---
const DesktopSidebar = ({
  className,
  children,
  open,
  setOpen,
  animate = true,
}) => {
  return (
    <motion.aside
      className={cn(
        "h-full px-4 py-4 hidden md:flex flex-col w-[260px] shrink-0 border-r border-slate-200",
        className
      )}
      animate={{ width: animate ? (open ? 260 : 80) : 260 }}
    >
      {children}
    </motion.aside>
  );
};

// --- Mobile Sidebar ---
const MobileSidebar = ({ children, open, setOpen }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: "-100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "-100%", opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex md:hidden"
        >
          <div
            className="bg-black/40 flex-1"
            onClick={() => setOpen(false)}
          ></div>
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="bg-white text-slate-800 w-4/5 max-w-xs h-full p-6 flex flex-col shadow-xl"
          >
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-semibold text-emerald-800">Menu</span>
              <button onClick={() => setOpen(false)} className="text-slate-500">
                ✕
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- Sidebar Link ---
const SidebarLink = ({ link, open, animate = true }) => {
  const pathname = usePathname();
  const isActive = pathname === link.href;

  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 group/sidebar transition-colors duration-200",
        isActive
          ? "bg-blue-100 text-black font-semibold"
          : "hover:text-slate-900 hover:bg-slate-100"
      )}
    >
      <span className="inline-flex items-center justify-center w-6 h-6">
        {link.icon}
      </span>
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-sm whitespace-pre"
      >
        {link.label}
      </motion.span>
    </Link>
  );
};

// --- Main Sidebar ---
export const DashboardSidebar = ({ open, setOpen }) => {
  const links = [
    {
      label: "Onboarding Form",
      href: "/onboarding",
      icon: <FileTextIcon size={20} />,
    },
  ];

  return (
    <>
      <DesktopSidebar open={open} setOpen={setOpen}>
        <div className="flex flex-col justify-between h-full w-full">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <SidebarLink key={link.label} link={link} open={open} />
            ))}
          </nav>
        </div>
      </DesktopSidebar>

      <MobileSidebar open={open} setOpen={setOpen}>
        <div className="flex flex-col justify-between h-full w-full">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <SidebarLink key={link.label} link={link} open={open} />
            ))}
          </nav>
        </div>
      </MobileSidebar>
    </>
  );
};
