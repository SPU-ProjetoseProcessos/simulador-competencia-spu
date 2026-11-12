/* Ficha da matéria — tudo o que a base sabe sobre uma matéria, num lugar só.
 *
 * O simulador responde um caso; a tabela mostra todas as regras. A ficha é a
 * terceira pergunta que as pessoas fazem: "e esse regime, como é?". Reúne a
 * identificação na TT-02, as grafias da planilha, o que a tela pergunta, as
 * regras das duas dimensões e as ressalvas que valem para a matéria inteira.
 */
'use strict';

const BASE = window.BASE;
const TESTES = {};
BASE.testes.forEach((t) => { TESTES[t.teste] = t; });

const NATUREZA = {
  regime: 'Regime de destinação',
  instrumento_previo: 'Instrumento prévio',
  finalidade: 'Finalidade',
  regra_residual: 'Regra residual',
};

let atual = null;

function el(tag, cls, texto) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (texto !== undefined && texto !== null) e.textContent = texto;
  return e;
}

function materiaDe(codigo) {
  return BASE.materias.filter((m) => m.codigo === codigo)[0];
}

function regrasDaMateria(cod) {
  const m = materiaDe(cod);
  const adm = m.coringas_admitidos || [];
  return BASE.regras.filter((r) => {
    if (r.materia === cod) return true;
    if (r.materia !== '*') return false;
    return r.condicoes.some((c) => adm.indexOf(c.teste) !== -1);
  });
}

function usaFaixa(r, eixo) {
  return r[eixo].min !== null || r[eixo].max !== null;
}

/* As irmãs que colapsam no mesmo regime-pai. */
function irmasColapsadas(m) {
  if (!m.colapsa_no_pai) return [];
  return BASE.materias.filter((x) => x.pai === m.pai && x.colapsa_no_pai);
}

// -------------------------------------------------------------------- índice

function montarIndice() {
  const alvo = document.getElementById('indice');
  const porClasse = {};
  const colapsadas = {};
  BASE.materias.forEach((m) => {
    if (m.colapsa_no_pai) {
      if (!colapsadas[m.pai]) colapsadas[m.pai] = [];
      colapsadas[m.pai].push(m);
      return;
    }
    const chave = m.fora_tt02 ? 'fora' : m.classe;
    if (!porClasse[chave]) porClasse[chave] = [];
    porClasse[chave].push({ codigo: m.codigo, rotulo: m.rotulo, filhas: [] });
  });
  Object.keys(colapsadas).forEach((pai) => {
    const filhas = colapsadas[pai].sort((a, b) => a.codigo.localeCompare(b.codigo));
    const classe = filhas[0].classe;
    if (!porClasse[classe]) porClasse[classe] = [];
    porClasse[classe].push({
      codigo: filhas[0].codigo,
      rotulo: BASE.rotulos_pai_tt02[pai] || filhas[0].rotulo,
      filhas: filhas.map((f) => f.rotulo),
    });
  });

  Object.keys(BASE.classes_tt02).sort().concat(['fora']).forEach((chave) => {
    if (!porClasse[chave]) return;
    alvo.appendChild(el('h3', null,
      chave === 'fora' ? 'Fora da TT-02' : BASE.classes_tt02[chave]));
    const ul = el('ul', 'lista-materias');
    porClasse[chave]
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'))
      .forEach((x) => {
        const li = el('li');
        const a = el('a', null, x.rotulo);
        a.href = '#' + x.codigo;
        a.dataset.codigo = x.codigo;
        li.appendChild(a);
        if (x.filhas.length) li.appendChild(el('span', 'subs', x.filhas.join(' · ')));
        ul.appendChild(li);
      });
    alvo.appendChild(ul);
  });
}

function marcarIndice(cod) {
  document.querySelectorAll('#indice a').forEach((a) => {
    if (a.dataset.codigo === cod) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

// --------------------------------------------------------------------- ficha

function bloco(titulo, classe) {
  const s = el('section', 'bloco ' + (classe || ''));
  s.appendChild(el('h3', null, titulo));
  return s;
}

function tabelaRegras(regras) {
  const t = el('table', 'regras');
  const thead = el('thead');
  const trh = el('tr');
  ['Valor', 'Área', 'Condições', 'Responde', 'Fundamento'].forEach((x) => {
    trh.appendChild(el('th', null, x));
  });
  thead.appendChild(trh);
  t.appendChild(thead);
  const tb = el('tbody');
  regras.forEach((r) => {
    const tr = el('tr');
    tr.appendChild(el('td', 'col-faixa', faixaValor(r)));
    tr.appendChild(el('td', 'col-faixa', faixaArea(r)));
    const td = el('td', 'col-cond',
      condicoesTexto(r, TESTES) || 'Sem condição — vale quando nenhuma específica bate');
    if (r.materia === '*') td.appendChild(el('span', 'etiqueta coringa', 'qualquer regime'));
    tr.appendChild(td);
    const tdr = el('td', 'col-resultado');
    tdr.appendChild(el('strong', null, resultadoTexto(r)));
    if (r.resultado_se) {
      tdr.appendChild(el('div', 'menor', 'Se não for do(a) '
        + COMPETENCIA[r.resultado_se.split('=')[1]] + ': '
        + (MANIFESTACAO_CURTA[r.resultado_alternativo] || r.resultado_alternativo)));
    }
    if (r.pendencia) tdr.appendChild(el('span', 'etiqueta pend', 'pendência'));
    tr.appendChild(tdr);
    const tdf = el('td', 'col-origem');
    tdf.appendChild(el('div', 'fundamento', r.fundamento || '—'));
    tdf.appendChild(el('div', 'origem', 'Texto de origem: “'
      + (r.origem.condicao || '—') + '”'));
    tr.appendChild(tdf);
    tb.appendChild(tr);
  });
  t.appendChild(tb);
  // A tabela é mais larga que a coluna da ficha: rola dentro da própria caixa,
  // em vez de empurrar a página.
  const caixa = el('div', 'rolagem-interna');
  caixa.appendChild(t);
  return caixa;
}

function desenharFicha(cod) {
  const alvo = document.getElementById('ficha');
  alvo.textContent = '';
  const m = materiaDe(cod);
  if (!m) {
    alvo.appendChild(el('p', 'vazio', 'Escolha um regime ao lado.'));
    return;
  }
  atual = cod;
  marcarIndice(cod);
  const regras = regrasDaMateria(cod);
  const proprias = regras.filter((r) => r.materia === cod);
  const irmas = irmasColapsadas(m);

  // --- identificação
  const id = el('header', 'cabeca-ficha');
  id.appendChild(el('h2', 'titulo-ficha',
    (m.colapsa_no_pai && BASE.rotulos_pai_tt02[m.pai]) || m.rotulo));
  const meta = el('p', 'meta');
  meta.textContent = (m.fora_tt02 ? 'Fora da TT-02' : 'TT-02 ' + m.codigo)
    + ' · ' + (NATUREZA[m.natureza] || m.natureza)
    + (m.classe && BASE.classes_tt02[m.classe] ? ' · ' + BASE.classes_tt02[m.classe] : '');
  id.appendChild(meta);
  const acoes = el('p', 'acoes');
  const aSim = el('a', 'botao-link', 'Simular um caso deste regime');
  aSim.href = 'index.html#' + cod;
  acoes.appendChild(aSim);
  const aTab = el('a', 'botao-link', 'Ver estas regras na tabela');
  aTab.href = 'tabela.html#' + cod;
  acoes.appendChild(aTab);
  id.appendChild(acoes);
  alvo.appendChild(id);

  // --- regras por dimensão
  [['manifestacao', 'Manifestação prévia'], ['competencia', 'Competência para autorizar']]
    .forEach((par) => {
      const rs = regras.filter((r) => r.dimensao === par[0]);
      const b = bloco(par[1] + ' — ' + rs.length
        + (rs.length === 1 ? ' regra' : ' regras'));
      if (!rs.length) {
        b.appendChild(el('p', 'explica', 'Não há regra desta dimensão para este regime.'));
      } else {
        b.appendChild(tabelaRegras(rs));
      }
      alvo.appendChild(b);
    });

  // --- assinatura
  const bA = bloco('Assinatura do instrumento', 'nota');
  bA.appendChild(el('p', 'explica', 'Em regra, do(a) Superintendente, após a '
    + 'autorização — Portaria SPU/MGI nº 11.424/2025, art. 1º, I.'));
  alvo.appendChild(bA);

  // --- ressalvas
  const ressalvas = [];
  if (irmas.length) {
    ressalvas.push('As submodalidades deste regime ('
      + irmas.map((x) => x.rotulo).join(' · ') + '): a regra é a mesma para as duas. '
      + 'Isso não quer dizer que o direito as equipare.');
  }
  if (m.observacao) ressalvas.push(m.observacao);
  if (m.coringas_situacao === 'a_confirmar' && (m.coringas_admitidos || []).length) {
    ressalvas.push('O alcance da condição de finalidade de interesse social neste regime '
      + 'aguarda confirmação da área de destinação.');
  }
  const pend = regras.filter((r) => r.pendencia);
  pend.forEach((r) => ressalvas.push('Pendência em ' + r.id + ': ' + r.pendencia));
  if (ressalvas.length) {
    const b = bloco('Ressalvas e procedência', 'ressalva');
    ressalvas.forEach((x) => b.appendChild(el('p', 'explica', x)));
    alvo.appendChild(b);
  }

  window.scrollTo(0, 0);
}

function daAncora() {
  const cod = decodeURIComponent(location.hash.replace(/^#/, ''));
  return materiaDe(cod) ? cod : null;
}

montarIndice();
window.addEventListener('hashchange', () => desenharFicha(daAncora()));
desenharFicha(daAncora());

/* A caixinha leva o regime que está aberto — é sobre ele que se relata. */
if (window.SPUCaixinha) {
  SPUCaixinha.iniciar({
    ferramenta: 'simulador',
    nome: 'Governança da Destinação',
    botao: '#relatar',
    contexto: () => {
      const cod = decodeURIComponent(location.hash.replace(/^#/, ''));
      const m = BASE.materias.filter((x) => x.codigo === cod)[0];
      return m ? [['Regime', m.rotulo], ['Versão da base', BASE.versao]]
               : [['Versão da base', BASE.versao]];
    },
  });
}
