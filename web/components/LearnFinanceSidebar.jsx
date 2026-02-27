// File: components/LearnFinanceSidebar.jsx

"use client";

import { cn } from "@/lib/utils"; // Assumes you have a `cn` utility for classnames
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  LayoutGrid,
  Youtube,
  Puzzle,
  ListVideo,
  History,
} from "lucide-react";

const DesktopSidebar = ({ className, children, open, animate = true }) => {
  return (
    <motion.aside
      className={cn(
        "h-full px-4 py-6 hidden md:flex flex-col bg-white text-slate-800 w-[260px] shrink-0 border-r border-slate-200",
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
          <div className="bg-black/40 flex-1" onClick={() => setOpen(false)}></div>
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="bg-white text-slate-800 w-4/5 max-w-xs h-full p-6 flex flex-col shadow-xl"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// This component now handles both Links (for navigation) and Buttons (for state changes)
const SidebarItem = ({ item, open, isActive, onClick, animate = true }) => {
  const content = (
    <>
      <span className="inline-flex items-center justify-center w-6 h-6">
        {item.icon}
      </span>
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-sm whitespace-pre"
      >
        {item.label}
      </motion.span>
    </>
  );

  const itemClasses = cn(
    "flex items-center gap-3 rounded-lg px-3 py-2.5 group/sidebar transition-colors duration-200",
    isActive
      ? "bg-blue-100 text-blue-700 font-semibold"
      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
  );

  if (item.href) {
    return (
      <Link href={item.href} className={itemClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={itemClasses}>
      {content}
    </button>
  );
};

export const LearnFinanceSidebar = ({ open, setOpen, activeTab, setActiveTab }) => {
  const topLinks = [
    { name: "overview", label: "Overview", icon: <LayoutGrid size={20} /> },
    { name: "videos", label: "Videos", icon: <Youtube size={20} /> },
    { name: "quizzes", label: "Quizzes", icon: <Puzzle size={20} /> },
    { name: "playlists", label: "Playlists", icon: <ListVideo size={20} /> },
    { name: "history", label: "History", icon: <History size={20} /> },
  ];

  const bottomLinks = [
    { label: "Back to Home", href: "/", icon: <ArrowLeft size={20} /> },
  ];

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full w-full">
      <nav className="flex flex-col gap-1">
        {topLinks.map((link) => (
          <SidebarItem
            key={link.label}
            item={link}
            open={open}
            isActive={activeTab === link.name}
            onClick={() => setActiveTab(link.name)}
          />
        ))}
      </nav>
      <div className="mt-auto pt-3 border-t border-slate-200">
        <nav className="flex flex-col gap-1">
          {bottomLinks.map((link) => (
            <SidebarItem key={link.label} item={link} open={open} />
          ))}
        </nav>
      </div>
    </div>
  );

  return (
    <>
      <DesktopSidebar open={open} setOpen={setOpen}>
        {sidebarContent}
      </DesktopSidebar>

      <MobileSidebar open={open} setOpen={setOpen}>
        {sidebarContent}
      </MobileSidebar>
    </>
  );
};