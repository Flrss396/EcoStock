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

  // Migración: agregar columna category si no existe (para bases de datos antiguas)
  db.run(`ALTER TABLE products ADD COLUMN category TEXT DEFAULT 'General'`, (err) => {
    if (err && !err.message.includes("duplicate column")) {
      // La columna ya existe, no es un error real
    }
  });

});

module.exports = db;
