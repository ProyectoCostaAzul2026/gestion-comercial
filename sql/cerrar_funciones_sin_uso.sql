-- Migración cerrar_funciones_sin_uso (2026-11-19)
-- La app no usa estas funciones y cualquier usuario con sesión podía ejecutarlas.
-- abrir_caja y cerrar_caja son la versión vieja de la caja (hoy se cierra con cerrar_caja_arqueo);
-- rls_auto_enable es una función interna de la base. Se conservan, solo se les quita el permiso.
-- Para deshacer: grant execute on function ... to authenticated;
revoke execute on function public.abrir_caja(numeric) from public, anon, authenticated;
revoke execute on function public.cerrar_caja(text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
