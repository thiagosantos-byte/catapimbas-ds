
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import './Login.css';

const papeis = [
  { value: 'ALUNO', label: 'Aluno' },
  { value: 'ORIENTADOR', label: 'Orientador' },
  { value: 'AVALIADOR', label: 'Avaliador' },
  { value: 'COORDENADOR', label: 'Coordenador' },
];

export default function Cadastro() {
  const navigate = useNavigate();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [instituicaoId, setInstituicaoId] = useState('');
  const [papel, setPapel] = useState('ALUNO');
  const [instituicoes, setInstituicoes] = useState([]);
  const [carregandoInstituicoes, setCarregandoInstituicoes] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [avisoInstituicoes, setAvisoInstituicoes] = useState('');
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function carregarInstituicoes() {
      try {
        const response = await api.get('/instituicoes');

        if (!ativo) return;

        const lista = Array.isArray(response.data) ? response.data : [];
        setInstituicoes(lista);

        if (lista.length === 0) {
          setAvisoInstituicoes(
            'Nenhuma instituição ativa foi encontrada. Um administrador precisa cadastrar ou ativar uma instituição antes de você solicitar ingresso.'
          );
        }
      } catch (error) {
        if (!ativo) return;

        setAvisoInstituicoes(
          error.response?.data?.mensagem ||
            'Não foi possível carregar a lista de instituições. Tente novamente em instantes.'
        );
      } finally {
        if (ativo) setCarregandoInstituicoes(false);
      }
    }

    carregarInstituicoes();

    return () => {
      ativo = false;
    };
  }, []);

  async function handleCadastro(event) {
    event.preventDefault();
    setErro('');

    if (senha.length < 10) {
      setErro('A senha precisa ter pelo menos 10 caracteres.');
      return;
    }

    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.');
      return;
    }

    if (!instituicaoId) {
      setErro('Selecione uma instituição para solicitar ingresso.');
      return;
    }

    setCarregando(true);

    try {
      await api.post('/auth/register', {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha,
        instituicaoId,
        papel,
      });
      setConcluido(true);
    } catch (error) {
      setErro(
        error.response?.data?.mensagem ||
          'Não foi possível criar a conta e solicitar ingresso. Tente novamente.'
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="nexus-login">
      <section className="nexus-visual">
        <header className="nexus-brand">
          <div className="brand-symbol" aria-hidden="true">N</div>
          <span className="brand-name">
            NEXUS<span className="brand-accent">.</span>
          </span>
          <span className="brand-divider" />
          <span className="brand-caption">ACADEMIC</span>
        </header>

        <div className="visual-copy">
          <span className="eyebrow">
            <span className="status-dot" />
            SEU PRIMEIRO PASSO
          </span>

          <h1>
            Suas ideias
            <br />
            merecem um <span>lugar.</span>
          </h1>

          <p className="visual-description">
            Faça parte de um ambiente que conecta instituições, projetos
            acadêmicos e pessoas com vontade de transformar ideias em resultados.
          </p>
        </div>

        <div className="feature-detail">
          <span className="feature-number">01</span>
          <div className="feature-copy">
            <span>CONEXÃO</span>
            <strong>Uma conta, novas possibilidades</strong>
            <p>Solicite acesso à sua instituição.</p>
          </div>
        </div>

        <div className="feature-detail">
          <span className="feature-number">02</span>
          <div className="feature-copy">
            <span>COLABORAÇÃO</span>
            <strong>Projetos e equipes</strong>
            <p>Participe de iniciativas acadêmicas.</p>
          </div>
        </div>

        <div className="feature-detail">
          <span className="feature-number">03</span>
          <div className="feature-copy">
            <span>TRANSPARÊNCIA</span>
            <strong>Acesso com aprovação</strong>
            <p>Os vínculos são confirmados pela instituição.</p>
          </div>
        </div>

        <footer className="visual-footer">
          <span>NEXUS ACADEMIC</span>
          <span>UM NOVO COMEÇO.</span>
        </footer>
      </section>

      <section className="nexus-access">
        <div className="access-topline">
          <span>CADASTRO DE USUÁRIO</span>
          <span className="access-indicator">PRIMEIRO ACESSO</span>
        </div>

        <div className="access-content">
          {!concluido ? (
            <>
              <span className="access-kicker">BOAS-VINDAS AO NEXUS</span>
              <h2>Crie sua conta.</h2>
              <p className="access-description">
                Preencha os dados e solicite ingresso na sua instituição.
              </p>

              {erro && (
                <div className="nexus-error" role="alert">
                  {erro}
                </div>
              )}

              {avisoInstituicoes && (
                <p className="social-login-notice" role="status">
                  {avisoInstituicoes}
                </p>
              )}

              <form className="nexus-form" onSubmit={handleCadastro}>
                <div className="nexus-field">
                  <label htmlFor="cadastro-nome">Nome completo</label>
                  <div className="nexus-input-wrap">
                    <input
                      id="cadastro-nome"
                      type="text"
                      autoComplete="name"
                      placeholder="Digite seu nome completo"
                      value={nome}
                      onChange={(event) => setNome(event.target.value)}
                      required
                      minLength={2}
                    />
                  </div>
                </div>

                <div className="nexus-field">
                  <label htmlFor="cadastro-email">E-mail</label>
                  <div className="nexus-input-wrap">
                    <input
                      id="cadastro-email"
                      type="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      placeholder="voce@exemplo.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="nexus-field">
                  <label htmlFor="cadastro-instituicao">Instituição</label>
                  <div className="nexus-input-wrap">
                    <select
                      id="cadastro-instituicao"
                      value={instituicaoId}
                      onChange={(event) => setInstituicaoId(event.target.value)}
                      required
                      disabled={
                        carregandoInstituicoes || instituicoes.length === 0
                      }
                      style={{
                        width: '100%',
                        minWidth: 0,
                        height: '100%',
                        color: 'var(--text)',
                        background: 'transparent',
                        border: 0,
                        outline: 0,
                        font: 'inherit',
                      }}
                    >
                      <option value="" style={{ color: '#211b2a' }}>
                        {carregandoInstituicoes
                          ? 'Carregando instituições...'
                          : 'Selecione sua instituição'}
                      </option>

                      {instituicoes.map((instituicao) => (
                        <option
                          key={instituicao.id}
                          value={instituicao.id}
                          style={{ color: '#211b2a' }}
                        >
                          {instituicao.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="nexus-field">
                  <label htmlFor="cadastro-papel">Perfil solicitado</label>
                  <div className="nexus-input-wrap">
                    <select
                      id="cadastro-papel"
                      value={papel}
                      onChange={(event) => setPapel(event.target.value)}
                      required
                      style={{
                        width: '100%',
                        minWidth: 0,
                        height: '100%',
                        color: 'var(--text)',
                        background: 'transparent',
                        border: 0,
                        outline: 0,
                        font: 'inherit',
                      }}
                    >
                      {papeis.map((opcao) => (
                        <option
                          key={opcao.value}
                          value={opcao.value}
                          style={{ color: '#211b2a' }}
                        >
                          {opcao.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="nexus-field">
                  <label htmlFor="cadastro-senha">Senha</label>
                  <div className="nexus-input-wrap">
                    <input
                      id="cadastro-senha"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Mínimo de 10 caracteres"
                      value={senha}
                      onChange={(event) => setSenha(event.target.value)}
                      minLength={10}
                      required
                    />
                  </div>
                </div>

                <div className="nexus-field">
                  <label htmlFor="cadastro-confirmar">Confirmar senha</label>
                  <div className="nexus-input-wrap">
                    <input
                      id="cadastro-confirmar"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Digite a senha novamente"
                      value={confirmarSenha}
                      onChange={(event) => setConfirmarSenha(event.target.value)}
                      minLength={10}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="nexus-submit"
                  disabled={
                    carregando ||
                    carregandoInstituicoes ||
                    instituicoes.length === 0
                  }
                >
                  <span>
                    {carregando
                      ? 'Criando conta e solicitando acesso...'
                      : 'Criar conta e solicitar acesso'}
                  </span>
                </button>
              </form>
            </>
          ) : (
            <>
              <span className="access-kicker">SOLICITAÇÃO REGISTRADA</span>
              <h2>Quase lá!</h2>
              <p className="access-description">
                Sua conta foi criada e sua solicitação de ingresso foi enviada.
                Você poderá acessar as áreas institucionais depois que um
                administrador aprovar seu vínculo.
              </p>

              <div className="social-login-notice" role="status">
                Guarde seu e-mail e sua senha para entrar depois da aprovação.
              </div>

              <button
                type="button"
                className="nexus-submit"
                onClick={() => navigate('/login')}
              >
                Voltar para o login
              </button>
            </>
          )}

          {!concluido && (
            <div className="access-assurance">
              As solicitações de vínculo precisam ser aprovadas pela instituição.
            </div>
          )}

          <button
            type="button"
            className="social-login-button"
            onClick={() => navigate('/login')}
            style={{ width: '100%', marginTop: 16 }}
          >
            Já tem uma conta? Entrar
          </button>
        </div>

        <footer className="access-footer">
          <span>NEXUS ACADEMIC</span>
          <span>CADASTRO SEGURO</span>
        </footer>
      </section>
    </main>
  );
}
