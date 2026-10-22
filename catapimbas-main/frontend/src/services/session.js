const KEYS = Object.freeze({
  token: '@Nexus:token',
  user: '@Nexus:user',
  vinculo: '@Nexus:activeVinculo',
});

function removeKeys(storage) {
  try {
    Object.values(KEYS).forEach((key) => {
      storage.removeItem(key);
    });
  } catch {
    // O navegador pode bloquear o armazenamento.
  }
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;

  try {
    removeKeys(window.localStorage);
  } catch {
    // Mantém a aplicação utilizável.
  }

  try {
    removeKeys(window.sessionStorage);
  } catch {
    // Mantém a aplicação utilizável.
  }
}

export function getAuthStorage() {
  if (typeof window === 'undefined') return null;

  try {
    const persistent = window.localStorage;
    const temporary = window.sessionStorage;

    const persistentToken = persistent.getItem(KEYS.token);
    const persistentUser = persistent.getItem(KEYS.user);

    const temporaryToken = temporary.getItem(KEYS.token);
    const temporaryUser = temporary.getItem(KEYS.user);

    if (persistentToken && persistentUser) {
      removeKeys(temporary);
      return persistent;
    }

    if (temporaryToken && temporaryUser) {
      removeKeys(persistent);
      return temporary;
    }

    const hasIncompleteSession =
      persistentToken ||
      persistentUser ||
      temporaryToken ||
      temporaryUser;

    if (hasIncompleteSession) {
      clearAuthSession();
    }

    return null;
  } catch {
    return null;
  }
}

export function readAuthSession() {
  const storage = getAuthStorage();

  if (!storage) return null;

  try {
    return {
      storage,
      token: storage.getItem(KEYS.token),
      userJson: storage.getItem(KEYS.user),
      vinculoJson: storage.getItem(KEYS.vinculo),
    };
  } catch {
    clearAuthSession();
    return null;
  }
}

export function saveAuthSession({
  token,
  user,
  vinculo = null,
  keepConnected = false,
}) {
  if (!token || !user || typeof user !== 'object') {
    throw new Error(
      'A resposta de autenticação não contém uma sessão válida.'
    );
  }

  clearAuthSession();

  try {
    const storage = keepConnected
      ? window.localStorage
      : window.sessionStorage;

    storage.setItem(KEYS.token, String(token));
    storage.setItem(KEYS.user, JSON.stringify(user));

    if (vinculo) {
      storage.setItem(
        KEYS.vinculo,
        JSON.stringify(vinculo)
      );
    }

    return storage;
  } catch {
    clearAuthSession();

    throw new Error(
      'Não foi possível guardar a sessão neste navegador. ' +
      'Verifique as permissões de armazenamento.'
    );
  }
}

export function saveActiveVinculo(vinculo) {
  const storage = getAuthStorage();

  if (!storage) return false;

  try {
    if (vinculo) {
      storage.setItem(
        KEYS.vinculo,
        JSON.stringify(vinculo)
      );
    } else {
      storage.removeItem(KEYS.vinculo);
    }

    return true;
  } catch {
    return false;
  }
}

export function getAuthKeys() {
  return KEYS;
}