/* Rótulos e formatação de faixas, comuns ao simulador e à tabela.
 *
 * Fica num arquivo só para as duas telas não divergirem: uma faixa escrita de
 * um jeito no simulador e de outro na tabela faria o leitor duvidar de qual
 * está certa.
 */
'use strict';

const MANIFESTACAO = {
  cde: 'Manifestação prévia da CDE',
  ge_desup: 'Manifestação prévia do GE-DESUP',
  sem_manifestacao: 'Sem manifestação prévia',
};
const MANIFESTACAO_CURTA = {
  cde: 'CDE',
  ge_desup: 'GE-DESUP',
  sem_manifestacao: 'Sem manifestação',
};
const COMPETENCIA = {
  superintendente: 'Superintendente',
  secretario: 'Secretário(a)',
  ministro: 'Ministro(a)',
};
const SITUACAO = {
  urbana: 'Urbana',
  rural: 'Rural',
  perimetro_urbano_ou_expansao: 'No perímetro urbano ou de expansão urbana',
};
const SITUACAO_NA_FAIXA = {
  qualquer: '',
  urbana_ou_rural: 'urbana ou rural',
  urbana: 'urbana',
  rural: 'rural',
  perimetro_urbano_ou_expansao: 'no perímetro urbano ou de expansão urbana',
};
const REFERENCIA = {
  imovel: 'Área do imóvel',
  terreno_total: 'Área total do terreno da União',
  fracao_ideal_da_unidade: 'Fração ideal do terreno vinculada à unidade',
};
const REFERENCIA_NA_FAIXA = {
  imovel: '',
  terreno_total: 'do terreno da União',
  fracao_ideal_da_unidade: 'da fração ideal da unidade',
};
const GATILHO = {
  formulario_art_7_v: 'Regra de transição do art. 10, § 1º, I, da Portaria MGI '
    + 'nº 11.384/2025: vigora até a edição do formulário padronizado do art. 7º, V.',
  diretrizes_cde_por_regime: 'Regra de transição do art. 10, § 1º, II: vigora até '
    + 'a CDE editar diretrizes próprias para este regime.',
};
const NIVEL_GE_DESUP = {
  0: 'nível 0 — até R$ 1,0 milhão',
  1: 'nível 1 — acima de R$ 1,0 milhão até R$ 10 milhões',
  2: 'nível 2 — acima de R$ 10 milhões',
};
const DIMENSAO = {
  manifestacao: 'Manifestação',
  competencia: 'Competência',
};

const fmt = new Intl.NumberFormat('pt-BR');
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL',
  maximumFractionDigits: 0 });

/* R$ 1,0 milhão / R$ 100 milhões — a grafia da própria planilha. */
function dinheiro(v) {
  if (v >= 1000000) {
    const m = v / 1000000;
    const n = fmt.format(Number.isInteger(m) ? m : Number(m.toFixed(1)));
    return 'R$ ' + n + (m === 1 ? ' milhão' : ' milhões');
  }
  return brl.format(v);
}

function metros(v) { return fmt.format(v) + ' m²'; }

function faixa(f, escreve) {
  if (f.min === null && f.max === null) return null;
  if (f.min === null) {
    return (f.max_inclusivo ? 'Até ' : 'Abaixo de ') + escreve(f.max);
  }
  if (f.max === null) {
    return (f.min_inclusivo ? 'A partir de ' : 'Acima de ') + escreve(f.min);
  }
  return (f.min_inclusivo ? 'A partir de ' : 'Acima de ') + escreve(f.min)
    + (f.max_inclusivo ? ' e até ' : ' e abaixo de ') + escreve(f.max);
}

function faixaValor(r) { return faixa(r.valor, dinheiro) || 'Qualquer valor'; }

function faixaArea(r) {
  const partes = [];
  const f = faixa(r.area, metros);
  if (f) partes.push(f);
  const ref = REFERENCIA_NA_FAIXA[r.area.referencia];
  if (ref) partes.push(ref);
  const sit = SITUACAO_NA_FAIXA[r.area.situacao];
  if (sit) partes.push('(' + sit + ')');
  return partes.length ? partes.join(' ') : 'Qualquer área';
}

/* As condições da regra em palavras, com os rótulos dos testes. */
function condicoesTexto(r, testesPorId) {
  if (!r.condicoes.length) return null;
  return r.condicoes.map((c) => {
    const te = testesPorId[c.teste];
    const rot = {};
    (te ? te.valores : []).forEach((v) => { rot[v.valor] = v.rotulo; });
    const vals = c.valores.map((v) => rot[v] || v).join(' ou ');
    return (te ? te.rotulo : c.teste) + ': ' + vals;
  }).join(' · ');
}

function resultadoTexto(r) {
  const base = MANIFESTACAO_CURTA[r.resultado] || COMPETENCIA[r.resultado]
    || r.resultado;
  if (r.resultado === 'ge_desup' && r.ge_desup_nivel !== null) {
    return base + ' (' + NIVEL_GE_DESUP[r.ge_desup_nivel].split(' — ')[0] + ')';
  }
  return base;
}
