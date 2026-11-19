/**
 * Miniaturas de los medios de pago, para reconocerlos de un vistazo (Cobrar, Caja, recibos).
 * Son dibujos propios con los colores de cada medio, no los logos de las marcas.
 */
export type MedioIcono = 'efectivo' | 'nequi' | 'daviplata' | 'tarjeta' | 'credito' | 'varios' | 'caja_mayor' | 'caja_menor'

export function MedioPagoIcono({ medio, className = 'h-8 w-12' }: { medio: MedioIcono | string; className?: string }) {
  return (
    <svg viewBox="0 0 48 32" className={className} aria-hidden="true">
      {medio === 'efectivo' || medio === 'caja_menor' ? (
        <>
          <rect width="48" height="32" rx="5" fill="#1F8A4C" />
          <rect x="3.5" y="3.5" width="41" height="25" rx="3" fill="none" stroke="#A8E6C1" strokeWidth="1.5" />
          <circle cx="24" cy="16" r="7.5" fill="#A8E6C1" />
          <path d="M26.6 12.6c-.6-.8-1.5-1.1-2.6-1.1-1.5 0-2.6.8-2.6 2s1 1.7 2.6 2.1c1.7.4 2.8.9 2.8 2.2s-1.2 2.1-2.8 2.1c-1.2 0-2.2-.4-2.8-1.3M24 10v12"
            stroke="#14532F" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </>
      ) : medio === 'nequi' ? (
        <>
          <rect width="48" height="32" rx="8" fill="#2A0A3B" />
          <path d="M16 23V9h3.2l9.6 9.4V9H32v14h-3.2L19.2 13.6V23Z" fill="#FF3DB4" />
        </>
      ) : medio === 'daviplata' ? (
        <>
          <rect width="48" height="32" rx="8" fill="#E1251B" />
          <path d="M17 8h7.5c5 0 8.5 3.3 8.5 8s-3.5 8-8.5 8H17Zm3.4 3v10h4c3 0 5.2-2.1 5.2-5s-2.2-5-5.2-5Z" fill="#FFFFFF" />
        </>
      ) : medio === 'tarjeta' ? (
        <>
          <rect width="48" height="32" rx="5" fill="#0368B6" />
          <rect x="6" y="8" width="10" height="8" rx="1.8" fill="#FEDB03" />
          <rect x="6" y="21" width="20" height="2.6" rx="1.3" fill="#BFDBF3" />
          <rect x="29" y="21" width="12" height="2.6" rx="1.3" fill="#BFDBF3" />
        </>
      ) : medio === 'credito' ? (
        <>
          <rect width="48" height="32" rx="4" fill="#FFF6C9" />
          <path d="M4 11h40M4 17h40M4 23h40" stroke="#8FB4D9" strokeWidth="1.2" />
          <path d="M11 3v26" stroke="#CE0D00" strokeWidth="1.4" />
          <path d="M17 15.5c2-2 3.5-2 4.5 0s2.5 2 4.5 0 3.5-2 4.5 0" stroke="#12263A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </>
      ) : medio === 'caja_mayor' ? (
        <>
          <rect width="48" height="32" rx="5" fill="#12263A" />
          <rect x="12" y="7" width="24" height="18" rx="2.5" fill="none" stroke="#FEDB03" strokeWidth="1.8" />
          <circle cx="24" cy="16" r="4" fill="none" stroke="#FEDB03" strokeWidth="1.8" />
          <path d="M24 12v1.5M24 18.5V20M20 16h1.5M26.5 16H28" stroke="#FEDB03" strokeWidth="1.5" />
        </>
      ) : (
        <>
          <rect x="0" y="5" width="30" height="22" rx="4" fill="#1F8A4C" />
          <circle cx="15" cy="16" r="5" fill="#A8E6C1" />
          <rect x="18" y="0" width="30" height="22" rx="6" fill="#2A0A3B" stroke="#0C1621" strokeWidth="1.5" />
          <path d="M27 17V6h2.4l6.4 6.6V6h2.4v11h-2.4L29.4 10.4V17Z" fill="#FF3DB4" />
        </>
      )}
    </svg>
  )
}
