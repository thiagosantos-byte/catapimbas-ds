import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import { api } from '../services/api';

import {
  clearAuthSession,
  readAuthSession,
  saveActiveVinculo,
  saveAuthSession,
} from '../services/session';

const AuthContext = createContext({});

function vinculoAprovado(vinculo) {
  return vinculo?.situacao === 'APROVADO';
}

function escolherVinculo(usuario, vinculoAnterior) {
  const vinculos = Array.isArray(usuario?.vinculos)
    ? usuario.vinculos
    : [];

  const vinculoValido = vinculos.find(
    (vinculo) =>
      vinculoAprovado(vinculo) &&
      vinculo.instituicaoId ===
        vinculoAnterior?.instituicaoId &&
      vinculo.papel === vinculoAnterior?.papel
  );

  return (
    vinculoValido ||
    vinculos.find(vinculoAprovado) ||
    null
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const [activeVinculo, setActiveVinculo] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const sessao = readAuthSession();

      if (!sessao?.token || !sessao?.userJson) {
        setUser(null);
        setActiveVinculo(null);
        return;
      }

      const usuario = JSON.parse(sessao.userJson);

      const vinculoAnterior = sessao.vinculoJson
        ? JSON.parse(sessao.vinculoJson)
        : null;

      if (
        !usuario ||
        typeof usuario !== 'object' ||
        !usuario.id
      ) {
        throw new Error('Dados de sessão inválidos.');
      }

      const vinculo = escolherVinculo(
        usuario,
        vinculoAnterior
      );

      setUser(usuario);
      setActiveVinculo(vinculo);

      saveActiveVinculo(vinculo);
    } catch {
      clearAuthSession();
      setUser(null);
      setActiveVinculo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  async function login(
    email,
    senha,
    keepConnected = false
  ) {
    const response = await api.post('/auth/login', {
      email: String(email || '').trim(),
      senha,
    });

    const token = response.data?.token;
    const usuario = response.data?.usuario;

    if (!token || !usuario?.id) {
      throw new Error(
        'O servidor não retornou os dados esperados para entrar.'
      );
    }

    const vinculoAtivo = escolherVinculo(
      usuario,
      null
    );

    saveAuthSession({
      token,
      user: usuario,
      vinculo: vinculoAtivo,
      keepConnected,
    });

    setUser(usuario);
    setActiveVinculo(vinculoAtivo);

    return usuario;
  }

  function selectVinculo(vinculo) {
    if (!vinculoAprovado(vinculo)) return;

    const salvo = saveActiveVinculo(vinculo);

    if (!salvo) return;

    setActiveVinculo(vinculo);
  }

  function logout() {
    clearAuthSession();

    setUser(null);
    setActiveVinculo(null);
  }

  return (
    <AuthContext.Provider
      value={{
        signed: Boolean(user),
        user,
        activeVinculo,
        loading,
        login,
        logout,
        selectVinculo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);