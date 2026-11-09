# Governança da Destinação

**Simulador de manifestação e competência**

Consulta, por matéria de destinação de imóveis da União e pelas condições do caso:

1. **Manifestação prévia** sobre conveniência e oportunidade — da CDE, do GE-DESUP (com o
   nível) ou nenhuma. Ela opina, **não decide**.
2. **Competência para autorizar** o ato — Ministro(a), Secretário(a) ou Superintendente.
3. **Assinatura do instrumento**, como nota.

> **A base ainda não foi validada pela área de destinação.** As respostas reproduzem a
> planilha de requisitos e servem para conferência e estudo. Para instruir processo,
> confira a norma.

## As cinco páginas

| Página | O que faz |
|---|---|
| `index.html` | **Simulador.** Pergunta só o que muda a resposta naquela matéria e mostra manifestação, competência, nota de assinatura e o fundamento de cada uma. |
| `tabela.html` | **Tabela de regras.** Todas as regras da base, com busca e filtros, e a grafia de origem da planilha em cada linha. |
| `ficha.html` | **Ficha da matéria.** Por matéria: identificação na TT-02, o que a ferramenta pergunta, as regras das duas dimensões e as ressalvas. |
| `rito.html` | **Rito e requisitos.** O fluxo de instrução e as exigências das Resoluções CDE. |
| `mudancas.html` | **O que mudou.** As notas de alteração da planilha, agrupadas, com os pontos que a própria planilha deixou "a confirmar". |

As páginas se ligam por âncora: `#<código da TT-02>` abre a matéria já escolhida em qualquer
uma delas.

## Como funciona

Site estático, sem dependências e sem servidor: abre com um duplo clique em `index.html`.

- `base.js` — a base de regras, **derivada**. Não editar à mão.
- `motor.js` — resolução e derivação de campos. É porte das versões em Python, que são as
  conferidas; alteração aqui tem de ser feita lá também.
- `rotulos.js` — rótulos e formatação de faixas, comuns às cinco páginas.
- `simulador.js`, `tabela.js`, `ficha.js`, `rito.js`, `mudancas.js` — apresentação.
- `estilo.css` — estilo das cinco.

Os estáticos levam `?v=<impressão digital do conteúdo>`, para o navegador não servir base nem
código antigos do cache. O carimbo é reescrito pelo derivador a cada alteração.

## De onde vêm as regras

De uma base estruturada e auditável, carregada da planilha de requisitos e conferida por um
motor de resolução: para cada regra, monta-se um caso dentro da faixa dela e verifica-se se a
base responde o que a planilha responde. A base, as ferramentas de validação e os relatórios
de conferência ficam no repositório de trabalho do Escritório de Processos, fora deste site.

Onde a planilha não responde por si, a ferramenta **não escolhe**: exibe as hipóteses com o
texto da célula de origem e diz por que não decide.

---

Desenvolvido por **CGGES — Escritório de Processos**
