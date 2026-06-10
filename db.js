S
/**
 * EcoStock — Capa de base de datos universal
 * - LOCAL:      Usa SQLite (sin configuración extra)
 * - RAILWAY:    Usa PostgreSQL (cuando DATABASE_URL está presente)
 *
 * Expone la misma API que antes: db.run(), db.get(), db.all()
 * El server.js no necesita ningún cambio.
 */
 
const IS_POSTGRES = !!process.env.DATABASE_URL;
 
// ─────────────────────────────────────────────
// MODO POSTGRESQL
// ─────────────────────────────────────────────
if (IS_POSTGRES) {
  const { Pool } = require("pg");
 
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }   // Railway requiere SSL
  });
 
  // Crear tablas si no existen
  async function initDB() {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id       SERIAL PRIMARY KEY,
          email    TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS products (
          id       SERIAL PRIMARY KEY,
          name     TEXT    NOT NULL,
          date     TEXT    NOT NULL,
          status   TEXT    NOT NULL,
          category TEXT    DEFAULT 'General',
          user_id  INTEGER NOT NULL REFERENCES users(id)
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS password_resets (
          id      SERIAL PRIMARY KEY,
          email   TEXT    NOT NULL,
          token   TEXT    NOT NULL UNIQUE,
          expires BIGINT  NOT NULL
        )
      `);
      // Migración segura: agregar columna si no existe
      await client.query(`
        ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General'
      `);
      console.log("✅ PostgreSQL conectado y tablas listas");
    } catch (err) {
      console.error("❌ Error iniciando PostgreSQL:", err.message);
    } finally {
      client.release();
    }
  }
 
  initDB();
 
  /**
   * Convierte el formato de placeholders SQLite (?) a PostgreSQL ($1, $2, ...)
   * y los valores de array a formato pg.
   */
  function convertQuery(sql, params = []) {
    let i = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++i}`);
    return { pgSql, params };
  }
 
  /**
   * Wrapper que imita la API de sqlite3:
   *   db.run(sql, params, callback)   — INSERT / UPDATE / DELETE
   *   db.get(sql, params, callback)   — SELECT una fila
   *   db.all(sql, params, callback)   — SELECT todas las filas
   */
  const db = {
    run(sql, params = [], callback) {
      if (typeof params === "function") { callback = params; params = []; }
      const { pgSql, params: pgParams } = convertQuery(sql, params);
 
      pool.query(pgSql, pgParams)
        .then((result) => {
          // Imitar `this.lastID` de SQLite usando RETURNING id
          const lastID = result.rows && result.rows[0] ? result.rows[0].id : null;
          const changes = result.rowCount || 0;
          if (callback) callback.call({ lastID, changes }, null);
        })
        .catch((err) => {
          console.error("db.run error:", err.message, "|", pgSql);
          if (callback) callback(err);
        });
    },
 
    get(sql, params = [], callback) {
      if (typeof params === "function") { callback = params; params = []; }
      const { pgSql, params: pgParams } = convertQuery(sql, params);
 
      pool.query(pgSql, pgParams)
        .then((result) => {
          if (callback) callback(null, result.rows[0] || null);
        })
        .catch((err) => {
          console.error("db.get error:", err.message, "|", pgSql);
          if (callback) callback(err, null);
        });
    },
 
    all(sql, params = [], callback) {
      if (typeof params === "function") { callback = params; params = []; }
      const { pgSql, params: pgParams } = convertQuery(sql, params);
 
      pool.query(pgSql, pgParams)
        .then((result) => {
          if (callback) callback(null, result.rows || []);
        })
        .catch((err) => {
          console.error("db.all error:", err.message, "|", pgSql);
          if (callback) callback(err, []);
        });
    }
  };
 
  // Para que db.run en INSERTs devuelva lastID, añadimos RETURNING id automáticamente
  const _run = db.run.bind(db);
  db.run = function(sql, params = [], callback) {
    if (typeof params === "function") { callback = params; params = []; }
    // Solo en INSERT, añadir RETURNING id para obtener lastID
    const isInsert = /^\s*INSERT/i.test(sql);
    const finalSql = isInsert && !/RETURNING/i.test(sql) ? sql + " RETURNING id" : sql;
    _run(finalSql, params, callback);
  };
 
  module.exports = db;
 
// ─────────────────────────────────────────────
// MODO SQLITE (local / desarrollo)
// ─────────────────────────────────────────────
} else {
  const sqlite3 = require("sqlite3").verbose();
  const db = new sqlite3.Database("./database.db");
 
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        email    TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        name     TEXT    NOT NULL,
        date     TEXT    NOT NULL,
        status   TEXT    NOT NULL,
        category TEXT    DEFAULT 'General',
        user_id  INTEGER NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        email   TEXT    NOT NULL,
        token   TEXT    NOT NULL UNIQUE,
        expires INTEGER NOT NULL
      )
    `);
    db.run(`ALTER TABLE products ADD COLUMN category TEXT DEFAULT 'General'`, () => {});
    console.log("✅ SQLite conectado (modo local)");
  });
 
  module.exports = db;
}