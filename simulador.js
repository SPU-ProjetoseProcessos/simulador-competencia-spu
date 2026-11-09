/* Tela do simulador. A lógica está em motor.js; aqui só há apresentação. */
'use strict';

const BASE = window.BASE;

/* Rótulos e formatação vêm de rotulos.js, compartilhado com a tabela. */

const estado = { materia: '', valor: null, area: null, situacao: null, condicoes: {} };

// ------------------------------------------------------------------ formatação

function el(tag, cls, texto) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (texto !== undefined && texto !== null) e.textContent = texto;
  return e;
}

function materiaDe(codigo) {
  return BASE.materias.filter((m) => m.codigo === codigo)[0];
}

// --------------------------------------------------- seletor de matéria

/* Monta o seletor agrupado pela TT-02. Submodalidades cuja regra é idêntica à
 * da irmã aparecem como o regime-pai, com um único item — decisão da rodada 3.
 * O rótulo do pai vem da TT-02, não do nome das filhas. */
function montarSeletor() {
  const sel = document.getElementById('materia');
  sel.appendChild(el('option', null, 'Escolha o regime…')).value = '';

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
    porClasse[chave].push({ codigo: m.codigo, rotulo: m.rotulo });
  });
  Object.keys(colapsadas).forEach((pai) => {
    const filhas = colapsadas[pai].sort((a, b) => a.codigo.localeCompare(b.codigo));
    const classe = filhas[0].classe;
    if (!porClasse[classe]) porClasse[classe] = [];
    porClasse[classe].push({
      codigo: filhas[0].codigo,
      rotulo: BASE.rotulos_pai_tt02[pai] || filhas[0].rotulo,
      colapsa: filhas.map((f) => f.rotulo),
    });
  });

  const ordem = Object.keys(BASE.classes_tt02).sort().concat(['fora']);
  ordem.forEach((chave) => {
    if (!porClasse[chave]) return;
    const g = el('optgroup');
    g.label = chave === 'fora' ? 'Fora da TT-02' : BASE.classes_tt02[chave];
    porClasse[chave]
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'))
      .forEach((m) => {
        const o = el('option', null, m.rotulo);
        o.value = m.codigo;
        if (m.colapsa) o.dataset.colapsa = m.colapsa.join(' · ');
        g.appendChild(o);
      });
    sel.appendChild(g);
  });

  sel.addEventListener('change', () => {
    estado.materia = sel.value;
    // O valor e a área informados PERSISTEM na troca de matéria (rodada 3).
    // As condições, não: elas são de outra matéria.
    estado.condicoes = {};
    estado.situacao = null;
    assinaturaNaTela = null;   // matéria nova, formulário novo
    desenhar();
  });
}

// ------------------------------------------------------------ campos dinâmicos

function respostasAtuais() {
  const r = Object.assign({}, estado.condicoes);
  if (estado.area !== null) r.__area__ = estado.area;
  return r;
}

/* O formulário só é reconstruído quando muda de verdade.
 *
 * Antes, cada tecla disparava o redesenho e o redesenho recriava todos os
 * campos — inclusive aquele em que se estava digitando, que deixava de existir
 * e levava o foco junto. Dava para digitar um algarismo por clique.
 *
 * Agora: compara-se a assinatura do formulário — quais campos, com que rótulo
 * de área e que opções — com a que está na tela. Igual, não se mexe no HTML;
 * só os ecos "R$ 500.000" e "20.000 m²" são atualizados no lugar. Diferente,
 * reconstrói — e aí devolve foco e posição do cursor a quem os tinha. */
let assinaturaNaTela = null;

function assinaturaCampos(lista) {
  return lista.map((c) => [c.campo, c.tipo, c.referencia || '',
    (c.valores || []).join(',')].join(':')).join('|');
}

function atualizarEcos() {
  ['valor', 'area'].forEach((qual) => {
    const e = document.getElementById('eco-' + qual);
    if (!e) return;
    e.textContent = estado[qual] === null ? ''
      : (qual === 'valor' ? brl.format(estado[qual])
        : fmt.format(estado[qual]) + ' m²');
  });
}

function desenharCampos(lista) {
  const assinatura = assinaturaCampos(lista);
  if (assinatura === assinaturaNaTela) {
    atualizarEcos();
    return;
  }
  const antes = document.activeElement;
  const foco = antes && antes.id ? antes.id : null;
  let inicio = null;
  let fim = null;
  try { inicio = antes.selectionStart; fim = antes.selectionEnd; } catch (e) { /* number */ }

  const alvo = document.getElementById('campos');
  alvo.textContent = '';
  lista.forEach((c) => {
    if (c.campo === 'valor') alvo.appendChild(campoNumero(c, 'valor'));
    else if (c.campo === 'area') alvo.appendChild(campoNumero(c, 'area'));
    else if (c.campo === 'situacao') alvo.appendChild(campoSituacao(c));
    else alvo.appendChild(campoCondicaoHtml(c));
  });
  assinaturaNaTela = assinatura;

  if (foco) {
    const depois = document.getElementById(foco);
    if (depois) {
      depois.focus();
      // input[type=number] recusa setSelectionRange em alguns navegadores
      try { if (inicio !== null) depois.setSelectionRange(inicio, fim); } catch (e) { /* ok */ }
    }
  }
}

function campoNumero(c, qual) {
  const d = el('div', 'campo');
  const id = 'campo-' + qual;
  const rot = el('label', 'pergunta', qual === 'valor'
    ? 'Valor do imóvel'
    : REFERENCIA[c.referencia] || 'Área');
  rot.htmlFor = id;
  d.appendChild(rot);
  if (qual === 'area' && c.referencia !== 'imovel') {
    d.appendChild(el('p', 'nota-campo', c.referencia === 'terreno_total'
      ? 'Informe a área total do terreno da União, não a da unidade.'
      : 'A área considerada é a fração ideal do terreno vinculada à unidade '
        + '(Resolução CDE nº 9/2026, item 3.1).'));
  }
  const linha = el('div', 'linha-numero');
  const i = el('input');
  i.type = 'number';
  i.id = id;
  i.min = '0';
  i.step = qual === 'valor' ? '1000' : '1';
  i.placeholder = qual === 'valor' ? 'em reais' : 'em metros quadrados';
  if (estado[qual] !== null) i.value = String(estado[qual]);
  i.addEventListener('input', () => {
    estado[qual] = i.value === '' ? null : Number(i.value);
    if (qual === 'area') estado.situacao = null;
    desenhar();
  });
  linha.appendChild(i);
  linha.appendChild(el('span', 'unidade', qual === 'valor' ? 'R$' : 'm²'));
  d.appendChild(linha);
  const eco = el('p', 'eco', estado[qual] === null ? ''
    : (qual === 'valor' ? brl.format(estado[qual])
      : fmt.format(estado[qual]) + ' m²'));
  eco.id = 'eco-' + qual;
  d.appendChild(eco);
  return d;
}

function campoSituacao(c) {
  const d = el('div', 'campo');
  d.appendChild(el('label', 'pergunta', 'Situação do imóvel'));
  d.appendChild(el('p', 'nota-campo', 'Nesta faixa de área a situação muda a '
    + 'resposta. Abaixo dela, não é perguntada.'));
  c.valores.forEach((v) => {
    d.appendChild(opcao('situacao', v, SITUACAO[v] || v, estado.situacao === v,
      () => { estado.situacao = v; desenhar(); }));
  });
  return d;
}

function campoCondicaoHtml(c) {
  const d = el('div', 'campo');
  d.appendChild(el('label', 'pergunta', c.pergunta));
  // O `motivo` continua sendo calculado — é ele que põe esta pergunta antes do
  // campo de área —, mas não se exibe (item 9 do backlog).
  const porValor = {};
  c.teste.valores.forEach((v) => { porValor[v.valor] = v; });
  c.valores.forEach((v) => {
    const info = porValor[v] || { rotulo: v };
    d.appendChild(opcao(c.campo, v, info.rotulo,
      estado.condicoes[c.campo] === v,
      () => { estado.condicoes[c.campo] = v; desenhar(); }));
  });
  return d;
}

function opcao(nome, valor, rotulo, marcado, aoEscolher) {
  const w = el('label', 'opcao');
  const i = el('input');
  i.type = 'radio';
  i.name = nome;
  i.value = valor;
  i.checked = marcado;
  i.addEventListener('change', aoEscolher);
  w.appendChild(i);
  w.appendChild(el('span', null, rotulo));
  return w;
}

// ------------------------------------------------------------------- resultado

function casoDe(lista) {
  const m = materiaDe(estado.materia);
  const nomes = lista.map((c) => c.campo);
  const campoArea = lista.filter((c) => c.campo === 'area')[0];
  const condicoes = {};
  lista.forEach((c) => {
    if (c.tipo === 'condicao' && estado.condicoes[c.campo] !== undefined) {
      condicoes[c.campo] = estado.condicoes[c.campo];
    }
  });
  return {
    valor: nomes.indexOf('valor') !== -1 ? estado.valor : null,
    area: campoArea ? estado.area : null,
    situacao: nomes.indexOf('situacao') !== -1 ? estado.situacao : null,
    referencia: campoArea ? campoArea.referencia : 'imovel',
    condicoes: condicoes,
    coringas_admitidos: m.coringas_admitidos || [],
  };
}

function faltaResponder(lista, caso) {
  const falta = [];
  lista.forEach((c) => {
    if (c.campo === 'valor' && caso.valor === null) falta.push('o valor');
    else if (c.campo === 'area' && caso.area === null) {
      falta.push(('' + (REFERENCIA[c.referencia] || 'a área')).toLowerCase());
    } else if (c.campo === 'situacao' && caso.situacao === null) {
      falta.push('a situação do imóvel');
    } else if (c.tipo === 'condicao' && caso.condicoes[c.campo] === undefined) {
      falta.push('«' + (c.rotulo || c.campo) + '»');
    }
  });
  return falta;
}

/* Resultado condicionado ao da outra dimensão: seis regras de manifestação
 * dependem de quem é a autoridade competente. A competência resolve primeiro. */
function aplicarCondicional(r, autoridade) {
  if (!r.resultado_se) return { resultado: r.resultado, nota: null };
  const par = r.resultado_se.split('=');
  if (par[0] !== 'competencia') return { resultado: r.resultado, nota: null };
  const bate = autoridade === par[1];
  return {
    resultado: bate ? r.resultado : r.resultado_alternativo,
    nota: 'A regra distingue conforme a autoridade: ' + MANIFESTACAO[r.resultado]
      + ' nos atos do(a) ' + COMPETENCIA[par[1]] + ', '
      + MANIFESTACAO[r.resultado_alternativo].toLowerCase() + ' nos demais. '
      + 'Aqui a competência é do(a) ' + (COMPETENCIA[autoridade] || '—') + '.',
  };
}

function blocoResultado(titulo, texto, classe) {
  const d = el('section', 'bloco ' + (classe || ''));
  d.appendChild(el('h3', null, titulo));
  d.appendChild(el('p', 'resposta', texto));
  return d;
}

function fundamentos(regras, preteridas) {
  const d = el('div', 'fundamentos');
  regras.forEach((r) => {
    const f = el('p', 'fundamento');
    f.appendChild(el('strong', null, 'Fundamento: '));
    f.appendChild(document.createTextNode(r.fundamento || '—'));
    d.appendChild(f);
    if (r.origem && r.origem.condicao) {
      d.appendChild(el('p', 'origem', 'Texto de origem: “' + r.origem.condicao + '”'));
    }
  });
  (preteridas || []).forEach((r) => {
    const f = el('p', 'fundamento preterido');
    f.appendChild(el('strong', null, 'Fundamento preterido: '));
    f.appendChild(document.createTextNode((r.fundamento || '—')
      + ' — levaria a ' + (MANIFESTACAO[r.resultado] || r.resultado).toLowerCase()
      + '. Preterido pela precedência entre eixos, que faz prevalecer o '
      + 'encaminhamento mais alto. Interpretação em conferência junto à área '
      + 'de destinação.'));
    d.appendChild(f);
  });
  return d;
}

function blocoColisao(titulo, vence) {
  const d = el('section', 'bloco colisao');
  d.appendChild(el('h3', null, titulo));
  d.appendChild(el('p', 'resposta', 'A ferramenta não responde este caso.'));
  d.appendChild(el('p', 'explica', 'Duas regras igualmente específicas dizem '
    + 'coisas diferentes, e a condição que as separaria não '
    + 'está reduzida. Escolher uma seria decidir no lugar de quem tem competência '
    + 'para isso. As duas hipóteses:'));
  const ul = el('ul', 'hipoteses');
  vence.forEach((r) => {
    const li = el('li');
    li.appendChild(el('strong', null,
      (MANIFESTACAO[r.resultado] || COMPETENCIA[r.resultado] || r.resultado) + ' — '));
    li.appendChild(document.createTextNode('quando: “'
      + (r.origem.condicao || '—') + '”'));
    li.appendChild(el('p', 'origem', r.fundamento || '—'));
    if (r.pendencia) li.appendChild(el('p', 'pendencia', r.pendencia));
    ul.appendChild(li);
  });
  d.appendChild(ul);
  return d;
}

function desenharResultado(lista) {
  const alvo = document.getElementById('resultado');
  alvo.textContent = '';
  if (!estado.materia) {
    alvo.appendChild(el('p', 'vazio', 'Escolha um regime para começar.'));
    return;
  }
  const m = materiaDe(estado.materia);
  const caso = casoDe(lista);
  const falta = faltaResponder(lista, caso);
  if (falta.length) {
    alvo.appendChild(el('p', 'vazio', 'Falta informar ' + falta.join(', ') + '.'));
    return;
  }

  // A competência resolve primeiro: a manifestação pode depender dela.
  const comp = resolver(BASE, 'competencia', estado.materia, caso);
  const manif = resolver(BASE, 'manifestacao', estado.materia, caso);
  const autoridade = comp.vence.length === 1 ? comp.vence[0].resultado : null;

  // --- manifestação prévia
  if (!manif.vence.length) {
    alvo.appendChild(blocoResultado('Manifestação prévia',
      'Não há regra de manifestação para este regime.', 'neutro'));
  } else if (manif.vence.length > 1) {
    alvo.appendChild(blocoColisao('Manifestação prévia', manif.vence));
  } else {
    const r = manif.vence[0];
    const ap = aplicarCondicional(r, autoridade);
    let texto = MANIFESTACAO[ap.resultado] || ap.resultado;
    if (ap.resultado === 'ge_desup' && r.ge_desup_nivel !== null) {
      texto += ' — ' + NIVEL_GE_DESUP[r.ge_desup_nivel];
    }
    const b = blocoResultado('Manifestação prévia', texto,
      ap.resultado === 'sem_manifestacao' ? 'neutro' : 'destaque');
    if (ap.nota) b.appendChild(el('p', 'explica', ap.nota));
    if (ap.resultado === 'ge_desup' && r.ge_desup_gatilho) {
      b.appendChild(el('p', 'explica', GATILHO[r.ge_desup_gatilho] || ''));
    }
    b.appendChild(el('p', 'explica', 'A manifestação prévia opina sobre '
      + 'conveniência e oportunidade; ela não decide.'));
    b.appendChild(fundamentos([r], manif.preteridas));
    alvo.appendChild(b);
  }

  // --- competência para autorizar
  if (!comp.vence.length) {
    alvo.appendChild(blocoResultado('Competência para autorizar',
      'Não há regra de competência para este regime.', 'neutro'));
  } else if (comp.vence.length > 1) {
    alvo.appendChild(blocoColisao('Competência para autorizar', comp.vence));
  } else {
    const r = comp.vence[0];
    const b = blocoResultado('Competência para autorizar',
      COMPETENCIA[r.resultado] || r.resultado, 'destaque');
    b.appendChild(fundamentos([r], comp.preteridas));
    alvo.appendChild(b);
  }

  // --- assinatura do instrumento
  const a = el('section', 'bloco nota');
  a.appendChild(el('h3', null, 'Assinatura do instrumento'));
  a.appendChild(el('p', 'resposta-menor', 'Em regra, do(a) Superintendente, '
    + 'após a autorização.'));
  a.appendChild(el('p', 'origem', 'Portaria SPU/MGI nº 11.424/2025, art. 1º, I.'));
  alvo.appendChild(a);

  // --- ressalvas da matéria
  const ressalvas = [];
  const opcaoSel = document.querySelector('#materia option:checked');
  if (opcaoSel && opcaoSel.dataset.colapsa) {
    ressalvas.push('As submodalidades deste regime (' + opcaoSel.dataset.colapsa
      + ') não foram distinguidas na origem: a regra é a mesma para as duas — o que '
      + 'não quer dizer que o direito as equipare.');
  }
  if (m.observacao) ressalvas.push(m.observacao);
  if (m.coringas_situacao === 'a_confirmar' && (m.coringas_admitidos || []).length) {
    ressalvas.push('O alcance da condição de finalidade de interesse social neste '
      + 'regime aguarda confirmação da área de destinação.');
  }
  if (ressalvas.length) {
    const s = el('section', 'bloco ressalva');
    s.appendChild(el('h3', null, 'Ressalvas'));
    ressalvas.forEach((x) => s.appendChild(el('p', 'explica', x)));
    alvo.appendChild(s);
  }
}

// ------------------------------------------------------------------- desenho

/* Campo já respondido não some da tela.
 *
 * `campos()` devolve só o que ainda pode mudar a resposta — correto para o
 * motor, ruim para quem está preenchendo: escolhida a "apreciação inicial",
 * nenhuma regra precisa mais daquele teste e a pergunta sumia logo depois de
 * respondida. Aqui ela é mantida, com a resposta à vista. Isso não altera a
 * resolução: condição que nenhuma regra candidata usa não muda o resultado. */
function listaExibida() {
  const resp = respostasAtuais();
  const lista = campos(BASE, estado.materia, resp);
  const nomes = lista.map((c) => c.campo);
  const m = materiaDe(estado.materia);
  const todas = regrasDa(BASE, estado.materia, m.coringas_admitidos || []);
  const proprias = todas.filter((r) => r.materia === estado.materia);
  const dims = Array.from(new Set(proprias.map((r) => r.dimensao))).sort();
  const testesPorId = {};
  BASE.testes.forEach((t) => { testesPorId[t.teste] = t; });

  const extras = [];
  m.testes.forEach((t) => {
    if (nomes.indexOf(t) !== -1) return;
    if (estado.condicoes[t] === undefined) return;
    const te = testesPorId[t];
    if (te.exibir_quando) {
      const par = te.exibir_quando.split('=');
      if (resp[par[0]] !== par[1]) return;   // o gatilho deixou de valer
    }
    const vals = valoresOferecidos(proprias, te, dims);
    if (vals.length) extras.push(campoCondicao(te, vals));
  });
  // Ordem confirmada, SEMPRE a mesma: valor, a condição que determina o que a
  // área mede, área, situação, demais condições. Montada aqui e não deixada ao
  // motor porque `campos()` devolve o gatilho ora antes, ora depois da área,
  // conforme o ramo — e um campo que troca de lugar entre uma resposta e outra
  // faz o técnico perder o fio.
  const gatilhosRef = new Set();
  proprias.forEach((r) => {
    if ((r.area.min !== null || r.area.max !== null) &&
        r.area.referencia !== 'imovel') {
      r.condicoes.forEach((c) => gatilhosRef.add(c.teste));
    }
  });
  const ordem = m.testes;
  const porOrdem = (a, b) => ordem.indexOf(a.campo) - ordem.indexOf(b.campo);
  const todas2 = lista.concat(extras);
  const so = (nome) => todas2.filter((c) => c.campo === nome);
  const cond = todas2.filter((c) => c.tipo === 'condicao');
  return so('valor')
    .concat(cond.filter((c) => gatilhosRef.has(c.campo)).sort(porOrdem))
    .concat(so('area'), so('situacao'))
    .concat(cond.filter((c) => !gatilhosRef.has(c.campo)).sort(porOrdem));
}

function desenhar() {
  const lista = estado.materia ? listaExibida() : [];
  // Respostas de campos que deixaram de ser exibidos não entram no caso, mas
  // também não são apagadas: voltar atrás não deve custar redigitar.
  desenharCampos(lista);
  desenharResultado(lista);
}

/* `index.html#02.01.02.01.01` abre já naquela matéria — é assim que a ficha
 * manda o leitor para cá. */
function daAncora() {
  const cod = decodeURIComponent(location.hash.replace(/^#/, ''));
  return materiaDe(cod) ? cod : '';
}

function aplicarAncora() {
  const cod = daAncora();
  if (!cod || cod === estado.materia) return;
  const sel = document.getElementById('materia');
  sel.value = cod;
  sel.dispatchEvent(new Event('change'));
}

montarSeletor();
window.addEventListener('hashchange', aplicarAncora);
aplicarAncora();
desenhar();
