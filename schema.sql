CREATE DATABASE IF NOT EXISTS oxxo_comercial CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE oxxo_comercial;

CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nombre      VARCHAR(200),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stores (
  cr                  VARCHAR(20) PRIMARY KEY,
  retek               VARCHAR(50),
  tienda              VARCHAR(200),
  plaza               VARCHAR(200),
  municipio           VARCHAR(200),
  ms                  VARCHAR(50),
  potencial           VARCHAR(50),
  nse                 VARCHAR(50),
  iniciativa_ohap     VARCHAR(100),
  fyv_nov             VARCHAR(100),
  asesor              VARCHAR(200),
  anl_hogar           VARCHAR(200),
  sem_visita          VARCHAR(50),
  hielera             VARCHAR(50),
  pop_exterior        VARCHAR(100),
  exh_volumen         VARCHAR(100),
  prioridad_hogar     VARCHAR(50),
  exh_marca_propia    VARCHAR(100),
  vta_mp_2025         VARCHAR(100),
  exh_fyv             VARCHAR(100),
  exh_huevo           VARCHAR(100),
  alimentos_cong      VARCHAR(100),
  salchikoxka         VARCHAR(100),
  mascotero           VARCHAR(100),
  potencial_mascotas  VARCHAR(100),
  tortillero          VARCHAR(100),
  jarceria            VARCHAR(100),
  mundo_postre        VARCHAR(100),
  mundo_cafe_gde      VARCHAR(100),
  mundo_cafe_ch       VARCHAR(100),
  sitck_cafe          VARCHAR(100),
  bascula_electrica   VARCHAR(100),
  farmacia            VARCHAR(100),
  exh_agua_familiar   VARCHAR(100),
  porta_garrafon_ext  VARCHAR(100),
  multi_nivel         VARCHAR(100),
  exh_dyr             VARCHAR(100),
  exh_dyr_3_frentes   VARCHAR(100),
  comentario_fecha    TEXT,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by          VARCHAR(100),
  INDEX idx_tienda (tienda),
  INDEX idx_municipio (municipio)
);

-- Usuario admin por defecto (password: oxxo1234)
-- Cambia el hash generando uno nuevo con: node -e "require('bcrypt').hash('tupassword',10).then(console.log)"
INSERT IGNORE INTO users (username, password_hash, nombre)
VALUES ('admin', '$2a$10$SU3GQOf.xd0KNfatfagqqud5WUZ3.Bqd01KiV23zbO8/geMZlReIK', 'Administrador');
