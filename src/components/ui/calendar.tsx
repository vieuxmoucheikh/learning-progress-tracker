import * as React from "react";
import { ComponentProps } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// Define CalendarProps type using ComponentProps from DayPicker
export type CalendarProps = ComponentProps<typeof DayPicker>;

// Calendar component definition
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)} // Adjust padding for better layout
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-between items-center px-4 py-2 bg-gray-100 rounded-md shadow-sm",
        caption_label: "text-lg font-bold text-primary",
        nav: "flex items-center space-x-2",
        nav_button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 hover:bg-gray-200 text-primary rounded-full transition-all"
        ),
        nav_button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 hover:bg-gray-200 text-primary rounded-full transition-all"
        ),
        table: "w-full border-collapse",
        head_row: "flex justify-between w-full",
        head_cell: "text-muted font-semibold text-sm h-10 w-10 flex items-center justify-center",
        row: "flex w-full mt-1 justify-between",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
          "[&:has([aria-selected])]:bg-primary-light"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-normal aria-selected:opacity-100",
          "hover:bg-primary-light hover:text-primary rounded-full transition-all"
        ),
        day_selected: cn(
          "bg-primary text-white",
          "hover:bg-primary-dark hover:text-white",
          "focus:bg-primary-dark focus:text-white",
          "rounded-full"
        ),
        day_today: cn(
          "bg-accent-light text-accent-dark",
          "rounded-full"
        ),
        day_outside: "text-muted/50",
        day_disabled: "text-muted/50 pointer-events-none",
        day_range_middle: "aria-selected:bg-accent-light aria-selected:text-accent-dark",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ ...props }) =>
          props.orientation === 'left' ? (
            <ChevronLeft className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          ),
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
