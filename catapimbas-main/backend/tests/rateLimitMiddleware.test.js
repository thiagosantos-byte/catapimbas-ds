import { createRateLimiter } from '../src/middlewares/rateLimitMiddleware.js';

describe('rate limiter', () => {
  test('recusa requisição acima do limite e informa Retry-After', () => {
    const middleware = createRateLimiter({ windowMs: 60_000, max: 2, message: 'Tente mais tarde.' });
    const req = { ip: '192.0.2.15', socket: { remoteAddress: '192.0.2.15' } };
    const response = () => ({
      headers: {}, statusCode: 200, body: null,
      setHeader(key, value) { this.headers[key] = value; return this; },
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    });
    let nextCalls = 0;
    const next = () => { nextCalls += 1; };
    const first = response();
    const second = response();
    const third = response();
    middleware(req, first, next);
    middleware(req, second, next);
    middleware(req, third, next);
    expect(nextCalls).toBe(2);
    expect(third.statusCode).toBe(429);
    expect(third.headers['Retry-After']).toBeTruthy();
  });
});
