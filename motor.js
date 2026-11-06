/* Motor de resolução e derivação de campos.
 *
 * Porte fiel de base/ferramentas/conferir.py e base/ferramentas/campos.py.
 * Se divergir deles, o erro está AQUI: as versões em Python são as conferidas
 * (1.649 percursos, nenhum sem resposta — base/relatorios/validacao.txt).
 * Qualquer alteração aqui tem de ser feita lá também, e reconferida.
 */
'use strict';

const SITUACOES_PERGUNTAVEIS = ['urbana', 'rural', 'perimetro_urbano_ou_expansao'];

/* Precedência entre eixos — decisão do Escritório de Processos (05/11/2026), achado nº 14.
 * Prevalece o encaminhamento mais alto. Só na manifestação, e nunca onde há
 * pendência: aplicá-la ali resolveria caladamente a autorização de obras. */
const PRECEDENCIA = { cde: 2, ge_desup: 1, sem_manifestacao: 0 };

// ----------------------------------------------------------------- utilidades

function dentro(x, f) {
  if (x === null || x === undefined) return f.min === null && f.max === null;
  if (f.min !== null) {
    if (x < f.min || (x === f.min && !f.min_inclusivo)) return false;
  }
  if (f.max !== null) {
    if (x > f.max || (x === f.max && !f.max_inclusivo)) return false;
  }
  return true;
}

function situacaoCompativel(r, caso) {
  const s = r.area.situacao;
  if (s === 'qualquer') return true;
  if (s === 'urbana_ou_rural') {
    return caso.situacao === null || caso.situacao === undefined ||
           caso.situacao === 'urbana' || caso.situacao === 'rural';
  }
  return caso.situacao === s;
}

function condicoesSatisfeitas(r, caso) {
  return r.condicoes.every((c) => {
    const v = caso.condicoes[c.teste];
    return v !== null && v !== undefined && c.valores.indexOf(v) !== -1;
  });
}

function usaFaixa(r, eixo) {
  return r[eixo].min !== null || r[eixo].max !== null;
}

function regrasDa(base, materia, admitidos) {
  const out = [];
  base.regras.forEach((r) => {
    if (r.materia === materia) {
      out.push(r);
    } else if (r.materia === '*') {
      const usa = r.condicoes.some((c) => admitidos.indexOf(c.teste) !== -1);
      if (usa) out.push(r);
    }
  });
  return out;
}

function compativel(r, respostas) {
  return r.condicoes.every((c) => {
    const v = respostas[c.teste];
    return v === undefined || v === null || c.valores.indexOf(v) !== -1;
  });
}

// --------------------------------------------------------- motor de resolução

function desempatar(dimensao, vence) {
  if (vence.length < 2 || dimensao !== 'manifestacao') return [vence, []];
  if (vence.some((r) => r.pendencia)) return [vence, []];
  const niveis = vence.map((r) => PRECEDENCIA[r.resultado]);
  if (niveis.some((n) => n === undefined)) return [vence, []];
  const distintos = new Set(niveis);
  if (distintos.size < 2) return [vence, []];
  const alto = Math.max.apply(null, niveis);
  return [vence.filter((r) => PRECEDENCIA[r.resultado] === alto),
          vence.filter((r) => PRECEDENCIA[r.resultado] !== alto)];
}

/* Devolve {vence, candidatas, preteridas}. Mais de uma vencedora depois do
 * desempate é colisão, não resposta. */
function resolver(base, dimensao, materia, caso) {
  const coringaOk = caso.coringas_admitidos || [];
  const cand = [];
  base.regras.forEach((r) => {
    if (r.dimensao !== dimensao) return;
    if (r.materia === '*') {
      if (!r.condicoes.some((c) => coringaOk.indexOf(c.teste) !== -1)) return;
    } else if (r.materia !== materia) {
      return;
    }
    if (!dentro(caso.valor, r.valor)) return;
    if (r.area.referencia !== 'imovel' && caso.referencia !== r.area.referencia) return;
    if (!dentro(caso.area, r.area)) return;
    if (!situacaoCompativel(r, caso)) return;
    if (!condicoesSatisfeitas(r, caso)) return;
    cand.push(r);
  });
  if (!cand.length) return { vence: [], candidatas: [], preteridas: [] };
  const melhor = Math.max.apply(null, cand.map((r) => r.especificidade));
  let vence = cand.filter((r) => r.especificidade === melhor);
  const par = desempatar(dimensao, vence);
  return { vence: par[0], candidatas: cand, preteridas: par[1] };
}

// ------------------------------------------------------ derivação dos campos

function gatilhosDaReferencia(comArea) {
  const s = new Set();
  comArea.forEach((r) => {
    if (r.area.referencia !== 'imovel') {
      r.condicoes.forEach((c) => s.add(c.teste));
    }
  });
  return Array.from(s).sort();
}

function referenciaDaArea(comArea, respostas) {
  for (let i = 0; i < comArea.length; i += 1) {
    const r = comArea[i];
    if (r.area.referencia === 'imovel') continue;
    if (r.condicoes.length &&
        r.condicoes.every((c) => c.valores.indexOf(respostas[c.teste]) !== -1)) {
      return r.area.referencia;
    }
  }
  return 'imovel';
}

function areaDispensada(rs, comArea, respostas) {
  const satisfeitas = (r) => r.condicoes.filter(
    (c) => c.valores.indexOf(respostas[c.teste]) !== -1).length;
  const semFaixa = rs.filter((r) => !usaFaixa(r, 'area')).map(satisfeitas);
  const sem = semFaixa.length ? Math.max.apply(null, semFaixa) : -1;
  const comFaixa = comArea.map(satisfeitas);
  const com = comFaixa.length ? Math.max.apply(null, comFaixa) : -1;
  return sem > com;
}

/* Pergunta-se a situação sempre que alguma regra da faixa informada exigir
 * situação determinada: sem ela aquela regra é inalcançável. */
function perguntaSituacao(comArea, area) {
  if (area === null || area === undefined) return false;
  return comArea.some((r) => SITUACOES_PERGUNTAVEIS.indexOf(r.area.situacao) !== -1 &&
                             dentro(area, r.area));
}

/* Parte de TODOS os valores declarados do teste, não só dos que alguma regra
 * nomeia: senão o caso que nenhuma regra específica alcança fica sem resposta
 * possível — numa doação que não seja para provisão habitacional, Reurb-E nem
 * múltiplos usos, o técnico não teria como dizer "outra finalidade".
 *
 * Um valor é oferecido quando TODA dimensão da matéria consegue responder com
 * ele — ou alguma regra o admite, ou existe regra que não condiciona naquele
 * teste e portanto o abriga. Sem isso a tela oferece resposta sem saída, como
 * "não é Reurb" na legitimação fundiária. */
function valoresOferecidos(proprias, te, dims) {
  const teste = te.teste;
  const todos = new Set(te.valores.map((v) => v.valor));
  return Array.from(todos).sort().filter((v) => dims.every((dim) => {
    const rd = proprias.filter((r) => r.dimensao === dim);
    if (!rd.length) return true;
    const admite = rd.some((r) => r.condicoes.some(
      (c) => c.teste === teste && c.valores.indexOf(v) !== -1));
    const abriga = rd.some((r) => !r.condicoes.some((c) => c.teste === teste));
    return admite || abriga;
  }));
}

function ordenarTestes(pedidos, testesPorId) {
  const ordem = [];
  let restam = Array.from(pedidos).sort();
  while (restam.length) {
    const antes = restam.length;
    restam.slice().forEach((t) => {
      const dep = testesPorId[t].exibir_quando;
      const d = dep ? dep.split('=')[0] : null;
      if (!d || restam.indexOf(d) === -1) {
        ordem.push(t);
        restam = restam.filter((x) => x !== t);
      }
    });
    if (restam.length === antes) { ordem.push.apply(ordem, restam); break; }
  }
  return ordem;
}

/* Os campos a exibir, em ordem. Ordem confirmada pelo Escritório de Processos — matéria, valor,
 * área, situação, condições —, com a exceção que a base impõe: a condição que
 * determina o que a área mede vem antes da área. */
function campos(base, materia, respostas) {
  const testesPorId = {};
  base.testes.forEach((t) => { testesPorId[t.teste] = t; });
  const m = base.materias.filter((x) => x.codigo === materia)[0];
  const admitidos = m.coringas_admitidos || [];
  const todas = regrasDa(base, materia, admitidos);
  const proprias = todas.filter((r) => r.materia === materia);
  const dims = Array.from(new Set(proprias.map((r) => r.dimensao))).sort();
  const rs = todas.filter((r) => compativel(r, respostas));
  const pedidos = m.testes;
  const out = [];
  const ja = new Set();

  // 1. valor
  if (rs.some((r) => usaFaixa(r, 'valor'))) {
    out.push({ campo: 'valor', tipo: 'numero', unidade: 'BRL' });
  }

  // 2. a condição que determina o que a área mede, antes da área
  const comArea = rs.filter((r) => usaFaixa(r, 'area'));
  const faltam = gatilhosDaReferencia(comArea).filter(
    (x) => pedidos.indexOf(x) !== -1 && respostas[x] === undefined);
  if (faltam.length) {
    faltam.forEach((x) => {
      out.push(campoCondicao(testesPorId[x],
        valoresOferecidos(proprias, testesPorId[x], dims), 'define o que a área mede'));
      ja.add(x);
    });
    return out;            // a área só depois de saber o que ela mede
  }

  // 3. área, quando ela ainda pode mudar a resposta
  if (comArea.length && !areaDispensada(rs, comArea, respostas)) {
    out.push({ campo: 'area', tipo: 'numero', unidade: 'm2',
               referencia: referenciaDaArea(comArea, respostas) });

    // 4. situação do imóvel
    if (perguntaSituacao(comArea, respostas.__area__)) {
      const vals = new Set();
      comArea.forEach((r) => {
        if (SITUACOES_PERGUNTAVEIS.indexOf(r.area.situacao) !== -1 &&
            dentro(respostas.__area__, r.area)) vals.add(r.area.situacao);
      });
      out.push({ campo: 'situacao', tipo: 'enumerado',
                 valores: Array.from(vals).sort() });
    }
  }

  // 5. as demais condições, cada dependente logo após o seu gatilho
  ordenarTestes(pedidos, testesPorId).forEach((x) => {
    if (ja.has(x)) return;
    const te = testesPorId[x];
    if (te.exibir_quando) {
      const par = te.exibir_quando.split('=');
      if (respostas[par[0]] !== par[1]) return;
    }
    if (!rs.some((r) => r.condicoes.some((c) => c.teste === x))) return;
    const vals = valoresOferecidos(proprias, te, dims);
    if (!vals.length) return;
    out.push(campoCondicao(te, vals));
    ja.add(x);
  });
  return out;
}

function campoCondicao(teste, valores, motivo) {
  const d = { campo: teste.teste, tipo: 'condicao', pergunta: teste.pergunta,
              rotulo: teste.rotulo, valores: valores, teste: teste };
  if (motivo) d.motivo = motivo;
  return d;
}
