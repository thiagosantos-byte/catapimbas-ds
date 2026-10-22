/**
 * Regras puras de pontuação/classificação: sem Express ou acesso ao banco.
 * Facilita testar a regra de negócio sem depender de uma instância do PostgreSQL.
 */
export function calcularNotaAvaliacao(notas, criterios) {
  if (!Array.isArray(notas) || !Array.isArray(criterios) || criterios.length === 0) return null;

  const criteriosPorId = new Map(criterios.map((criterio) => [String(criterio.id), criterio]));
  const idsRecebidos = new Set();
  let somaPonderada = 0;
  let pesoTotal = 0;

  for (const nota of notas) {
    const criterioId = String(nota?.criterioId ?? '');
    const criterio = criteriosPorId.get(criterioId);
    const valor = Number(nota?.valor);
    if (
      !criterio ||
      !Number.isInteger(valor) ||
      valor < Number(criterio.notaMinima ?? 1) ||
      valor > Number(criterio.notaMaxima ?? 5) ||
      idsRecebidos.has(criterioId)
    ) {
      return null;
    }

    const peso = Number(criterio.peso);
    if (!Number.isFinite(peso) || peso <= 0) return null;

    idsRecebidos.add(criterioId);
    somaPonderada += valor * peso;
    pesoTotal += peso;
  }

  // Todos os critérios da banca são obrigatórios para uma avaliação ser válida.
  if (idsRecebidos.size !== criterios.length || pesoTotal <= 0) return null;
  return somaPonderada / pesoTotal;
}

export function classificarResultados(resultados, casasDecimais = 2, politicaDesempate = 'EMPATE_COMPARTILHADO') {
  const precisao = Math.min(4, Math.max(0, Number(casasDecimais) || 0));
  const classificados = resultados.map((resultado) => ({
    ...resultado,
    pontuacaoFinal: Number(Number(resultado.pontuacaoFinal).toFixed(precisao)),
  }));

  classificados.sort((a, b) => {
    const diferenca = b.pontuacaoFinal - a.pontuacaoFinal;
    if (diferenca !== 0) return diferenca;
    if (politicaDesempate === 'NOME_PROJETO') {
      return String(a.nomeProjeto || '').localeCompare(String(b.nomeProjeto || ''), 'pt-BR', { sensitivity: 'base' });
    }
    // A ordem interna de projetos empatados não altera a colocação compartilhada.
    return String(a.projetoId).localeCompare(String(b.projetoId));
  });

  if (politicaDesempate === 'NOME_PROJETO') {
    return classificados.map((resultado, index) => ({ ...resultado, posicao: index + 1 }));
  }

  if (politicaDesempate !== 'EMPATE_COMPARTILHADO') {
    throw new Error('Política de desempate não suportada.');
  }

  let posicaoAnterior = 0;
  let pontuacaoAnterior = null;
  for (let i = 0; i < classificados.length; i += 1) {
    const atual = classificados[i];
    if (i > 0 && atual.pontuacaoFinal === pontuacaoAnterior) {
      atual.posicao = posicaoAnterior;
    } else {
      atual.posicao = i + 1;
      posicaoAnterior = atual.posicao;
      pontuacaoAnterior = atual.pontuacaoFinal;
    }
  }
  return classificados;
}
