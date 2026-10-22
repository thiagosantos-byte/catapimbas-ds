import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import './PublicPages.css';

export default function RecuperarSenha() {
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  async function enviar(event) {
    event.preventDefault(); setErro(''); setMensagem(''); setCarregando(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setMensagem(data.mensagem || 'Se existir uma conta ativa com esse e-mail, enviaremos instruções para redefinir a senha.');
    } catch (error) {
      setErro(error.response?.data?.mensagem || 'Não foi possível processar o pedido agora. Tente novamente mais tarde.');
    } finally { setCarregando(false); }
  }

  return <main className="public-auth"><section className="public-card"><span className="public-brand">NEXUS<span>.</span></span><p className="public-eyebrow">RECUPERAÇÃO DE ACESSO</p><h1>Vamos recuperar sua conta.</h1><p>Informe o e-mail cadastrado. Se houver uma conta ativa, enviaremos um link para criar uma nova senha.</p>{erro && <div className="public-message error" role="alert">{erro}</div>}{mensagem && <div className="public-message success" role="status">{mensagem}</div>}<form onSubmit={enviar}><label htmlFor="recovery-email">E-mail cadastrado</label><input id="recovery-email" type="email" autoComplete="email" required maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com"/><button className="public-primary" disabled={carregando}>{carregando ? 'Enviando instruções…' : 'Enviar link de recuperação'}</button></form><button className="public-link" onClick={() => navigate('/login')}>Voltar para o login</button></section></main>;
}
