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
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-between items-center px-4 py-2 bg-background rounded-md",
        caption_label: "text-lg font-bold text-foreground",
        nav: "flex items-center space-x-2",
        nav_button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 hover:bg-accent text-foreground rounded-full transition-all"
        ),
        nav_button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 hover:bg-accent text-foreground rounded-full transition-all"
        ),
        table: "w-full border-collapse",
        head_row: "grid grid-cols-7 text-center",
        head_cell: cn(
          "text-muted-foreground font-medium text-[0.8rem] w-9 h-9",
          "flex items-center justify-center"
        ),
        row: "grid grid-cols-7 mt-2",
        cell: cn(
          "relative p-0 text-center focus-within:relative focus-within:z-20",
          "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
          "[&:has([aria-selected])]:bg-accent"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal text-foreground aria-selected:opacity-100",
          "hover:bg-accent hover:text-accent-foreground rounded-full transition-all",
          "mx-auto"
        ),
        day_selected: cn(
          "bg-primary text-primary-foreground",
          "hover:bg-primary hover:text-primary-foreground",
          "focus:bg-primary focus:text-primary-foreground",
          "rounded-full"
        ),
        day_today: cn(
          "bg-accent text-accent-foreground",
          "rounded-full"
        ),
        day_outside: "text-muted-foreground/50",
        day_disabled: "text-muted-foreground/50 pointer-events-none",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
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
