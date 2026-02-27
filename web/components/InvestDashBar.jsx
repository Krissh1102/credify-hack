"use client";

import { cn } from "@/lib/utils";
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconArrowBack,
  IconBook,
  IconCalendarDollar,
  IconEdit,
  IconLayoutDashboard,
  IconMenu2,
  IconPigMoney,
  IconWallet,
  IconX,
} from "@tabler/icons-react";
import {
  BarChart2,
  CalculatorIcon,
  FileTextIcon,
  PieChart,
  TrendingUp,
  Wallet,
  PiggyBank,
  DollarSign,
} from "lucide-react";

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
        "h-full px-4 py-4 hidden md:flex flex-colw-[260px] shrink-0 border-r border-slate-200",
        className
      )}
      animate={{ width: animate ? (open ? 260 : 80) : 260 }}
    >
      {children}
    </motion.aside>
  );
};

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
            className=" text-slate-800 w-4/5 max-w-xs h-full p-6 flex flex-col shadow-xl"
          >
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-semibold text-emerald-800">
                Menu
              </span>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

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
          : " hover:text-slate-900 hover:bg-slate-100"
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

export const InvestDashBar = ({ open, setOpen }) => {
  const topLinks = [
    {
      label: "Overview",
      href: "/investment-overview",
      icon: <IconLayoutDashboard size={20} />,
    },
    {
      label: "My Portfolio",
      href: "/portfolio",
      icon: <Wallet size={20} />,
    },
    {
      label: "Savings Jar",
      href: "/savings-jar",
      icon: <PiggyBank size={20} />,
    },
    {
      label: "Returns Calculator",
      href: "/returns-calculator",
      icon: <CalculatorIcon size={20} />,
    },
    {
      label: "Retirement Planning",
      href: "/retirement-planning",
      icon: <DollarSign size={20} />,
    },
  ];

  const bottomLinks = [
    {
      label: "Add Investment",
      href: "/investment-form",
      icon: <IconEdit size={20} />,
    },
    {
      label: "Back to Home",
      href: "/",
      icon: <IconArrowBack size={20} />,
    },
  ];

  return (
    <>
      <DesktopSidebar open={open} setOpen={setOpen}>
        <div className="flex flex-col justify-between h-full w-full">
          <nav className="flex flex-col gap-1">
            {topLinks.map((link) => (
              <SidebarLink key={link.label} link={link} open={open} />
            ))}
          </nav>
          <div className="mt-auto  border-t border-slate-200">
            <nav className="flex flex-col gap-1">
              {bottomLinks.map((link) => (
                <SidebarLink key={link.label} link={link} open={open} />
              ))}
            </nav>
          </div>
        </div>
      </DesktopSidebar>

      <MobileSidebar open={open} setOpen={setOpen}>
        <div className="flex flex-col justify-between h-full w-full">
          <nav className="flex flex-col gap-1">
            {topLinks.map((link) => (
              <SidebarLink key={link.label} link={link} open={open} />
            ))}
          </nav>
          <div className="mt-auto pt-3 border-t border-slate-200">
            <nav className="flex flex-col gap-1">
              {bottomLinks.map((link) => (
                <SidebarLink key={link.label} link={link} open={open} />
              ))}
            </nav>
          </div>
        </div>
      </MobileSidebar>
    </>
  );
};
