require('dotenv').config();
const express = require('express');
const mysql   = require('mysql2/promise');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'oxxo-dev-secret';

app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// ─── DB POOL ────────────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host:            process.env.DB_HOST || 'localhost',
  user:            process.env.DB_USER || 'root',
  password:        process.env.DB_PASS || '',
  database:        process.env.DB_NAME || 'oxxo_comercial',
  waitForConnections: true,
  connectionLimit: 10,
  charset:         'utf8mb4'
});

// ─── COLUMN MAPPING (display ↔ db) ──────────────────────────────────────────
const COL_MAP = {
  'CR':                                    'cr',
  'Retek':                                 'retek',
  'Tienda':                                'tienda',
  'Plaza':                                 'plaza',
  'Municipio':                             'municipio',
  'MS':                                    'ms',
  'Potencial':                             'potencial',
  'NSE':                                   'nse',
  'Iniciativa OHAP':                       'iniciativa_ohap',
  'FyV Nov':                               'fyv_nov',
  'Asesor':                                'asesor',
  'Anl. HOGAR':                            'anl_hogar',
  '# Sem de Visita':                       'sem_visita',
  'Hielera':                               'hielera',
  'POP Exterior':                          'pop_exterior',
  'Exh de Volumen':                        'exh_volumen',
  'Prioridad Hogar':                       'prioridad_hogar',
  'Exh Marca Propia':                      'exh_marca_propia',
  'Vta MP 2025':                           'vta_mp_2025',
  'Exh FyV':                               'exh_fyv',
  'Exh Huevo':                             'exh_huevo',
  'Alimentos Cong.':                       'alimentos_cong',
  'Salchikoxka':                           'salchikoxka',
  'Mascotero':                             'mascotero',
  'Potencial Mascotas':                    'potencial_mascotas',
  'Tortillero':                            'tortillero',
  'Jarceria':                              'jarceria',
  'Mundo del Postre':                      'mundo_postre',
  'Mundo Café Gde':                        'mundo_cafe_gde',
  'Mundo Café Ch':                         'mundo_cafe_ch',
  'Sitck de Café':                         'sitck_cafe',
  'Bascula Electrica':                     'bascula_electrica',
  'Farmacia':                              'farmacia',
  'Exh. Agua Familiar':                    'exh_agua_familiar',
  'Porta Garrafón Ext.':                   'porta_garrafon_ext',
  'Multi Nivel':                           'multi_nivel',
  'Exh DyR':                               'exh_dyr',
  'Exh DyR 3 Frentes':                     'exh_dyr_3_frentes',
  'Comentario y Fecha':                    'comentario_fecha',
  'Simbología':                            'simbologia'
};
const COL_MAP_REV = Object.fromEntries(Object.entries(COL_MAP).map(([k,v])=>[v,k]));

// Normalize raw Excel header: strip \r\n, collapse spaces, trim
function normKey(k) {
  const n = k.replace(/[\r\n]+/g,' ').replace(/\s+/g,' ').trim();
  // Special case: long Comentario column header → short key
  if (n.startsWith('Comentario')) return 'Comentario y Fecha';
  return n;
}

function toDb(obj) {
  const r = {};
  for (const [k, v] of Object.entries(obj)) {
    const dbKey = COL_MAP[normKey(k)];
    if (dbKey) r[dbKey] = v ?? '';
    // silently skip truly unknown columns (no matching db column)
  }
  return r;
}
function toDisplay(row) {
  const r = {};
  for (const [k,v] of Object.entries(row))
    if (!['updated_at','updated_by'].includes(k)) r[COL_MAP_REV[k] || k] = v ?? '';
  return r;
}

// ─── AUTH MIDDLEWARE ─────────────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Sin autorización' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

// POST /api/login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Faltan datos' });
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username.trim()]);
    if (!rows.length) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    const token = jwt.sign(
      { id: rows[0].id, username: rows[0].username, nombre: rows[0].nombre },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, username: rows[0].username, nombre: rows[0].nombre });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/stores?q=texto
app.get('/api/stores', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json([]);
    const like = `%${q}%`;
    // Strip common suffixes for name search
    const qClean = q.replace(/\s+(MAF|TAM|FRA|MRY|CHI|MTY)$/i,'').trim();
    const likeClean = `%${qClean}%`;
    const [rows] = await pool.query(
      `SELECT * FROM stores
       WHERE cr LIKE ? OR tienda LIKE ? OR municipio LIKE ?
       ORDER BY tienda LIMIT 20`,
      [like, likeClean, like]
    );
    res.json(rows.map(toDisplay));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error en búsqueda' });
  }
});

// GET /api/stores/:cr
app.get('/api/stores/:cr', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM stores WHERE cr = ?', [req.params.cr]);
    if (!rows.length) return res.status(404).json({ error: 'Tienda no encontrada' });
    res.json(toDisplay(rows[0]));
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener tienda' });
  }
});

// PUT /api/stores/:cr
app.put('/api/stores/:cr', auth, async (req, res) => {
  try {
    const dbData = toDb(req.body);
    delete dbData.cr; // no actualizar PK
    dbData.updated_by = req.user.username;
    const sets  = Object.keys(dbData).map(k => `\`${k}\` = ?`).join(', ');
    const vals  = [...Object.values(dbData), req.params.cr];
    await pool.query(`UPDATE stores SET ${sets} WHERE cr = ?`, vals);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al guardar' });
  }
});

// POST /api/stores/import  — carga masiva desde Excel parseado en frontend
app.post('/api/stores/import', auth, async (req, res) => {
  const { stores } = req.body;
  if (!stores?.length) return res.status(400).json({ error: 'Sin datos' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let count = 0;
    for (const s of stores) {
      const data = toDb(s);
      if (!data.cr) continue;
      data.updated_by = req.user.username;
      const cols  = Object.keys(data).map(k=>`\`${k}\``).join(', ');
      const ph    = Object.keys(data).map(()=>'?').join(', ');
      const upd   = Object.keys(data).filter(k=>k!=='cr').map(k=>`\`${k}\`=VALUES(\`${k}\`)`).join(', ');
      await conn.query(
        `INSERT INTO stores (${cols}) VALUES (${ph}) ON DUPLICATE KEY UPDATE ${upd}`,
        Object.values(data)
      );
      count++;
    }
    await conn.commit();
    res.json({ ok: true, count });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

// GET /api/stores/count — total de tiendas
app.get('/api/count', auth, async (req, res) => {
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM stores');
  res.json({ total });
});

// ─── START ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`✅  OXXO Comercial corriendo en puerto ${PORT}`));