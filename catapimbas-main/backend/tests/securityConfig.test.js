import { segredoJwtAdequado } from '../src/config/security.js';

describe('configuração do segredo JWT', () => {
  test('aceita um segredo aleatório longo o suficiente', () => {
    expect(segredoJwtAdequado('01qR5oI8lW3B3DFJ5M2e6G4XnP2wJk8A6H0v9K7x')).toBe(true);
  });

  test('rejeita segredos curtos ou placeholders', () => {
    expect(segredoJwtAdequado('curto')).toBe(false);
    expect(segredoJwtAdequado('SUBSTITUA_POR_UM_SEGREDO_ALEATORIO_DE_NO_MINIMO_32_BYTES')).toBe(false);
    expect(segredoJwtAdequado('REPLACE_WITH_A_NEW_RANDOM_SECRET')).toBe(false);
  });
});
