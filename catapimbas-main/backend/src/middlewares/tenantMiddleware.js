import VinculoInstitucional from '../models/VinculoInstitucional.js';
import Instituicao from '../models/Instituicao.js';
import Projeto from '../models/Projeto.js';
import Banca from '../models/Banca.js';

const PAPEIS_ADMIN = ['SUPERADMIN', 'ADMIN_INST'];
const PAPEIS_GESTAO = ['SUPERADMIN', 'ADMIN_INST', 'COORDENADOR'];

async function validarVinculo(usuarioId, instituicaoId, papeisPermitidos = [], papelSolicitado = null) {
  const instituicao = await Instituicao.findByPk(instituicaoId);
  if (!instituicao) return { permitido: false, status: 404 };

  const [vinculos, superadminGlobal] = await Promise.all([
    VinculoInstitucional.findAll({ where: { usuarioId, instituicaoId, situacao: 'APROVADO' } }),
    VinculoInstitucional.findOne({ where: { usuarioId, papel: 'SUPERADMIN', situacao: 'APROVADO' }, attributes: ['id'] }),
  ]);

  // Uma instituição suspensa deixa de aceitar operações de seus membros, mas o
  // superadministrador global ainda pode inspecioná-la e reativá-la.
  if (instituicao.status !== 'ATIVA') {
    if (superadminGlobal && (!papelSolicitado || papelSolicitado === 'SUPERADMIN')) {
      return { permitido: true, papel: 'SUPERADMIN' };
    }
    return { permitido: false, status: 404 };
  }

  if (papelSolicitado === 'SUPERADMIN' && superadminGlobal) {
    return { permitido: true, papel: 'SUPERADMIN' };
  }

  let vinculo;
  if (papelSolicitado) {
    vinculo = vinculos.find((v) => v.papel === papelSolicitado);
    if (!vinculo) return { permitido: false, status: 403 };
    if (vinculo.papel !== 'SUPERADMIN' && papeisPermitidos.length > 0 && !papeisPermitidos.includes(vinculo.papel)) {
      return { permitido: false, status: 403 };
    }
  } else {
    if (superadminGlobal) return { permitido: true, papel: 'SUPERADMIN' };
    vinculo = vinculos.find((v) => papeisPermitidos.length === 0 || papeisPermitidos.includes(v.papel));
  }

  if (!vinculo) return { permitido: false, status: 403 };
  return { permitido: true, papel: vinculo.papel };
}

export const verificarEscopoInstituicao = (papeisPermitidos = []) => async (req, res, next) => {
  try {
    const instituicaoId = req.params.instituicaoId || req.body?.instituicaoId || req.query.instituicaoId;
    if (!instituicaoId) return res.status(400).json({ mensagem: 'Identificador da instituição não fornecido.' });
    const papelSolicitado = req.get('X-Papel-Ativo') || null;
    const resultado = await validarVinculo(req.usuario.id, instituicaoId, papeisPermitidos, papelSolicitado);
    if (!resultado.permitido) return res.status(resultado.status).json(resultado.status === 404
      ? { codigo: 'ESCOPO_INSTITUCIONAL_INDISPONIVEL', mensagem: 'Instituição não encontrada ou inativa.' }
      : { codigo: 'VINCULO_NAO_AUTORIZADO', mensagem: 'Acesso negado para esta instituição.' });
    req.instituicaoIdAutorizada = instituicaoId;
    req.papelAtivo = resultado.papel;
    next();
  } catch (error) {
    next(error);
  }
};

export const verificarEscopoRecurso = (tipo, papeisPermitidos = []) => async (req, res, next) => {
  try {
    const id = req.params[`${tipo}Id`] || req.body?.[`${tipo}Id`];
    if (!id) return res.status(400).json({ mensagem: `Identificador de ${tipo} não fornecido.` });
    const Model = tipo === 'banca' ? Banca : Projeto;
    const recurso = await Model.findByPk(id);
    if (!recurso) return res.status(404).json({ mensagem: `${tipo === 'banca' ? 'Banca' : 'Projeto'} não encontrado.` });
    const papelSolicitado = req.get('X-Papel-Ativo') || null;
    const resultado = await validarVinculo(req.usuario.id, recurso.instituicaoId, papeisPermitidos, papelSolicitado);
    if (!resultado.permitido) {
      // Avoid a 403-vs-404 oracle that reveals whether a foreign-tenant resource
      // exists. Institution IDs are public; individual project/bank IDs are not.
      return res.status(404).json({
        codigo: 'RECURSO_NAO_ENCONTRADO',
        mensagem: 'Recurso não encontrado.',
      });
    }
    req.instituicaoIdAutorizada = recurso.instituicaoId;
    req.papelAtivo = resultado.papel;
    next();
  } catch (error) {
    next(error);
  }
};

export const papeis = { admin: PAPEIS_ADMIN, gestao: PAPEIS_GESTAO };

export const exigirPapelGlobal = (papeisPermitidos = []) => async (req, res, next) => {
  try {
    const vinculos = await VinculoInstitucional.findAll({ where: { usuarioId: req.usuario.id, situacao: 'APROVADO' } });
    if (!vinculos.some(v => papeisPermitidos.includes(v.papel))) {
      return res.status(403).json({ mensagem: 'Operação restrita a usuários com permissão global.' });
    }
    next();
  } catch (error) { next(error); }
};

export const verificarAcessoAoVinculo = (papeisPermitidos = ['SUPERADMIN', 'ADMIN_INST']) => async (req, res, next) => {
  try {
    const vinculo = await VinculoInstitucional.findByPk(req.params.id);
    if (!vinculo) return res.status(404).json({ mensagem: 'Vínculo não encontrado.' });
    const papelSolicitado = req.get('X-Papel-Ativo') || null;
    const resultado = await validarVinculo(req.usuario.id, vinculo.instituicaoId, papeisPermitidos, papelSolicitado);
    if (!resultado.permitido) {
      // Do not disclose whether a private membership ID is valid to an untrusted caller.
      return res.status(404).json({ codigo: 'VINCULO_NAO_ENCONTRADO', mensagem: 'Vínculo não encontrado.' });
    }
    req.vinculoAlvo = vinculo;
    req.instituicaoIdAutorizada = vinculo.instituicaoId;
    req.papelAtivo = resultado.papel;
    next();
  } catch (error) { next(error); }
};
