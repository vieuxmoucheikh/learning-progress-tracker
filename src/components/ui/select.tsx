import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { cn } from "@/lib/utils"
import { Check, ChevronDown } from "lucide-react"

const Select = React.forwardRef<
  HTMLDivElement,
  {
    value: string
    onValueChange: (value: string) => void
    items: { value: string; label: string }[]
    className?: string
    placeholder?: string
  }
>(({ value, onValueChange, items, className, placeholder = "Select an option" }, ref) => (
  <div ref={ref} className={className}>
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white",
          className
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder}>
          {items.find(item => item.value === value)?.label || placeholder}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="relative z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <SelectPrimitive.Viewport className="p-1">
            {items.map(({ value: itemValue, label }) => (
              <SelectPrimitive.Item
                key={itemValue}
                value={itemValue}
                className={cn(
                  "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-blue-50 focus:bg-blue-50 dark:hover:bg-gray-700 dark:focus:bg-gray-700",
                  value === itemValue && "bg-blue-50 text-blue-600 dark:bg-gray-700 dark:text-blue-400"
                )}
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  </div>
))
Select.displayName = "Select"

export { Select }
