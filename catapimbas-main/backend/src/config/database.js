import { Sequelize } from 'sequelize';
import 'dotenv/config';

const rawDatabaseUrl = process.env.DATABASE_URL?.trim();
if (!rawDatabaseUrl) {
  throw new Error('DATABASE_URL não configurada. Defina a URI PostgreSQL do Supabase no ambiente da API.');
}

let databaseUrl;
try {
  databaseUrl = new URL(rawDatabaseUrl);
} catch {
  throw new Error('DATABASE_URL não é uma URL válida. Copie a connection string em Supabase → Connect.');
}
if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
  throw new Error('DATABASE_URL deve usar o protocolo postgres:// ou postgresql://.');
}
if (!databaseUrl.hostname || !databaseUrl.pathname || databaseUrl.pathname === '/') {
  throw new Error('DATABASE_URL precisa conter host e nome do banco.');
}

const production = process.env.NODE_ENV === 'production';
const sslEnabled = production || process.env.DB_SSL === 'true';
if (production && process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false') {
  throw new Error('DB_SSL_REJECT_UNAUTHORIZED=false não é permitido em produção.');
}
// node-postgres can let TLS parameters in the URI override dialectOptions.ssl.
// Enforce TLS explicitly and optionally accept the Supabase root CA as base64.
if (sslEnabled) {
  for (const key of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey']) databaseUrl.searchParams.delete(key);
}
const connectionString = databaseUrl.toString();
const caBase64 = String(process.env.DB_SSL_CA_BASE64 || '').trim();
let sslCa;
if (caBase64) {
  try {
    sslCa = Buffer.from(caBase64, 'base64').toString('utf8');
  } catch {
    throw new Error('DB_SSL_CA_BASE64 precisa conter o certificado CA codificado em base64.');
  }
  if (!sslCa.includes('-----BEGIN CERTIFICATE-----') || !sslCa.includes('-----END CERTIFICATE-----')) {
    throw new Error('DB_SSL_CA_BASE64 não contém um certificado PEM válido.');
  }
}
const requestedPoolMax = Number.parseInt(process.env.DB_POOL_MAX || '5', 10);
const poolMax = Number.isInteger(requestedPoolMax) && requestedPoolMax >= 1 && requestedPoolMax <= 20
  ? requestedPoolMax
  : 5;
const requestedStatementTimeout = Number.parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '15000', 10);
const statementTimeout = Number.isInteger(requestedStatementTimeout) && requestedStatementTimeout >= 1000 && requestedStatementTimeout <= 120000
  ? requestedStatementTimeout
  : 15000;

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  logging: process.env.SQL_LOG === 'true' && !production ? console.log : false,
  pool: { max: poolMax, min: 0, acquire: 30000, idle: 10000, evict: 1000 },
  retry: { max: 2 },
  dialectOptions: {
    statement_timeout: statementTimeout,
    ...(sslEnabled ? { ssl: { require: true, rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false', ...(sslCa ? { ca: sslCa } : {}) } } : {}),
  },
  define: { timestamps: false, underscored: true },
  timezone: '+00:00',
});

export default sequelize;
