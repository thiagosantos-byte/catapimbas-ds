
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

const modules = {
  projetos: {
    number: '01',
    title: 'Projetos',
    description: 'Ideias, equipes e orientações conectadas.',
  },
  bancas: {
    number: '02',
    title: 'Bancas',
    description: 'Avaliadores, critérios e notas organizados.',
  },
  resultados: {
    number: '03',
    title: 'Resultados',
    description: 'Classificações e indicadores com rastreabilidade.',
  },
};

function Icon({ name, size = 18 }) {
  const drawings = {
    building: (
      <>
        <path d="M3 21h18" />
        <path d="M5 21V5l7-2 7 2v16" />
        <path d="M9 8h1m4 0h1m-6 4h1m4 0h1M10 21v-4h4v4" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" />
        <path d="m19 15 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" />
      </>
    ),
    projects: (
      <>
        <rect x="3" y="4" width="13" height="16" rx="2" />
        <path d="M7 8h5M7 12h5M7 16h3M16 9h3a2 2 0 0 1 2 2v8h-5" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v1" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5M4 19h17" />
        <path d="m7 15 4-4 3 2 5-6M16 7h3v3" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 1 1 8 0v3m-4 4v3" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    eyeOff: (
      <>
        <path d="m3 3 18 18" />
        <path d="M10.6 6.2A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.1 3.6M6.2 6.3C3.5 8.1 2 12 2 12s3.5 6 10 6a10 10 0 0 0 3.2-.5" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    phone: (
      <>
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {drawings[name] || drawings.spark}
    </svg>
  );
}

function PersonIllustration() {
  return (
    <svg
      className="person-illustration"
      viewBox="0 0 360 330"
      role="img"
      aria-label="Ilustração de uma pessoa analisando painéis de projetos"
    >
      <defs>
        <linearGradient id="person-shirt" x1="130" y1="105" x2="205" y2="236" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9D8BF4" />
          <stop offset="1" stopColor="#51466F" />
        </linearGradient>
        <linearGradient id="holo-fill" x1="45" y1="55" x2="310" y2="220" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8FE8CC" stopOpacity=".3" />
          <stop offset="1" stopColor="#9B88F4" stopOpacity=".08" />
        </linearGradient>
      </defs>

      <ellipse cx="180" cy="294" rx="118" ry="19" fill="#090711" fillOpacity=".32" />
      <ellipse cx="180" cy="287" rx="112" ry="17" fill="#B5A6FF" fillOpacity=".08" stroke="#A99AFF" strokeOpacity=".2" />

      <path d="M41 68C70 105 91 119 130 124V205C87 199 59 176 41 145V68Z" fill="url(#holo-fill)" stroke="#8FE8CC" strokeOpacity=".78" strokeWidth="1.5" />
      <path d="M41 68C73 109 93 122 130 124M58 94l17 21 17-10 20 33M56 151l26 17 25-25" fill="none" stroke="#B7FFE7" strokeOpacity=".75" strokeWidth="1.4" />
      <circle cx="101" cy="157" r="5" fill="#8FE8CC" />

      <path d="M230 124C274 117 296 93 320 56V145C298 178 269 198 230 205V124Z" fill="url(#holo-fill)" stroke="#8FE8CC" strokeOpacity=".78" strokeWidth="1.5" />
      <path d="M250 143v-20l14-8v45M273 135v-32l14-8v59M296 117V88l10-9v35" fill="none" stroke="#B7FFE7" strokeOpacity=".8" strokeWidth="1.6" />

      <path d="M151 204 143 269c-1 8 4 12 11 12h7l18-66-28-11Z" fill="#49435C" />
      <path d="m181 211 8 58c1 8 7 12 14 11l6-2-5-72-23 5Z" fill="#39334D" />
      <path d="M143 272h17l10 14h-31c-5 0-7-5-4-9l8-5ZM190 269l15-1 16 13c3 3 1 6-4 6h-29l2-18Z" fill="#28243A" />

      <path d="M139 120c-5 8-9 25-8 42l7 48c13 15 36 19 55 7l11-56c3-18-3-35-13-43l-52 2Z" fill="url(#person-shirt)" />
      <path d="M144 125 118 144c-5 4-6 11-3 16l19 26 11-7-13-23 22-14-10-17ZM189 126l19 20c4 5 4 11 0 16l-16 19-10-8 12-20-17-12 2-15Z" fill="#C99391" />

      <path d="M147 85h37v39c-8 10-27 10-36 0l-1-39Z" fill="#D9A09B" />
      <ellipse cx="165" cy="67" rx="25" ry="30" fill="#E7B2A6" />
      <path d="M141 66c-4-20 5-36 23-39 17-3 29 11 29 27l-4 11-7-15c-14 4-24 4-37 0l-4 16Z" fill="#30283F" />
      <path d="M142 54c13 2 28-1 42-11 3 10 8 15 10 17-2-19-14-31-31-31-12 0-22 9-24 25Z" fill="#463752" />

      <circle cx="155" cy="69" r="2" fill="#30283F" />
      <circle cx="175" cy="69" r="2" fill="#30283F" />
      <path d="M159 82c4 3 8 3 12 0" stroke="#A86E71" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M144 123c12 8 31 8 42-1" stroke="#C5B4FF" strokeWidth="1.6" strokeOpacity=".7" fill="none" />
      <circle cx="165" cy="166" r="4" fill="#8FE8CC" fillOpacity=".8" />
      <path d="M165 166v24" stroke="#8FE8CC" strokeOpacity=".6" />
    </svg>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [manterConectado, setManterConectado] = useState(false);
  const [moduloAtivo, setModuloAtivo] = useState('projetos');
  const [movimento, setMovimento] = useState({ x: 0, y: 0 });

  const { login } = useAuth();
  const navigate = useNavigate();
  const modulo = modules[moduloAtivo];

  async function handleLogin(event) {
    event.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      await login(email.trim(), senha, manterConectado);
      navigate('/dashboard');
    } catch (error) {
      setErro(
        error.response?.data?.mensagem ||
          error.response?.data?.message ||
          'Não foi possível entrar. Confira seu e-mail e sua senha.'
      );
    } finally {
      setCarregando(false);
    }
  }


  function handleSceneMove(event) {
    if (
      event.pointerType === 'touch' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    setMovimento({ x: x * 8, y: y * 6 });
  }

  function resetScene() {
    setMovimento({ x: 0, y: 0 });
  }

  return (
    <main className="nexus-login">
      <section className="nexus-visual">
        <header className="nexus-brand">
          <div className="brand-symbol">
            <Icon name="building" size={21} />
          </div>
          <span className="brand-name">
            NEXUS<span className="brand-accent">.</span>
          </span>
          <span className="brand-divider" />
          <span className="brand-caption">ACADEMIC</span>
        </header>

        <div className="visual-copy">
          <span className="eyebrow">
            <span className="status-dot" />
            IDEIAS EM MOVIMENTO
          </span>

          <h1>
            Boas ideias merecem
            <br />
            um <span>novo espaço.</span>
          </h1>

          <p className="visual-description">
            Conecte projetos, avaliadores e instituições em um ambiente
            criado para transformar potencial em resultado.
          </p>
        </div>

        <div
          className="interactive-scene"
          onPointerMove={handleSceneMove}
          onPointerLeave={resetScene}
          style={{
            '--move-x': `${movimento.x}px`,
            '--move-y': `${movimento.y}px`,
          }}
        >
          <div className="scene-grid" />
          <div className="scene-orbit orbit-one" />
          <div className="scene-orbit orbit-two" />

          <div className="scene-art">
            <PersonIllustration />
          </div>

          <button
            type="button"
            className={`scene-panel panel-projects ${
              moduloAtivo === 'projetos' ? 'is-active' : ''
            }`}
            onClick={() => setModuloAtivo('projetos')}
            aria-pressed={moduloAtivo === 'projetos'}
          >
            <Icon name="projects" size={18} />
            <span>PROJETOS</span>
            <strong>Novas ideias</strong>
          </button>

          <button
            type="button"
            className={`scene-panel panel-evaluation ${
              moduloAtivo === 'bancas' ? 'is-active' : ''
            }`}
            onClick={() => setModuloAtivo('bancas')}
            aria-pressed={moduloAtivo === 'bancas'}
          >
            <Icon name="users" size={18} />
            <span>BANCAS</span>
            <strong>Olhares que somam</strong>
          </button>

          <button
            type="button"
            className={`scene-panel panel-ranking ${
              moduloAtivo === 'resultados' ? 'is-active' : ''
            }`}
            onClick={() => setModuloAtivo('resultados')}
            aria-pressed={moduloAtivo === 'resultados'}
          >
            <Icon name="chart" size={18} />
            <span>RESULTADOS</span>
            <strong>Potencial revelado</strong>
          </button>
        </div>

        <div className="feature-detail" aria-live="polite">
          <span className="feature-number">{modulo.number}</span>
          <div className="feature-copy">
            <span>EXPLORE A PLATAFORMA</span>
            <strong>{modulo.title}</strong>
            <p>{modulo.description}</p>
          </div>
          <Icon name="spark" size={21} />
        </div>

        <footer className="visual-footer">
          <span>TECNOLOGIA PARA BOAS IDEIAS.</span>
          <span>MÚLTIPLAS INSTITUIÇÕES.</span>
        </footer>
      </section>

      <section className="nexus-access">
        <div className="access-topline">
          <span>ÁREA INSTITUCIONAL</span>
          <span className="access-indicator">
            <Icon name="shield" size={14} />
            ACESSO PROTEGIDO
          </span>
        </div>

        <div className="access-content">
          <span className="access-kicker">BEM-VINDO AO NEXUS</span>
          <h2>Seu próximo passo começa aqui.</h2>
          <p className="access-description">
            Entre com sua conta para continuar.
          </p>

          {erro && (
  <div
    className="nexus-error"
    id="login-error"
    role="alert"
    aria-live="assertive"
  >
    {erro}
  </div>
)}

          <form className="nexus-form" onSubmit={handleLogin}>
            <div className="nexus-field">
              <label htmlFor="email">E-mail institucional</label>
              <div className="nexus-input-wrap">
                <Icon name="mail" size={17} />
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="voce@instituicao.edu.br"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  required
                  aria-invalid={Boolean(erro)}
aria-describedby={erro ? 'login-error' : undefined}
                />
              </div>
            </div>

            <div className="nexus-field">
              <label htmlFor="senha">Senha</label>
              <div className="nexus-input-wrap">
                <Icon name="lock" size={17} />
                <input
                  id="senha"
                  name="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setMostrarSenha((current) => !current)}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <Icon name={mostrarSenha ? 'eyeOff' : 'eye'} size={17} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="nexus-submit"
              disabled={carregando}
            >
              <span>
                {carregando ? 'Verificando acesso...' : 'Entrar na plataforma'}
              </span>
              {!carregando && <Icon name="arrow" size={18} />}
              {carregando && <span className="submit-spinner" />}
            </button>
          </form>

          <button
            type="button"
            className="social-login-button"
            onClick={() => navigate('/cadastro')}
            style={{ width: '100%', marginTop: 16 }}
          >
            Ainda não tem uma conta? Criar conta
          </button>

          <button
            type="button"
            className="social-login-button"
            onClick={() => navigate('/recuperar-senha')}
            style={{ width: '100%', marginTop: 10 }}
          >
            Esqueceu sua senha? Recuperar acesso
          </button>

          <div className="access-assurance">
            <Icon name="shield" size={15} />
            <span>
              O acesso respeita as permissões de cada instituição.
            </span>
          </div>
        </div>

        <footer className="access-footer">
          <span>NEXUS ACADEMIC</span>
          <span>PLATAFORMA DE AVALIAÇÃO</span>
        </footer>
      </section>
    </main>
  );
}
