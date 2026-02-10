-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS mrfrio;
USE mrfrio;

-- Tabla de usuarios del sistema (autenticación)
-- Nota: Los roles en la aplicación se manejan como 'ADMIN', 'REPARTIDOR', 'SUPERVISOR'.
-- En la base de datos se almacenan como 'admin', 'rutero', 'visor' respectivamente.
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  role ENUM('admin','rutero','visor') DEFAULT 'rutero',
  password_hash VARCHAR(255) NOT NULL,
  rutero_id INT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (rutero_id) REFERENCES ruteros(id) ON DELETE SET NULL
);

-- Tabla de ruteros (conductores)
CREATE TABLE IF NOT EXISTS ruteros (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  telefono VARCHAR(20),
  activo BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de rutas
CREATE TABLE IF NOT EXISTS rutas (
  id VARCHAR(10) PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE
);

-- Tabla de productos
CREATE TABLE IF NOT EXISTS productos (
  id VARCHAR(20) PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE
);

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id VARCHAR(36) PRIMARY KEY,
  local VARCHAR(100) NOT NULL,
  telefono VARCHAR(20),
  direccion TEXT NOT NULL,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  tiene_refrigerador BOOLEAN DEFAULT FALSE,
  capacidad_refrigerador VARCHAR(50),
  isExtra BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  limite_credito DECIMAL(10,2) DEFAULT 0,
  credito_usado DECIMAL(10,2) DEFAULT 0,
  credito_disponible DECIMAL(10,2) DEFAULT 0,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de relación entre clientes y rutas
CREATE TABLE IF NOT EXISTS clientes_rutas (
  cliente_id VARCHAR(36),
  ruta_id VARCHAR(10),
  orden INT DEFAULT NULL,
  dia_lunes BOOLEAN DEFAULT FALSE,
  dia_martes BOOLEAN DEFAULT FALSE,
  dia_miercoles BOOLEAN DEFAULT FALSE,
  dia_jueves BOOLEAN DEFAULT FALSE,
  dia_viernes BOOLEAN DEFAULT FALSE,
  dia_sabado BOOLEAN DEFAULT FALSE,
  dia_domingo BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (cliente_id, ruta_id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  FOREIGN KEY (ruta_id) REFERENCES rutas(id) ON DELETE CASCADE
);

-- Tabla de asignaciones de rutas
CREATE TABLE IF NOT EXISTS asignaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ruta_id VARCHAR(10) NOT NULL,
  rutero_id INT NOT NULL,
  fecha DATETIME NOT NULL,
  estado ENUM('pendiente', 'en_progreso', 'completada', 'cancelada') DEFAULT 'pendiente',
  FOREIGN KEY (ruta_id) REFERENCES rutas(id),
  FOREIGN KEY (rutero_id) REFERENCES ruteros(id)
);

-- Tabla de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asignacion_id INT NOT NULL,
  cliente_id VARCHAR(36) NOT NULL,
  estado ENUM('pendiente', 'completado', 'cancelado') DEFAULT 'pendiente',
  motivo_cancelacion TEXT,
  gourmet15 INT DEFAULT 0,
  gourmet5 INT DEFAULT 0,
  barraHielo INT DEFAULT 0,
  mediaBarra INT DEFAULT 0,
  premium INT DEFAULT 0,
  credito_usado DECIMAL(10,2) DEFAULT 0,
  FOREIGN KEY (asignacion_id) REFERENCES asignaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

-- Tabla de historial de crédito
CREATE TABLE IF NOT EXISTS historial_credito (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id VARCHAR(36) NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  tipo ENUM('uso', 'pago', 'ajuste') DEFAULT 'uso',
  pedido_id INT NULL,
  descripcion VARCHAR(255),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

-- Tabla de sobrantes
CREATE TABLE IF NOT EXISTS sobrantes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rutero_id INT NOT NULL,
  ruta_id VARCHAR(10) NOT NULL,
  fecha DATE NOT NULL,
  gourmet15 INT DEFAULT 0,
  gourmet5 INT DEFAULT 0,
  barraHielo INT DEFAULT 0,
  mediaBarra INT DEFAULT 0,
  premium INT DEFAULT 0,
  FOREIGN KEY (rutero_id) REFERENCES ruteros(id),
  FOREIGN KEY (ruta_id) REFERENCES rutas(id)
);

-- Insertar datos de ejemplo para productos
INSERT INTO productos (id, nombre) VALUES
('gourmet15', 'GOURMET 15KG'),
('gourmet5', 'GOURMET 5KG'),
('barraHielo', 'BARRA HIELO'),
('mediaBarra', 'MEDIA BARRA'),
('premium', 'PREMIUM');

-- Insertar datos de ejemplo para ruteros
INSERT INTO ruteros (nombre, telefono) VALUES
('Juan Pérez', '(444) 123-4567'),
('María González', '(444) 234-5678'),
('Carlos Rodríguez', '(444) 345-6789'),
('Ana Martínez', '(444) 456-7890');

-- Insertar datos de ejemplo para rutas
INSERT INTO rutas (id, nombre) VALUES
('101', 'Ruta 101'),
('102', 'Ruta 102'),
('103', 'Ruta 103'),
('104', 'Ruta 104'),
('105', 'Ruta 105'),
('106', 'Ruta 106'),
('107', 'Ruta 107'),
('LOCAL', 'Ruta LOCAL');

-- Insertar datos de ejemplo para clientes
INSERT INTO clientes (id, local, telefono, direccion, lat, lng, isExtra) VALUES
('2', 'Oxxo Centro', '(444) 111-2222', 'Av. Universidad 123, SLP', 22.1505, -100.9789, FALSE),
('3', 'Tienda Don Juan', '(444) 222-3333', 'Calle Hidalgo 456, SLP', 22.1523, -100.9765, FALSE),
('4', 'Super Express', '(444) 333-4444', 'Av. Carranza 789, SLP', 22.1489, -100.9812, FALSE),
('5', 'Abarrotes La Luz', '(444) 444-5555', 'Calle Reforma 234, SLP', 22.1534, -100.9745, FALSE),
('6', 'Minisuper El Sol', '(444) 555-6666', 'Av. Salvador Nava 567, SLP', 22.1478, -100.9834, FALSE),
('7', 'Tienda La Estrella', '(444) 666-7777', 'Calle Morelos 890, SLP', 22.1512, -100.9778, FALSE),
('8', 'Abarrotes El Ahorro', '(444) 777-8888', 'Av. Himno Nacional 123, SLP', 22.1545, -100.9723, FALSE),
('9', 'Minisuper 24/7', '(444) 888-9999', 'Calle Constitución 456, SLP', 22.1467, -100.9856, FALSE),
('10', 'Tienda La Central', '(444) 999-0000', 'Av. Chapultepec 789, SLP', 22.1556, -100.9701, FALSE),
('11', 'Abarrotes Don Pedro', '(444) 000-1111', 'Calle Juárez 012, SLP', 22.1456, -100.9878, FALSE),
('12', 'Tienda La Bodega', '(444) 111-0000', 'Av. Universidad 345, SLP', 22.1501, -100.9799, FALSE),
('extra_101', 'Extra 101', '', 'San Luis Potosí, México', 22.1565, -100.9855, TRUE),
('extra_102', 'Extra 102', '', 'San Luis Potosí, México', 22.1565, -100.9855, TRUE),
('extra_103', 'Extra 103', '', 'San Luis Potosí, México', 22.1565, -100.9855, TRUE),
('extra_104', 'Extra 104', '', 'San Luis Potosí, México', 22.1565, -100.9855, TRUE),
('extra_105', 'Extra 105', '', 'San Luis Potosí, México', 22.1565, -100.9855, TRUE),
('extra_106', 'Extra 106', '', 'San Luis Potosí, México', 22.1565, -100.9855, TRUE),
('extra_107', 'Extra 107', '', 'San Luis Potosí, México', 22.1565, -100.9855, TRUE),
('extra_local', 'Extra LOCAL', '', 'San Luis Potosí, México', 22.1565, -100.9855, TRUE);

-- Asignar clientes a rutas
INSERT INTO clientes_rutas (cliente_id, ruta_id, dia_lunes, dia_miercoles, dia_viernes) VALUES
('2', '101', TRUE, TRUE, TRUE),
('3', '101', TRUE, TRUE, TRUE),
('extra_101', '101', TRUE, TRUE, TRUE);

INSERT INTO clientes_rutas (cliente_id, ruta_id, dia_martes, dia_jueves, dia_sabado) VALUES
('4', '102', TRUE, TRUE, TRUE),
('5', '102', TRUE, TRUE, TRUE),
('extra_102', '102', TRUE, TRUE, TRUE);

INSERT INTO clientes_rutas (cliente_id, ruta_id, dia_lunes, dia_miercoles, dia_viernes) VALUES
('6', '103', TRUE, TRUE, TRUE),
('extra_103', '103', TRUE, TRUE, TRUE);

INSERT INTO clientes_rutas (cliente_id, ruta_id, dia_martes, dia_jueves, dia_sabado) VALUES
('7', '104', TRUE, TRUE, TRUE),
('8', '104', TRUE, TRUE, TRUE),
('extra_104', '104', TRUE, TRUE, TRUE);

INSERT INTO clientes_rutas (cliente_id, ruta_id, dia_lunes, dia_miercoles, dia_viernes) VALUES
('9', '105', TRUE, TRUE, TRUE),
('extra_105', '105', TRUE, TRUE, TRUE);

INSERT INTO clientes_rutas (cliente_id, ruta_id, dia_martes, dia_jueves, dia_sabado) VALUES
('10', '106', TRUE, TRUE, TRUE),
('extra_106', '106', TRUE, TRUE, TRUE);

INSERT INTO clientes_rutas (cliente_id, ruta_id, dia_lunes, dia_miercoles, dia_viernes) VALUES
('11', '107', TRUE, TRUE, TRUE),
('extra_107', '107', TRUE, TRUE, TRUE);

INSERT INTO clientes_rutas (cliente_id, ruta_id, dia_lunes, dia_martes, dia_miercoles, dia_jueves, dia_viernes) VALUES
('12', 'LOCAL', TRUE, TRUE, TRUE, TRUE, TRUE),
('extra_local', 'LOCAL', TRUE, TRUE, TRUE, TRUE, TRUE);

-- Insertar datos de ejemplo para sobrantes
INSERT INTO sobrantes (rutero_id, ruta_id, fecha, gourmet15, gourmet5, barraHielo, mediaBarra, premium) VALUES
(1, '101', '2025-05-06', 10, 10, 11, 10, 10),
(1, '101', '2025-04-02', 0, 0, 13, 0, 0),
(1, '101', '2025-04-01', 60, 60, 60, 60, 60),
(1, '102', '2025-03-27', 12, 12, 12, 0, 12),
(2, '103', '2025-05-06', 10, 10, 11, 10, 10),
(2, '103', '2025-04-02', 0, 0, 13, 0, 0),
(2, '103', '2025-04-01', 60, 60, 60, 60, 60),
(2, '102', '2025-03-27', 12, 12, 12, 0, 12),
(3, '104', '2025-05-05', 5, 8, 0, 3, 7),
(3, '105', '2025-04-15', 2, 0, 5, 0, 1),
(4, '106', '2025-05-04', 3, 6, 9, 4, 0),
(4, '107', '2025-04-10', 7, 2, 0, 5, 8);
