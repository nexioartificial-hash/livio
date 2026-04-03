"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 select-none", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-semibold capitalize",
        nav: "flex items-center gap-1",
        button_previous: cn(
          "absolute left-2 top-2 h-7 w-7 rounded-md border border-slate-200 dark:border-slate-700",
          "inline-flex items-center justify-center",
          "bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 transition-colors"
        ),
        button_next: cn(
          "absolute right-2 top-2 h-7 w-7 rounded-md border border-slate-200 dark:border-slate-700",
          "inline-flex items-center justify-center",
          "bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 transition-colors"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex mb-1",
        weekday: "text-slate-400 dark:text-slate-500 dark:text-slate-400 w-9 text-[0.8rem] font-medium text-center",
        weeks: "flex flex-col",
        week: "flex mt-1",
        day: "h-9 w-9 text-center p-0",
        day_button: cn(
          "h-9 w-9 rounded-md text-sm font-normal",
          "inline-flex items-center justify-center",
          "hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800 transition-colors cursor-pointer",
          "aria-selected:bg-accent aria-selected:text-accent-foreground aria-selected:font-bold aria-selected:hover:bg-accent/90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        ),
        selected: "text-primary-foreground",
        today: "bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white rounded-md",
        outside: "text-slate-300 dark:text-slate-600 dark:text-slate-400 opacity-50",
        disabled: "text-slate-300 dark:text-slate-600 dark:text-slate-400 opacity-30 cursor-not-allowed",
        range_middle: "bg-accent/20",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        PreviousMonthButton: (props) => (
          <button {...props}>
            <ChevronLeft className="h-4 w-4" />
          </button>
        ),
        NextMonthButton: (props) => (
          <button {...props}>
            <ChevronRight className="h-4 w-4" />
          </button>
        ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
