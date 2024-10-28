import path from "node:path";
import fs from "node:fs";
import { v7 as uuidv7 } from "uuid";
import Piscina from "piscina";
import QueryStream from "./utils/querystream.js";
import Progress from "./utils/progress.js";
import db from "./utils/db.js";

const domainBlockFile = new URL("./domain-blocks.json", import.meta.url)
  .pathname;
const domain_blocks = JSON.parse(fs.readFileSync(domainBlockFile, "utf-8"));

const selectDomains = db.prepare(
  "SELECT domain FROM domains WHERE last_checked_at IS NULL OR last_checked_at < :expiry LIMIT :limit OFFSET :offset"
);

const insertFailure = db.prepare(`
  INSERT INTO results (id, domain, status, error) VALUES (:id, :domain, :status, :error)
  `);

const insertResult = db.prepare(`
  INSERT INTO results (
    id,
    domain,
    status,
    error,
    actor,
    webfinger_status,
    webfinger_location,
    hostmeta_status,
    hostmeta_location,
    nodeinfo_status,
    nodeinfo
  ) VALUES (
    :id,
    :domain,
    :status,
    :error,
    :actor,
    :webfinger_status,
    :webfinger_location,
    :hostmeta_status,
    :hostmeta_location,
    :nodeinfo_status,
    :nodeinfo
  )  
`);

const ONE_DAY_AGO = 60 * 60 * 24;
const expiry = Math.trunc(Math.floor(Date.now() / 1000) - ONE_DAY_AGO);

const domainsStream = new QueryStream(selectDomains, { expiry }, 200);

const maxQueue = 250;

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
      .run({ domain, expiry })
      .then((result) => {
        console.log("<<", result);

        if (!result) {
          console.log("Not processed:", domain);
          progress.incCompleted();
          return;
        }

        /*
        {
          domain: 'strangeparts.com',
          status: 'ok',
          error: string | null,
          actor: 'strangeparts',
          webfinger_status: 404,
          webfinger_location: 'https://strangeparts.com/.well-known/webfinger?resource=acct:strangeparts@strangeparts.com',
          hostmeta_status: 301,
          hostmeta_location: 'https://mastodon.strangeparts.com/.well-known/host-meta',
          nodeinfo_status: -1,
          nodeinfo: null
        }
        */

        insertResult.run({ id: uuidv7(), ...result });
        progress.incCompleted();
      })
      .catch((err) => {
        console.error("ERR", err);
        insertFailure.run({
          id: uuidv7(),
          domain,
          actor: null,
          status: "error",
          error: err,
        });

        progress.incFailed();
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

    console.log(progress.message);
  });

process.on("exit", () => {
  console.log("Mean Wait Time:", pool.waitTime.mean, "ms");
  console.log("Mean Run Time:", pool.runTime.mean, "ms");
  console.log("Pool Completed:", pool.completed);
});
