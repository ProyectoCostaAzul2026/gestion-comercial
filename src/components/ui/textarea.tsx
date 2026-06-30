import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-xl border border-white/10 bg-[#1a2430] px-4 py-2 text-[16px] text-white transition-colors outline-none placeholder:text-steel-500 focus-visible:border-brand-yellow/60 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-brand-red aria-invalid:ring-3 aria-invalid:ring-brand-red/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }