/* Tabela de regras — a base inteira, legível e filtrável.
 *
 * Não é a tela de consulta: é o instrumento de conferência. Mostra cada regra
 * como ela está na base, com a grafia de origem da planilha ao lado, para que
 * quem valida possa comparar linha a linha sem abrir o CSV.
 */
'use strict';

const BASE = window.BASE;
const TESTES = {};
BASE.testes.forEach((t) => { TESTES[t.teste] = t; });
const MATERIAS = {};
BASE.materias.forEach((m) => { MATERIAS[m.codigo] = m; });

const filtro = { busca: '', materia: '', dimensao: '', resultado: '', so: '' };

function el(tag, cls, texto) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (texto !== undefined && texto !== null) e.textContent = texto;
  return e;
}

function rotuloMateria(r) {
  if (r.materia === '*') return 'Qualquer regime admitido';
  const m = MATERIAS[r.materia];
  return m ? m.rotulo : r.materia;
}

function textoDaRegra(r) {
  return [r.id, rotuloMateria(r), DIMENSAO[r.dimensao], faixaValor(r), faixaArea(r),
    condicoesTexto(r, TESTES) || '', resultadoTexto(r), r.fundamento || '',
    r.origem.materia, r.origem.condicao, r.observacao || '', r.pendencia || '']
    .join(' ').toLowerCase();
}

function passa(r) {
  if (filtro.materia && r.materia !== filtro.materia) return false;
  if (filtro.dimensao && r.dimensao !== filtro.dimensao) return false;
  if (filtro.resultado && r.resultado !== filtro.resultado) return false;
  if (filtro.so === 'pendencia' && !r.pendencia) return false;
  if (filtro.so === 'coringa' && r.materia !== '*') return false;
  if (filtro.so === 'alteracao' && !r.alteracao) return false;
  if (filtro.busca) {
    const termos = filtro.busca.toLowerCase().split(/\s+/).filter(Boolean);
    const alvo = textoDaRegra(r);
    if (!termos.every((x) => alvo.indexOf(x) !== -1)) return false;
  }
  return true;
}

function montarFiltros() {
  const selM = document.getElementById('f-materia');
  BASE.materias.slice()
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'))
    .forEach((m) => {
      const o = el('option', null, m.rotulo);
      o.value = m.codigo;
      selM.appendChild(o);
    });

  const liga = (id, campo) => {
    const e = document.getElementById(id);
    e.addEventListener('input', () => { filtro[campo] = e.value; desenhar(); });
    e.addEventListener('change', () => { filtro[campo] = e.value; desenhar(); });
  };
  liga('f-busca', 'busca');
  liga('f-materia', 'materia');
  liga('f-dimensao', 'dimensao');
  liga('f-resultado', 'resultado');
  liga('f-so', 'so');
  document.getElementById('limpar').addEventListener('click', () => {
    Object.keys(filtro).forEach((k) => { filtro[k] = ''; });
    ['f-busca', 'f-materia', 'f-dimensao', 'f-resultado', 'f-so']
      .forEach((id) => { document.getElementById(id).value = ''; });
    desenhar();
  });
}

function celulaRegra(r) {
  const td = el('td', 'col-regra');
  td.appendChild(el('div', 'id-regra', r.id));
  if (r.pendencia) td.appendChild(el('span', 'etiqueta pend', 'pendência'));
  if (r.materia === '*') td.appendChild(el('span', 'etiqueta coringa', 'coringa'));
  if (r.alteracao) td.appendChild(el('span', 'etiqueta alt', 'alterada'));
  return td;
}

function celulaResultado(r) {
  const td = el('td', 'col-resultado');
  td.appendChild(el('strong', null, resultadoTexto(r)));
  if (r.resultado_se) {
    td.appendChild(el('div', 'menor', 'Se a competência não for do(a) '
      + COMPETENCIA[r.resultado_se.split('=')[1]] + ': '
      + (MANIFESTACAO_CURTA[r.resultado_alternativo] || r.resultado_alternativo)));
  }
  return td;
}

function celulaOrigem(r) {
  const td = el('td', 'col-origem');
  const d = el('details');
  d.appendChild(el('summary', null, 'fundamento e origem'));
  d.appendChild(el('p', 'fundamento', r.fundamento || '—'));
  const g = el('p', 'origem');
  g.textContent = 'Texto de origem: “' + r.origem.materia + '” · “'
    + (r.origem.valor || '—') + '” · “' + (r.origem.area || '—') + '” · “'
    + (r.origem.condicao || '—') + '” → “' + (r.origem.resultado || '—') + '”';
  d.appendChild(g);
  if (r.indiferentes && r.indiferentes.length) {
    d.appendChild(el('p', 'origem', 'Indiferente nesta regra: '
      + r.indiferentes.map((t) => (TESTES[t] ? TESTES[t].rotulo : t)).join(', ')));
  }
  if (r.ge_desup_gatilho) d.appendChild(el('p', 'origem', GATILHO[r.ge_desup_gatilho]));
  if (r.alteracao) d.appendChild(el('p', 'origem', 'Alteração: ' + r.alteracao));
  // a observação da regra é registro interno de carga: fica no CSV, não na tela
  if (r.pendencia) d.appendChild(el('p', 'pendencia', r.pendencia));
  d.appendChild(el('p', 'origem', 'Vigência desde ' + r.vigencia_inicio));
  td.appendChild(d);
  return td;
}

function desenhar() {
  const corpo = document.getElementById('corpo');
  corpo.textContent = '';
  const linhas = BASE.regras.filter(passa);
  linhas.forEach((r) => {
    const tr = el('tr');
    tr.appendChild(celulaRegra(r));
    tr.appendChild(el('td', 'col-materia', rotuloMateria(r)));
    tr.appendChild(el('td', 'col-dim', DIMENSAO[r.dimensao]));
    tr.appendChild(el('td', 'col-faixa', faixaValor(r)));
    tr.appendChild(el('td', 'col-faixa', faixaArea(r)));
    tr.appendChild(el('td', 'col-cond',
      condicoesTexto(r, TESTES) || 'Sem condição — vale quando nenhuma específica bate'));
    tr.appendChild(celulaResultado(r));
    tr.appendChild(celulaOrigem(r));
    corpo.appendChild(tr);
  });
  const total = BASE.regras.length;
  document.getElementById('contagem').textContent = linhas.length === total
    ? total + ' regras'
    : linhas.length + ' de ' + total + ' regras';
  document.getElementById('vazio').hidden = linhas.length > 0;
}

/* `tabela.html#02.01.02.01.01` abre já filtrada naquela matéria. */
function aplicarAncora() {
  const cod = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (!MATERIAS[cod]) return;
  filtro.materia = cod;
  document.getElementById('f-materia').value = cod;
}

montarFiltros();
window.addEventListener('hashchange', () => { aplicarAncora(); desenhar(); });
aplicarAncora();
desenhar();
