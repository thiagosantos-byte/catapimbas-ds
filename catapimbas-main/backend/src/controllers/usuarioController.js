import Usuario from '../models/Usuario.js';

// A criação pública é feita exclusivamente por POST /api/auth/register, que também
// cria o vínculo institucional PENDENTE na mesma transação.
export const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      attributes: { exclude: ['hashSenha'] },
      order: [['nome', 'ASC']],
    });
    return res.json(usuarios);
  } catch (error) {
    console.error('Erro ao listar usuários:', error.name);
    return res.status(500).json({ mensagem: 'Erro interno ao listar usuários.' });
  }
};
