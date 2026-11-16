const cheerio = require('cheerio');
const axios = require('axios');
const { sanitizeMagnet } = require('../utils/sanitizer');

/**
 * Faz a extração e sanitização de links magnéticos presentes no HTML de uma página.
 *
 * @param {string} urlDaPagina - URL da página a ser consultada
 * @returns {Promise<Array<{ name: string, magnet: string, infoHash: string, sources: Array<string> }>>}
 */
async function extrairMagnetsParaStremio(urlDaPagina) {
  try {
    console.log(`[PageExtractor] Baixando conteúdo de: ${urlDaPagina}`);

    const response = await axios.get(urlDaPagina, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 10000
    });

    const html = typeof response.data === 'string' ? response.data : '';
    const $ = cheerio.load(html);
    const streams = [];

    // Seleciona todos os links que começam com "magnet:?"
    $('a[href^="magnet:?"]').each((index, element) => {
      const rawMagnet = $(element).attr('href');
      const textoDoBotao = $(element).text().trim();

      // Sanitiza o magnet (limpa trackers inválidos e extrai o hash)
      const sanitized = sanitizeMagnet(rawMagnet);
      if (!sanitized) return;

      // Busca texto descritivo no elemento anterior ou pai (ex: "WEB-DL 1080p Dual Áudio 5.1 (11.58 GB)")
      const prevElementText = $(element).prev().text().trim() || $(element).parent().prev().text().trim();
      const parentText = $(element).parent().text().replace(/\s+/g, ' ').trim();

      let contextoDescricao = '';
      for (const candidate of [prevElementText, parentText]) {
        if (candidate && /(1080p|720p|2160p|4k|dual|dublado|legendado|\d+\s*(?:gb|mb))/i.test(candidate)) {
          contextoDescricao = candidate;
          break;
        }
      }

      let nomeFinal = sanitized.displayName || textoDoBotao || 'Stream Torrent';

      // Enriquece o nome com resolução e tamanho encontrados no HTML caso não existam no magnet
      if (contextoDescricao) {
        const resFound = contextoDescricao.match(/(?:2160p|4k|1080p|720p|480p)/i)?.[0];
        if (resFound && !/(2160p|4k|1080p|720p|480p)/i.test(nomeFinal)) {
          nomeFinal = `${nomeFinal}.${resFound}`;
        }

        const sizeFound = contextoDescricao.match(/(\d+(?:\.\d+)?\s*(?:gb|mb))/i)?.[0];
        if (sizeFound && !/(?:gb|mb)/i.test(nomeFinal)) {
          nomeFinal = `${nomeFinal} [${sizeFound.toUpperCase()}]`;
        }

        // Se houver menção a episódio no contexto HTML e não no magnet
        const epFound = contextoDescricao.match(/(?:epis[oó]dio|ep)\.?\s*0*(\d+)/i)?.[0];
        if (epFound && !/(s\d+\s*e\d+|\d+x\d+|epis[oó]dio|ep\b)/i.test(nomeFinal)) {
          nomeFinal = `${epFound} - ${nomeFinal}`;
        }
      }

      // Constrói a lista de sources no formato oficial do Stremio
      const sources = (sanitized.trackers || []).map(tr => `tracker:${tr}`);

      streams.push({
        name: nomeFinal,
        magnet: sanitized.cleanMagnet,
        infoHash: sanitized.infoHash,
        sources: sources,
        fileIdx: 0
      });
    });

    console.log(`[PageExtractor] ${streams.length} magnet(s) extraído(s) e sanitizado(s).`);
    return streams;
  } catch (erro) {
    console.error('[PageExtractor] Erro ao extrair magnets da página:', erro.message);
    return [];
  }
}

module.exports = {
  extrairMagnetsParaStremio
};
