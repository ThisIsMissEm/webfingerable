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

// const currentSchema = db.pragma("table_info('results');");
// if (Array.isArray(currentSchema)) {
//   if (!currentSchema.find((col) => col.name === "webfinger_location")) {
//     db.exec(`
//       ALTER TABLE results ADD COLUMN webfinger_location text;
//     `);
//   }

//   if (!currentSchema.find((col) => col.name === "hostmeta_location")) {
//     db.exec(`
//       ALTER TABLE results ADD COLUMN hostmeta_location text;
//     `);
//   }
// }
