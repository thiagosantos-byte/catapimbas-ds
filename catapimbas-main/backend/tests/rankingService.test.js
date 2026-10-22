import { calcularNotaAvaliacao, classificarResultados } from '../src/services/rankingService.js';

describe('regras puras do ranking', () => {
  const criterios = [
    { id: 'clareza', peso: 2, notaMinima: 1, notaMaxima: 5 },
    { id: 'mercado', peso: 1, notaMinima: 1, notaMaxima: 5 },
  ];

  test('calcula a média ponderada dos critérios', () => {
    expect(calcularNotaAvaliacao([
      { criterioId: 'clareza', valor: 5 },
      { criterioId: 'mercado', valor: 2 },
    ], criterios)).toBe(4);
  });

  test('rejeita notas ausentes, duplicadas ou fora da escala', () => {
    expect(calcularNotaAvaliacao([{ criterioId: 'clareza', valor: 5 }], criterios)).toBeNull();
    expect(calcularNotaAvaliacao([
      { criterioId: 'clareza', valor: 5 },
      { criterioId: 'clareza', valor: 4 },
    ], criterios)).toBeNull();
    expect(calcularNotaAvaliacao([
      { criterioId: 'clareza', valor: 6 },
      { criterioId: 'mercado', valor: 2 },
    ], criterios)).toBeNull();
  });

  test('classifica em ordem decrescente, arredonda e preserva empates sem inventar desempate', () => {
    const resultado = classificarResultados([
      { projetoId: 'A', pontuacaoFinal: 4.444 },
      { projetoId: 'B', pontuacaoFinal: 4.445 },
      { projetoId: 'C', pontuacaoFinal: 4.445 },
      { projetoId: 'D', pontuacaoFinal: 3.1 },
    ], 2);

    expect(resultado.map((r) => r.projetoId)).toEqual(['B', 'C', 'A', 'D']);
    expect(resultado.map((r) => r.posicao)).toEqual([1, 1, 3, 4]);
    expect(resultado.map((r) => r.pontuacaoFinal)).toEqual([4.45, 4.45, 4.44, 3.1]);
  });

  test('política NOME_PROJETO aplica desempate alfabético determinístico', () => {
    const resultado = classificarResultados([
      { projetoId: '2', nomeProjeto: 'Zebra', pontuacaoFinal: 4.2 },
      { projetoId: '1', nomeProjeto: 'AcolheMãe', pontuacaoFinal: 4.2 },
    ], 2, 'NOME_PROJETO');
    expect(resultado.map((r) => [r.nomeProjeto, r.posicao])).toEqual([['AcolheMãe', 1], ['Zebra', 2]]);
  });

  test('preserva a precisão configurada de até quatro casas decimais', () => {
    const resultado = classificarResultados([
      { projetoId: '1', pontuacaoFinal: 4.12345 },
    ], 4, 'EMPATE_COMPARTILHADO');
    expect(resultado[0].pontuacaoFinal).toBe(4.1235);
  });

  test('rejeita política de desempate desconhecida', () => {
    expect(() => classificarResultados([], 2, 'ALEATORIO')).toThrow('Política de desempate não suportada.');
  });
});
