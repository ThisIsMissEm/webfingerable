import db from "./utils/db.js";

const selectAccount = db.prepare(`
  SELECT * FROM accounts WHERE domain = :domain AND username = :username
`);

const insertAccount = db.prepare(
  "INSERT INTO accounts (username, domain) VALUES (@username, @domain)"
);

const autoSelectAccount = db.prepare(
  "SELECT username FROM accounts WHERE domain = :domain AND (last_checked_at IS NULL OR last_checked_at < :expiry) ORDER BY username LIMIT 1"
);

const updateAccount = db.prepare(`
  UPDATE accounts SET status = :status, last_checked_at = current_timestamp WHERE domain = :domain AND username = :username
`);

/**
 *
 * @param {string} url
 * @param {RequestInit} init
 * @returns
 */
async function request(url, init) {
  console.log(`Fetching: ${url}...`);

  const result = {
    url,
    status: -1,
    statusText: "",
    ok: false,
    /** @type {string|null} */
    location: "",
  };

  try {
    const request = await fetch(url, {
      ...init,
      headers: {
        ...init.headers,
        "User-Agent": `Webfingerable/0.1.0 (node.js/${process.version}; +http://hachyderm.io/@thisismissem)`,
        Accept: [
          "application/activity+json",
          "application/ld+json",
          'application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
          "application/jrd+json",
          "application/json",
        ].join(", "),
      },
      redirect: "manual",
    });

    result.status = request.status;
    result.statusText = request.statusText.toLowerCase().replace(/\s+/, "_");
    result.ok = true;
    result.location =
      request.status >= 300 && request.status < 400
        ? request.headers.get("location")
        : request.url;

    return result;
  } catch (error) {
    if (error.name === "TimeoutError") {
      result.statusText = "timeout";
    } else if (error.name === "TypeError" && typeof error.cause === "object") {
      if (error.cause.code === "ENOTFOUND") {
        result.statusText = "domain_not_found";
      } else if (error.cause.code === "ECONNREFUSED") {
        result.statusText = "server_not_found";
      } else if (
        error.cause.name === "ConnectTimeoutError" ||
        error.cause.code === "ETIMEDOUT"
      ) {
        result.statusText = "connect_timeout";
      } else if (error.cause.code === "CERT_HAS_EXPIRED") {
        result.statusText = "ssl_cert_expired";
      } else if (error.cause.code === "ERR_TLS_CERT_ALTNAME_INVALID") {
        result.statusText = "ssl_cert_altname_invalid";
      } else {
        console.log("ERR", error.cause);
      }
    } else if (error.code === "ECONNREFUSED") {
      result.statusText = "server_not_found";
    } else {
      console.log(error);
    }

    return result;
  }
}

async function getWebfinger(result, domain, username) {
  const url = `https://${domain}/.well-known/webfinger?resource=acct:${username}@${domain}`;
  const timeout = AbortSignal.timeout(30_000);
  const response = await request(url, {
    signal: timeout,
  });

  result.webfinger_status = response.status;
  result.webfinger_location = response.location;

  // Record that we've fingered that account:
  updateAccount.run({
    domain,
    username,
    status: response.statusText,
  });

  if (response.ok) {
    result.status = "ok";
  } else {
    result.status = "error";
    result.error = response.statusText;
  }
}

async function getHostmeta(result, domain) {
  const url = `https://${domain}/.well-known/host-meta`;
  const timeout = AbortSignal.timeout(30_000);
  const response = await request(url, {
    signal: timeout,
  });

  if (response.ok) {
    result.status = "ok";
    result.hostmeta_status = response.status;
    result.hostmeta_location = response.location;
  } else {
    result.status = "error";
    result.error = response.statusText;
  }
}

export default async function processDomain({ domain, username, expiry }) {
  if (!username) {
    const user = autoSelectAccount.get({ domain, expiry });

    if (!user) {
      return;
    }

    // @ts-ignore
    if (user && user.username) {
      // @ts-ignore
      username = user.username;
    }
  }

  if (!username) {
    throw new TypeError("Missing username");
  }

  console.log(">>", domain, username);

  const result = {
    domain: domain,
    status: "unknown",
    actor: username,
    error: null,
    webfinger_status: -1,
    webfinger_location: null,
    hostmeta_status: -1,
    hostmeta_location: null,
    nodeinfo_status: -1,
    nodeinfo: null,
  };

  // Try webfinger
  await getWebfinger(result, domain, username);

  // If we timeout or don't find the domain, fail fast:
  if (
    result.status !== "ok" &&
    (result.error === "timeout" || result.error === "domain_not_found")
  ) {
    return result;
  }

  // Try hostmeta:
  await getHostmeta(result, domain);

  return result;
}

// If we're executing via `node worker.js <domain> <username>`
if (`file://${process.argv[1]}` === import.meta.url) {
  if (process.argv.length < 3) {
    console.error("Usage: node worker.js <domain> <username>");
    process.exit(1);
  }

  const domain = process.argv[2];
  const username = process.argv[3];

  const acct = selectAccount.get({ domain, username });
  if (!acct) {
    insertAccount.run({ domain, username });
    console.log(`Added account record for ${username}@${domain}`);
  }

  await processDomain({
    domain,
    username,
    expiry: 0,
  })
    .then((result) => {
      console.log(result);
    })
    .catch((err) => {
      console.error("ERR: ", err);
    });
}
