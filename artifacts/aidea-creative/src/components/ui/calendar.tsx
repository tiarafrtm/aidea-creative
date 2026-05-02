"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-background group/calendar p-4",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4 md:flex-row", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-3", defaultClassNames.month),
        nav: cn(
          "flex w-full items-center justify-between mb-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-9 w-9 select-none p-0 rounded-full border-border shadow-none aria-disabled:opacity-30 aria-disabled:pointer-events-none",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-9 w-9 select-none p-0 rounded-full border-border shadow-none aria-disabled:opacity-30 aria-disabled:pointer-events-none",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-9 w-full items-center justify-center",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-9 w-full items-center justify-center gap-1.5 text-sm font-semibold",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "has-focus:border-ring border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] relative rounded-md border",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn("bg-popover absolute inset-0 opacity-0", defaultClassNames.dropdown),
        caption_label: cn("select-none font-semibold text-sm tracking-wide", defaultClassNames.caption_label),
        table: "w-full border-collapse",
        weekdays: cn("flex mb-2", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground/60 flex-1 select-none text-[0.65rem] font-bold uppercase tracking-widest text-center",
          defaultClassNames.weekday
        ),
        week: cn("flex w-full gap-1", defaultClassNames.week),
        week_number_header: cn("w-9 select-none", defaultClassNames.week_number_header),
        week_number: cn("text-muted-foreground select-none text-xs", defaultClassNames.week_number),
        day: cn("group/day relative flex-1 p-0 text-center", defaultClassNames.day),
        range_start: cn("bg-accent rounded-l-full", defaultClassNames.range_start),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("bg-accent rounded-r-full", defaultClassNames.range_end),
        today: cn(defaultClassNames.today),
        outside: cn("text-muted-foreground/35 aria-selected:text-muted-foreground", defaultClassNames.outside),
        disabled: cn("text-muted-foreground/30 cursor-not-allowed", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => (
          <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />
        ),
        Chevron: ({ orientation, ...props }) => {
          if (orientation === "left") return <ChevronLeftIcon className="size-4" />
          if (orientation === "right") return <ChevronRightIcon className="size-4" />
          return null
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => (
          <td {...props}>
            <div className="flex size-9 items-center justify-center text-center">{children}</div>
          </td>
        ),
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()
  const ref = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  const isSelectedSingle =
    modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle
  const isToday = modifiers.today && !modifiers.selected

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString()}
      disabled={modifiers.disabled}
      className={cn(
        "relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-normal transition-colors",
        "hover:bg-primary/10 hover:text-primary",
        isSelectedSingle && "bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/90 hover:text-primary-foreground",
        isToday && "font-semibold text-primary after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
        modifiers.outside && "text-muted-foreground/35",
        modifiers.disabled && "cursor-not-allowed opacity-30 hover:bg-transparent hover:text-inherit",
        modifiers.range_start && "bg-primary text-primary-foreground rounded-l-full",
        modifiers.range_end && "bg-primary text-primary-foreground rounded-r-full",
        modifiers.range_middle && "bg-primary/15 text-primary rounded-none",
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
