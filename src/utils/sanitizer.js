/**
 * Utilitário de sanitização de links magnéticos (Magnet Links).
 *
 * Links magnéticos de vários sites costumam conter rastreadores inválidos,
 * parâmetros de publicidade ou anúncios no nome do arquivo (dn).
 */

// Lista de trackers públicos conhecidos e confiáveis (OpenTrackers)
const DEFAULT_PUBLIC_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://explodie.org:6969/announce',
  'udp://tracker.openbittorrent.com:6969/announce'
];

// Palavras-chave ou padrões comuns de anúncios para remover do nome (dn)
const AD_PATTERNS = [
  /www\.[a-z0-9\-]+\.[a-z]{2,}/gi,   // URLs como www.exemplo.com
  /@[a-z0-9_]+/gi,                   // Menções de canais como @canal
  /\[\s*site[a-z0-9\-.]*\s*\]/gi      // Tags como [site.com]
];

/**
 * Sanitiza um link magnético bruto.
 * 
 * @param {string} rawMagnet - O link magnet bruto (ex: magnet:?xt=urn:btih:...)
 * @param {object} options
 * @param {boolean} options.replaceWithDefaultTrackers - Se verdadeiro, descarta os trackers do link e injeta a lista confiável
 * @returns {object|null} Retorna { infoHash, cleanMagnet, displayName } ou null se o link for inválido
 */
function sanitizeMagnet(rawMagnet, options = { replaceWithDefaultTrackers: true }) {
  if (!rawMagnet || typeof rawMagnet !== 'string' || !rawMagnet.startsWith('magnet:?')) {
    return null;
  }

  try {
    // Normaliza entidades HTML (&amp;) e converte para URL padrão
    const cleanRaw = rawMagnet.replace(/&amp;/g, '&');
    const parsedUrl = new URL(cleanRaw.replace('magnet:?', 'http://localhost/?'));
    const params = parsedUrl.searchParams;

    // 1. Extração do Hash essencial (urn:btih:...)
    const xt = params.get('xt');
    if (!xt) return null;

    const hashMatch = xt.match(/urn:btih:([a-zA-Z0-9]+)/i);
    if (!hashMatch) return null;

    const rawHash = hashMatch[1];
    // Hash pode ser hexadecimal (40 caracteres) ou Base32 (32 caracteres)
    const infoHash = rawHash.toLowerCase();

    // 2. Limpeza do Nome de Exibição (dn)
    let dn = params.get('dn') || '';
    if (dn) {
      for (const pattern of AD_PATTERNS) {
        dn = dn.replace(pattern, '');
      }
      // Remove colchetes ou parênteses vazios que sobraram da remoção
      dn = dn.replace(/\[\s*\]|\(\s*\)/g, '');
      // Remove hífens ou pontos soltos no final
      dn = dn.replace(/[\s\-_.]+$/, '');
      dn = dn.replace(/\s+/g, ' ').trim();
    }

    // 3. Tratamento dos Trackers (tr)
    const cleanParams = new URLSearchParams();
    cleanParams.append('xt', `urn:btih:${infoHash}`);

    if (dn) {
      cleanParams.append('dn', dn);
    }

    let activeTrackers = DEFAULT_PUBLIC_TRACKERS;

    if (options.replaceWithDefaultTrackers) {
      // Injeta apenas a lista confiável
      DEFAULT_PUBLIC_TRACKERS.forEach(tr => cleanParams.append('tr', tr));
    } else {
      // Filtra os trackers existentes removendo os que contêm termos suspeitos
      const existingTrackers = params.getAll('tr');
      const filteredTrackers = existingTrackers.filter(tr => {
        const isUrl = /^((udp|http|https|wss):\/\/)/i.test(tr);
        const hasAdWord = /(anuncio|propaganda|adserver|banner|click)/i.test(tr);
        return isUrl && !hasAdWord;
      });

      activeTrackers = filteredTrackers.length > 0 ? filteredTrackers : DEFAULT_PUBLIC_TRACKERS;
      activeTrackers.forEach(tr => cleanParams.append('tr', tr));
    }

    return {
      infoHash,
      displayName: dn || null,
      cleanMagnet: `magnet:?${cleanParams.toString()}`,
      trackers: activeTrackers
    };
  } catch (error) {
    console.error('Falha ao sanitizar magnet link:', error.message);
    return null;
  }
}

module.exports = {
  sanitizeMagnet,
  DEFAULT_PUBLIC_TRACKERS
};
