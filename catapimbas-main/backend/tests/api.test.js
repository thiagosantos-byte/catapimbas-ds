import request from 'supertest';

// Os testes básicos não usam o banco de produção. Para os testes integrados,
// informe TEST_DATABASE_URL apontando para um banco descartável de teste.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/nexus_test';
process.env.JWT_SECRET ||= 'segredo-exclusivo-para-testes-com-mais-de-32-caracteres';

const { default: app } = await import('../src/app.js');
const { default: sequelize } = await import('../src/config/database.js');

describe('API Integrador - verificações sem banco', () => {
  test('GET / deve responder com a mensagem da API', async () => {
    const response = await request(app).get('/');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('mensagem', 'API Integrador rodando com sucesso!');
  });

  test('GET /health deve sinalizar que o processo está ativo', async () => {
    const response = await request(app).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });


  test('respostas incluem cabeçalhos de segurança e identificador de requisição', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.headers['cache-control']).toBe('no-store');
  });

  test('JSON malformado é rejeitado sem retornar detalhes internos', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{invalido');
    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('codigo', 'JSON_INVALIDO');
    expect(response.body).not.toHaveProperty('stack');
  });

  test('CORS recusa origem não autorizada', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'https://origem-nao-autorizada.invalid');
    expect(response.statusCode).toBe(403);
    expect(response.body).toHaveProperty('codigo', 'CORS_ORIGIN_NEGADA');
  });

  test('POST /api/instituicoes recusa criação sem autenticação', async () => {
    const response = await request(app)
      .post('/api/instituicoes')
      .send({ nome: 'Instituição não autorizada', identificador: `nao_aut_${Date.now()}` });
    expect(response.statusCode).toBe(401);
  });

  test('GET /api/projetos/instituicao/:id recusa consulta sem token', async () => {
    const response = await request(app).get('/api/projetos/instituicao/00000000-0000-4000-8000-000000000001');
    expect(response.statusCode).toBe(401);
  });

  test('GET /api/auth/me recusa acesso sem token', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.statusCode).toBe(401);
  });

  test('solicitação de recuperação valida o e-mail antes de processar', async () => {
    const response = await request(app).post('/api/auth/forgot-password').send({ email: 'email-invalido' });
    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('mensagem');
  });

  test('redefinição rejeita token malformado sem acessar o banco', async () => {
    const response = await request(app).post('/api/auth/reset-password').send({ token: 'token-invalido', senha: 'senhaSegura123' });
    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('mensagem');
  });

  test('solicitações globais exigem autenticação', async () => {
    const response = await request(app).get('/api/vinculos/administracao/solicitacoes');
    expect(response.statusCode).toBe(401);
  });
});

const describeWithTestDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;
describeWithTestDb('API Integrador - integração com banco TEST_DATABASE_URL', () => {
  beforeAll(async () => {
    await sequelize.authenticate();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('registro atômico cria conta e solicitação pendente', async () => {
    const instituicao = await (await import('../src/models/Instituicao.js')).default.findOne({ where: { status: 'ATIVA' } });
    if (!instituicao) return;

    const email = `test_${Date.now()}@exemplo.test`;
    const response = await request(app).post('/api/auth/register').send({
      nome: 'Usuário Teste', email, senha: 'senhaSegura123', instituicaoId: instituicao.id, papel: 'ALUNO',
    });
    expect(response.statusCode).toBe(201);
    expect(response.body.solicitacao.situacao).toBe('PENDENTE');
  });
});
