-- Lote 3 del orden del catálogo con la referencia de Ranger (herrajes, plomería, jardín). Una sola transacción.
-- Solo cambia categoría y descripción; no cambia nombre, marca, medida, código, stock ni precios.
begin;

-- 1. Los dos registros de gas pasan a la categoría Gas (los de agua siguen en Plomería)
update productos set categoria_id = (select id from categorias_producto where nombre = 'Gas')
where familia_id = (select id from producto_familias where nombre_base = 'Registro') and caracteristica like 'Gas%';

-- 2. La guaya va a Herrajes, junto a sus accesorios (perros, tensores, eslabones, poleas, mosquetones)
update productos set categoria_id = (select id from categorias_producto where nombre = 'Herrajes')
where familia_id = (select id from producto_familias where nombre_base = 'Guaya');

-- 3. El acople rápido es para manguera de aire de compresor, no de jardín
update productos set categoria_id = (select id from categorias_producto where nombre = 'Accesorios para Herramienta Eléctrica')
where familia_id = (select id from producto_familias where nombre_base = 'Acople Rapido');

-- 4. Otros nombres al final de la descripción, solo donde todavía no lo dice
with s(fam, sinonimo, clave) as (values
  ('Mosqueton', 'gancho de seguridad', 'gancho de seguridad'),
  ('Tensor', 'templete', 'templete'),
  ('Racor Para Manguera', 'acople para manguera', 'acople'),
  ('Fumigadora', 'fumigador o bomba de espalda', 'bomba de espalda'),
  ('Polea', 'garrucha', 'garrucha')
)
update productos p
set descripcion = rtrim(coalesce(p.descripcion, '')) || ' También se conoce como ' || s.sinonimo || '.'
from s join producto_familias f on f.nombre_base = s.fam
where p.familia_id = f.id
  and coalesce(p.descripcion, '') not ilike '%' || s.clave || '%';

commit;
