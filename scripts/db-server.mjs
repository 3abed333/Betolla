import EmbeddedPostgres from "embedded-postgres";
import { Client } from "pg";
import fs from "node:fs";
import path from "node:path";

const port = Number(process.env.BETOLLA_DB_PORT ?? 5433);
const dataDir = path.join(process.cwd(), ".pgdata");
const connectionString = `postgresql://postgres:postgres@localhost:${port}/betolla?sslmode=disable`;

async function isUp() {
  const client = new Client({ connectionString, connectionTimeoutMillis: 1000 });
  try {
    await client.connect();
    await client.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function main() {
  if (await isUp()) {
    console.log(`betolla db: already running on port ${port}`);
    return;
  }

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "postgres",
    port,
    persistent: true,
  });

  const isNew = !fs.existsSync(path.join(dataDir, "PG_VERSION"));
  if (isNew) {
    console.log("betolla db: initializing (first run, ~20s)...");
    await pg.initialise();
  }
  await pg.start();
  if (isNew) {
    // initdb picks up the OS locale (Windows-1252 on this machine), which can't store Arabic
    // text at all - force UTF8/C collation explicitly rather than accepting that default.
    const admin = new Client({
      connectionString: `postgresql://postgres:postgres@localhost:${port}/postgres?sslmode=disable`,
    });
    await admin.connect();
    await admin.query(
      `CREATE DATABASE betolla WITH ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0`,
    );
    await admin.end();
  }
  console.log(`betolla db: ready on port ${port}`);

  const shutdown = async () => {
    console.log("betolla db: stopping...");
    await pg.stop().catch(() => undefined);
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // Keep this process (and the postgres child it owns) alive until stopped.
  await new Promise(() => {});
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
