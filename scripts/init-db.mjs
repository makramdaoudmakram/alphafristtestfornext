import bcrypt from "bcryptjs";
import { execFile } from "child_process";
import { readFileSync, existsSync, copyFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

async function loadSqlDriver() {
  try {
    return (await import("mssql")).default;
  } catch {
    console.error(
      "Missing optional packages for init-db. Install locally with:\n" +
        "  npm install mssql msnodesqlv8\n"
    );
    process.exit(1);
  }
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    process.env[key] = value;
  }
}

function loadEnv() {
  const envPath = resolve(rootDir, ".env");
  const localPath = resolve(rootDir, ".env.local");
  const examplePath = resolve(rootDir, ".env.example");

  if (!existsSync(envPath) && !existsSync(localPath)) {
    if (existsSync(examplePath)) {
      copyFileSync(examplePath, envPath);
      console.log("Created .env from .env.example");
    } else {
      console.error("Missing .env file. Copy .env.example to .env and configure it.");
      process.exit(1);
    }
  }

  loadEnvFile(envPath);
  loadEnvFile(localPath);
}

function getConfig(database = "master") {
  const dbType = process.env.DB_TYPE ?? "tcp";

  if (dbType === "localdb") {
    return {
      type: "localdb",
      server: process.env.DB_SERVER ?? "(localdb)\\MSSQLLocalDB",
      database,
    };
  }

  return {
    type: "tcp",
    server: process.env.DB_SERVER ?? "localhost",
    port: Number(process.env.DB_PORT ?? 1433),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database,
    options: {
      encrypt: process.env.DB_ENCRYPT === "true",
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
    },
    connectionTimeout: 15000,
  };
}

async function startLocalDb() {
  try {
    await execFileAsync("sqllocaldb", ["start", "MSSQLLocalDB"]);
    console.log("LocalDB instance started");
  } catch {
    // Already running or managed externally
  }
}

async function runSqlCmd(query, database = "master") {
  const config = getConfig(database);
  const args = ["-S", config.server, "-E", "-b", "-Q", query];

  if (database !== "master") {
    args.splice(3, 0, "-d", database);
  }

  await execFileAsync("sqlcmd", args, { windowsHide: true });
}

async function initWithLocalDb(dbName) {
  await startLocalDb();

  console.log(`Connecting to LocalDB: ${getConfig().server}`);
  await runSqlCmd("SELECT 1");

  console.log(`Creating database ${dbName} if not exists...`);
  await runSqlCmd(`
    IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'${dbName}')
    BEGIN
      CREATE DATABASE [${dbName}]
    END
  `);

  console.log("Creating Users table...");
  await runSqlCmd(
    `
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
    CREATE TABLE Users (
      id INT IDENTITY(1,1) PRIMARY KEY,
      name NVARCHAR(255) NOT NULL,
      email NVARCHAR(255) NOT NULL UNIQUE,
      password NVARCHAR(255) NOT NULL,
      role NVARCHAR(50) NOT NULL DEFAULT 'user',
      createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
      updatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    )
  `,
    dbName
  );

  const adminCheck = await execFileAsync(
    "sqlcmd",
    [
      "-S",
      getConfig().server,
      "-E",
      "-d",
      dbName,
      "-h",
      "-1",
      "-W",
      "-Q",
      "SET NOCOUNT ON; SELECT COUNT(*) FROM Users WHERE email = 'admin@example.com'",
    ],
    { windowsHide: true }
  );

  const count = Number(adminCheck.stdout.trim());

  if (!count) {
    console.log("Creating default admin user...");
    const hashedPassword = await bcrypt.hash("admin123", 12);
    const escapedHash = hashedPassword.replace(/'/g, "''");

    await runSqlCmd(
      `
      INSERT INTO Users (name, email, password, role)
      VALUES (N'Admin User', N'admin@example.com', N'${escapedHash}', N'admin')
    `,
      dbName
    );
    console.log("Default admin created: admin@example.com / admin123");
  } else {
    console.log("Admin user already exists");
  }
}

async function initWithTcp(dbName, sql) {
  const baseConfig = getConfig("master");

  if (!baseConfig.user || !baseConfig.password) {
    throw new Error(
      "DB_USER and DB_PASSWORD are required when DB_TYPE=tcp. Update your .env file."
    );
  }

  const shouldCreateDb = process.env.DB_CREATE_DATABASE === "true";

  if (shouldCreateDb) {
    console.log(`Connecting to SQL Server at ${baseConfig.server}:${baseConfig.port}...`);
    const pool = await sql.connect(baseConfig);

    console.log(`Creating database ${dbName} if not exists...`);
    await pool.request().query(`
      IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'${dbName}')
      BEGIN
        CREATE DATABASE [${dbName}]
      END
    `);

    await pool.close();
  } else {
    console.log(
      `Connecting to SQL Server at ${baseConfig.server}:${baseConfig.port} (database: ${dbName})...`
    );
  }

  const dbPool = await sql.connect({ ...baseConfig, database: dbName });

  console.log("Creating Users table...");
  await dbPool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
    CREATE TABLE Users (
      id INT IDENTITY(1,1) PRIMARY KEY,
      name NVARCHAR(255) NOT NULL,
      email NVARCHAR(255) NOT NULL UNIQUE,
      password NVARCHAR(255) NOT NULL,
      role NVARCHAR(50) NOT NULL DEFAULT 'user',
      createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
      updatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    )
  `);

  const adminCheck = await dbPool
    .request()
    .query("SELECT COUNT(*) as count FROM Users WHERE email = 'admin@example.com'");

  if (adminCheck.recordset[0].count === 0) {
    console.log("Creating default admin user...");
    const hashedPassword = await bcrypt.hash("admin123", 12);
    await dbPool
      .request()
      .input("name", sql.NVarChar, "Admin User")
      .input("email", sql.NVarChar, "admin@example.com")
      .input("password", sql.NVarChar, hashedPassword)
      .input("role", sql.NVarChar, "admin")
      .query(
        "INSERT INTO Users (name, email, password, role) VALUES (@name, @email, @password, @role)"
      );
    console.log("Default admin created: admin@example.com / admin123");
  } else {
    console.log("Admin user already exists");
  }

  await dbPool.close();
}

function printConnectionHelp(error) {
  const dbType = process.env.DB_TYPE ?? "tcp";

  console.error("\nCould not connect to SQL Server.\n");

  if (dbType === "localdb") {
    console.error("LocalDB troubleshooting:");
    console.error("  1. Ensure SQL Server LocalDB is installed (ships with Visual Studio)");
    console.error("  2. Run: sqllocaldb start MSSQLLocalDB");
    console.error("  3. Verify with: sqlcmd -S \"(localdb)\\MSSQLLocalDB\" -E -Q \"SELECT 1\"");
  } else {
    console.error("TCP connection troubleshooting:");
    console.error("  1. Ensure SQL Server is running and listening on the configured port");
    console.error("  2. For local Docker SQL Server, run: npm run db:up");
    console.error("  3. For a remote/hosted server, set DB_SERVER, DB_PORT, DB_USER, DB_PASSWORD in .env");
    console.error("  4. Nothing is listening on localhost:1433 unless Docker or full SQL Server is running");
  }

  console.error("\nOriginal error:", error.message);
}

async function initDatabase() {
  loadEnv();

  const dbName = process.env.DB_NAME ?? "NextAuthDB";
  const dbType = process.env.DB_TYPE ?? "tcp";

  if (dbType === "localdb") {
    await initWithLocalDb(dbName);
  } else {
    const sql = await loadSqlDriver();
    await initWithTcp(dbName, sql);
  }

  console.log("Database initialized successfully!");
}

initDatabase().catch((err) => {
  printConnectionHelp(err);
  process.exit(1);
});
