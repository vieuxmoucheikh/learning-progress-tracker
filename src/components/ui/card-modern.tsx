import * as React from "react"
import { cn } from "@/lib/utils"

const CardModern = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    gradient?: boolean;
    glassEffect?: boolean;
  }
>(({ className, gradient = false, glassEffect = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow",
      gradient && "bg-gradient-to-br from-slate-900/95 to-slate-800/95 border-slate-700/30",
      glassEffect && "backdrop-blur-sm",
      className
    )}
    {...props}
  />
))
CardModern.displayName = "CardModern"

const CardModernHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardModernHeader.displayName = "CardModernHeader"

const CardModernTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardModernTitle.displayName = "CardModernTitle"

const CardModernDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardModernDescription.displayName = "CardModernDescription"

const CardModernContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardModernContent.displayName = "CardModernContent"

const CardModernFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardModernFooter.displayName = "CardModernFooter"

const CardModernPill = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    position?: "top" | "bottom";
  }
>(({ className, position = "top", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full shadow-lg bg-gradient-to-r from-primary to-blue-600 backdrop-blur-sm",
      position === "top" ? "-translate-y-1/2 top-0" : "translate-y-1/2 bottom-0",
      className
    )}
    {...props}
  />
))
CardModernPill.displayName = "CardModernPill"

export {
  CardModern,
  CardModernHeader,
  CardModernFooter,
  CardModernTitle,
  CardModernDescription,
  CardModernContent,
  CardModernPill
}
