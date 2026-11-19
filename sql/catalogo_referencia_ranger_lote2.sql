-- Lote 2 del orden del catálogo con la referencia de Ranger (herramientas). Una sola transacción.
-- No cambia marca, medida, código, stock ni precios.
begin;

-- 1. Volvedores y mango en T salen de "Rache" (Ranger los separa: no tienen trinquete)
insert into producto_familias (nombre_base, imagen_url)
select v.n, case when v.n = 'Volvedor' then (select p.imagen_url from productos p where p.codigo = 'RAC-0019') end
from (values ('Volvedor'), ('Mango En T')) v(n)
where not exists (select 1 from producto_familias f where lower(f.nombre_base) = lower(v.n));

with d(codigo, familia, caracteristica) as (values
  ('RAC-0019', 'Volvedor', 'Palanca De Fuerza'),
  ('RAC-0007', 'Volvedor', 'En L 10 mm'),
  ('RAC-0008', 'Volvedor', 'En L 250 mm'),
  ('RAC-0006', 'Mango En T', 'Corredizo')
)
update productos p
set familia_id = f.id, caracteristica = d.caracteristica, nombre = f.nombre_base || ' - ' || d.caracteristica
from d join producto_familias f on f.nombre_base = d.familia
where p.codigo = d.codigo;

-- 2. Categoría: la pinza de masa va con el portaelectrodo; el soplete de gas no es herramienta eléctrica
update productos set categoria_id = (select id from categorias_producto where nombre = 'Accesorios para Herramienta Eléctrica')
where familia_id = (select id from producto_familias where nombre_base = 'Pinza De Masa');
update productos set categoria_id = (select id from categorias_producto where nombre = 'Herramientas Manuales')
where familia_id = (select id from producto_familias where nombre_base = 'Soplete');

-- 3. Otros nombres con que se conoce cada herramienta, al final de la descripción (el buscador de Ventas
--    también busca en la descripción). Solo donde la descripción todavía no lo dice.
with s(fam, sinonimo, clave) as (values
  ('Llave Mixta', 'llave combinada', 'combinada'),
  ('Llave Tubo', 'llave para tubo o llave Stillson', 'stillson'),
  ('Rache', 'ratchet o matraca', 'ratchet'),
  ('Volvedor', 'palanca de fuerza o maneral', 'maneral'),
  ('Mango En T', 'maneral en T', 'maneral'),
  ('Machuelo', 'macho de roscar', 'macho'),
  ('Tarraja', 'terraja', 'terraja'),
  ('Pie De Rey', 'calibrador vernier', 'vernier'),
  ('Punta Para Atornillar', 'bits para atornillar', 'bits'),
  ('Copa Sierra', 'sierra copa o sierra perforadora', 'sierra copa'),
  ('Disco Flap', 'disco laminado', 'laminado'),
  ('Cruceta Para Carro', 'llave de cruz para llantas', 'llantas'),
  ('Guaya', 'cable de acero', 'cable de acero'),
  ('Armella', 'cáncamo', 'cáncamo'),
  ('Cerradura', 'chapa', 'chapa'),
  ('Valvula Cheque', 'cheque o válvula de retención', 'retención'),
  ('Soplete', 'antorcha de gas', 'antorcha'),
  ('Rodachina', 'rodachín o rueda giratoria', 'rodachín'),
  ('Protector Auditivo', 'protector de oídos', 'oídos'),
  ('Gafas De Seguridad', 'lentes de seguridad o monogafas', 'lentes'),
  ('Careta', 'máscara facial', 'máscara'),
  ('Bisturi', 'cortador o cuchilla retráctil', 'cortador'),
  ('Tiralineas', 'cordel marcador', 'cordel'),
  ('Mandril', 'broquero', 'broquero'),
  ('Llave Para Mandril', 'llave de broquero', 'broquero'),
  ('Pulidora', 'esmeriladora angular', 'esmeriladora'),
  ('Rotomartillo', 'martillo perforador', 'perforador'),
  ('Remachadora', 'pistola remachadora', 'pistola'),
  ('Ponchadora', 'crimpeadora', 'crimp')
)
update productos p
set descripcion = rtrim(coalesce(p.descripcion, '')) || ' También se conoce como ' || s.sinonimo || '.'
from s join producto_familias f on f.nombre_base = s.fam
where p.familia_id = f.id
  and coalesce(p.descripcion, '') not ilike '%' || s.clave || '%';

commit;
