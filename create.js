import db from "./utils/db.js";

let drop = false;
if (process.argv[2] === "reset") {
  drop = true;
}

if (drop) db.exec(`DROP TABLE IF EXISTS accounts;`);

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts(
    'username' varchar NOT NULL,
    'domain' varchar NOT NULL,
    'uri' text,
    'url' text,
    'last_checked_at' datetime,
    'status' text,
    PRIMARY KEY(username, domain)
  );
`);

/*
interface Result {
  domain: 'domain.example'
  status: 'available' | 'timeout' | 'error'
  webfinger_status: 200 / 404 / 400
  hostmeta_status: 200 / 404 / etc
  created_at: int
}
*/

if (drop) db.exec("DROP TABLE IF EXISTS results;");

db.exec(`
  CREATE TABLE IF NOT EXISTS results(
    'id' varchar PRIMARY KEY DESC,
    'domain' varchar NOT NULL,
    'actor' varchar,
    'status' varchar NOT NULL,
    'error' text,
    'webfinger_status' int,
    'webfinger_location' text,
    'hostmeta_status' int,
    'hostmeta_location' text,
    'nodeinfo_status' int,
    'nodeinfo' text,
    'updated_at' datetime default current_timestamp NOT NULL
  );
`);

db.exec(`
  DROP VIEW IF EXISTS domains;
  CREATE VIEW IF NOT EXISTS domains(domain, last_checked_at) AS SELECT DISTINCT domain, last_checked_at FROM accounts;
`);
