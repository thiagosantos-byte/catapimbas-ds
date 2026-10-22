import Auditoria from '../models/Auditoria.js';

export const registrarAuditoria = async ({
  instituicaoId = null,
  usuarioId = null,
  operacao,
  entidade,
  entidadeId = null,
  dadosAnteriores = null,
  dadosNovos = null,
  transaction = null,
}) => {
  const payload = {
    instituicaoId,
    usuarioId,
    operacao,
    entidade,
    entidadeId: entidadeId ? String(entidadeId) : null,
    dadosAnteriores,
    dadosNovos,
  };

  try {
    await Auditoria.create(payload, transaction ? { transaction } : {});
  } catch (error) {
    // Dentro de uma transação de negócio, falhar em auditar deve abortar a operação.
    // Fora dela, a falha é registrada sem expor dados ou credenciais.
    console.error('Falha ao gravar registro de auditoria.');
    if (transaction) throw error;
  }
};
