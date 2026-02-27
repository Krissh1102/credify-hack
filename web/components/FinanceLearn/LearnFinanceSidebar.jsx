"use client";

import { cn } from "@/lib/utils";
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconArrowBack } from "@tabler/icons-react";
import { Youtube, Puzzle, LayoutGrid, Newspaper } from "lucide-react";

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

const SidebarLink = ({ link, open, animate = true, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 group/sidebar transition-colors duration-200 w-full text-left",
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
    </button>
  );
};

export const LearnFinanceSidebar = ({ open, setOpen, activeTab, setActiveTab }) => {
  // MODIFIED: added 'name' (tab key) to each link
  const topLinks = [
    { label: "Overview", name: "overview", icon: <LayoutGrid size={20} /> },
    { label: "Videos", name: "videos", icon: <Youtube size={20} /> },
    { label: "Quizzes", name: "quizzes", icon: <Puzzle size={20} /> },
    { label: "Simulator", name: "simulator", icon: <LayoutGrid size={20} /> },
    { label: "News & Events", name: "news_events", icon: <Newspaper size={20} /> },
  ];

  const bottomLinks = [
    { label: "Back to Home", name: "back_home", icon: <IconArrowBack size={20} /> },
  ];

  return (
    <>
      {/* Desktop */}
      <DesktopSidebar open={open} setOpen={setOpen}>
        <div className="flex flex-col justify-between h-full w-full">
          <nav className="flex flex-col gap-1">
            {/* MODIFIED: use link.name for isActive and setActiveTab */}
            {topLinks.map((link) => (
              <SidebarLink
                key={link.name}
                link={link}
                open={open}
                isActive={activeTab === link.name}
                onClick={() => setActiveTab(link.name)}
              />
            ))}
          </nav>
          <div className="mt-auto border-t border-slate-200">
            <nav className="flex flex-col gap-1">
              {bottomLinks.map((link) => (
                <SidebarLink
                  key={link.name}
                  link={link}
                  open={open}
                  isActive={false}
                  onClick={() => (window.location.href = "/")}
                />
              ))}
            </nav>
          </div>
        </div>
      </DesktopSidebar>

      {/* Mobile */}
      <MobileSidebar open={open} setOpen={setOpen}>
        <div className="flex flex-col justify-between h-full w-full">
          <nav className="flex flex-col gap-1">
            {/* MODIFIED: use link.name for isActive and setActiveTab */}
            {topLinks.map((link) => (
              <SidebarLink
                key={link.name}
                link={link}
                open={open}
                isActive={activeTab === link.name}
                onClick={() => {
                  setActiveTab(link.name);
                  setOpen(false);
                }}
              />
            ))}
          </nav>
          <div className="mt-auto pt-3 border-t border-slate-200">
            <nav className="flex flex-col gap-1">
              {bottomLinks.map((link) => (
                <SidebarLink
                  key={link.name}
                  link={link}
                  open={open}
                  isActive={false}
                  onClick={() => (window.location.href = "/")}
                />
              ))}
            </nav>
          </div>
        </div>
      </MobileSidebar>
    </>
  );
};
