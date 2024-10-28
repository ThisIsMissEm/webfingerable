import path from "node:path";
import fs from "node:fs";
import Piscina from "piscina";
import sqlite from "better-sqlite3";
import QueryStream from "./utils/querystream.js";
import Progress from "./utils/progress.js";

const db = sqlite("data.db", { verbose: console.log });
db.pragma("journal_mode = WAL");

const domainBlockFile = new URL("./domain-blocks.json", import.meta.url)
  .pathname;
const domain_blocks = JSON.parse(fs.readFileSync(domainBlockFile, "utf-8"));

const selectDomains = db.prepare(
  "SELECT domain FROM domains WHERE last_checked_at IS NULL OR last_checked_at < :expiry LIMIT :limit OFFSET :offset"
);

const ONE_DAY_AGO = 60 * 60 * 24;
const expiry = Math.trunc(Math.floor(Date.now() / 1000) - ONE_DAY_AGO);

const domainsStream = new QueryStream(selectDomains, { expiry }, 100, 120);

const maxQueue = 20;

const progress = new Progress();

const pool = new Piscina({
  filename: new URL("./worker.js", import.meta.url).href,
  maxQueue,
});

pool.on("drain", () => {
  if (domainsStream.isPaused()) {
    console.log("resuming...", pool.queueSize);
    domainsStream.resume();
  }
});

domainsStream
  .on("data", ({ domain }) => {
    if (domain_blocks.some((blockedDomain) => domain.endsWith(blockedDomain))) {
      console.log(`Skipping ${domain} as it is blocked`);
      return;
    }

    progress.incSubmitted();
    pool
      .run({ domain })
      .then(() => {
        progress.incCompleted();
      })
      .catch((err) => {
        progress.incFailed();
        domainsStream.destroy(err);
      });

    if (pool.queueSize === maxQueue) {
      console.log("pausing...", pool.queueSize, pool.utilization);
      domainsStream.pause();
    }
  })
  .on("error", console.error)
  .on("end", () => {
    console.log("done");
    progress.done();
  });

process.on("exit", () => {
  console.log("Mean Wait Time:", pool.waitTime.mean, "ms");
  console.log("Mean Run Time:", pool.runTime.mean, "ms");
  console.log("Completed:", pool.completed);
});
