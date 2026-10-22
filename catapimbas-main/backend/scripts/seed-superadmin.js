import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { QueryTypes } from 'sequelize';
import sequelize from '../src/config/database.js';
import Instituicao from '../src/models/Instituicao.js';
import Usuario from '../src/models/Usuario.js';
import VinculoInstitucional from '../src/models/VinculoInstitucional.js';

// Chave fixa para serializar execuções concorrentes deste bootstrap no PostgreSQL.
// O lock é liberado automaticamente ao terminar a transação/conexão.
const BOOTSTRAP_LOCK_KEY_1 = 7310421;
const BOOTSTRAP_LOCK_KEY_2 = 1;

function readBootstrapConfig() {
  const config = {
    nomeInstituicao: String(process.env.INITIAL_INSTITUTION_NAME || '').trim(),
    identificador: String(process.env.INITIAL_INSTITUTION_IDENTIFIER || '').trim(),
    nomeAdmin: String(process.env.SEED_ADMIN_NAME || '').trim(),
    emailAdmin: String(process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase(),
    senhaAdmin: String(process.env.SEED_ADMIN_PASSWORD || ''),
  };

  const missing = [];
  if (!config.nomeInstituicao) missing.push('INITIAL_INSTITUTION_NAME');
  if (!config.identificador) missing.push('INITIAL_INSTITUTION_IDENTIFIER');
  if (!config.nomeAdmin) missing.push('SEED_ADMIN_NAME');
  if (!config.emailAdmin) missing.push('SEED_ADMIN_EMAIL');
  if (!config.senhaAdmin) missing.push('SEED_ADMIN_PASSWORD');
  if (missing.length) {
    throw new Error(`Variáveis obrigatórias ausentes: ${missing.join(', ')}.`);
  }
  if (config.identificador.length > 50) {
    throw new Error('INITIAL_INSTITUTION_IDENTIFIER deve ter no máximo 50 caracteres.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.emailAdmin)) {
    throw new Error('SEED_ADMIN_EMAIL não parece ser um e-mail válido.');
  }
  if (config.senhaAdmin.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD deve ter pelo menos 12 caracteres.');
  }
  if (config.senhaAdmin.length > 72) {
    throw new Error('SEED_ADMIN_PASSWORD deve ter no máximo 72 bytes/caracteres para compatibilidade com bcrypt.');
  }
  return config;
}

async function seedSuperadmin() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não configurada.');

  const transaction = await sequelize.transaction();
  try {
    // Impede que duas execuções simultâneas concluam que ainda não há superadmin.
    await sequelize.query(
      'SELECT pg_advisory_xact_lock(:key1, :key2)',
      {
        replacements: { key1: BOOTSTRAP_LOCK_KEY_1, key2: BOOTSTRAP_LOCK_KEY_2 },
        type: QueryTypes.SELECT,
        transaction,
      },
    );

    // Qualquer vínculo SUPERADMIN já existente bloqueia novo bootstrap, mesmo que
    // esteja pendente, revogado ou associado a uma conta atualmente bloqueada.
    const existingSuperadmin = await VinculoInstitucional.findOne({
      where: { papel: 'SUPERADMIN' },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (existingSuperadmin) {
      await transaction.rollback();
      console.log('Bootstrap ignorado: já existe um vínculo SUPERADMIN. Nenhuma alteração foi feita.');
      return;
    }

    const config = readBootstrapConfig();

    let instituicao = await Instituicao.findOne({
      where: { identificador: config.identificador },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (instituicao && instituicao.status !== 'ATIVA') {
      throw new Error('A instituição com esse identificador já existe, mas está suspensa. Ative-a por um procedimento administrativo antes do bootstrap.');
    }
    if (!instituicao) {
      instituicao = await Instituicao.create({
        nome: config.nomeInstituicao,
        identificador: config.identificador,
        status: 'ATIVA',
      }, { transaction });
    }

    let usuario = await Usuario.findOne({
      where: { email: config.emailAdmin },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (usuario) {
      if (usuario.status !== 'ATIVO') {
        throw new Error('Já existe uma conta com esse e-mail, mas ela está bloqueada. Nenhuma permissão foi alterada.');
      }
      if (!(await bcrypt.compare(config.senhaAdmin, usuario.hashSenha))) {
        throw new Error('O e-mail informado já pertence a uma conta, mas a senha não confere. Nenhuma permissão foi alterada.');
      }
    } else {
      usuario = await Usuario.create({
        nome: config.nomeAdmin,
        email: config.emailAdmin,
        hashSenha: await bcrypt.hash(config.senhaAdmin, 12),
        status: 'ATIVO',
      }, { transaction });
    }

    await VinculoInstitucional.create({
      usuarioId: usuario.id,
      instituicaoId: instituicao.id,
      papel: 'SUPERADMIN',
      situacao: 'APROVADO',
    }, { transaction });

    await transaction.commit();
    console.log(`Primeiro superadministrador criado com sucesso. E-mail: ${config.emailAdmin}; instituição: ${config.identificador}.`);
    console.log('Por segurança, remova as variáveis SEED_ADMIN_* e INITIAL_INSTITUTION_* do ambiente após a execução.');
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    throw error;
  } finally {
    await sequelize.close();
  }
}

seedSuperadmin().catch((error) => {
  console.error('Não foi possível inicializar o superadministrador:', error.message);
  process.exitCode = 1;
});
