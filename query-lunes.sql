SELECT c.local, c.direccion, c.telefono FROM clientes c JOIN clientes_rutas cr ON c.id = cr.cliente_id WHERE cr.ruta_id = '101' AND cr.dia_lunes = 1 AND c.activo = 1 ORDER BY cr.orden;
