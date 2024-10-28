import db from "./utils/db.js";

db.exec(`
  DROP TABLE IF EXISTS accounts;
  CREATE TABLE accounts(
    'username' varchar NOT NULL,
    'domain' varchar NOT NULL,
    'uri' text,
    'url' text,
    'last_checked_at' datetime,
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

db.exec(`
  DROP TABLE IF EXISTS results;
  CREATE TABLE IF NOT EXISTS results(
    'domain' varchar PRIMARY KEY NOT NULL,
    'status' varchar NOT NULL,
    'actor' varchar NOT NULL,
    'webfinger_status' int,
    'hostmeta_status' int,
    'nodeinfo_status' int,
    'nodeinfo' text,
    'updated_at' datetime default current_timestamp NOT NULL
  );
`);

db.exec(`
  DROP VIEW IF EXISTS domains;
  CREATE VIEW IF NOT EXISTS domains(domain, last_checked_at) AS SELECT DISTINCT domain, last_checked_at FROM accounts;
`);
