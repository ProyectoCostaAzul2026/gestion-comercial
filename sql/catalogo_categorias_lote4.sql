-- Lote 4: clasificación inferida del propio catálogo (sin Ranger). Solo cambia la categoría. Una sola transacción.
begin;

insert into categorias_producto (nombre, descripcion, imagen_url)
select v.nombre, v.descripcion, (select imagen_url from producto_familias where nombre_base = v.familia_imagen)
from (values
  ('Iluminación', 'Bombillos, paneles, reflectores, cintas y regletas LED, rosetas, portalámparas, fotoceldas, sensores de movimiento y linternas.', 'Bombillo LED'),
  ('Electrónica, Audio y Video', 'Antenas, cables y conectores de audio, video y red, convertidores, soportes para TV, pilas y componentes de electrónica.', 'Antena De TV'),
  ('Empaque y Amarre', 'Amarres plásticos, cuerdas, piolas, hilos, pulpos elásticos, zunchos, vinipel y cartón para amarrar, embalar y proteger.', 'Cuerda')
) as v(nombre, descripcion, familia_imagen)
where not exists (select 1 from categorias_producto c where c.nombre = v.nombre);

with m(destino, fam, solo_caracteristica_like) as (values
  ('Iluminación', 'Bombillo LED', null), ('Iluminación', 'Bombillo Candelabro', null), ('Iluminación', 'Panel LED', null),
  ('Iluminación', 'Reflector LED', null), ('Iluminación', 'Regleta LED', null), ('Iluminación', 'Cinta LED', null),
  ('Iluminación', 'Lampara LED', null), ('Iluminación', 'Linterna', null), ('Iluminación', 'Portalampara', null),
  ('Iluminación', 'Roseta', null), ('Iluminación', 'Fotocelda', null),
  ('Iluminación', 'Sensor', 'Movimiento%'),          -- el sensor anunciador con alarma se queda en Eléctrico
  ('Electrónica, Audio y Video', 'Antena De TV', null), ('Electrónica, Audio y Video', 'Cable Audio Y Video', null),
  ('Electrónica, Audio y Video', 'Conector Coaxial', null), ('Electrónica, Audio y Video', 'Conector RJ45', null),
  ('Electrónica, Audio y Video', 'Convertidor Audio', null), ('Electrónica, Audio y Video', 'Splitter Coaxial', null),
  ('Electrónica, Audio y Video', 'Protoboard', null), ('Electrónica, Audio y Video', 'Resistencia Electronica', null),
  ('Electrónica, Audio y Video', 'Motor DC', null), ('Electrónica, Audio y Video', 'Jumper', null),
  ('Electrónica, Audio y Video', 'Pila', null), ('Electrónica, Audio y Video', 'Portapilas', null),
  ('Electrónica, Audio y Video', 'Estaño Para Soldar', null), ('Electrónica, Audio y Video', 'Pasta Para Soldar', null),
  ('Electrónica, Audio y Video', 'Soporte Para TV', null),
  ('Empaque y Amarre', 'Cuerda', null), ('Empaque y Amarre', 'Piola', null), ('Empaque y Amarre', 'Hilo', null),
  ('Empaque y Amarre', 'Pulpo Elastico', null), ('Empaque y Amarre', 'Zuncho', null), ('Empaque y Amarre', 'Vinipel', null),
  ('Empaque y Amarre', 'Rollo De Carton', null),
  ('Empaque y Amarre', 'Amarre Plastico', null),
  ('Jardín y Agropecuario', 'Pegante Para Ratas', null),  -- control de plagas, junto al veneno
  ('Jardín y Agropecuario', 'Trampa Para Raton', null)
)
update productos p
set categoria_id = c_dest.id
from m
join producto_familias f on f.nombre_base = m.fam
join categorias_producto c_dest on c_dest.nombre = m.destino
where p.familia_id = f.id
  and (m.solo_caracteristica_like is null or p.caracteristica like m.solo_caracteristica_like)
  and p.categoria_id is distinct from c_dest.id;

commit;
