// Enlaces de WhatsApp (wa.me). El número debe llevar el indicativo del país y solo dígitos:
// un celular colombiano guardado como "300 123 4567" no abre el chat si no se le antepone el 57.

/** Deja el teléfono listo para wa.me, o null si no parece un número válido */
export function numeroWhatsApp(telefono: string | null | undefined): string | null {
  const digitos = (telefono ?? '').replace(/\D/g, '').replace(/^00/, '')
  if (digitos.length < 7) return null
  // Celular colombiano sin indicativo: 10 dígitos que empiezan por 3
  if (digitos.length === 10 && digitos.startsWith('3')) return `57${digitos}`
  return digitos
}

/** Enlace que abre el chat con el texto escrito, o null si el teléfono no sirve */
export function enlaceWhatsApp(telefono: string | null | undefined, texto: string): string | null {
  const numero = numeroWhatsApp(telefono)
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(texto)}` : null
}

const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

export interface CreditoRecordatorio {
  ticket: number | null
  saldo: number
  /** Fecha de pago acordada AAAA-MM-DD */
  vence: string | null
}

/** Mensaje para recordarle a un cliente lo que debe. `hoy` en AAAA-MM-DD. */
export function textoRecordatorioCredito(negocio: string, cliente: string, creditos: CreditoRecordatorio[], hoy: string): string {
  const total = creditos.reduce((s, c) => s + c.saldo, 0)
  const lineas = creditos.map(c => {
    const estado = !c.vence ? '' : c.vence < hoy ? ` (venció el ${c.vence})` : ` (para el ${c.vence})`
    return `• Ticket #${c.ticket ?? '—'}: ${pesos(c.saldo)}${estado}`
  })
  return [
    `Hola ${cliente}, te saluda ${negocio}.`,
    creditos.length === 1 ? 'Te recordamos tu saldo pendiente:' : 'Te recordamos tus saldos pendientes:',
    ...lineas,
    creditos.length > 1 ? `*Total: ${pesos(total)}*` : '',
    'Puedes pagar en efectivo, Nequi, Daviplata o tarjeta. ¡Gracias!',
  ].filter(Boolean).join('\n')
}

export interface LineaPedido {
  /** Referencia del proveedor o código del producto */
  codigo: string
  nombre: string
  medida: string | null
  marca: string | null
  cantidad: number
}

/** Pedido para enviarle al proveedor */
export function textoPedido(negocio: string, lineas: LineaPedido[]): string {
  return [
    `Buen día, les escribe ${negocio}. Quisiéramos hacer este pedido:`,
    ...lineas.filter(l => l.cantidad > 0).map(l =>
      `• ${l.cantidad} × ${l.nombre}${l.medida ? ` ${l.medida}` : ''}${l.marca && l.marca !== 'Generica' ? ` (${l.marca})` : ''}${l.codigo && l.codigo !== '—' ? ` [${l.codigo}]` : ''}`),
    'Quedamos atentos al valor y a la fecha de entrega. Gracias.',
  ].join('\n')
}
