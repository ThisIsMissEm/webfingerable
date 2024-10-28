import sqlite from "better-sqlite3";

const db = sqlite("data.db", { verbose: console.log });
db.pragma("journal_mode = WAL");

// const currentSchema = db.pragma("table_info('accounts');");
// if (
//   Array.isArray(currentSchema) &&
//   currentSchema.some(
//     (col) => col.name === "last_checked_at" && col.type === "INT"
//   )
// ) {
//   db.exec(`
//     ALTER TABLE accounts DROP COLUMN last_checked_at;
//     ALTER TABLE accounts ADD COLUMN last_checked_at datetime;
//   `);
// }
