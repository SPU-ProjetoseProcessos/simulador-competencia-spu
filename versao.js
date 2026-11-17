/* Fecha o buraco do cache do HTML.
 *
 * O `?v=` do derivador protege os estáticos: base, scripts e folha de estilo
 * só são reaproveitados do cache enquanto o conteúdo não muda. O HTML, não —
 * o GitHub Pages o serve com cache e não há como carimbar o endereço da
 * própria página. Resultado visto em 17/11/2026: a ferramenta publicada e,
 * no navegador, a página anterior inteira, com os scripts anteriores, por
 * referenciar os carimbos antigos. Numa ferramenta que responde competência,
 * isso não é incômodo: é resposta errada sem avisar que é velha.
 *
 * Aqui a página pergunta ao servidor de que versão ele é — um arquivo de dez
 * caracteres, buscado sem cache — e, se não for a dela, recarrega uma vez com
 * `?v=` no endereço, que é o que faz o navegador buscar de novo em vez de
 * reusar o que guardou.
 *
 * Três cuidados, porque uma recarga automática que erra é pior que o defeito:
 *  . recarrega UMA vez por versão, marcado em sessionStorage — se o servidor
 *    insistir na versão antiga, a pessoa fica com o que há, sem laço;
 *  . falha de rede não faz nada: a página continua como está;
 *  . os outros parâmetros do endereço e a âncora são preservados, senão a
 *    recarga levaria a pessoa para outro regime.
 */
(function () {
  var meta = document.querySelector('meta[name="spu-versao"]');
  if (!meta || !meta.content || !window.fetch) return;
  var daPagina = meta.content;

  fetch('versao.txt?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.text() : null; })
    .then(function (texto) {
      if (!texto) return;
      var noServidor = texto.trim();
      if (!noServidor || noServidor === daPagina) return;

      try {
        if (sessionStorage.getItem('spu-recarga') === noServidor) return;
        sessionStorage.setItem('spu-recarga', noServidor);
      } catch (e) { return; }   // sem onde marcar, não arrisco o laço

      var url = new URL(location.href);
      url.searchParams.set('v', noServidor);
      location.replace(url.toString());
    })
    .catch(function () { /* offline, ou o arquivo não subiu: segue a página */ });
}());
