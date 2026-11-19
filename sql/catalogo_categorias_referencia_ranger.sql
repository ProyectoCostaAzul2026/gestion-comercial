-- Lote 1 del orden del catálogo con la referencia de Ranger: solo cambia la categoría.
-- No cambia nombre, marca, medida, código, stock ni precios. Una sola transacción.
begin;

-- 1. Categorías nuevas (la imagen de la tarjeta se toma de una familia que ya la tiene)
insert into categorias_producto (nombre, descripcion, imagen_url)
select v.nombre, v.descripcion, (select imagen_url from producto_familias where nombre_base = v.familia_imagen)
from (values
  ('Seguridad Industrial', 'Elementos de protección personal: guantes, gafas, caretas, cascos, botas, tapabocas y protectores auditivos.', 'Guante'),
  ('Accesorios para Herramienta Eléctrica', 'Brocas, copas sierra, puntas, mandriles, fresas, carbones y accesorios de soldadura para taladros, pulidoras y demás herramientas eléctricas.', 'Broca Para Metal'),
  ('Herramientas de Medición', 'Flexómetros, decámetros, niveles, escuadras, plomadas, calibradores y tiralíneas.', 'Flexometro'),
  ('Llaves y Copas', 'Llaves mixtas, francesas, de tubo, bristol y torx, copas, raches y sus extensiones y adaptadores.', 'Llave Mixta'),
  ('Automotriz', 'Herramientas y accesorios para el carro: cruceta, cables para pasar corriente, infladores, medidores de presión y bola de remolque.', 'Cable Pasa Corriente'),
  ('Gas', 'Pipetas de gas, reguladores, mangueras, racores, válvulas y rejillas de ventilación para gasodomésticos.', 'Regulador De Gas')
) as v(nombre, descripcion, familia_imagen)
where not exists (select 1 from categorias_producto c where c.nombre = v.nombre);

-- 2. Mover los productos (activos e inactivos) de cada familia a su categoría
with m(destino, fam, solo_caracteristica, desde_categoria) as (values
  ('Seguridad Industrial', 'Botas', null, null), ('Seguridad Industrial', 'Casco', null, null),
  ('Seguridad Industrial', 'Gafas De Seguridad', null, null), ('Seguridad Industrial', 'Guante', null, null),
  ('Seguridad Industrial', 'Protector Auditivo', null, null), ('Seguridad Industrial', 'Tapabocas', null, null),
  ('Seguridad Industrial', 'Careta', null, null), ('Seguridad Industrial', 'Vidrio Para Careta', null, null),
  ('Accesorios para Herramienta Eléctrica', 'Adaptador Para Copa Sierra', null, null),
  ('Accesorios para Herramienta Eléctrica', 'Adaptador Para Taladro', null, null),
  ('Accesorios para Herramienta Eléctrica', 'Avellanador', null, null),
  ('Accesorios para Herramienta Eléctrica', 'Broca De Centro', null, null),
  ('Accesorios para Herramienta Eléctrica', 'Broca Escalonada', null, null),
  ('Accesorios para Herramienta Eléctrica', 'Broca Para Concreto', null, null),
  ('Accesorios para Herramienta Eléctrica', 'Broca Para Madera', null, null),
  ('Accesorios para Herramienta Eléctrica', 'Broca Para Metal', null, null),
  ('Accesorios para Herramienta Eléctrica', 'Cincel SDS Plus', null, null),
  ('Accesorios para Herramienta Eléctrica', 'Copa Sierra', null, null),
  ('Accesorios para Herramienta Eléctrica', 'Dado Magnetico', null, null),
  ('Accesorios para Herramienta Eléctrica', 'Escobilla Para Motor', null, null),
  ('Accesorios para Herramienta Eléctrica', 'Fresa', null, null),
  ('Accesorios para Herramienta Eléctrica', 'Llave Para Mandril', null, null),
  ('Accesorios para Herramienta Eléctrica', 'Mandril', null, null),
  ('Accesorios para Herramienta Eléctrica', 'Punta Para Atornillar', null, null),
  ('Accesorios para Herramienta Eléctrica', 'Portaelectrodo', null, null),
  ('Accesorios para Herramienta Eléctrica', 'Soldadura', null, null),
  ('Herramientas de Medición', 'Decametro', null, null), ('Herramientas de Medición', 'Escuadra', null, null),
  ('Herramientas de Medición', 'Flexometro', null, null), ('Herramientas de Medición', 'Nivel', null, null),
  ('Herramientas de Medición', 'Pie De Rey', null, null), ('Herramientas de Medición', 'Plomada', null, null),
  ('Herramientas de Medición', 'Calibrador De Laminas', null, null), ('Herramientas de Medición', 'Tiralineas', null, null),
  ('Llaves y Copas', 'Adaptador Para Copa', null, null), ('Llaves y Copas', 'Copa Para Rache', null, null),
  ('Llaves y Copas', 'Extension Para Copa', null, null), ('Llaves y Copas', 'Llave Bristol', null, null),
  ('Llaves y Copas', 'Llave En T', null, null), ('Llaves y Copas', 'Llave Francesa', null, null),
  ('Llaves y Copas', 'Llave Mixta', null, null), ('Llaves y Copas', 'Llave Torx', null, null),
  ('Llaves y Copas', 'Llave Triceta', null, null), ('Llaves y Copas', 'Llave Tubo', null, null),
  ('Llaves y Copas', 'Rache', null, null), ('Llaves y Copas', 'Union Universal Para Copa', null, null),
  ('Llaves y Copas', 'Destornillador De Copa', null, null),
  ('Automotriz', 'Bola Remolque', null, null), ('Automotriz', 'Bomba Para Inflar', null, null),
  ('Automotriz', 'Cable Pasa Corriente', null, null), ('Automotriz', 'Cruceta Para Carro', null, null),
  ('Automotriz', 'Inflador', null, null), ('Automotriz', 'Medidor De Presion Para Llantas', null, null),
  ('Automotriz', 'Cera Para Autos', null, null),
  ('Gas', 'Gas Butano', null, null), ('Gas', 'Manguera Para Gas', null, null), ('Gas', 'Racor Para Gas', null, null),
  ('Gas', 'Regulador De Gas', null, null), ('Gas', 'Rejilla De Ventilacion', null, null),
  ('Gas', 'Valvula', 'Gas', null),                       -- solo la válvula de gas; las de agua siguen en Plomería
  ('Jardín y Agropecuario', 'Rueda', null, null),         -- rueda y neumático de carretilla
  ('Jardín y Agropecuario', 'Neumatico', null, null),
  ('Varios', 'Zuncho', null, 'Herrajes')                  -- el único zuncho que estaba en Herrajes
)
update productos p
set categoria_id = c_dest.id
from m
join producto_familias f on f.nombre_base = m.fam
join categorias_producto c_dest on c_dest.nombre = m.destino
where p.familia_id = f.id
  and (m.solo_caracteristica is null or p.caracteristica = m.solo_caracteristica)
  and (m.desde_categoria is null
       or p.categoria_id = (select id from categorias_producto where nombre = m.desde_categoria))
  and p.categoria_id is distinct from c_dest.id;

commit;
