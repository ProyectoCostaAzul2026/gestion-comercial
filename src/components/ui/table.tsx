"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Tabla. En celular (menos de 768 px) cada fila se muestra como una tarjeta: el encabezado se oculta y cada celda lleva
 * delante el nombre de su columna (ver `table[data-apilar]` en globals.css). `apilar={false}` deja la tabla con
 * desplazamiento lateral.
 */
function Table({ className, apilar = true, ...props }: React.ComponentProps<"table"> & { apilar?: boolean }) {
  const ref = React.useRef<HTMLTableElement>(null)

  // Copia el título de cada columna a sus celdas (data-etiqueta) y lo mantiene al cambiar las filas
  React.useEffect(() => {
    const tabla = ref.current
    if (!tabla || !apilar) return
    const etiquetar = () => {
      const titulos = Array.from(tabla.querySelectorAll("thead th")).map((th) => (th.textContent ?? "").trim())
      tabla.querySelectorAll("tbody tr, tfoot tr").forEach((fila) => {
        let columna = 0
        Array.from(fila.children).forEach((celda) => {
          if (!(celda instanceof HTMLTableCellElement)) return
          const titulo = celda.colSpan > 1 ? "" : titulos[columna] ?? ""
          if (titulo) {
            if (celda.dataset.etiqueta !== titulo) celda.dataset.etiqueta = titulo
          } else if (celda.dataset.etiqueta !== undefined) {
            delete celda.dataset.etiqueta
          }
          columna += celda.colSpan
        })
      })
    }
    etiquetar()
    const observador = new MutationObserver(etiquetar)
    observador.observe(tabla, { childList: true, subtree: true })
    return () => observador.disconnect()
  }, [apilar])

  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        ref={ref}
        data-slot="table"
        data-apilar={apilar ? "" : undefined}
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b [&_tr]:border-white/8", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t border-white/8 bg-steel-700/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-white/8 transition-colors hover:bg-white/5 has-aria-expanded:bg-white/5 data-[state=selected]:bg-white/10",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-3 text-left align-middle font-medium whitespace-nowrap text-white [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-3 py-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-steel-300", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}