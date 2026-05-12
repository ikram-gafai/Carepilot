"use client"

import * as React from "react"
import { format } from "date-fns"
import { ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function CarePilotHeaderDatePicker() {
  const [date, setDate] = React.useState<Date>(() => new Date())

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label="Select date"
          variant="outline"
          className="h-8 w-auto min-w-40 max-w-48 shrink-0 justify-between gap-0 rounded-full px-3 text-left text-sm font-normal"
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {format(date, "PPP")}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          defaultMonth={date}
          mode="single"
          onSelect={(d) => {
            if (d) setDate(d)
          }}
          selected={date}
        />
      </PopoverContent>
    </Popover>
  )
}
