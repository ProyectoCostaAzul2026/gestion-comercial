export interface TemaAyuda {
  id: string
  categoria: string
  titulo: string
  soloAdmin: boolean
  secciones: { subtitulo?: string; pasos: string[] }[]
}

export const TEMAS_AYUDA: TemaAyuda[] = [
  // ============ GENERAL ============
  {
    id: 'registrar-venta',
    categoria: 'Ventas',
    titulo: 'Registrar una venta',
    soloAdmin: false,
    secciones: [
      {
        pasos: [
          'Entra a Ventas → Nueva Venta.',
          'Busca cada producto por nombre, código o marca y haz clic en el resultado para agregarlo al carrito. Si el producto se vende fraccionado (por metro, kg, etc.), indica la cantidad fraccionada.',
          'Ajusta la cantidad, el precio o el descuento de cada línea si lo necesitas (el descuento por producto no puede superar el 10%).',
          'Si el cliente ya existe, búscalo; si no, puedes crearlo rápido desde el mismo formulario, o dejarlo como "Cliente General".',
          'Agrega servicios adicionales si aplica (instalación, cambio de guardas, etc.).',
          'Elige el o los medios de pago (puedes combinar varios) e ingresa el monto recibido para calcular el vuelto.',
          'Si vas a fiar la venta, marca "Crédito" en vez de completar el pago — esto la manda a Ventas a Crédito con una fecha de pago programada.',
          'Confirma la venta. Se descuenta el stock automáticamente y se genera el número de ticket.',
        ],
      },
    ],
  },
  {
    id: 'cotizacion',
    categoria: 'Ventas',
    titulo: 'Crear una cotización',
    soloAdmin: false,
    secciones: [
      {
        pasos: [
          'Entra a Ventas → Cotización.',
          'Agrega productos y/o servicios al carrito igual que en una venta normal.',
          'Aplica descuento si aplica (respeta el máximo configurado en el negocio).',
          'Elige el formato de impresión: recibo (POS, angosto) o carta.',
          'Genera la cotización — se abre en una ventana lista para imprimir o guardar como PDF desde el navegador.',
        ],
      },
      {
        subtitulo: 'Importante',
        pasos: [
          'La cotización NO descuenta stock ni queda guardada como venta — es solo un documento informativo para el cliente. Si el cliente acepta, la venta se debe registrar por separado en Nueva Venta.',
        ],
      },
    ],
  },
  {
    id: 'ventas-credito',
    categoria: 'Ventas',
    titulo: 'Vender a crédito y registrar abonos',
    soloAdmin: false,
    secciones: [
      {
        subtitulo: 'Registrar la venta a crédito',
        pasos: [
          'En Nueva Venta, arma el carrito normalmente.',
          'En el paso de pago, elige la opción de Crédito en vez de un medio de pago.',
          'Define la fecha programada de pago.',
          'Confirma — el saldo pendiente queda asociado al cliente.',
        ],
      },
      {
        subtitulo: 'Registrar un abono',
        pasos: [
          'Ve al perfil del cliente (Clientes → selecciona el cliente) y busca sus créditos activos.',
          'En el crédito correspondiente, abre "Registrar abono".',
          'Ingresa el monto (puedes dividirlo en más de una fuente de pago) y confirma.',
          'El saldo pendiente se reduce automáticamente; cuando llega a $0, el crédito pasa a "Pagado".',
          'Si necesitas mover la fecha de pago programada, también se puede editar desde ahí.',
        ],
      },
    ],
  },
  {
    id: 'historial-ventas',
    categoria: 'Ventas',
    titulo: 'Buscar y consultar el historial de ventas',
    soloAdmin: false,
    secciones: [
      {
        pasos: [
          'Entra a Ventas — verás el listado con filtros de fecha (desde/hasta), medio de pago, estado y (si eres admin) empleado.',
          'Haz clic en cualquier venta para ver el detalle completo: productos, precios, pagos y posibles devoluciones.',
          'El nombre, precio y costo que aparecen en una venta pasada son los que tenía el producto EN ESE MOMENTO — no cambian aunque después edites el producto.',
        ],
      },
    ],
  },
  {
    id: 'buscar-producto',
    categoria: 'Inventario',
    titulo: 'Buscar un producto y ver su ficha',
    soloAdmin: false,
    secciones: [
      {
        pasos: [
          'Entra a Inventario y usa el buscador (funciona por nombre, código, marca, medida o ubicación).',
          'Haz clic en un producto para ver su ficha completa: precio, stock por almacén y bodega, proveedores y costos.',
          'Desde la ficha puedes ir a "Familia de productos" si el producto tiene variantes de medida, marca o característica.',
        ],
      },
    ],
  },
  {
    id: 'familia-anadir-miembro',
    categoria: 'Inventario',
    titulo: 'Familia de productos — Añadir Miembro',
    soloAdmin: false,
    secciones: [
      {
        subtitulo: 'Qué es una familia',
        pasos: [
          'Una familia agrupa productos que son la misma referencia pero varían en Característica (ej. CPVC vs Presión), Medida (ej. 1/2", 3/4") y Marca (ej. Pavco, Gerfor).',
          'Cada combinación distinta de Característica + Medida + Marca es un producto independiente en el inventario, con su propio stock y precio.',
        ],
      },
      {
        subtitulo: 'Crear una familia por primera vez',
        pasos: [
          'Entra a la ficha del producto y haz clic en "Familia de productos".',
          'Haz clic en "Añadir Miembro".',
          'Haz clic en "+ Característica" y escribe el nombre (ej. "CPVC").',
          'Junto a esa característica, haz clic en "Medida" para agregar una fila de medida — escribe el valor (acepta números, fracciones, decimales o texto libre) y elige la unidad.',
          'Truco: si necesitas varias medidas iguales en características, sepáralas con punto y coma en el mismo campo (ej. "1/2;3/4;1") — cada una se convierte en un producto distinto.',
          'Dentro de cada medida, haz clic en "Marca" para agregar una o más marcas. Si dejas la marca vacía, se guarda como "Generica".',
          'Repite con "+ Característica" para agregar más ramas si las necesitas.',
          'Haz clic en "Crear Familia De Producto". El producto desde el que entraste se convierte en la primera combinación; el resto se crean como productos nuevos.',
        ],
      },
      {
        subtitulo: 'Importante sobre los productos nuevos',
        pasos: [
          'Los productos nuevos de la familia nacen con Stock $0 y Costo $0, y quedan INACTIVOS (no aparecen para vender) hasta que entres a "Editar producto" y los actualices con datos reales — ahí se activan solos.',
          'Heredan del producto de origen: categoría, proveedor(es) (con costo en $0), IVA, y demás datos generales.',
          'Si escribes la misma combinación de Característica + Medida + Marca dos veces, el sistema te avisa antes de guardar y te señala en rojo dónde está el error.',
        ],
      },
      {
        subtitulo: 'Editar una familia ya creada',
        pasos: [
          'Vuelve a hacer clic en "Añadir Miembro" — esta vez carga automáticamente el árbol con todo lo que ya existe.',
          'Si agregas una característica, medida o marca nueva (vacía), se crea un producto nuevo al guardar.',
          'Si borras (papelera) una fila que ya existía, ese producto se desactiva al guardar.',
          'Si solo editas el texto de una medida o marca que ya existía, se actualiza el mismo producto (no se crea uno nuevo ni se borra el anterior).',
        ],
      },
    ],
  },
  {
    id: 'familia-editar-datos',
    categoria: 'Inventario',
    titulo: 'Familia de productos — Editar Datos',
    soloAdmin: false,
    secciones: [
      {
        pasos: [
          'Desde "Familia de productos", haz clic en "Editar Datos" (junto a "Añadir Miembro").',
          'Marca con el check una o más ramas de la lista (puedes usar "Todas"/"Ninguna" para ir rápido).',
          'Llena SOLO los campos que quieras aplicar — todo es opcional: Categoría, Descripción, URL de imagen, IVA incluido, Vender por fracción (y su configuración), y Proveedores asociados (con su código de referencia).',
          'Haz clic en "Aplicar a X seleccionados".',
          'Esto llena esos datos en todos los productos marcados de una sola vez, para no editarlos uno por uno.',
        ],
      },
      {
        subtitulo: 'Importante',
        pasos: [
          'Esta función NO activa los productos ni les asigna stock o precio — eso sigue siendo exclusivo de "Editar producto".',
          'Los proveedores que asignes aquí quedan con costo $0 hasta que los ajustes individualmente.',
        ],
      },
    ],
  },
  {
    id: 'productos-agotados',
    categoria: 'Inventario',
    titulo: 'Consultar productos agotados',
    soloAdmin: false,
    secciones: [
      {
        pasos: [
          'Entra a Inventario → Ver agotados.',
          'Verás el listado de productos con stock en $0, para priorizar el reabastecimiento.',
        ],
      },
    ],
  },
  {
    id: 'clientes',
    categoria: 'Clientes',
    titulo: 'Crear y buscar un cliente',
    soloAdmin: false,
    secciones: [
      {
        pasos: [
          'Entra a Clientes.',
          'Usa el buscador para encontrar uno existente, o haz clic en "Nuevo cliente".',
          'Llena nombre y, si los tienes, NIT/cédula, teléfono, correo y dirección — solo el nombre es obligatorio.',
          'Guarda. El cliente queda disponible para elegir en Nueva Venta.',
        ],
      },
    ],
  },
  {
    id: 'clientes-creditos',
    categoria: 'Clientes',
    titulo: 'Ver los créditos de un cliente',
    soloAdmin: false,
    secciones: [
      {
        pasos: [
          'Entra al perfil del cliente desde el listado de Clientes.',
          'Verás sus créditos activos y pagados, con saldo pendiente y fecha programada de pago.',
          'Desde ahí mismo puedes registrar abonos (ver el tema "Vender a crédito y registrar abonos").',
        ],
      },
    ],
  },
  {
    id: 'garantias-registrar',
    categoria: 'Garantías',
    titulo: 'Registrar una garantía',
    soloAdmin: false,
    secciones: [
      {
        pasos: [
          'Puedes registrar una garantía desde el detalle de una venta (si el producto fue vendido) o directamente desde Inventario → Garantías.',
          'Indica el producto, la cantidad y una observación del motivo.',
          'Guarda — la garantía queda en estado "Pendiente" hasta que el proveedor la reciba o resuelva.',
        ],
      },
    ],
  },
  {
    id: 'garantias-recibir',
    categoria: 'Garantías',
    titulo: 'Recibir una garantía pendiente',
    soloAdmin: false,
    secciones: [
      {
        pasos: [
          'Entra a Inventario → Garantías.',
          'En la lista de "Pendientes", elige la garantía y haz clic en "Recibir".',
          'Indica a qué stock vuelve el producto (almacén o bodega) si aplica.',
          'Confirma — la garantía pasa a "Recibida" y, si corresponde, el stock se ajusta.',
        ],
      },
    ],
  },
  {
    id: 'horario-ver',
    categoria: 'Horario',
    titulo: 'Ver mi horario semanal',
    soloAdmin: false,
    secciones: [
      {
        pasos: [
          'Entra a Horario para ver los turnos asignados de lunes a domingo.',
          'Solo un administrador puede crear o modificar turnos — como empleado, esta vista es de solo consulta.',
        ],
      },
    ],
  },
  {
    id: 'mi-perfil',
    categoria: 'Cuenta',
    titulo: 'Editar mi perfil',
    soloAdmin: false,
    secciones: [
      {
        pasos: [
          'Entra a Mi Perfil desde el menú.',
          'Ahí puedes actualizar tu foto, teléfono y otros datos personales.',
        ],
      },
    ],
  },

  // ============ SOLO ADMINISTRADOR ============
  {
    id: 'crear-producto',
    categoria: 'Inventario (Admin)',
    titulo: 'Crear o editar un producto',
    soloAdmin: true,
    secciones: [
      {
        pasos: [
          'Entra a Inventario → Agregar producto (o "Editar" desde la ficha de uno existente).',
          'Llena nombre, categoría, marca, medida y unidad si aplica.',
          'Define el precio de venta.',
          'Agrega al menos un proveedor con su precio de costo — es obligatorio; sin esto no se puede guardar.',
          'Si hay más de un proveedor, el costo base se toma automáticamente del más bajo, salvo que marques manualmente el check "Usar el precio de este proveedor como costo base" en otro.',
          'Configura IVA, stock por almacén/bodega, y si se vende por fracción (metro, kg, etc.), activa esa opción y define sus datos.',
          'Guarda. El código (SKU) se genera solo si lo dejas vacío.',
        ],
      },
    ],
  },
  {
    id: 'productos-desactivados',
    categoria: 'Inventario (Admin)',
    titulo: 'Productos Desactivados: activar o eliminar',
    soloAdmin: true,
    secciones: [
      {
        pasos: [
          'Entra a Inventario → Desactivados.',
          'Verás dos listas: "Con Registros" (ya se vendieron alguna vez) y "Sin Registros" (nunca se han vendido) — cada una con su buscador.',
          '"Activar producto" pide confirmación y te lleva a "Editar producto" — cualquier guardado ahí lo reactiva.',
          '"Eliminar" (solo disponible en la lista "Sin Registros") borra el producto de la base de datos de forma permanente, junto con su historial de movimientos de inventario. Pide confirmación antes de ejecutar.',
          'Un producto con ventas registradas nunca se puede eliminar de verdad — solo desactivar — para no perder el historial contable.',
        ],
      },
    ],
  },
  {
    id: 'proveedores-pedido',
    categoria: 'Proveedores (Admin)',
    titulo: 'Ver ficha de un proveedor y hacer un pedido sugerido',
    soloAdmin: true,
    secciones: [
      {
        pasos: [
          'Entra a Proveedores y elige uno del listado.',
          'En su ficha verás los productos asociados — si hay muchos, usa el buscador de familia con autocompletado para filtrar por familia de producto.',
          'Haz clic en "Hacer pedido" para que el sistema calcule cantidades sugeridas según la rotación de cada producto en los días que definas.',
          'Ajusta las cantidades sugeridas si lo necesitas y genera o exporta el pedido.',
        ],
      },
    ],
  },
  {
    id: 'proveedores-facturas',
    categoria: 'Proveedores (Admin)',
    titulo: 'Registrar y pagar facturas de proveedor',
    soloAdmin: true,
    secciones: [
      {
        pasos: [
          'Desde la ficha del proveedor, registra una nueva factura con su número, fecha de emisión y monto total.',
          'Para pagarla (total o parcialmente), abre la factura y registra el pago indicando fecha, medio de pago y monto.',
          'El saldo pendiente de la factura se actualiza solo; cuando llega a $0 queda marcada como pagada.',
          'También puedes programar pagos futuros para una factura sin registrarlos como pagados todavía.',
        ],
      },
    ],
  },
  {
    id: 'caja-dia',
    categoria: 'Caja (Admin)',
    titulo: 'Entradas del día, saldos y transferencias entre fondos',
    soloAdmin: true,
    secciones: [
      {
        pasos: [
          'Entra a Caja para ver "Entradas del día" (Efectivo, Nequi, Daviplata, Tarjeta, Crédito y el Gran Total) y "Saldos acumulados por fondo".',
          'Puedes transferir montos entre fondos (ej. de efectivo a Caja Mayor) indicando origen, destino y monto.',
          'También puedes registrar gastos y retiros directamente desde este panel, indicando de qué fondo salen.',
          'Al cerrar el día, el sistema arma el conteo de denominaciones para que cuadres el efectivo físico contra el sistema.',
        ],
      },
    ],
  },
  {
    id: 'empleados-crear',
    categoria: 'Empleados (Admin)',
    titulo: 'Crear un empleado y asignar turnos',
    soloAdmin: true,
    secciones: [
      {
        subtitulo: 'Crear un empleado',
        pasos: [
          'Entra a Empleados → Nuevo empleado.',
          'Llena nombre, rol (empleado o administrador), teléfono y salario base si aplica.',
          'Guarda — el empleado queda disponible para asignarle turnos y, más adelante, nómina.',
        ],
      },
      {
        subtitulo: 'Asignar turnos',
        pasos: [
          'Entra a Horario.',
          'Haz clic en el día y empleado correspondiente para asignar hora de inicio y fin.',
          'El sistema calcula automáticamente las horas trabajadas, y aplica el recargo si el día es domingo o festivo colombiano.',
          'Puedes eliminar un turno ya asignado con la papelera.',
        ],
      },
    ],
  },
  {
    id: 'nomina-pagar',
    categoria: 'Nómina (Admin)',
    titulo: 'Pagar nómina',
    soloAdmin: true,
    secciones: [
      {
        pasos: [
          'Entra a Nómina — verás cada empleado con su salario base, horas trabajadas y estado (pendiente/pagado).',
          'Puedes agregar bonificaciones o deducciones puntuales antes de pagar, con su concepto.',
          'Usa "Pagar" en un empleado puntual, o "Pagar Todos" para liquidar a todo el equipo del período de una vez.',
          'El pago queda registrado con el medio de pago usado y afecta los saldos de caja correspondientes.',
        ],
      },
    ],
  },
  {
    id: 'contabilidad-gastos',
    categoria: 'Contabilidad (Admin)',
    titulo: 'Registrar un gasto',
    soloAdmin: true,
    secciones: [
      {
        pasos: [
          'Entra a Contabilidad.',
          'Registra el gasto indicando categoría (de las configuradas en Configuración → Categorías de gastos), concepto, monto y medio de pago.',
          'Si el gasto es a un proveedor específico, puedes asociarlo para llevar su historial.',
          'El gasto se descuenta automáticamente del fondo elegido, igual que un retiro.',
        ],
      },
    ],
  },
  {
    id: 'reportes',
    categoria: 'Reportes (Admin)',
    titulo: 'Leer el panel de Reportes',
    soloAdmin: true,
    secciones: [
      {
        pasos: [
          'Entra a Reportes y elige el período de análisis (o un rango de fechas personalizado).',
          'Ingresos por medio de pago: ve el detalle de Efectivo, Nequi, Daviplata, Tarjeta, Crédito y el Gran Total.',
          'Ventas por hora del día y Ventas promedio por día de la semana: usa los chips "Valor / Ticket / Valor·Ticket" para cambiar entre ver el dinero total, la cantidad de tickets, o el valor promedio por venta.',
          'Top de productos: cambia entre "más vendidos por cantidad", "mayor ingreso" y "mayor rotación" para priorizar reabastecimiento o promociones.',
          'Ventas por empleado: compara el desempeño del equipo en el período.',
          'Puedes exportar los listados de productos top a PDF desde el botón de descarga.',
        ],
      },
    ],
  },
  {
    id: 'configuracion',
    categoria: 'Configuración (Admin)',
    titulo: 'Categorías, unidades de medida, servicios y datos del negocio',
    soloAdmin: true,
    secciones: [
      {
        pasos: [
          'Entra a Configuración.',
          'Datos del negocio: nombre, NIT, dirección y montos base de caja menor.',
          'Categorías de gastos: agrega o desactiva las categorías disponibles al registrar un gasto.',
          'Servicios: crea o edita los servicios adicionales que se pueden agregar a una venta (instalación, cambio de guardas, etc.).',
          'Unidades de medida: agrega o desactiva las unidades disponibles al crear productos y familias — no necesitas tocar código para esto.',
        ],
      },
    ],
  },
]