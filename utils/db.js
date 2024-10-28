import sqlite from "better-sqlite3";

const db = sqlite("data.db", { verbose: console.log });
db.pragma("journal_mode = WAL");

export default db;
