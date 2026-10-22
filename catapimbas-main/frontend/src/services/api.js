import axios from 'axios';

import {
  clearAuthSession,
  getAuthKeys,
  getAuthStorage,
} from './session';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

const apiUrl = (
  configuredApiUrl ||
  (
    import.meta.env.PROD
      ? ''
      : 'http://localhost:3001/api'
  )
).replace(/\/+$/, '');

if (!apiUrl) {
  throw new Error(
    'A configuração do serviço de dados está incompleta. ' +
    'Entre em contato com o suporte.'
  );
}

if (import.meta.env.PROD) {
  let parsed;

  try {
    parsed = new URL(apiUrl);
  } catch {
    throw new Error(
      'A configuração do ambiente não é válida.'
    );
  }

  if (
    parsed.protocol !== 'https:' ||
    parsed.pathname.replace(/\/+$/, '') !== '/api'
  ) {
    throw new Error(
      'O endereço configurado para o serviço de dados ' +
      'precisa usar HTTPS e o caminho esperado.'
    );
  }
}

export const api = axios.create({
  baseURL: apiUrl,
  timeout: 20_000,
  headers: {
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const keys = getAuthKeys();
  const storage = getAuthStorage();

  const token = storage?.getItem(keys.token);

  config.headers = config.headers || {};

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }

  const vinculoSalvo = storage?.getItem(
    keys.vinculo
  );

  if (vinculoSalvo) {
    try {
      const vinculo = JSON.parse(vinculoSalvo);

      if (vinculo?.papel) {
        config.headers['X-Papel-Ativo'] =
          vinculo.papel;
      } else {
        delete config.headers['X-Papel-Ativo'];
      }
    } catch {
      storage?.removeItem(keys.vinculo);

      delete config.headers['X-Papel-Ativo'];
    }
  } else {
    delete config.headers['X-Papel-Ativo'];
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error.response?.status;

    const url = String(
      error.config?.url || ''
    );

    const isLoginRequest = url.includes(
      '/auth/login'
    );

    const codigo = error.response?.data?.codigo;

    const vinculoRevogadoOuIndisponivel =
      (status === 403 || status === 404) &&
      [
        'VINCULO_NAO_AUTORIZADO',
        'ESCOPO_INSTITUCIONAL_INDISPONIVEL',
        'CONTA_BLOQUEADA',
      ].includes(codigo);

    if (
      (status === 401 && !isLoginRequest) ||
      vinculoRevogadoOuIndisponivel
    ) {
      clearAuthSession();

      if (
        window.location.pathname !== '/login'
      ) {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  }
);