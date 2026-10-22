import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import './PublicPages.css';

export default function RedefinirSenha() {
  const [params] = useSearchParams();
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();
  const token = params.get('token') || '';

  async function salvar(event) {
    event.preventDefault(); setErro(''); setMensagem('');
    if (senha.length < 10) return setErro('A senha precisa ter pelo menos 10 caracteres.');
    if (senha !== confirmacao) return setErro('As senhas não coincidem.');
    if (!token) return setErro('Este link está incompleto. Solicite uma nova redefinição de senha.');
    setCarregando(true);
    try { const { data } = await api.post('/auth/reset-password', { token, senha }); setMensagem(data.mensagem || 'Senha redefinida com sucesso.'); }
    catch (error) { setErro(error.response?.data?.mensagem || 'Não foi possível redefinir a senha. Solicite um novo link.'); }
    finally { setCarregando(false); }
  }

  return <main className="public-auth"><section className="public-card"><span className="public-brand">NEXUS<span>.</span></span><p className="public-eyebrow">NOVA SENHA</p><h1>Crie uma nova senha.</h1><p>Use pelo menos 10 caracteres. Por segurança, o link só pode ser usado uma vez e expira em uma hora.</p>{erro && <div className="public-message error" role="alert">{erro}</div>}{mensagem && <div className="public-message success" role="status">{mensagem}</div>}{!mensagem && <form onSubmit={salvar}><label htmlFor="new-password">Nova senha</label><input id="new-password" type="password" autoComplete="new-password" minLength={10} maxLength={72} required value={senha} onChange={(e) => setSenha(e.target.value)}/><label htmlFor="confirm-password">Confirme a nova senha</label><input id="confirm-password" type="password" autoComplete="new-password" minLength={10} maxLength={72} required value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)}/><button className="public-primary" disabled={carregando}>{carregando ? 'Salvando…' : 'Redefinir senha'}</button></form>}<button className="public-link" onClick={() => navigate('/login')}>Ir para o login</button></section></main>;
}
