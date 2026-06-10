const IS_POSTGRES = !!process.env.DATABASE_URL;

if (IS_POSTGRES) {
  const { Pool } = require("pg");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

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
      await client.query(`
        ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General'
      `);
      console.log("PostgreSQL conectado y tablas listas");
    } catch (err) {
      console.error("Error iniciando PostgreSQL:", err.message);
    } finally {
      client.release();
    }
  }

  initDB();

  function convertQuery(sql, params) {
    let i = 0;
    const pgSql = sql.replace(/\?/g, function() { return "$" + (++i); });
    return { pgSql: pgSql, params: params };
  }

  const db = {
    run: function(sql, params, callback) {
      if (typeof params === "function") { callback = params; params = []; }
      if (!params) params = [];
      var isInsert = /^\s*INSERT/i.test(sql);
      var finalSql = isInsert && !/RETURNING/i.test(sql) ? sql + " RETURNING id" : sql;
      var converted = convertQuery(finalSql, params);
      pool.query(converted.pgSql, converted.params)
        .then(function(result) {
          var lastID = result.rows && result.rows[0] ? result.rows[0].id : null;
          var changes = result.rowCount || 0;
          if (callback) callback.call({ lastID: lastID, changes: changes }, null);
        })
        .catch(function(err) {
          console.error("db.run error:", err.message);
          if (callback) callback(err);
        });
    },

    get: function(sql, params, callback) {
      if (typeof params === "function") { callback = params; params = []; }
      if (!params) params = [];
      var converted = convertQuery(sql, params);
      pool.query(converted.pgSql, converted.params)
        .then(function(result) {
          if (callback) callback(null, result.rows[0] || null);
        })
        .catch(function(err) {
          console.error("db.get error:", err.message);
          if (callback) callback(err, null);
        });
    },

    all: function(sql, params, callback) {
      if (typeof params === "function") { callback = params; params = []; }
      if (!params) params = [];
      var converted = convertQuery(sql, params);
      pool.query(converted.pgSql, converted.params)
        .then(function(result) {
          if (callback) callback(null, result.rows || []);
        })
        .catch(function(err) {
          console.error("db.all error:", err.message);
          if (callback) callback(err, []);
        });
    }
  };

  module.exports = db;

} else {
  const sqlite3 = require("sqlite3").verbose();
  const db = new sqlite3.Database("./database.db");

  db.serialize(function() {
    db.run(
      "CREATE TABLE IF NOT EXISTS users (" +
      "  id       INTEGER PRIMARY KEY AUTOINCREMENT," +
      "  email    TEXT UNIQUE NOT NULL," +
      "  password TEXT NOT NULL" +
      ")"
    );
    db.run(
      "CREATE TABLE IF NOT EXISTS products (" +
      "  id       INTEGER PRIMARY KEY AUTOINCREMENT," +
      "  name     TEXT    NOT NULL," +
      "  date     TEXT    NOT NULL," +
      "  status   TEXT    NOT NULL," +
      "  category TEXT    DEFAULT 'General'," +
      "  user_id  INTEGER NOT NULL," +
      "  FOREIGN KEY(user_id) REFERENCES users(id)" +
      ")"
    );
    db.run(
      "CREATE TABLE IF NOT EXISTS password_resets (" +
      "  id      INTEGER PRIMARY KEY AUTOINCREMENT," +
      "  email   TEXT    NOT NULL," +
      "  token   TEXT    NOT NULL UNIQUE," +
      "  expires INTEGER NOT NULL" +
      ")"
    );
    db.run("ALTER TABLE products ADD COLUMN category TEXT DEFAULT 'General'", function() {});
    console.log("SQLite conectado (modo local)");
  });

  module.exports = db;
}
