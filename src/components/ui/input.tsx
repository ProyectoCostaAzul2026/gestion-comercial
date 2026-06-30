import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-xl border border-white/10 bg-[#1a2430] px-4 py-1 text-[16px] text-white transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-steel-500 focus-visible:border-brand-yellow/60 focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-brand-red aria-invalid:ring-3 aria-invalid:ring-brand-red/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }