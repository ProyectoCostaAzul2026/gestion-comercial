/**
 * Leyenda de una gráfica con varias series: muestra de color (barra o línea) y el nombre en tinta normal, nunca en el
 * color de la serie. Va arriba de la gráfica, alineada a la izquierda.
 */
export function LeyendaGrafica({ items }: { items: { color: string; texto: string; forma?: 'barra' | 'linea' }[] }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-suave">
      {items.map(it => (
        <li key={it.texto} className="flex items-center gap-1.5">
          {it.forma === 'linea'
            ? <span className="h-0.5 w-4 rounded-full" style={{ background: it.color }} aria-hidden />
            : <span className="size-2.5 rounded-[3px]" style={{ background: it.color }} aria-hidden />}
          {it.texto}
        </li>
      ))}
    </ul>
  )
}
