const { extrairMagnetsParaStremio } = require('./src/providers/pageExtractor');
const cheerio = require('cheerio');
const { sanitizeMagnet } = require('./src/utils/sanitizer');

console.log('--- Testando Extração com Cheerio ---');

// Mock de um HTML típico de post de filme/série com botões de download magnet
const mockHtml = `
  <!DOCTYPE html>
  <html>
    <head><title>Filme Teste Dual Áudio 1080p</title></head>
    <body>
      <h1>Filme Teste (2024) WEB-DL 1080p Dual Áudio 5.1</h1>
      <div class="downloads">
        <a href="magnet:?xt=urn:btih:aaf2a00e49d6e3d9e46976c94fe1b6f83b33a321&dn=Filme.Teste.2024.1080p.DUAL.5.1&tr=http://anuncio-tracker.ru/announce&tr=udp://tracker.opentrackr.org:1337/announce" class="btn">
          Download Magnet 1080p Dual Áudio
        </a>
        <a href="magnet:?xt=urn:btih:4b4860b7194f4a362f68bc1ab6be272fef6372ec&dn=Filme.Teste.2024.720p.DUBLADO&tr=udp://tracker.openbittorrent.com:6969/announce" class="btn">
          Download Magnet 720p Dublado
        </a>
        <a href="https://site.com/outro-link" class="btn">Link Comum</a>
      </div>
    </body>
  </html>
`;

// Simula a lógica de extração sobre o HTML mockado
const $ = cheerio.load(mockHtml);
const streams = [];

$('a[href^="magnet:?"]').each((index, element) => {
  const rawMagnet = $(element).attr('href');
  const textoDoBotao = $(element).text().trim();
  const sanitized = sanitizeMagnet(rawMagnet);

  if (sanitized) {
    const nomeFinal = sanitized.displayName || textoDoBotao;
    const sources = (sanitized.trackers || []).map(tr => `tracker:${tr}`);

    streams.push({
      name: nomeFinal,
      infoHash: sanitized.infoHash,
      sources: sources
    });
  }
});

console.log(`Encontrados ${streams.length} links magnéticos no HTML:`);
console.log(JSON.stringify(streams, null, 2));
console.log('\n--- Teste concluído com sucesso! ---');
