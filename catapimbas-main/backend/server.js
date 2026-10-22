import 'dotenv/config';
import app from './src/app.js';
import sequelize from './src/config/database.js';
import { segredoJwtAdequado } from './src/config/security.js';

const PORT = Number(process.env.PORT || 3001);

async function startServer() {
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT deve ser uma porta TCP válida.');
  if (!segredoJwtAdequado(process.env.JWT_SECRET)) {
    throw new Error('JWT_SECRET precisa ser aleatório, não-placeholder e ter pelo menos 32 bytes.');
  }
  if (process.env.NODE_ENV === 'production' && process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false') {
    throw new Error('DB_SSL_REJECT_UNAUTHORIZED=false não é permitido em produção.');
  }

  await sequelize.authenticate();
  console.log(JSON.stringify({ level: 'info', event: 'database_connected' }));

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(JSON.stringify({ level: 'info', event: 'api_listening', port: PORT, environment: process.env.NODE_ENV || 'development' }));
  });
  // Finite HTTP timeouts reduce the chance of clients holding sockets open
  // indefinitely. Health checks and regular API calls should finish far sooner.
  server.requestTimeout = 30_000;
  server.headersTimeout = 35_000;
  server.keepAliveTimeout = 5_000;

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(JSON.stringify({ level: 'info', event: 'shutdown_started', signal }));
    const forceExit = setTimeout(() => process.exit(1), 10_000);
    forceExit.unref();
    server.close(async () => {
      try {
        await sequelize.close();
        clearTimeout(forceExit);
        process.exit(0);
      } catch {
        process.exit(1);
      }
    });
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

function safeStartupMessage(value) {
  if (typeof value !== 'string') return undefined;
  // Do not expose credentials if a driver happens to include a connection URI.
  return value
    .replace(/(postgres(?:ql)?:\/\/)[^\s@]+@/gi, '$1[REDACTED]@')
    .replace(/(password|passwd|pwd)=([^&\s]+)/gi, '$1=[REDACTED]')
    .slice(0, 500);
}

startServer().catch(async (error) => {
  const cause = error.original || error.parent;
  console.error(JSON.stringify({
    level: 'error',
    event: 'startup_failed',
    error: error.name || 'Error',
    message: safeStartupMessage(error.message),
    code: typeof error.code === 'string' ? error.code : undefined,
    causeName: cause?.name,
    causeMessage: safeStartupMessage(cause?.message),
    causeCode: typeof cause?.code === 'string' ? cause.code : undefined,
  }));
  process.exitCode = 1;
});
