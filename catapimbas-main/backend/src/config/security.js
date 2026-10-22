const PLACEHOLDER_SECRET = /(SUBSTITUA|CHANGE[_ -]?ME|REPLACE[_ -]?WITH|EXAMPLE|YOUR[_ -]?SECRET|SEGREDO_ALEATORIO|COLOQUE_AQUI)/i;

export const JWT_ISSUER = 'nexus-academic-api';
export const JWT_AUDIENCE = 'nexus-academic-web';

export function segredoJwtAdequado(value) {
  return typeof value === 'string'
    && Buffer.byteLength(value, 'utf8') >= 32
    && !PLACEHOLDER_SECRET.test(value);
}
