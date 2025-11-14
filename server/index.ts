import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectSqlite3 from "connect-sqlite3";
import connectPgSimple from "connect-pg-simple";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { registerRoutes } from "./routes";
import { setupSecurity } from "./security";
import type { Server } from "http";

const SQLiteStore = connectSqlite3(session);
const PostgresStore = connectPgSimple(session);

// Get or generate persistent session secret
function getSessionSecret(): string {
  // Check environment variable first
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }

  // Check for persisted secret file
  const secretPath = path.join('./data', '.session-secret');

  if (fs.existsSync(secretPath)) {
    return fs.readFileSync(secretPath, 'utf8').trim();
  }

  // Generate new secret and persist it
  const newSecret = randomUUID();
  fs.mkdirSync('./data', { recursive: true });
  fs.writeFileSync(secretPath, newSecret, { mode: 0o600 });
  console.log('Generated new session secret and saved to', secretPath);

  return newSecret;
}

const app = express();

// Setup security headers
setupSecurity(app);

// Session configuration - use PostgreSQL when DATABASE_URL is available, SQLite otherwise
const usePostgres = !!process.env.DATABASE_URL;
const sessionStore = usePostgres
  ? new PostgresStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      tableName: 'sessions'
    })
  : new SQLiteStore({
      db: 'sessions.db',
      dir: './data',
      table: 'sessions'
    });

app.use(session({
  store: sessionStore as any, // Type assertion to bypass store type mismatch
  secret: getSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS)
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days - serves as "remember me"
    sameSite: 'lax'
  },
  name: 'sessionId'
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      // Simple console log instead of importing from vite module
      const formattedTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      console.log(`${formattedTime} [express] ${logLine}`);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Initialize notification scheduler
  const { initializeScheduler } = await import("./scheduler");
  initializeScheduler();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    const { serveStatic } = await import("./vite");
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    console.log(`${formattedTime} [express] serving on port ${port}`);
  });
})();