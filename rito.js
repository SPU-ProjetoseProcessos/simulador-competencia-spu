/* Página de rito — como o processo corre, e o que a instrução exige.
 *
 * O simulador diz quem se manifesta e quem autoriza. Esta página responde a
 * pergunta seguinte: por onde o processo passa até lá, e o que precisa estar
 * no processo. Sai inteira de `normas.csv` e `rito.csv`; nada é escrito à mão
 * aqui, para que uma Resolução nova entre pela base e não pelo HTML.
 */
'use strict';

const BASE = window.BASE;
const MATERIAS = {};
BASE.materias.forEach((m) => { MATERIAS[m.codigo] = m; });

const TIPO_PASSO = {
  etapa: 'Etapa',
  desvio: 'Caminho alternativo',
  posterior: 'Depois do ato',
};

function el(tag, cls, texto) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (texto !== undefined && texto !== null) e.textContent = texto;
  return e;
}

function bloco(titulo, classe) {
  const s = el('section', 'bloco ' + (classe || ''));
  if (titulo) s.appendChild(el('h3', null, titulo));
  return s;
}

function normas(papel) {
  return BASE.normas.filter((n) => n.papel === papel);
}

/* Cada norma vira um cartão com tema, efeito e as matérias que alcança. */
function cartaoNorma(n) {
  const d = el('article', 'norma');
  const cab = el('header', 'norma-cab');
  cab.appendChild(el('strong', null, n.norma));
  cab.appendChild(el('span', 'menor', n.data_vigencia));
  d.appendChild(cab);
  d.appendChild(el('p', 'norma-tema', n.tema));
  d.appendChild(el('p', 'explica', n.efeito));
  if (n.materias.length) {
    const p = el('p', 'menor');
    p.appendChild(el('strong', null, 'Alcança: '));
    n.materias.forEach((c, i) => {
      if (i) p.appendChild(document.createTextNode(' · '));
      const a = el('a', null, MATERIAS[c] ? MATERIAS[c].rotulo : c);
      a.href = 'ficha.html#' + c;
      p.appendChild(a);
    });
    d.appendChild(p);
  }
  if (n.altera_manifestacao) {
    d.appendChild(el('span', 'etiqueta alt', 'alterou a tabela de manifestação'));
  }
  return d;
}

function desenharRito() {
  const alvo = document.getElementById('rito');

  // --- o fluxo
  const b = bloco('O rito de instrução');
  const rito = BASE.normas.filter((n) => n.papel === 'rito')[0];
  if (rito) {
    b.appendChild(el('p', 'explica', rito.norma + ' — ' + rito.tema + '. '
      + rito.data_vigencia + '.'));
  }
  const ol = el('ol', 'passos');
  BASE.rito.filter((p) => p.tipo === 'etapa').forEach((p) => {
    const li = el('li');
    li.appendChild(el('div', 'passo-quem', p.quem));
    li.appendChild(el('div', 'passo-oque', p.o_que));
    if (p.observacao) li.appendChild(el('div', 'menor', p.observacao));
    li.appendChild(el('div', 'origem', p.fundamento));
    ol.appendChild(li);
  });
  b.appendChild(ol);
  alvo.appendChild(b);

  // --- desvios e verificação posterior
  BASE.rito.filter((p) => p.tipo !== 'etapa').forEach((p) => {
    const s = bloco(TIPO_PASSO[p.tipo] || p.tipo,
      p.tipo === 'desvio' ? 'ressalva' : 'nota');
    s.appendChild(el('p', 'passo-quem', p.quem));
    s.appendChild(el('p', 'passo-oque', p.o_que));
    if (p.observacao) s.appendChild(el('p', 'menor', p.observacao));
    s.appendChild(el('p', 'origem', p.fundamento));
    alvo.appendChild(s);
  });

  // --- como o colegiado decide
  const dec = normas('decisao');
  if (dec.length) {
    const s = bloco('Como o colegiado decide');
    dec.forEach((n) => s.appendChild(cartaoNorma(n)));
    alvo.appendChild(s);
  }

  // --- exigências de todo processo
  const tr = normas('requisito_transversal');
  if (tr.length) {
    const s = bloco('O que todo processo submetido à CDE precisa ter');
    tr.forEach((n) => s.appendChild(cartaoNorma(n)));
    alvo.appendChild(s);
  }

  // --- exigências por matéria
  const pm = normas('requisito_por_materia');
  if (pm.length) {
    const s = bloco('Exigências que alcançam regimes determinados');
    pm.forEach((n) => s.appendChild(cartaoNorma(n)));
    alvo.appendChild(s);
  }

  // --- quadro das normas
  const q = bloco('Quadro das normas');
  const t = el('table', 'regras');
  const thead = el('thead');
  const trh = el('tr');
  ['Norma', 'Data e vigência', 'Tema', 'Alterou a manifestação?'].forEach((x) => {
    trh.appendChild(el('th', null, x));
  });
  thead.appendChild(trh);
  t.appendChild(thead);
  const tb = el('tbody');
  BASE.normas.forEach((n) => {
    const tr2 = el('tr');
    tr2.appendChild(el('td', null, n.norma));
    tr2.appendChild(el('td', null, n.data_vigencia));
    tr2.appendChild(el('td', null, n.tema));
    tr2.appendChild(el('td', null, n.altera_manifestacao ? 'Sim' : 'Não'));
    tb.appendChild(tr2);
  });
  t.appendChild(tb);
  const caixa = el('div', 'rolagem-interna');
  caixa.appendChild(t);
  q.appendChild(caixa);
  alvo.appendChild(q);
}

desenharRito();
