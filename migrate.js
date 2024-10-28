import db from "./utils/db.js";

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
