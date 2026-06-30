import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        // Completada / Al día / Activo
        default:
          "border-emerald-500/30 bg-emerald-500/20 text-emerald-400 [a]:hover:bg-emerald-500/30",
        // Pendiente / Parcial
        secondary:
          "border-brand-yellow/30 bg-brand-yellow/20 text-brand-yellow [a]:hover:bg-brand-yellow/30",
        // Anulada / Con deuda / Error
        destructive:
          "border-brand-red/30 bg-brand-red/20 text-brand-red [a]:hover:bg-brand-red/30",
        // Programado / Información
        info:
          "border-brand-blue/30 bg-brand-blue/20 text-brand-blue [a]:hover:bg-brand-blue/30",
        outline:
          "border-white/10 bg-steel-700 text-steel-300 [a]:hover:bg-white/5",
        ghost:
          "border-transparent hover:bg-white/5 hover:text-white",
        link: "border-transparent text-brand-blue underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }