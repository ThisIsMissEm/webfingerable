import csv from "csv-parser";
import fs from "fs";
import path from "path";

import db from "./utils/db.js";

if (process.argv.length !== 3) {
  console.error("Missing csv filename, usage: npm import [filename.csv]");
  process.exit(1);
}

const domainblocks = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "domain-blocks.json"), "utf-8")
);

const filepath = path.join(process.cwd(), process.argv[2]);
console.log(`Importing ${filepath}...`);

const insertAccount = db.prepare(
  "INSERT INTO accounts (username, domain, uri, url) VALUES (@username, @domain, @uri, @url)"
);

let rows = 0;

fs.createReadStream(filepath)
  .pipe(csv({ headers: ["username", "domain", "uri", "url"], skipLines: 1 }))
  .on("data", (data) => {
    insertAccount.run(data);
    rows++;
  })
  .on("end", () => {
    console.log(`Done! Imported ${rows} rows`);
    db.close();
    process.exit(0);
  });
