import { useCallback, useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  LayoutDashboard, Building2, Users, FolderKanban, CalendarDays, ClipboardCheck,
  Trophy, FileSpreadsheet, ShieldCheck, LogOut, Plus, RefreshCw, Check, X,
  Search, Menu, ChevronRight, CircleAlert, Download, Ban, PlayCircle, Send,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import './Workspace.css';

const ROLES = {
  SUPERADMIN: 'Superadministrador', ADMIN_INST: 'Administrador institucional',
  COORDENADOR: 'Coordenador', ORIENTADOR: 'Orientador', AVALIADOR: 'Avaliador', ALUNO: 'Aluno',
};
const ADMIN = ['SUPERADMIN', 'ADMIN_INST'];
const MANAGEMENT = ['SUPERADMIN', 'ADMIN_INST', 'COORDENADOR'];
const menu = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'requests', label: 'Solicitações', icon: Users, roles: ADMIN },
  { id: 'institutions', label: 'Instituições', icon: Building2, roles: ['SUPERADMIN'] },
  { id: 'projects', label: 'Projetos', icon: FolderKanban },
  { id: 'banks', label: 'Bancas e critérios', icon: CalendarDays },
  { id: 'evaluations', label: 'Avaliações', icon: ClipboardCheck },
  { id: 'ranking', label: 'Ranking e pódio', icon: Trophy },
  { id: 'reports', label: 'Relatórios', icon: FileSpreadsheet },
  { id: 'audit', label: 'Auditoria', icon: ShieldCheck, roles: ADMIN },
];
const errMsg = (error) => {
  const status = error?.response?.status;
  if (error?.response?.data?.mensagem) return error.response.data.mensagem;
  if (status === 401) return 'Sua sessão expirou. Entre novamente para continuar.';
  if (status === 403) return 'Você não tem permissão para realizar esta ação.';
  if (status === 404) return 'Não encontramos os dados solicitados.';
  if (status === 409) return 'Esta operação não pode ser concluída porque os dados foram alterados.';
  if (!error?.response) return 'Não foi possível concluir agora. Verifique sua conexão e tente novamente.';
  return 'Ocorreu um problema inesperado. Tente novamente.';
};
const dateTime = (value) => value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const inputDate = (date) => { const d = new Date(date); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const rubricaDaNota = (criterio, nota) => { const rubricas = criterio?.rubricas; if (!rubricas) return ''; if (Array.isArray(rubricas)) return rubricas.find((item) => Number(item.nota ?? item.valor) === Number(nota))?.descricao || ''; return rubricas[nota] || rubricas[String(nota)] || ''; };

function Notice({ notice, clear }) {
  if (!notice) return null;
  return <div className={`ws-notice ${notice.type}`} role="status"><span>{notice.text}</span><button onClick={clear} aria-label="Fechar aviso"><X size={16}/></button></div>;
}
function Empty({ title, text }) { return <div className="ws-empty"><div className="ws-empty-icon"><FolderKanban size={22}/></div><strong>{title}</strong><p>{text}</p></div>; }
function Status({ value }) { const status = String(value || '—').toUpperCase(); return <span className={`ws-status status-${status.toLowerCase()}`}>{status.replaceAll('_', ' ')}</span>; }
function Field({ label, children, wide = false }) { return <label className={`ws-field ${wide ? 'wide' : ''}`}><span>{label}</span>{children}</label>; }

export default function Dashboard() {
  const { user, activeVinculo, selectVinculo, logout } = useAuth();
  const role = activeVinculo?.papel || '';
  const institutionId = activeVinculo?.instituicaoId || activeVinculo?.instituicao_id || activeVinculo?.instituicao?.id;
  const institutionName = activeVinculo?.instituicao?.nome || activeVinculo?.instituicaoNome || 'Instituição ativa';
  const visibleMenu = menu.filter((item) => !item.roles || item.roles.includes(role));
  const [page, setPage] = useState('overview');
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [requests, setRequests] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [banks, setBanks] = useState([]);
  const [audit, setAudit] = useState([]);
  const [rankings, setRankings] = useState({});

  const notify = (text, type = 'success') => setNotice({ text, type });
  const refresh = () => setRefreshKey((n) => n + 1);
  const run = async (action, success) => {
    setBusy(true); setNotice(null);
    try { await action(); if (success) notify(success); refresh(); }
    catch (error) { notify(errMsg(error), 'error'); }
    finally { setBusy(false); }
  };

  const loadPage = useCallback(async () => {
    if (!institutionId) return;
    try {
      if (page === 'overview') {
        if (MANAGEMENT.includes(role)) {
          const { data } = await api.get(`/dashboard/instituicao/${institutionId}`); setDashboard(data);
        } else setDashboard(null);
      }
      if (page === 'requests' && ADMIN.includes(role)) {
        const endpoint = role === 'SUPERADMIN'
          ? '/vinculos/administracao/solicitacoes'
          : `/vinculos/instituicao/${institutionId}`;
        const { data } = await api.get(endpoint); setRequests(Array.isArray(data) ? data : []);
      }
      if (page === 'institutions' && role === 'SUPERADMIN') {
        const { data } = await api.get('/instituicoes/administracao'); setInstitutions(Array.isArray(data) ? data : []);
      }
      if (page === 'projects') {
        const { data } = await api.get(`/projetos/instituicao/${institutionId}`, { params: { limite: 100 } }); setProjects(Array.isArray(data) ? data : []);
      }
      if (page === 'banks' || page === 'evaluations' || page === 'ranking' || page === 'reports') {
        const requests = [api.get(`/bancas/instituicao/${institutionId}`)];
        if (page === 'banks') requests.push(api.get(`/projetos/instituicao/${institutionId}`, { params: { limite: 100 } }));
        const [bankResponse, projectResponse] = await Promise.all(requests);
        setBanks(Array.isArray(bankResponse.data) ? bankResponse.data : []);
        if (projectResponse) setProjects(Array.isArray(projectResponse.data) ? projectResponse.data : []);
      }
      if (page === 'audit' && ADMIN.includes(role)) {
        const { data } = await api.get(`/auditoria/instituicao/${institutionId}`); setAudit(Array.isArray(data) ? data : []);
      }
    } catch (error) { setNotice({ text: errMsg(error), type: 'error' }); }
  }, [page, role, institutionId, refreshKey]);
  useEffect(() => { loadPage(); }, [loadPage]);

  const doRevoke = (id) => {
    if (!window.confirm('Revogar o acesso desta pessoa à instituição? A conta continuará existindo, mas este vínculo deixará de conceder acesso.')) return;
    run(() => api.patch(`/vinculos/${id}/revogar`), 'Acesso institucional revogado.');
  };

  const doDecision = (id, situacao) => {
    const justificativaRecusa = situacao === 'RECUSADO' ? window.prompt('Informe a justificativa da recusa:') : null;
    if (situacao === 'RECUSADO' && !justificativaRecusa?.trim()) return;
    run(() => api.patch(`/vinculos/${id}/decisao`, { situacao, ...(justificativaRecusa ? { justificativaRecusa } : {}) }), situacao === 'APROVADO' ? 'Solicitação aprovada.' : 'Solicitação recusada.');
  };

  const title = visibleMenu.find((item) => item.id === page)?.label || 'Visão geral';
  const initials = (user?.nome || 'U').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  const pendingCount = requests.filter((item) => item.situacao === 'PENDENTE').length;

  return <div className="ws-shell">
    <aside className={`ws-sidebar ${mobileMenu ? 'open' : ''}`}>
      <div className="ws-brand"><span className="ws-brand-mark">N.</span><div><b>nexus</b><small>ACADEMIC PLATFORM</small></div><button className="ws-mobile-close" onClick={() => setMobileMenu(false)}><X size={18}/></button></div>
      <div className="ws-institution"><span className="ws-institution-icon"><Building2 size={18}/></span><div><small>INSTITUIÇÃO ATIVA</small><strong>{institutionName}</strong><em>{ROLES[role] || role}</em></div></div>
      {(user?.vinculos || []).filter((v) => v.situacao === 'APROVADO').length > 1 && <label className="ws-institution-select"><span>Trocar instituição ou perfil</span><select value={`${institutionId}:${role}`} onChange={(event) => { const next = (user?.vinculos || []).find((v) => v.situacao === 'APROVADO' && `${v.instituicaoId || v.instituicao?.id}:${v.papel}` === event.target.value); if (next) { selectVinculo(next); setPage('overview'); setNotice(null); } }} aria-label="Trocar instituição ou perfil">{(user?.vinculos || []).filter((v) => v.situacao === 'APROVADO').map((v) => <option key={`${v.instituicaoId || v.instituicao?.id}:${v.papel}`} value={`${v.instituicaoId || v.instituicao?.id}:${v.papel}`}>{v.instituicao?.nome || v.instituicaoNome || 'Instituição'} — {ROLES[v.papel] || v.papel}</option>)}</select></label>}
      <div className="ws-nav-label">ESPAÇO DE TRABALHO</div>
      <nav className="ws-nav">{visibleMenu.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'active' : ''} onClick={() => { setPage(id); setMobileMenu(false); setNotice(null); }}><Icon size={18}/><span>{label}</span>{id === 'requests' && pendingCount > 0 && <b className="ws-badge">{pendingCount}</b>}</button>)}</nav>
      <div className="ws-sidebar-bottom"><div className="ws-user"><span className="ws-avatar">{initials}</span><div><strong>{user?.nome || 'Usuário'}</strong><small>{user?.email}</small></div></div><button className="ws-logout" onClick={logout}><LogOut size={17}/> Sair da conta</button></div>
    </aside>
    {mobileMenu && <button className="ws-overlay" aria-label="Fechar menu" onClick={() => setMobileMenu(false)}/>}
    <main className="ws-main">
      <header className="ws-topbar"><button className="ws-mobile-open" onClick={() => setMobileMenu(true)}><Menu size={20}/></button><div><small>NEXUS ACADEMIC / {institutionName}</small><h1>{title}</h1></div><div className="ws-top-actions"><button className="ws-icon-button" onClick={refresh} title="Atualizar dados"><RefreshCw size={17}/></button><span className="ws-avatar top-avatar">{initials}</span></div></header>
      <div className="ws-content"><Notice notice={notice} clear={() => setNotice(null)}/>
        {page === 'overview' && <Overview data={dashboard} role={role} institutionName={institutionName} loading={busy} onNavigate={setPage} onRefresh={refresh}/>}
        {page === 'requests' && <Requests items={requests} role={role} search={search} setSearch={setSearch} onDecision={doDecision} onRevoke={doRevoke} busy={busy} onRefresh={refresh}/>}
        {page === 'institutions' && <Institutions items={institutions} busy={busy} onRun={run}/>}
        {page === 'projects' && <Projects items={projects} role={role} institutionId={institutionId} search={search} setSearch={setSearch} busy={busy} onRun={run}/>}
        {page === 'banks' && <Banks items={banks} projects={projects} institutionId={institutionId} role={role} busy={busy} onRun={run} onRefresh={refresh} />}
        {page === 'evaluations' && <Evaluations items={banks} role={role} busy={busy} onRun={run}/>}
        {page === 'ranking' && <Ranking items={banks} role={role} busy={busy} rankings={rankings} setRankings={setRankings} onRun={run}/>}
        {page === 'reports' && <Reports items={banks} busy={busy} onRun={run}/>}
        {page === 'audit' && <Audit items={audit} search={search} setSearch={setSearch}/>}
      </div>
      <footer className="ws-footer"><span>NEXUS ACADEMIC</span><span>Plataforma multi-institucional · Acesso controlado por perfil</span></footer>
    </main>
  </div>;
}

function Overview({ data, role, institutionName, onNavigate, onRefresh }) {
  const resumo = data?.resumo || {};
  const cards = [
    { label: 'Projetos cadastrados', value: resumo.totalProjetos ?? '—', icon: FolderKanban, color: 'violet' },
    { label: 'Bancas e eventos', value: resumo.totalBancas ?? '—', icon: CalendarDays, color: 'cyan' },
    { label: 'Avaliações submetidas', value: resumo.totalAvaliacoes ?? '—', icon: ClipboardCheck, color: 'green' },
    { label: 'Solicitações pendentes', value: resumo.vinculosPendentes ?? '—', icon: Users, color: 'orange' },
  ];
  return <>
    <section className="ws-hero"><div><span className="ws-eyebrow">PAINEL INSTITUCIONAL</span><h2>Ideias em movimento<span>.</span></h2><p>Olá, {institutionName}. Gerencie pessoas, projetos e avaliações em um só lugar.</p></div><button className="ws-button primary" onClick={onRefresh}><RefreshCw size={16}/> Atualizar indicadores</button></section>
    {['SUPERADMIN','ADMIN_INST','COORDENADOR'].includes(role) ? <><div className="ws-metrics">{cards.map(({ label, value, icon: Icon, color }) => <article className="ws-metric" key={label}><span className={`ws-metric-icon ${color}`}><Icon size={19}/></span><small>{label}</small><strong>{value}</strong></article>)}</div><section className="ws-panel"><div className="ws-panel-heading"><div><h3>Projetos recentes</h3><p>Últimos projetos registrados na instituição.</p></div><button className="ws-button subtle" onClick={() => onNavigate('projects')}>Ver projetos <ChevronRight size={15}/></button></div>{(data?.projetosRecentes || []).length ? <div className="ws-table-wrap"><table><thead><tr><th>Projeto</th><th>Período</th><th>Status</th></tr></thead><tbody>{data.projetosRecentes.map((p) => <tr key={p.id}><td><strong>{p.nome}</strong></td><td>{p.ano} · {p.semestre}º semestre</td><td><Status value={p.status}/></td></tr>)}</tbody></table></div> : <Empty title="Nenhum projeto cadastrado" text="Quando projetos forem criados, eles aparecerão aqui."/>}</section><div className="ws-chart-grid"><section className="ws-panel ws-chart-panel"><div className="ws-panel-heading"><div><h3>Projetos por situação</h3><p>Distribuição atual dos projetos da instituição.</p></div></div>{(data?.projetosPorStatus || []).length ? <div className="ws-chart"><ResponsiveContainer width="100%" height={230}><BarChart data={(data?.projetosPorStatus || []).map((item) => ({ nome: String(item.status || '').replaceAll('_', ' '), total: Number(item.total) }))}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="nome" tick={{ fontSize: 10 }}/><YAxis allowDecimals={false} tick={{ fontSize: 10 }}/><Tooltip/><Bar dataKey="total" name="Projetos" fill="#8068df" radius={[6, 6, 0, 0]}/></BarChart></ResponsiveContainer></div> : <Empty title="Sem dados para exibir" text="O gráfico será preenchido quando projetos forem cadastrados."/>}</section><section className="ws-panel ws-chart-panel"><div className="ws-panel-heading"><div><h3>Projetos por período</h3><p>Distribuição por ano e semestre.</p></div></div>{(data?.projetosPorPeriodo || []).length ? <div className="ws-chart"><ResponsiveContainer width="100%" height={230}><BarChart data={(data?.projetosPorPeriodo || []).map((item) => ({ periodo: item.periodo, total: Number(item.total) }))}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="periodo" tick={{ fontSize: 10 }}/><YAxis allowDecimals={false} tick={{ fontSize: 10 }}/><Tooltip/><Bar dataKey="total" name="Projetos" fill="#27a78b" radius={[6, 6, 0, 0]}/></BarChart></ResponsiveContainer></div> : <Empty title="Sem dados para exibir" text="Os períodos aparecerão após o cadastro de projetos."/>}</section></div></> : <section className="ws-panel ws-welcome-panel"><div className="ws-welcome-icon"><ShieldCheck size={26}/></div><h3>Bem-vindo à sua área de trabalho</h3><p>Seu menu mostra os recursos liberados para o perfil <strong>{ROLES[role] || role}</strong>. As informações privadas são limitadas às suas permissões.</p><button className="ws-button primary" onClick={() => onNavigate(role === 'AVALIADOR' ? 'evaluations' : 'projects')}>Continuar <ChevronRight size={16}/></button></section>}
    <div className="ws-quick-grid"><button onClick={() => onNavigate('projects')}><FolderKanban size={19}/><span><strong>Projetos</strong><small>Consultar e cadastrar projetos</small></span><ChevronRight size={16}/></button><button onClick={() => onNavigate('banks')}><CalendarDays size={19}/><span><strong>Bancas e eventos</strong><small>Ver períodos e critérios</small></span><ChevronRight size={16}/></button><button onClick={() => onNavigate('ranking')}><Trophy size={19}/><span><strong>Resultados</strong><small>Classificação e publicação</small></span><ChevronRight size={16}/></button></div>
  </>;
}

function Requests({ items, role, search, setSearch, onDecision, onRevoke, busy, onRefresh }) {
  const [filter, setFilter] = useState('PENDENTE');
  const list = items.filter((item) => (filter === 'TODOS' || item.situacao === filter) && `${item.usuario?.nome || ''} ${item.usuario?.email || ''} ${item.papel || ''} ${item.instituicao?.nome || ''} ${item.instituicao?.identificador || ''}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="ws-panel"><div className="ws-panel-heading"><div><h3>Solicitações de ingresso</h3><p>{role === 'SUPERADMIN' ? 'Acompanhe solicitações de todas as instituições e aprove ou recuse cada pedido.' : 'Aprove ou recuse os pedidos de vínculo desta instituição.'}</p></div><button className="ws-button subtle" onClick={onRefresh}><RefreshCw size={15}/> Atualizar</button></div><div className="ws-toolbar"><label className="ws-search"><Search size={16}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome, e-mail ou perfil"/></label><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="PENDENTE">Pendentes</option><option value="APROVADO">Aprovadas</option><option value="RECUSADO">Recusadas</option><option value="REVOGADO">Revogadas</option><option value="TODOS">Todas</option></select></div>{list.length ? <div className="ws-table-wrap"><table><thead><tr><th>Solicitante</th>{role === 'SUPERADMIN' && <th>Instituição</th>}<th>Perfil solicitado</th><th>Solicitado em</th><th>Status</th><th>Ações</th></tr></thead><tbody>{list.map((item) => <tr key={item.id}><td><strong>{item.usuario?.nome || 'Usuário'}</strong><small className="ws-subline">{item.usuario?.email}</small></td>{role === 'SUPERADMIN' && <td>{item.instituicao?.nome || 'Instituição indisponível'}<small className="ws-subline">{item.instituicao?.identificador || ''}</small></td>}<td>{ROLES[item.papel] || item.papel}</td><td>{dateTime(item.criadoEm)}</td><td><Status value={item.situacao}/></td><td>{item.situacao === 'PENDENTE' ? <div className="ws-row-actions"><button disabled={busy} className="ws-action approve" onClick={() => onDecision(item.id, 'APROVADO')} title="Aprovar"><Check size={16}/> Aprovar</button><button disabled={busy} className="ws-action reject" onClick={() => onDecision(item.id, 'RECUSADO')} title="Recusar"><X size={16}/> Recusar</button></div> : item.situacao === 'APROVADO' && item.papel !== 'SUPERADMIN' ? <button disabled={busy} className="ws-action reject" onClick={() => onRevoke(item.id)}><Ban size={15}/> Revogar acesso</button> : <span className="ws-muted">Sem ações</span>}</td></tr>)}</tbody></table></div> : <Empty title="Nenhuma solicitação encontrada" text="Quando alguém solicitar acesso à instituição, o pedido aparecerá aqui."/>}</section>;
}

function Institutions({ items, busy, onRun }) {
  const [form, setForm] = useState({ nome: '', identificador: '', corTema: '#8b70f8' });
  const [adminForm, setAdminForm] = useState({ email: '', instituicaoId: '' });
  const create = (e) => {
    e.preventDefault();
    onRun(async () => {
      await api.post('/instituicoes', form);
      setForm({ nome: '', identificador: '', corTema: '#8b70f8' });
    }, 'Instituição criada com sucesso.');
  };
  const assignAdmin = (e) => {
    e.preventDefault();
    onRun(async () => {
      await api.post('/vinculos/administrador-institucional', adminForm);
      setAdminForm({ ...adminForm, email: '' });
    }, 'Administrador institucional designado.');
  };
  return <>
    <div className="ws-two-col">
      <section className="ws-panel">
        <div className="ws-panel-heading"><div><h3>Nova instituição</h3><p>Cadastre uma instituição na plataforma.</p></div></div>
        <form className="ws-form" onSubmit={create}>
          <Field label="Nome da instituição"><input required minLength="2" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Universidade Central"/></Field>
          <Field label="Identificador único"><input required pattern="[a-z0-9][a-z0-9_-]{1,49}" value={form.identificador} onChange={(e) => setForm({ ...form, identificador: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })} placeholder="universidade-central"/><small>Use letras minúsculas, números, hífen ou sublinhado.</small></Field>
          <Field label="Cor do tema"><input type="color" value={form.corTema} onChange={(e) => setForm({ ...form, corTema: e.target.value })}/></Field>
          <button className="ws-button primary" disabled={busy}><Plus size={16}/> Criar instituição</button>
        </form>
      </section>
      <section className="ws-panel">
        <div className="ws-panel-heading"><div><h3>Instituições cadastradas</h3><p>Ative ou suspenda o acesso de uma instituição.</p></div><span className="ws-count">{items.length}</span></div>
        {items.length ? <div className="ws-stack">{items.map((item) => <article className="ws-institution-card" key={item.id}><span className="ws-institution-icon" style={{ color: item.corTema || undefined }}><Building2 size={18}/></span><div className="ws-grow"><strong>{item.nome}</strong><small>{item.identificador}</small><Status value={item.status}/></div><button className={`ws-action ${item.status === 'ATIVA' ? 'reject' : 'approve'}`} disabled={busy} onClick={() => onRun(() => api.patch(`/instituicoes/${item.id}/status`, { status: item.status === 'ATIVA' ? 'SUSPENSA' : 'ATIVA' }), item.status === 'ATIVA' ? 'Instituição suspensa.' : 'Instituição reativada.')}>{item.status === 'ATIVA' ? <><Ban size={15}/> Suspender</> : <><PlayCircle size={15}/> Reativar</>}</button></article>)}</div> : <Empty title="Sem instituições" text="Cadastre a primeira instituição pelo formulário."/>}
      </section>
    </div>
    <section className="ws-panel">
      <div className="ws-panel-heading"><div><h3>Designar administrador institucional</h3><p>A pessoa precisa ter criado uma conta antes. Esta ação concede o papel administrativo à instituição selecionada.</p></div></div>
      <form className="ws-form ws-inline-form" onSubmit={assignAdmin}>
        <Field label="E-mail da conta existente"><input type="email" required value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} placeholder="pessoa@instituicao.edu.br"/></Field>
        <Field label="Instituição"><select required value={adminForm.instituicaoId} onChange={(e) => setAdminForm({ ...adminForm, instituicaoId: e.target.value })}><option value="">Selecione uma instituição</option>{items.filter((item) => item.status === 'ATIVA').map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></Field>
        <button className="ws-button primary" disabled={busy || !items.some((item) => item.id === adminForm.instituicaoId)}><ShieldCheck size={16}/> Designar administrador</button>
      </form>
    </section>
  </>;
}

function Projects({ items, role, institutionId, search, setSearch, busy, onRun }) {
  const [showForm, setShowForm] = useState(false);
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [form, setForm] = useState({ nome: '', descricao: '', ano: new Date().getFullYear(), semestre: '1' });
  const canCreate = MANAGEMENT.includes(role);
  useEffect(() => { if (showForm && institutionId && canCreate) api.get(`/vinculos/instituicao/${institutionId}`).then(({ data }) => setMembers((data || []).filter((v) => v.situacao === 'APROVADO' && ['ALUNO', 'ORIENTADOR'].includes(v.papel)))).catch(() => setMembers([])); }, [showForm, institutionId, canCreate]);
  const filtered = items.filter((p) => `${p.nome} ${p.descricao || ''} ${p.ano || ''}`.toLowerCase().includes(search.toLowerCase()));
  const toggleMember = (vinculo) => setSelectedMembers((old) => old.some((x) => x.usuarioId === vinculo.usuarioId && x.funcao === vinculo.papel) ? old.filter((x) => !(x.usuarioId === vinculo.usuarioId && x.funcao === vinculo.papel)) : [...old, { usuarioId: vinculo.usuarioId, funcao: vinculo.papel }]);
  const create = (e) => { e.preventDefault(); onRun(async () => { await api.post('/projetos', { ...form, instituicaoId, ano: Number(form.ano), semestre: Number(form.semestre), integrantes: selectedMembers }); setForm({ nome: '', descricao: '', ano: new Date().getFullYear(), semestre: '1' }); setSelectedMembers([]); setShowForm(false); }, 'Projeto cadastrado com sucesso.'); };
  return <><section className="ws-panel"><div className="ws-panel-heading"><div><h3>Projetos da instituição</h3><p>Consulte projetos, equipes e orientações dentro do seu escopo de acesso.</p></div>{canCreate && <button className="ws-button primary" onClick={() => setShowForm(!showForm)}><Plus size={16}/>{showForm ? 'Cancelar' : 'Novo projeto'}</button>}</div>{showForm && <form className="ws-form ws-inline-form" onSubmit={create}><Field label="Nome do projeto"><input required maxLength="255" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}/></Field><Field label="Ano"><input type="number" min="2000" max="9999" required value={form.ano} onChange={(e) => setForm({ ...form, ano: e.target.value })}/></Field><Field label="Semestre"><select value={form.semestre} onChange={(e) => setForm({ ...form, semestre: e.target.value })}><option value="1">1º semestre</option><option value="2">2º semestre</option></select></Field><Field label="Descrição" wide><textarea rows="3" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })}/></Field><div className="ws-check-group"><strong>Equipe e orientação (opcional)</strong>{members.length ? members.map((v) => <label key={`${v.usuarioId}-${v.papel}`} className="ws-check"><input type="checkbox" checked={selectedMembers.some((x) => x.usuarioId === v.usuarioId && x.funcao === v.papel)} onChange={() => toggleMember(v)}/><span>{v.usuario?.nome || v.usuario?.email} <small>{ROLES[v.papel] || v.papel}</small></span></label>) : <small>Aprove solicitações de alunos e orientadores para poder associá-los ao projeto.</small>}</div><button className="ws-button primary" disabled={busy}><Plus size={16}/> Salvar projeto</button></form>}<div className="ws-toolbar"><label className="ws-search"><Search size={16}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar projeto"/></label><span className="ws-count">{filtered.length} projetos</span></div>{filtered.length ? <div className="ws-table-wrap"><table><thead><tr><th>Projeto</th><th>Ano / semestre</th><th>Status</th><th>Integrantes</th></tr></thead><tbody>{filtered.map((p) => <tr key={p.id}><td><strong>{p.nome}</strong>{p.descricao && <small className="ws-subline">{p.descricao}</small>}</td><td>{p.ano} · {p.semestre}º semestre</td><td><Status value={p.status}/></td><td>{(p.integrantes || []).length}</td></tr>)}</tbody></table></div> : <Empty title="Nenhum projeto encontrado" text={canCreate ? 'Crie o primeiro projeto para começar a organizar as avaliações.' : 'Os projetos vinculados ao seu perfil aparecerão aqui.'}/>}</section></>;
}

function Banks({ items, projects, institutionId, role, busy, onRun, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [approved, setApproved] = useState([]);
  const [criteria, setCriteria] = useState([{ titulo: 'Clareza do problema', peso: '1', rubricas: {} }, { titulo: 'Mercado e escalabilidade', peso: '1', rubricas: {} }, { titulo: 'Conceito e produto', peso: '1', rubricas: {} }]);
  const [form, setForm] = useState({ nome: '', periodoInicio: inputDate(new Date(Date.now() - 60000)), periodoFim: inputDate(new Date(Date.now() + 7 * 86400000)), politicaDesempate: 'EMPATE_COMPARTILHADO', casasDecimais: '2', projetosIds: [], avaliadoresIds: [] });
  useEffect(() => { if (showForm && institutionId && ADMIN.concat('COORDENADOR').includes(role)) api.get(`/vinculos/instituicao/${institutionId}`).then(({ data }) => setApproved((data || []).filter((v) => v.situacao === 'APROVADO' && v.papel === 'AVALIADOR'))) .catch(() => setApproved([])); }, [showForm, institutionId, role]);
  const canCreate = MANAGEMENT.includes(role);
  const toggle = (key, id) => setForm((old) => ({ ...old, [key]: old[key].includes(id) ? old[key].filter((x) => x !== id) : [...old[key], id] }));
  const create = (e) => { e.preventDefault(); onRun(async () => { await api.post('/bancas', { ...form, instituicaoId: institutionId, periodoInicio: new Date(form.periodoInicio).toISOString(), periodoFim: new Date(form.periodoFim).toISOString(), casasDecimais: Number(form.casasDecimais), criterios: criteria.map((c) => ({ ...c, peso: Number(c.peso), notaMinima: 1, notaMaxima: 5, rubricas: c.rubricas || {} })), projetosIds: form.projetosIds, avaliadoresIds: form.avaliadoresIds }); setShowForm(false); setForm({ nome: '', periodoInicio: inputDate(new Date()), periodoFim: inputDate(new Date(Date.now() + 7 * 86400000)), politicaDesempate: 'EMPATE_COMPARTILHADO', casasDecimais: '2', projetosIds: [], avaliadoresIds: [] }); }, 'Banca criada com sucesso.'); };
  return <section className="ws-panel"><div className="ws-panel-heading"><div><h3>Bancas e eventos</h3><p>Configure período, critérios ponderados, projetos e avaliadores.</p></div><div className="ws-actions">{canCreate && <button className="ws-button primary" onClick={() => setShowForm(!showForm)}><Plus size={16}/>{showForm ? 'Cancelar' : 'Nova banca'}</button>}<button className="ws-button subtle" onClick={onRefresh}><RefreshCw size={15}/></button></div></div>{showForm && <form className="ws-form ws-inline-form" onSubmit={create}><Field label="Nome da banca" wide><input required maxLength="255" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Banca de avaliação 2026-1"/></Field><Field label="Início"><input type="datetime-local" required value={form.periodoInicio} onChange={(e) => setForm({ ...form, periodoInicio: e.target.value })}/></Field><Field label="Fim"><input type="datetime-local" required value={form.periodoFim} onChange={(e) => setForm({ ...form, periodoFim: e.target.value })}/></Field><Field label="Política de desempate"><select value={form.politicaDesempate} onChange={(e) => setForm({ ...form, politicaDesempate: e.target.value })}><option value="EMPATE_COMPARTILHADO">Posições compartilhadas</option><option value="NOME_PROJETO">Nome do projeto</option></select></Field><Field label="Casas decimais"><select value={form.casasDecimais} onChange={(e) => setForm({ ...form, casasDecimais: e.target.value })}>{[0,1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}</select></Field><div className="ws-check-group"><strong>Projetos participantes</strong>{projects.length ? projects.map((p) => <label key={p.id} className="ws-check"><input type="checkbox" checked={form.projetosIds.includes(p.id)} onChange={() => toggle('projetosIds', p.id)}/><span>{p.nome}</span></label>) : <small>Cadastre projetos antes de criar uma banca.</small>}</div><div className="ws-check-group"><strong>Avaliadores aprovados</strong>{approved.length ? approved.map((v) => <label key={v.usuarioId} className="ws-check"><input type="checkbox" checked={form.avaliadoresIds.includes(v.usuarioId)} onChange={() => toggle('avaliadoresIds', v.usuarioId)}/><span>{v.usuario?.nome} <small>{v.usuario?.email}</small></span></label>) : <small>É necessário aprovar usuários com perfil Avaliador.</small>}</div><div className="ws-criteria"><div className="ws-criteria-head"><strong>Critérios de avaliação</strong><button type="button" className="ws-button subtle" onClick={() => setCriteria([...criteria, { titulo: '', peso: '1', rubricas: {} }])}><Plus size={14}/> Adicionar critério</button></div>{criteria.map((c, i) => <div className="ws-criterion-editor" key={i}><div className="ws-criterion-row"><input aria-label="Título do critério" required placeholder="Nome do critério" value={c.titulo} onChange={(e) => setCriteria(criteria.map((x, j) => i === j ? { ...x, titulo: e.target.value } : x))}/><label>Peso<input aria-label="Peso do critério" required type="number" min="0.01" step="0.01" value={c.peso} onChange={(e) => setCriteria(criteria.map((x, j) => i === j ? { ...x, peso: e.target.value } : x))}/></label>{criteria.length > 1 && <button type="button" className="ws-icon-button danger" onClick={() => setCriteria(criteria.filter((_, j) => j !== i))}><X size={15}/></button>}</div><details className="ws-rubric-editor"><summary>Descritores orientadores por nota (opcional)</summary><div>{[1,2,3,4,5].map((nota) => <label key={nota}>Nota {nota}<input maxLength="500" placeholder={`Descreva o que representa a nota ${nota}`} value={c.rubricas?.[nota] || ''} onChange={(e) => setCriteria(criteria.map((x, j) => i === j ? { ...x, rubricas: { ...(x.rubricas || {}), [nota]: e.target.value } } : x))}/></label>)}</div></details></div>)}</div><button className="ws-button primary" disabled={busy || !form.projetosIds.length || !form.avaliadoresIds.length}><Plus size={16}/> Criar banca</button></form>}<div className="ws-stack">{items.length ? items.map((b) => <article className="ws-bank-card" key={b.id}><div className="ws-bank-head"><div><h4>{b.nome}</h4><small>{dateTime(b.periodoInicio)} — {dateTime(b.periodoFim)}</small></div><Status value={b.status}/></div><div className="ws-bank-meta"><span>{(b.criterios || []).length} critérios</span><span>{(b.bancaProjetos || []).length} projetos</span><span>{(b.bancaAvaliadores || []).length} avaliadores</span></div>{(b.criterios || []).length > 0 && <div className="ws-tags">{b.criterios.map((c) => <span key={c.id}>{c.titulo} · peso {c.peso}</span>)}</div>}</article>) : <Empty title="Nenhuma banca cadastrada" text={canCreate ? 'Crie uma banca para associar projetos, critérios e avaliadores.' : 'As bancas às quais você tem acesso aparecerão aqui.'}/>}</div></section>;
}

function Evaluations({ items, role, busy, onRun }) {
  const eligible = items.filter((b) => ['ABERTA', 'EM_AVALIACAO'].includes(b.status));
  const [bankId, setBankId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [notes, setNotes] = useState({});
  const [details, setDetails] = useState([]);
  const bank = items.find((b) => b.id === bankId);
  const criteria = bank?.criterios || [];
  const bankProjects = bank?.bancaProjetos || [];
  useEffect(() => { if (!bankId && (eligible[0] || items[0])) setBankId((eligible[0] || items[0]).id); }, [items]);
  useEffect(() => { setProjectId(''); setNotes({}); setDetails([]); }, [bankId]);
  const submit = (e) => {
    e.preventDefault();
    onRun(async () => {
      await api.post('/avaliacoes', { bancaId: bankId, projetoId: projectId, notas: criteria.map((c) => ({ criterioId: c.id, valor: Number(notes[c.id]) })) });
      setNotes({});
    }, 'Avaliação registrada com sucesso.');
  };
  const loadDetails = () => onRun(async () => {
    const { data } = await api.get(`/avaliacoes/banca/${bankId}/projeto/${projectId}`);
    setDetails(Array.isArray(data) ? data : []);
  }, 'Avaliações carregadas.');
  if (role !== 'AVALIADOR') {
    if (!['SUPERADMIN', 'ADMIN_INST', 'COORDENADOR'].includes(role)) return <section className="ws-panel"><Empty title="Acesso não disponível" text="Este perfil não tem permissão para consultar avaliações detalhadas."/></section>;
    return <section className="ws-panel"><div className="ws-panel-heading"><div><h3>Consulta de avaliações</h3><p>Consulte as notas submetidas por projeto, sem alterar os registros enviados.</p></div></div>
      <div className="ws-form ws-inline-form"><Field label="Banca"><select value={bankId} onChange={(e) => setBankId(e.target.value)}><option value="">Selecione uma banca</option>{items.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}</select></Field><Field label="Projeto"><select value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="">Selecione um projeto</option>{bankProjects.map((bp) => <option key={bp.projetoId} value={bp.projetoId}>{bp.projeto?.nome || bp.projetoId}</option>)}</select></Field><button className="ws-button primary" disabled={!bankId || !projectId || busy} onClick={loadDetails}><Search size={16}/> Consultar notas</button></div>
      {details.length ? <div className="ws-stack">{details.map((item) => <article className="ws-institution-card" key={item.id}><div className="ws-grow"><strong>{item.avaliador?.nome || 'Avaliação submetida'}</strong><small>{dateTime(item.submetidaEm)} · {item.status}</small><div className="ws-tags">{(item.notas || []).map((nota) => <span key={nota.criterioId}>{criteria.find((c) => c.id === nota.criterioId)?.titulo || 'Critério'}: {nota.valor}</span>)}</div></div></article>)}</div> : <Empty title="Nenhuma avaliação carregada" text="Selecione uma banca e um projeto para consultar as notas existentes."/>}
    </section>;
  }
  return <div className="ws-two-col"><section className="ws-panel"><div className="ws-panel-heading"><div><h3>Instrumento de avaliação</h3><p>Registre uma nota por critério para o projeto selecionado.</p></div></div>{eligible.length ? <form className="ws-form" onSubmit={submit}><Field label="Banca"><select required value={bankId} onChange={(e) => setBankId(e.target.value)}><option value="">Selecione a banca</option>{eligible.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}</select></Field><Field label="Projeto participante"><select required value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="">Selecione o projeto</option>{bankProjects.map((bp) => <option key={bp.projetoId} value={bp.projetoId}>{bp.projeto?.nome || bp.projetoId}</option>)}</select></Field>{criteria.map((c) => <Field key={c.id} label={`${c.titulo} · peso ${c.peso}`}><div className="ws-score-row"><input type="range" min={c.notaMinima} max={c.notaMaxima} value={notes[c.id] ?? c.notaMinima} onChange={(e) => setNotes({ ...notes, [c.id]: e.target.value })}/><strong>{notes[c.id] ?? c.notaMinima}</strong><small>{c.notaMinima}–{c.notaMaxima}</small></div>{(c.descricao || rubricaDaNota(c, notes[c.id] ?? c.notaMinima)) && <small>{rubricaDaNota(c, notes[c.id] ?? c.notaMinima) || c.descricao}</small>}</Field>)}<button className="ws-button primary" disabled={busy || !bankId || !projectId || !criteria.length}><Send size={16}/> Submeter avaliação</button></form> : <Empty title="Nenhuma banca aberta" text="As bancas abertas e atribuídas a você aparecerão aqui."/>}</section><section className="ws-panel"><h3>Antes de submeter</h3><ul className="ws-guidance"><li>Confira se a banca e o projeto estão corretos.</li><li>Todos os critérios são obrigatórios.</li><li>Uma segunda avaliação para o mesmo projeto e banca será bloqueada.</li><li>Se precisar corrigir uma nota, procure o administrador conforme a política de edição auditada.</li></ul></section></div>;
}

function Ranking({ items, role, busy, rankings, setRankings, onRun }) {
  const [bankId, setBankId] = useState(''); const [presentation, setPresentation] = useState(false); const [soundEnabled, setSoundEnabled] = useState(false); const bank = items.find((b) => b.id === bankId); const results = rankings[bankId] || [];
  useEffect(() => { if (!bankId && items[0]) setBankId(items[0].id); }, [items]);
  const load = () => onRun(async () => { const { data } = await api.get(`/ranking/banca/${bankId}`); setRankings((old) => ({ ...old, [bankId]: Array.isArray(data) ? data : [] })); }, null);
  const calculate = () => onRun(async () => { const { data } = await api.post(`/ranking/banca/${bankId}/calcular`); setRankings((old) => ({ ...old, [bankId]: data.resultados || [] })); }, 'Ranking calculado.');
  const publish = () => { if (!window.confirm('Publicar este ranking? Os resultados ficarão disponíveis conforme as permissões da plataforma.')) return; onRun(() => api.patch(`/ranking/banca/${bankId}/publicar`), 'Ranking publicado.'); };
  const playSound = () => { if (!soundEnabled) return; try { const AudioCtx = window.AudioContext || window.webkitAudioContext; if (!AudioCtx) return; const ctx = new AudioCtx(); [523.25, 659.25, 783.99].forEach((frequency, index) => { const oscillator = ctx.createOscillator(); const gain = ctx.createGain(); oscillator.frequency.value = frequency; oscillator.type = 'sine'; gain.gain.setValueAtTime(0.0001, ctx.currentTime + index * 0.16); gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + index * 0.16 + 0.03); gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + index * 0.16 + 0.22); oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(ctx.currentTime + index * 0.16); oscillator.stop(ctx.currentTime + index * 0.16 + 0.23); }); window.setTimeout(() => ctx.close(), 1000); } catch { /* áudio opcional; a apresentação continua sem som */ } };
  const startPresentation = () => { setPresentation(true); confetti({ particleCount: 180, spread: 90, origin: { y: 0.65 } }); playSound(); };
  return <section className="ws-panel"><div className="ws-panel-heading"><div><h3>Classificação dos projetos</h3><p>Calcule, revise e publique os resultados de uma banca.</p></div></div><div className="ws-toolbar"><Field label="Banca"><select value={bankId} onChange={(e) => { setBankId(e.target.value); }}><option value="">Selecione</option>{items.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}</select></Field><div className="ws-actions"><button className="ws-button subtle" disabled={!bankId || busy} onClick={load}><RefreshCw size={15}/> Carregar</button>{MANAGEMENT.includes(role) && <button className="ws-button primary" disabled={!bankId || busy} onClick={calculate}><Trophy size={15}/> Calcular</button>}{ADMIN.includes(role) && <button className="ws-button primary" disabled={!bankId || busy || bank?.status === 'PUBLICADA' || !results.length} onClick={publish}><Check size={15}/> Publicar</button>}</div></div>{bank && <div className="ws-callout"><Trophy size={18}/><p>Política de desempate: <strong>{bank.politicaDesempate === 'NOME_PROJETO' ? 'ordem alfabética do projeto' : 'posições compartilhadas'}</strong>. Casas decimais: {bank.casasDecimais ?? 2}. Status: {bank.status}.</p></div>}{results.length > 0 && <div className="ws-actions ws-podium-controls"><button className="ws-button primary" onClick={startPresentation}><Trophy size={15}/> Apresentar pódio</button><button className="ws-button subtle" onClick={() => setSoundEnabled((value) => !value)}>{soundEnabled ? 'Desativar som' : 'Ativar som'}</button>{presentation && <button className="ws-button subtle" onClick={() => { setPresentation(false); setSoundEnabled(false); }}>Encerrar apresentação</button>}</div>}{presentation && results.length > 0 && <div className="ws-podium-stage" role="status"><span>RESULTADO FINAL</span><h3>{bank?.nome || 'Banca de avaliação'}</h3><div className="ws-podium-winners">{[...results].sort((a,b) => Number(a.posicao) - Number(b.posicao)).filter((r) => Number(r.posicao) <= 3).map((r, i) => <article key={r.projetoId || r.id || i} className={`ws-podium-winner place-${r.posicao}`}><span>{Number(r.posicao) === 1 ? '🥇' : Number(r.posicao) === 2 ? '🥈' : '🥉'}</span><strong>{r.nomeProjeto || r.projeto?.nome || 'Projeto'}</strong><small>{Number(r.pontuacaoFinal ?? r.pontuacao_final ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 4 })} pontos</small><b>{r.posicao}º lugar</b></article>)}</div></div>}{results.length ? <div className="ws-ranking-list">{[...results].sort((a,b) => Number(a.posicao) - Number(b.posicao)).map((r, i) => { const projectName = r.nomeProjeto || r.projeto?.nome || 'Projeto'; return <article key={r.projetoId || r.id || i} className={`ws-ranking-row ${i < 3 ? `podium p${i + 1}` : ''}`}><span className="ws-rank-number">{r.posicao ?? i + 1}</span><div className="ws-grow"><strong>{projectName}</strong><small>{r.quantidadeAvaliacoesValidas != null ? `${r.quantidadeAvaliacoesValidas} avaliações válidas` : (r.status || 'Resultado')}</small></div><strong className="ws-score">{Number(r.pontuacaoFinal ?? r.pontuacao_final ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}</strong></article>; })}</div> : <Empty title="Nenhum resultado carregado" text="Selecione uma banca e carregue um ranking já calculado ou calcule um novo."/>}</section>;
}

function Reports({ items, busy, onRun }) {
  const [bankId, setBankId] = useState('');
  const download = () => onRun(async () => { const response = await api.get(`/relatorios/banca/${bankId}/excel`, { responseType: 'blob' }); const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `relatorio-banca-${bankId}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }, 'Relatório gerado.');
  return <section className="ws-panel ws-report-panel"><div className="ws-report-icon"><FileSpreadsheet size={27}/></div><h3>Exportar relatório Excel</h3><p>Gere uma planilha de classificação e, para perfis de gestão, uma segunda aba com as avaliações detalhadas disponíveis.</p><div className="ws-form ws-report-form"><Field label="Banca"><select value={bankId} onChange={(e) => setBankId(e.target.value)}><option value="">Selecione uma banca</option>{items.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}</select></Field><button className="ws-button primary" disabled={!bankId || busy} onClick={download}><Download size={16}/> Baixar arquivo .xlsx</button></div><div className="ws-callout"><ShieldCheck size={18}/><p>O arquivo respeita suas permissões. Usuários sem perfil de gestão recebem somente resultados publicados.</p></div></section>;
}

function Audit({ items, search, setSearch }) {
  const filtered = items.filter((item) => `${item.operacao} ${item.entidade} ${item.usuario?.nome || ''} ${item.usuario?.email || ''}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="ws-panel"><div className="ws-panel-heading"><div><h3>Trilha de auditoria</h3><p>Últimos registros de operações relevantes na instituição.</p></div><span className="ws-count">{filtered.length} registros</span></div><div className="ws-toolbar"><label className="ws-search"><Search size={16}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar operação, entidade ou usuário"/></label></div>{filtered.length ? <div className="ws-table-wrap"><table><thead><tr><th>Data</th><th>Operação</th><th>Entidade</th><th>Usuário</th><th>Detalhes</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td>{dateTime(item.criadoEm)}</td><td><Status value={item.operacao}/></td><td>{item.entidade}<small className="ws-subline">{item.entidadeId || ''}</small></td><td>{item.usuario?.nome || 'Sistema'}<small className="ws-subline">{item.usuario?.email || ''}</small></td><td><details><summary>Ver</summary><pre>{JSON.stringify({ antes: item.dadosAnteriores, depois: item.dadosNovos }, null, 2)}</pre></details></td></tr>)}</tbody></table></div> : <Empty title="Nenhum evento de auditoria" text="As operações auditadas aparecerão aqui conforme forem realizadas."/>}</section>;
}
