-- Habilita extensão para geração de UUIDs nativos
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS (Tipos enumerados)
CREATE TYPE status_instituicao_enum AS ENUM ('ATIVA', 'SUSPENSA');
CREATE TYPE status_usuario_enum AS ENUM ('ATIVO', 'BLOQUEADO');
CREATE TYPE papel_enum AS ENUM ('SUPERADMIN', 'ADMIN_INST', 'COORDENADOR', 'ORIENTADOR', 'AVALIADOR', 'ALUNO');
CREATE TYPE situacao_vinculo_enum AS ENUM ('PENDENTE', 'APROVADO', 'RECUSADO', 'REVOGADO');
CREATE TYPE status_projeto_enum AS ENUM ('RASCUNHO', 'SUBMETIDO', 'APROVADO', 'ARQUIVADO');
CREATE TYPE funcao_integrante_enum AS ENUM ('ALUNO', 'ORIENTADOR');
CREATE TYPE status_banca_enum AS ENUM ('PLANEJADA', 'ABERTA', 'EM_AVALIACAO', 'CONCLUIDA', 'PUBLICADA');
CREATE TYPE status_avaliacao_enum AS ENUM ('RASCUNHO', 'SUBMETIDA', 'CANCELADA');
CREATE TYPE status_resultado_enum AS ENUM ('RASCUNHO', 'PUBLICADO');

-- 2. TABELA: instituicoes
CREATE TABLE instituicoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  identificador VARCHAR(50) UNIQUE NOT NULL,
  status status_instituicao_enum DEFAULT 'ATIVA',
  cor_tema VARCHAR(20),
  logo_url TEXT,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELA: usuarios
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  hash_senha VARCHAR(255) NOT NULL,
  status status_usuario_enum DEFAULT 'ATIVO',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELA: vinculos_institucionais
CREATE TABLE vinculos_institucionais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  instituicao_id UUID NOT NULL REFERENCES instituicoes(id) ON DELETE CASCADE,
  papel papel_enum NOT NULL,
  situacao situacao_vinculo_enum DEFAULT 'PENDENTE',
  justificativa_recusa TEXT,
  decidido_por_usuario_id UUID REFERENCES usuarios(id),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(usuario_id, instituicao_id, papel)
);

-- 5. TABELA: projetos
CREATE TABLE projetos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instituicao_id UUID NOT NULL REFERENCES instituicoes(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  ano INT NOT NULL,
  semestre INT CHECK (semestre IN (1, 2)),
  status status_projeto_enum DEFAULT 'RASCUNHO',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABELA: projeto_integrantes
CREATE TABLE projeto_integrantes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  funcao funcao_integrante_enum NOT NULL,
  UNIQUE(projeto_id, usuario_id, funcao)
);

-- 7. TABELA: bancas
CREATE TABLE bancas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instituicao_id UUID NOT NULL REFERENCES instituicoes(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  periodo_inicio TIMESTAMP NOT NULL,
  periodo_fim TIMESTAMP NOT NULL,
  status status_banca_enum DEFAULT 'PLANEJADA',
  politica_desempate VARCHAR(40) NOT NULL CHECK (politica_desempate IN ('EMPATE_COMPARTILHADO', 'NOME_PROJETO')),
  regra_notas_ausentes TEXT,
  casas_decimais INT DEFAULT 2,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABELA: banca_criterios
CREATE TABLE banca_criterios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  banca_id UUID NOT NULL REFERENCES bancas(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  peso NUMERIC(5,2) NOT NULL CHECK (peso > 0),
  nota_minima INT DEFAULT 1,
  nota_maxima INT DEFAULT 5,
  rubricas JSONB
);

-- 9. TABELAS ASSOCIATIVAS DA BANCA
CREATE TABLE banca_projetos (
  banca_id UUID REFERENCES bancas(id) ON DELETE CASCADE,
  projeto_id UUID REFERENCES projetos(id) ON DELETE CASCADE,
  elegivel_ranking BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (banca_id, projeto_id)
);

CREATE TABLE banca_avaliadores (
  banca_id UUID REFERENCES bancas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  PRIMARY KEY (banca_id, usuario_id)
);

-- 10. TABELA: avaliacoes (RN03: garante submissão única por banca/projeto/avaliador)
CREATE TABLE avaliacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instituicao_id UUID NOT NULL REFERENCES instituicoes(id) ON DELETE CASCADE,
  banca_id UUID NOT NULL REFERENCES bancas(id) ON DELETE CASCADE,
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  avaliador_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  status status_avaliacao_enum DEFAULT 'SUBMETIDA',
  notas JSONB NOT NULL,
  submetida_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Uma avaliação ativa por avaliador/projeto/banca; cancelamentos preservam histórico.
CREATE UNIQUE INDEX uq_avaliacao_ativa ON avaliacoes (banca_id, projeto_id, avaliador_id) WHERE status IN ('RASCUNHO', 'SUBMETIDA');

-- 11. TABELA: resultados_projetos
CREATE TABLE resultados_projetos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  banca_id UUID NOT NULL REFERENCES bancas(id) ON DELETE CASCADE,
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  pontuacao_final NUMERIC(7,4) NOT NULL,
  posicao INT NOT NULL,
  status status_resultado_enum DEFAULT 'RASCUNHO',
  publicado_em TIMESTAMP,
  UNIQUE (banca_id, projeto_id)
);

-- 12. TABELA: auditoria
CREATE TABLE auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instituicao_id UUID REFERENCES instituicoes(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  operacao VARCHAR(50) NOT NULL,
  entidade VARCHAR(50) NOT NULL,
  entidade_id VARCHAR(255),
  dados_anteriores JSONB,
  dados_novos JSONB,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Índices para filtros frequentes e isolamento por instituição.
CREATE INDEX idx_projetos_instituicao_periodo ON projetos (instituicao_id, ano, semestre);
CREATE INDEX idx_bancas_instituicao_status ON bancas (instituicao_id, status);
CREATE INDEX idx_avaliacoes_instituicao_banca ON avaliacoes (instituicao_id, banca_id, status);
CREATE INDEX idx_vinculos_usuario_situacao ON vinculos_institucionais (usuario_id, situacao);
CREATE INDEX idx_auditoria_instituicao_data ON auditoria (instituicao_id, criado_em DESC);

-- Esta aplicação usa a API Express e conexão PostgreSQL privada; não expor as
-- tabelas do domínio pela Supabase Data API a usuários anon/authenticated.
-- Roles podem não existir fora do Supabase, por isso a revogação é condicional.
DO $$
DECLARE
  role_name TEXT;
BEGIN
  FOR role_name IN
    SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM %I', role_name);
    EXECUTE format('REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM %I', role_name);
    EXECUTE format('REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM %I', role_name);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM %I', role_name);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', role_name);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM %I', role_name);
  END LOOP;
END $$;

-- Tokens de uso único para recuperação de senha. Para bancos já existentes,
-- execute também a migração backend/migrations/20261021_password_reset_tokens.sql.
CREATE TABLE IF NOT EXISTS tokens_redefinicao_senha (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) UNIQUE NOT NULL,
  expira_em TIMESTAMPTZ NOT NULL,
  usado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tokens_redefinicao_usuario ON tokens_redefinicao_senha (usuario_id, expira_em DESC);
