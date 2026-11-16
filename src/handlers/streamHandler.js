const cheerio = require('cheerio');
const { parseStreamId, fetchMetadata } = require('../utils/metadata');
const { sanitizeMagnet } = require('../utils/sanitizer');
const { searchTorrents } = require('../providers/customProvider');

/**
 * Decodifica entidades HTML em títulos (ex: &ccedil; -> ç, &atilde; -> ã).
 */
function cleanHtmlEntities(str) {
  if (!str || !str.includes('&')) return str;
  try {
    return cheerio.load('<textarea>' + str + '</textarea>')('textarea').text();
  } catch (_) {
    return str;
  }
}

/**
 * Detecta resolução, idiomas (bandeiras) e canais de áudio a partir do nome do release.
 */
function detectAudioAndFlags(releaseName) {
  const name = releaseName || '';
  const isDual = /dual/i.test(name);
  const isDublado = /dublado|nacional/i.test(name);
  const isLegendado = /legendado|subpack|subbed/i.test(name);

  // Define as bandeirinhas e etiqueta de áudio
  let langBadge = '🇧🇷 Dublado';
  if (isDual) {
    langBadge = '🇧🇷 🇺🇸 Dual Áudio';
  } else if (isDublado) {
    langBadge = '🇧🇷 Dublado';
  } else if (isLegendado) {
    langBadge = '🇺🇸 💬 Legendado';
  }

  // Detecta Resolução (4K / 1080p / 720p)
  const resMatch = name.match(/2160p|4k|1080p|720p|480p/i);
  let resolution = '1080p';
  if (resMatch) {
    const lower = resMatch[0].toLowerCase();
    resolution = (lower === '4k' || lower === '2160p') ? '4K' : lower;
  }

  // Detecta canais de áudio (5.1, 7.1)
  const audioChannels = name.match(/5\.1|7\.1/)?.[0];
  const audioPart = audioChannels ? ` | 🔊 ${audioChannels}` : '';

  // Detecta tipo de fonte (WEB-DL, BluRay, HDR, etc.)
  const sourceMatch = name.match(/web-dl|bluray|webrip|hdtv|remux/i);
  const sourcePart = sourceMatch ? ` | 🎞️ ${sourceMatch[0].toUpperCase()}` : '';

  // Detecta tamanho (ex: 11.58 GB, 2.55 GB, 30.05 GB)
  const sizeMatch = name.match(/(\d+(?:\.\d+)?\s*(?:gb|mb))/i);
  const sizePart = sizeMatch ? ` | 💾 ${sizeMatch[0].toUpperCase()}` : '';

  return {
    resolution,
    langBadge,
    details: `${langBadge}${audioPart}${sourcePart}${sizePart}`
  };
}

/**
 * Handler responsável por responder à requisição de streams do Stremio de forma dinâmica.
 * 
 * @param {object} args
 * @param {string} args.type - 'movie' ou 'series'
 * @param {string} args.id - Ex: 'tt1234567' ou 'tt1234567:1:1'
 * @returns {Promise<{ streams: Array }>}
 */
async function streamHandler({ type, id }) {
  console.log(`[StreamHandler] Requisição recebida -> Tipo: ${type}, ID: ${id}`);

  const parsed = parseStreamId(id);
  if (!parsed) {
    return { streams: [] };
  }

  // 1. Resolução de Metadados (obtém título e ano a partir do IMDb ID)
  const meta = await fetchMetadata(type, parsed.imdbId);
  const mediaTitle = meta ? meta.title : '';
  const mediaYear = meta ? meta.year : '';

  if (!mediaTitle) {
    console.warn(`[StreamHandler] Metadados não encontrados para ${id}`);
    return { streams: [] };
  }

  console.log(`[StreamHandler] Mídia identificada: "${mediaTitle}" (${mediaYear})`);

  // 2. Busca dinâmica através do Provider
  const torrentsEncontrados = await searchTorrents({
    title: mediaTitle,
    year: mediaYear,
    season: parsed.season,
    episode: parsed.episode,
    isSeries: parsed.isSeries
  });

  // 3. Sanitiza cada magnet encontrado e constrói a lista de streams
  const streams = [];

  for (const item of torrentsEncontrados) {
    const sanitized = sanitizeMagnet(item.magnet);
    if (!sanitized) continue;

    const rawReleaseName = sanitized.displayName || item.name || mediaTitle;
    const releaseName = cleanHtmlEntities(rawReleaseName);
    const info = detectAudioAndFlags(releaseName);
    const sources = item.sources || (sanitized.trackers || []).map(tr => `tracker:${tr}`);

    streams.push({
      name: `Dublado Veterano\n${info.resolution}`,
      title: `${releaseName}\n${info.details}`,
      infoHash: sanitized.infoHash,
      sources: sources,
      fileIdx: item.fileIdx !== undefined ? item.fileIdx : 0
    });
  }

  console.log(`[StreamHandler] Retornando ${streams.length} stream(s) para "${mediaTitle}"`);
  return { streams };
}

module.exports = streamHandler;
