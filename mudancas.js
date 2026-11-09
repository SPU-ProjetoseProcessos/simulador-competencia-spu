/* Alterações — as normas que mudaram as regras, da mais recente para a mais antiga.
 *
 * Responde a uma pergunta só: mudou alguma coisa desde a última vez que eu vi?
 * Por isso é lista de normas, não lista de regras — quem consulta já tem as
 * regras valendo no simulador e na tabela.
 *
 * O detalhamento por norma — que regimes cada uma mexeu — espera o
 * identificador de norma, que ainda não existe na base.
 */
'use strict';

const BASE = window.BASE;
const MATERIAS = {};
BASE.materias.forEach((m) => { MATERIAS[m.codigo] = m; });

function el(tag, cls, texto) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (texto !== undefined && texto !== null) e.textContent = texto;
  return e;
}

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
    d.appendChild(el('span', 'etiqueta alt', 'alterou regras'));
  }
  return d;
}

function desenhar() {
  const alvo = document.getElementById('mudancas');
  alvo.textContent = '';
  const ordenadas = BASE.normas.slice()
    .sort((a, b) => b.data_ordem.localeCompare(a.data_ordem));
  const s = el('section', 'bloco');
  ordenadas.forEach((n) => s.appendChild(cartaoNorma(n)));
  alvo.appendChild(s);
}

desenhar();
