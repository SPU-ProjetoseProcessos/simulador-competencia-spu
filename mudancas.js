/* O que mudou — as notas de alteração que a planilha v4 traz em cada linha.
 *
 * A classificação é da planilha, não nossa: o texto de cada mudança é a nota
 * que quem mantém a planilha escreveu na linha. Aqui elas são agrupadas, para
 * que uma nota repetida em 60 regras apareça uma vez, com as matérias que
 * alcança — e para que as que a própria planilha marcou "a confirmar" não
 * fiquem perdidas no meio.
 */
'use strict';

const BASE = window.BASE;
const MATERIAS = {};
BASE.materias.forEach((m) => { MATERIAS[m.codigo] = m; });

let filtroMateria = '';

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

/* Uma regra pode trazer mais de uma nota, separadas por " | ". */
function agrupar() {
  const grupos = new Map();
  BASE.regras.forEach((r) => {
    if (!r.alteracao) return;
    if (filtroMateria && r.materia !== filtroMateria) return;
    r.alteracao.split(' | ').forEach((bruto) => {
      const nota = bruto.trim();
      if (!nota) return;
      if (!grupos.has(nota)) grupos.set(nota, { nota: nota, regras: 0, materias: new Set() });
      const g = grupos.get(nota);
      g.regras += 1;
      if (r.materia !== '*') g.materias.add(r.materia);
    });
  });
  return Array.from(grupos.values()).sort((a, b) => b.regras - a.regras
    || a.nota.localeCompare(b.nota, 'pt-BR'));
}

function linkMaterias(codigos) {
  const p = el('p', 'menor');
  if (!codigos.length) {
    p.textContent = 'Regra coringa — não se prende a um regime.';
    return p;
  }
  p.appendChild(el('strong', null,
    codigos.length === 1 ? 'Regime: ' : codigos.length + ' regimes: '));
  codigos.slice().sort((a, b) => (MATERIAS[a] ? MATERIAS[a].rotulo : a)
    .localeCompare(MATERIAS[b] ? MATERIAS[b].rotulo : b, 'pt-BR'))
    .forEach((c, i) => {
      if (i) p.appendChild(document.createTextNode(' · '));
      const a = el('a', null, MATERIAS[c] ? MATERIAS[c].rotulo : c);
      a.href = 'ficha.html#' + c;
      p.appendChild(a);
    });
  return p;
}

function cartaoMudanca(g) {
  const d = el('article', 'norma');
  const cab = el('header', 'norma-cab');
  cab.appendChild(el('strong', null, g.regras === 1 ? '1 regra' : g.regras + ' regras'));
  d.appendChild(cab);
  d.appendChild(el('p', 'passo-oque', g.nota));
  d.appendChild(linkMaterias(Array.from(g.materias)));
  return d;
}

function montarFiltro() {
  const sel = document.getElementById('f-materia');
  BASE.materias.slice()
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'))
    .forEach((m) => {
      const o = el('option', null, m.rotulo);
      o.value = m.codigo;
      sel.appendChild(o);
    });
  sel.addEventListener('change', () => { filtroMateria = sel.value; desenhar(); });
  document.getElementById('limpar').addEventListener('click', () => {
    filtroMateria = '';
    sel.value = '';
    desenhar();
  });
}

function desenhar() {
  const alvo = document.getElementById('mudancas');
  alvo.textContent = '';
  const grupos = agrupar();
  const comNota = BASE.regras.filter((r) => r.alteracao
    && (!filtroMateria || r.materia === filtroMateria)).length;
  const total = BASE.regras.filter((r) => !filtroMateria
    || r.materia === filtroMateria).length;

  // --- números
  const b0 = bloco('Em números');
  b0.appendChild(el('p', 'resposta-menor',
    comNota + ' de ' + total + ' regras foram alteradas, em '
    + grupos.length + (grupos.length === 1 ? ' alteração distinta' : ' alterações distintas')));
  alvo.appendChild(b0);

  // --- normas que alteraram a tabela
  const motores = BASE.normas.filter((n) => n.altera_manifestacao);
  if (motores.length && !filtroMateria) {
    const b = bloco('As normas que alteraram a manifestação');
    motores.forEach((n) => {
      const d = el('article', 'norma');
      const cab = el('header', 'norma-cab');
      cab.appendChild(el('strong', null, n.norma));
      cab.appendChild(el('span', 'menor', n.data_vigencia));
      d.appendChild(cab);
      d.appendChild(el('p', 'norma-tema', n.tema));
      d.appendChild(el('p', 'explica', n.efeito));
      b.appendChild(d);
    });
    const p = el('p', 'menor');
    const a = el('a', null, 'Ver todas as normas no rito');
    a.href = 'rito.html';
    p.appendChild(a);
    b.appendChild(p);
    alvo.appendChild(b);
  }

  // --- todas as mudanças
  const b2 = bloco('As alterações');
  const demais = grupos;
  if (!demais.length) {
    b2.appendChild(el('p', 'vazio', 'Nenhuma alteração registrada neste regime.'));
  } else {
    demais.forEach((g) => b2.appendChild(cartaoMudanca(g)));
  }
  alvo.appendChild(b2);
}

montarFiltro();
desenhar();
