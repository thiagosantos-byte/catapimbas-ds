import { Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

export default function AguardandoAprovacao() {
  const { signed, activeVinculo, user, logout } = useAuth();
  const [reenviando, setReenviando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const solicitacoes = (user?.vinculos || []).filter((v) => ['PENDENTE', 'RECUSADO', 'REVOGADO'].includes(v.situacao));
  const ultimaSolicitacao = solicitacoes[0];
  const [situacaoAtual, setSituacaoAtual] = useState(ultimaSolicitacao?.situacao || 'PENDENTE');
  const navigate = useNavigate();

  if (!signed) return <Navigate to="/login" replace />;
  if (activeVinculo) return <Navigate to="/dashboard" replace />;

  async function reenviar() {
    if (!ultimaSolicitacao?.id) return;
    setReenviando(true); setErro(''); setAviso('');
    try { const { data } = await api.post(`/vinculos/${ultimaSolicitacao.id}/solicitar-novamente`); setAviso(data.mensagem || 'Solicitação reenviada.'); setSituacaoAtual('PENDENTE'); }
    catch (error) { setErro(error.response?.data?.mensagem || 'Não foi possível reenviar a solicitação agora.'); }
    finally { setReenviando(false); }
  }

  function sair() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#17131d', color: '#fff' }}>
      <section style={{ width: 'min(100%, 520px)', padding: 32, borderRadius: 20, background: '#211b2a', boxShadow: '0 20px 60px #0004' }}>
        <p style={{ letterSpacing: '.12em', opacity: .75 }}>NEXUS ACADEMIC</p>
        <h1>{situacaoAtual === 'RECUSADO' ? 'Solicitação recusada' : situacaoAtual === 'REVOGADO' ? 'Acesso revogado' : 'Solicitação em análise'}</h1>
        <p>{ultimaSolicitacao?.instituicao?.nome ? `Instituição: ${ultimaSolicitacao.instituicao.nome}. ` : ''}{situacaoAtual === 'RECUSADO' ? `O pedido foi recusado${ultimaSolicitacao.justificativaRecusa ? ` pelo seguinte motivo: ${ultimaSolicitacao.justificativaRecusa}` : '.'}` : situacaoAtual === 'REVOGADO' ? 'O vínculo de acesso foi revogado. Você pode solicitar uma nova análise.' : 'Sua conta existe, mas o acesso institucional só é liberado após a aprovação do administrador.'}</p>
        {aviso && <p role="status">{aviso}</p>}{erro && <p role="alert">{erro}</p>}
        {ultimaSolicitacao && ['RECUSADO', 'REVOGADO'].includes(situacaoAtual) && <button type="button" className="nexus-submit" onClick={reenviar} disabled={reenviando}>{reenviando ? 'Enviando…' : 'Solicitar novamente'}</button>}
        <button type="button" className="nexus-submit" onClick={sair}>Sair da conta</button>
      </section>
    </main>
  );
}
