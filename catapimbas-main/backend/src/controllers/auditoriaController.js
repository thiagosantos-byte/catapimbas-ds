import Auditoria from '../models/Auditoria.js';
import Usuario from '../models/Usuario.js';

export const listarLogsPorInstituicao = async (req, res) => {
  try {
    const { instituicaoId } = req.params;

    const logs = await Auditoria.findAll({
      where: { instituicaoId },
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nome', 'email']
        }
      ],
      order: [['criadoEm', 'DESC']], 
      limit: 100 
    });

    return res.json(logs);
  } catch (error) {
    console.error('Erro ao buscar logs de auditoria:', error.name);
    return res.status(500).json({ mensagem: 'Erro interno ao carregar logs de auditoria.' });
  }
};

