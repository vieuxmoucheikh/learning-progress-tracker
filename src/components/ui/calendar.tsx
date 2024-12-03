import * as React from "react"
import { ComponentProps } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-between pt-1 relative items-center px-2",
        caption_label: "text-sm font-semibold",
        nav: "flex items-center space-x-2",
        nav_button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground rounded-full transition-colors"
        ),
        nav_button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground rounded-full transition-colors"
        ),
        table: "w-full border-collapse space-y-2",
        head_row: "flex justify-between w-full",
        head_cell: "text-muted-foreground font-medium text-[0.8rem] h-8 w-8 flex items-center justify-center",
        row: "flex w-full mt-1 justify-between",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
          "[&:has([aria-selected])]:bg-accent/50"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 font-normal aria-selected:opacity-100",
          "hover:bg-accent hover:text-accent-foreground rounded-full transition-colors",
          "focus:bg-accent focus:text-accent-foreground focus:rounded-full"
        ),
        day_selected: cn(
          "bg-primary text-primary-foreground",
          "hover:bg-primary hover:text-primary-foreground",
          "focus:bg-primary focus:text-primary-foreground",
          "rounded-full"
        ),
        day_today: cn(
          "bg-accent/50 text-accent-foreground",
          "rounded-full"
        ),
        day_outside: "text-muted-foreground/50",
        day_disabled: "text-muted-foreground/50",
        day_range_middle: "aria-selected:bg-accent/50 aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ ...props }) => 
          props.orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
