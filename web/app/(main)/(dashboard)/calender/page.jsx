"use client";

import React, { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
  addYears,
  subYears,
} from "date-fns";

import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  Banknote,
  CalendarDays,
  Landmark,
  Receipt,
  Target,
  AlertCircle,
} from "lucide-react";

// 🔹 Configuration for event types
const activityConfig = {
  transaction: {
    icon: CreditCard,
    color: "bg-red-100 text-red-700 border-red-300",
  },
  income: {
    icon: Banknote,
    color: "bg-green-100 text-green-700 border-green-300",
  },
  emi: {
    icon: CalendarDays,
    color: "bg-yellow-100 text-yellow-700 border-yellow-300",
  },
  loan: {
    icon: Landmark,
    color: "bg-blue-100 text-blue-700 border-blue-300",
  },
  bill: {
    icon: Receipt,
    color: "bg-purple-100 text-purple-700 border-purple-300",
  },
  goal: {
    icon: Target,
    color: "bg-pink-100 text-pink-700 border-pink-300",
  },
};

// 🔹 FilterBar Component
const FilterBar = ({ filters, setFilters }) => {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {Object.keys(activityConfig).map((key) => {
        const Icon = activityConfig[key].icon;
        return (
          <Button
            key={key}
            variant={filters[key] ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setFilters((prev) => ({ ...prev, [key]: !prev[key] }))
            }
          >
            <Icon className="h-4 w-4 mr-1" />
            {key.toUpperCase()}
          </Button>
        );
      })}
    </div>
  );
};

// 🔹 Modal Component (Day Details)
const DayModal = ({ day, onClose }) => {
  if (!day) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-lg w-96 max-h-[80vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">
          {format(day.date, "MMMM d, yyyy")}
        </h2>
        {day.activities.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No events for this day.
          </p>
        ) : (
          <ul className="space-y-2">
            {day.activities.map((act, idx) => {
              const config = activityConfig[act.type] || {};
              const Icon = config.icon;
              return (
                <li
                  key={idx}
                  className={`flex items-center gap-2 p-2 rounded-md border ${config.color}`}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <div className="flex-1">
                    <p className="font-medium">{act.title}</p>
                    {act.amount && (
                      <p className="text-xs">Amount: ₹{act.amount}</p>
                    )}
                    {act.status && (
                      <p
                        className={`text-xs ${
                          act.status === "overdue" ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        Status: {act.status}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

// 🔹 Main Calendar Component
const FinanceCalendar = ({ activities }) => {
  const safeActivities = Array.isArray(activities) ? activities : [];
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState(
    Object.keys(activityConfig).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {})
  );
  const [selectedDay, setSelectedDay] = useState(null);

  const calendarGrid = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start, end });
    const startingDayIndex = getDay(start);

    const daysWithActivities = daysInMonth.map((day) => ({
      date: day,
      activities: safeActivities.filter(
        (act) =>
          isSameDay(new Date(act.date), day) && filters[act.type] === true
      ),
    }));

    return [...Array(startingDayIndex).fill(null), ...daysWithActivities];
  }, [currentDate, safeActivities, filters]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextYear = () => setCurrentDate(addYears(currentDate, 1));
  const prevYear = () => setCurrentDate(subYears(currentDate, 1));

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      {/* Filters */}
      <FilterBar filters={filters} setFilters={setFilters} />

      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={prevYear}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <h3 className="text-lg font-semibold">
          {format(currentDate, "MMMM yyyy")}
        </h3>

        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={nextYear}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarGrid.map((day, index) => (
          <div
            key={index}
            onClick={() => day && setSelectedDay(day)}
            className={`h-28 rounded-md border p-1.5 cursor-pointer relative transition-colors ${
              day ? "bg-background hover:bg-muted/50" : "bg-muted/50"
            } ${
              day && isToday(day.date)
                ? "bg-blue-100 dark:bg-blue-900/50 border-blue-400"
                : ""
            }`}
          >
            {day && (
              <>
                <span
                  className={`text-xs font-medium ${
                    isToday(day.date)
                      ? "text-blue-600 font-bold"
                      : "text-foreground"
                  }`}
                >
                  {format(day.date, "d")}
                </span>
                <div className="mt-1 space-y-1 overflow-y-auto max-h-20 scrollbar-thin">
                  {day.activities.map((activity, actIndex) => {
                    const config = activityConfig[activity.type] || {};
                    const Icon = config.icon;
                    return (
                      <div
                        key={actIndex}
                        title={`${activity.title} ${
                          activity.amount ? "₹" + activity.amount : ""
                        }`}
                        className={`flex items-center gap-1.5 p-1 rounded-md text-xs border ${config.color}`}
                      >
                        {Icon && <Icon className="h-3 w-3 flex-shrink-0" />}
                        <span className="truncate font-medium">
                          {activity.title}
                        </span>
                        {activity.status === "overdue" && (
                          <AlertCircle className="h-3 w-3 text-red-600" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Day Modal */}
      {selectedDay && (
        <DayModal day={selectedDay} onClose={() => setSelectedDay(null)} />
      )}
    </div>
  );
};

export default FinanceCalendar;
