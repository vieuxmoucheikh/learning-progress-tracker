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
        months: "flex flex-col relative",
        month: "gap-y-4 overflow-x-hidden w-full",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium truncate",
        nav: "flex items-start",
        nav_button_previous: cn(
          buttonVariants({
            variant: "outline",
          }),
          "absolute left-0 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_next: cn(
          buttonVariants({
            variant: "outline",
          }),
          "absolute right-0 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground w-8 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "p-0 size-8 text-sm flex-1 flex items-center justify-center has-[button]:hover:!bg-accent rounded-md has-[button]:hover:aria-selected:!bg-primary has-[button]:hover:text-accent-foreground has-[button]:hover:aria-selected:text-primary-foreground",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 p-0 font-normal transition-none hover:bg-transparent hover:text-inherit aria-selected:opacity-100"
        ),
        day_range_start: "day-range-start rounded-s-md",
        day_range_end: "day-range-end rounded-e-md",
        day_selected:
          "bg-primary text-primary-foreground hover:!bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent hover:aria-selected:!bg-accent rounded-none aria-selected:text-accent-foreground hover:aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          const Icon = orientation === 'left' ? ChevronLeft : ChevronRight;
          return <Icon className="h-4 w-4" />;
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
