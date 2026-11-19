import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-xl border border-linea bg-superficie-2 px-4 py-2 text-[16px] text-tinta transition-colors outline-none placeholder:text-tenue focus-visible:border-accion focus-visible:ring-3 focus-visible:ring-accion/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-brand-red aria-invalid:ring-3 aria-invalid:ring-brand-red/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }