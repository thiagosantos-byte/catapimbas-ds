import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import Usuario from '../models/Usuario.js';
import VinculoInstitucional from '../models/VinculoInstitucional.js';
import Instituicao from '../models/Instituicao.js';
import PasswordResetToken from '../models/PasswordResetToken.js';
import sequelize from '../config/database.js';
import { registrarAuditoria } from '../utils/auditLogger.js';
import { JWT_AUDIENCE, JWT_ISSUER, segredoJwtAdequado } from '../config/security.js';

export const login = async (req, res) => {
  try {
    const emailNormalizado = String(req.body?.email || '').trim().toLowerCase();
    const senha = req.body?.senha;

    if (!emailNormalizado || typeof senha !== 'string' || senha.length === 0) {
      return res.status(400).json({ mensagem: 'E-mail e senha são obrigatórios.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado) || emailNormalizado.length > 255) {
      return res.status(400).json({ mensagem: 'E-mail inválido.' });
    }

    const usuario = await Usuario.findOne({ where: { email: emailNormalizado } });
    if (!usuario) {
      return res.status(401).json({ mensagem: 'Credenciais inválidas ou acesso indisponível.' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.hashSenha);
    if (!senhaValida || usuario.status !== 'ATIVO') {
      // Use the same response for invalid credentials and blocked accounts.
      return res.status(401).json({ mensagem: 'Credenciais inválidas ou acesso indisponível.' });
    }

    const vinculosUsuario = await VinculoInstitucional.findAll({
      where: { usuarioId: usuario.id },
      include: [{ model: Instituicao, as: 'instituicao', attributes: ['id', 'nome', 'identificador'] }],
      order: [['criadoEm', 'DESC']]
    });

    if (!segredoJwtAdequado(process.env.JWT_SECRET)) {
      return res.status(500).json({ mensagem: 'A configuração JWT_SECRET deve ser um segredo aleatório com pelo menos 32 bytes.' });
    }
    // The JWT is signed, not encrypted. Keep only the user ID in the claim set;
    // names, email and institutional roles are returned in the JSON response and
    // authorization decisions are recalculated from the database on each request.
    const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: '45m',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    return res.json({
      mensagem: 'Login realizado com sucesso!',
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        vinculos: vinculosUsuario
      }
    });

  } catch (error) {
    console.error('Erro no login:', error.name);
    return res.status(500).json({ mensagem: 'Erro interno ao realizar login.' });
  }
};

export const obterPerfil = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.usuario.id, {
      attributes: { exclude: ['hashSenha'] },
      include: [
        {
          model: VinculoInstitucional,
          as: 'vinculos',
          include: [{ model: Instituicao, as: 'instituicao' }]
        }
      ]
    });

    if (!usuario) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }

    return res.json(usuario);
  } catch (error) {
    console.error('Erro ao obter perfil:', error.name);
    return res.status(500).json({ mensagem: 'Erro interno ao buscar perfil.' });
  }
};

export const registrarConta = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const { nome, email, senha, instituicaoId, papel } = req.body || {};
    const nomeLimpo = String(nome || '').trim();
    const emailNormalizado = String(email || '').trim().toLowerCase();
    const papeisSolicitaveis = ['ALUNO', 'ORIENTADOR', 'AVALIADOR', 'COORDENADOR'];

    if (!nomeLimpo || nomeLimpo.length < 2 || nomeLimpo.length > 255 || !emailNormalizado || typeof senha !== 'string' || senha.length === 0 || !instituicaoId || !papel) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'Nome, e-mail, senha, instituição e perfil são obrigatórios.' });
    }
    if (emailNormalizado.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'E-mail inválido.' });
    }
    if (senha.length < 10) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'A senha deve ter pelo menos 10 caracteres.' });
    }
    if (Buffer.byteLength(senha, 'utf8') > 72) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'A senha deve ter no máximo 72 bytes UTF-8 ao usar bcrypt.' });
    }
    if (!papeisSolicitaveis.includes(papel)) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'Perfil solicitado inválido.' });
    }

    const instituicao = await Instituicao.findOne({
      where: { id: instituicaoId, status: 'ATIVA' },
      transaction,
    });
    if (!instituicao) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'Instituição inexistente ou inativa.' });
    }

    const existente = await Usuario.findOne({ where: { email: emailNormalizado }, transaction });
    if (existente) {
      await transaction.rollback();
      return res.status(409).json({ mensagem: 'Este e-mail já está cadastrado.' });
    }

    const hashSenha = await bcrypt.hash(senha, 12);
    const usuario = await Usuario.create({ nome: nomeLimpo, email: emailNormalizado, hashSenha }, { transaction });
    const novoVinculo = await VinculoInstitucional.create({
      usuarioId: usuario.id,
      instituicaoId: instituicao.id,
      papel,
      situacao: 'PENDENTE',
    }, { transaction });

    await registrarAuditoria({
      instituicaoId: instituicao.id,
      usuarioId: usuario.id,
      operacao: 'SOLICITAR_INGRESSO',
      entidade: 'vinculos_institucionais',
      entidadeId: novoVinculo.id,
      dadosNovos: { papel, situacao: 'PENDENTE' },
      transaction,
    });

    await transaction.commit();
    return res.status(201).json({
      mensagem: 'Conta criada. A solicitação de ingresso aguarda aprovação da instituição.',
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, status: usuario.status },
      solicitacao: { instituicaoId: instituicao.id, instituicaoNome: instituicao.nome, papel, situacao: 'PENDENTE' },
    });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ mensagem: 'Este e-mail ou vínculo já está cadastrado.' });
    }
    console.error('Erro ao registrar conta:', error.name);
    return res.status(500).json({ mensagem: 'Erro interno ao registrar conta.' });
  }
};


const hashTokenRecuperacao = (token) => createHash('sha256').update(token).digest('hex');

export const solicitarRedefinicaoSenha = async (req, res) => {
  const respostaGenerica = { mensagem: 'Se existir uma conta ativa com esse e-mail, enviaremos instruções para redefinir a senha.' };
  let tokenRegistro;
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ mensagem: 'Informe um e-mail válido.' });
    }
    const resendKey = String(process.env.RESEND_API_KEY || '').trim();
    const emailFrom = String(process.env.EMAIL_FROM || '').trim();
    const frontendUrl = String(process.env.FRONTEND_URL || '').trim().replace(/\/$/, '');
    if (!resendKey || !emailFrom || !frontendUrl) {
      return res.status(503).json({ mensagem: 'A recuperação de senha está temporariamente indisponível. Tente novamente mais tarde.' });
    }

    const usuario = await Usuario.findOne({ where: { email, status: 'ATIVO' }, attributes: ['id', 'email', 'nome'] });
    if (!usuario) return res.status(200).json(respostaGenerica);

    const token = randomBytes(32).toString('hex');
    tokenRegistro = await PasswordResetToken.create({
      usuarioId: usuario.id,
      tokenHash: hashTokenRecuperacao(token),
      expiraEm: new Date(Date.now() + 60 * 60 * 1000),
    });
    const link = `${frontendUrl}/redefinir-senha?token=${encodeURIComponent(token)}`;
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        from: emailFrom,
        to: [usuario.email],
        subject: 'Redefinição de senha — Nexus Academic',
        text: `Olá, ${usuario.nome}. Para criar uma nova senha, acesse: ${link}\n\nO link expira em 1 hora. Se você não solicitou a redefinição, ignore esta mensagem.`,
        html: `<p>Olá, ${String(usuario.nome).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])}.</p><p>Recebemos uma solicitação para redefinir sua senha do Nexus Academic.</p><p><a href="${link}">Criar nova senha</a></p><p>O link expira em 1 hora. Se você não solicitou a redefinição, ignore esta mensagem.</p>`,
      }),
    });
    if (!response.ok) {
      await tokenRegistro.destroy();
      tokenRegistro = null;
      console.error('Falha no envio de redefinição de senha:', response.status);
      return res.status(200).json(respostaGenerica);
    }
    return res.status(200).json(respostaGenerica);
  } catch (error) {
    if (tokenRegistro) {
      await tokenRegistro.destroy().catch(() => {});
      console.error('Falha no processamento do e-mail de redefinição:', error.name);
      return res.status(200).json(respostaGenerica);
    }
    console.error('Erro ao solicitar redefinição de senha:', error.name);
    return res.status(503).json({ mensagem: 'A recuperação de senha está temporariamente indisponível. Tente novamente mais tarde.' });
  }
};

export const redefinirSenha = async (req, res) => {
  let transaction;
  try {
    const token = String(req.body?.token || '');
    const senha = req.body?.senha;
    if (!/^[a-f0-9]{64}$/.test(token) || typeof senha !== 'string' || senha.length < 10 || Buffer.byteLength(senha, 'utf8') > 72) {
      return res.status(400).json({ mensagem: 'O link é inválido ou expirou. Confira o link e use uma senha com pelo menos 10 caracteres.' });
    }
    transaction = await sequelize.transaction();
    const registro = await PasswordResetToken.findOne({
      where: { tokenHash: hashTokenRecuperacao(token), usadoEm: null },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!registro || new Date(registro.expiraEm).getTime() <= Date.now()) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'O link é inválido ou expirou. Solicite uma nova redefinição de senha.' });
    }
    const usuario = await Usuario.findByPk(registro.usuarioId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!usuario || usuario.status !== 'ATIVO') {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'Não foi possível redefinir a senha desta conta.' });
    }
    await usuario.update({ hashSenha: await bcrypt.hash(senha, 12) }, { transaction });
    await registro.update({ usadoEm: new Date() }, { transaction });
    await PasswordResetToken.update({ usadoEm: new Date() }, { where: { usuarioId: usuario.id, usadoEm: null }, transaction });
    await transaction.commit();
    return res.json({ mensagem: 'Senha redefinida com sucesso. Entre com sua nova senha.' });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('Erro ao redefinir senha:', error.name);
    return res.status(500).json({ mensagem: 'Não foi possível redefinir a senha agora.' });
  }
};
