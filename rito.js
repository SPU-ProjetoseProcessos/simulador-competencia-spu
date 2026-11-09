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

/* O fluxo: um passo por cartão, numerado, com a linha ligando-os.
   Decisão e caminho posterior têm tratamento próprio. */
function passo(p, numero) {
  const li = el('li', 'passo ' + p.tipo);
  const bolha = el('div', 'passo-n' + (p.tipo === 'decisao' ? ' decisao' : '')
    + (p.tipo === 'posterior' ? ' posterior' : ''),
    p.tipo === 'decisao' ? '?' : String(numero));
  li.appendChild(bolha);
  const c = el('div', 'passo-cartao');
  if (p.quem) c.appendChild(el('p', 'passo-quem', p.quem));
  c.appendChild(el('h2', 'passo-titulo', p.o_que));
  if (p.detalhes.length) {
    const ul = el('ul', 'passo-detalhes');
    p.detalhes.forEach((d) => ul.appendChild(el('li', null, d)));
    c.appendChild(ul);
  }
  if (p.ramos.length) {
    const g = el('div', 'ramos');
    p.ramos.forEach((r, n) => {
      const b = el('div', 'ramo ' + (n === 0 ? 'sim' : 'nao'));
      b.appendChild(el('strong', null, r.rotulo));
      b.appendChild(document.createTextNode(r.texto));
      g.appendChild(b);
    });
    c.appendChild(g);
  }
  if (p.observacao) c.appendChild(el('p', 'menor', p.observacao));
  if (p.fundamento) c.appendChild(el('span', 'fonte', p.fundamento));
  li.appendChild(c);
  return li;
}

function desenharRito() {
  const alvo = document.getElementById('rito');

  // --- o fluxo
  const ol = el('ol', 'fluxo');
  let n = 0;
  BASE.rito.forEach((p) => {
    if (p.tipo !== 'decisao') n += 1;
    ol.appendChild(passo(p, n));
  });
  alvo.appendChild(ol);

  // --- como o colegiado decide
  const dec = normas('decisao');
  if (dec.length) {
    const s = bloco('Como o colegiado decide');
    dec.forEach((x) => s.appendChild(cartaoNorma(x)));
    alvo.appendChild(s);
  }

  // --- exigências de todo processo
  const tr = normas('requisito_transversal');
  if (tr.length) {
    const s = bloco('O que todo processo submetido à CDE precisa ter');
    tr.forEach((x) => s.appendChild(cartaoNorma(x)));
    alvo.appendChild(s);
  }

  // --- exigências por regime
  const pm = normas('requisito_por_materia');
  if (pm.length) {
    const s = bloco('Exigências que alcançam regimes determinados');
    pm.forEach((x) => s.appendChild(cartaoNorma(x)));
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
  BASE.normas.forEach((x) => {
    const tr2 = el('tr');
    tr2.appendChild(el('td', null, x.norma));
    tr2.appendChild(el('td', null, x.data_vigencia));
    tr2.appendChild(el('td', null, x.tema));
    tr2.appendChild(el('td', null, x.altera_manifestacao ? 'Sim' : 'Não'));
    tb.appendChild(tr2);
  });
  t.appendChild(tb);
  const caixa = el('div', 'rolagem-interna');
  caixa.appendChild(t);
  q.appendChild(caixa);
  alvo.appendChild(q);
}

desenharRito();
