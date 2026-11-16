const cheerio = require('cheerio');
const axios = require('axios');
const { extrairMagnetsParaStremio } = require('./pageExtractor');

/**
 * Módulo Provedor Dinâmico (Opção 2: Busca + Extração Automática)
 */

// URL base do site de destino (definida no arquivo .env ou diretamente aqui)
const TARGET_SITE_URL = process.env.TARGET_SITE_URL || 'https://exemplo.com';

// Padrões de URLs que não são posts de filmes/séries (categorias, tags, paginação)
const IGNORED_URL_PATTERNS = [
  /\/category\//i,
  /\/categoria\//i,
  /\/tag\//i,
  /\/author\//i,
  /\/autor\//i,
  /\/page\//i,
  /\/feed\//i,
  /#/
];

/**
 * Normaliza um texto removendo acentos, pontuação e múltiplos espaços.
 */
function normalizeText(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Stop words para relevância (palavras comuns ignoradas na pontuação)
const STOP_WORDS = new Set([
  'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'e',
  'the', 'of', 'and', 'in', 'on', 'at', 'to', 'for', 'with', 'a', 'an'
]);

/**
 * Verifica se o título do post ou slug da URL é relevante para a mídia buscada.
 */
function isPostTitleRelevant(postTitle, postUrl, queryTitle) {
  const normQuery = normalizeText(queryTitle);
  const normPost = `${normalizeText(postTitle)} ${normalizeText(postUrl)}`;

  // Rejeita explicitamente posts de listões, coletâneas gerais ou pacotões
  if (/(listao|coletanea|pack de filmes|todos os filmes|maratona)/i.test(normPost) && !/(listao|coletanea)/i.test(normQuery)) {
    return false;
  }

  const queryTokens = normQuery
    .split(' ')
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));

  if (queryTokens.length === 0) return true;

  let matches = 0;
  for (const token of queryTokens) {
    if (normPost.includes(token)) {
      matches++;
    }
  }

  // Para 1 ou 2 palavras-chave, exige que todas estejam presentes
  // Para 3 ou mais, exige pelo menos 70% de correspondência
  if (queryTokens.length <= 2) {
    return matches === queryTokens.length;
  } else {
    return (matches / queryTokens.length) >= 0.7;
  }
}

/**
 * Constrói termos de busca otimizados para filmes e séries.
 */
function buildSearchQueries({ title, year, season, episode, isSeries }) {
  const cleanTitle = title.replace(/[:!?]/g, '').trim();
  const queries = [];

  if (isSeries && season !== null && episode !== null) {
    const s = String(season).padStart(2, '0');
    const e = String(episode).padStart(2, '0');
    // Ex: "Rick and Morty S09E01"
    queries.push(`${cleanTitle} S${s}E${e}`);
    // Ex: "Rick and Morty S09" (muitos sites têm posts com a temporada inteira)
    queries.push(`${cleanTitle} S${s}`);
    queries.push(`${cleanTitle} ${season}ª Temporada`);
    queries.push(cleanTitle);
  } else {
    // Para filmes: "Nome 2024" e apenas "Nome"
    if (year) {
      queries.push(`${cleanTitle} ${year}`);
    }
    queries.push(cleanTitle);
  }

  return queries;
}

/**
 * Verifica se o nome do release corresponde à temporada e episódio solicitados.
 */
function isMatchingEpisode(title, season, episode) {
  if (!season || !episode) return true;

  const sNum = parseInt(season, 10);
  const eNum = parseInt(episode, 10);

  // 1. Padrões com Temporada e Episódio explícitos (ex: S09E01, 9x01, S09 E01)
  const seMatch = title.match(/s(\d+)\s*e(\d+)|\b(\d+)x(\d+)\b/i);
  if (seMatch) {
    const s = parseInt(seMatch[1] || seMatch[3], 10);
    const e = parseInt(seMatch[2] || seMatch[4], 10);
    return s === sNum && e === eNum;
  }

  // 2. Padrões com Episódio isolado (ex: "Episódio 01", "Ep. 01", "E01")
  const epMatch = title.match(/(?:epis[oó]dio|ep)\.?\s*0*(\d+)\b|\bE0*(\d{1,3})\b/i);
  if (epMatch) {
    const e = parseInt(epMatch[1] || epMatch[2], 10);
    const seasonMatch = title.match(/(?:temporada|temp|s)\.?\s*0*(\d+)\b/i);
    if (seasonMatch) {
      const s = parseInt(seasonMatch[1], 10);
      return s === sNum && e === eNum;
    }
    return e === eNum;
  }

  // 3. Caso de Temporada Completa (Season Pack, ex: 'Fallout.S01...', 'Temporada 1')
  // Não tem episódio individual especificado, portanto contém todos os episódios daquela temporada
  const seasonOnlyMatch = title.match(/(?:temporada|temp)\s*0*(\d+)|\bS0*(\d+)\b/i);
  if (seasonOnlyMatch) {
    const s = parseInt(seasonOnlyMatch[1] || seasonOnlyMatch[2], 10);
    return s === sNum;
  }

  return true;
}

/**
 * Busca posts no site alvo usando Cheerio para encontrar os links dos posts.
 */
async function buscarPostsNoSite(termo, baseUrl) {
  try {
    const searchUrl = `${baseUrl.replace(/\/$/, '')}/?s=${encodeURIComponent(termo)}`;
    console.log(`[Provider] Buscando página de resultados: ${searchUrl}`);

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 10000
    });

    const html = typeof response.data === 'string' ? response.data : '';
    const $ = cheerio.load(html);
    const posts = [];

    let baseHost = '';
    try {
      baseHost = new URL(baseUrl).hostname;
    } catch (_) {}

    // Seletores CSS comuns para títulos/links de posts
    const selectors = [
      'article h2 a',
      '.post h2 a',
      '.entry-title a',
      'h2.title a',
      '.capa-conteudo a',
      'h2 a',
      'article a'
    ];

    $(selectors.join(', ')).each((i, el) => {
      let href = $(el).attr('href');
      const title = $(el).text().trim() || $(el).attr('title') || '';

      if (!href) return;

      // Normaliza links relativos
      if (href.startsWith('/')) {
        href = `${baseUrl.replace(/\/$/, '')}${href}`;
      }

      // Só aceita links do próprio site (evita imdb.com, youtube.com, etc.)
      if (href.startsWith('http') && (!baseHost || href.includes(baseHost))) {
        const isIgnored = IGNORED_URL_PATTERNS.some(p => p.test(href));
        const alreadyAdded = posts.some(p => p.url === href);

        if (!isIgnored && !alreadyAdded) {
          posts.push({ title, url: href });
        }
      }
    });

    console.log(`[Provider] Encontrados ${posts.length} post(s) válidos para "${termo}".`);
    return posts;
  } catch (err) {
    console.error(`[Provider] Erro ao buscar posts:`, err.message);
    return [];
  }
}

/**
 * Busca torrents dinamicamente conectando a busca do site com o extrator de páginas.
 */
async function searchTorrents({ title, year, season, episode, isSeries }) {
  const queries = buildSearchQueries({ title, year, season, episode, isSeries });
  console.log(`[Provider] Termos de busca gerados:`, queries);

  // Se o site configurado ainda for o de exemplo, retorna dados de demonstração
  if (TARGET_SITE_URL.includes('exemplo.com')) {
    console.log('[Provider] 💡 Dica: Configure a URL do site no arquivo .env (TARGET_SITE_URL).');
    
    if (/rick.*morty/i.test(title)) {
      return [
        {
          name: `Rick.and.Morty.S09E01.REPACK.1080p.WEB-DL.DUAL.5.1`,
          magnet: `magnet:?xt=urn:btih:aaf2a00e49d6e3d9e46976c94fe1b6f83b33a321&dn=Rick.and.Morty.S09E01.REPACK.1080p.WEB-DL.DUAL.5.1&tr=udp://tracker.opentrackr.org:1337/announce`,
          fileIdx: 0
        }
      ];
    }
    return [];
  }

  try {
    const allStreams = [];

    // Tenta os termos de busca em ordem de especificidade
    for (const query of queries) {
      const posts = await buscarPostsNoSite(query, TARGET_SITE_URL);

      // FILTRO 1: Seleciona apenas os posts que realmente correspondem ao título da mídia buscada
      const postsRelevantes = posts.filter(post => 
        isPostTitleRelevant(post.title, post.url, title)
      );

      console.log(`[Provider] Posts relevantes após filtro de título: ${postsRelevantes.length} de ${posts.length}`);

      if (postsRelevantes.length > 0) {
        // Pega no máximo os 2 primeiros posts relevantes
        const postsParaExtrair = postsRelevantes.slice(0, 2);

        for (const post of postsParaExtrair) {
          console.log(`[Provider] Extraindo magnets do post: "${post.title}" (${post.url})`);
          let streamsDoPost = await extrairMagnetsParaStremio(post.url);

          // FILTRO 2 (SÉRIES): Filtra estritamente pelo episódio solicitado
          if (isSeries && season !== null && episode !== null) {
            const totalAntes = streamsDoPost.length;
            streamsDoPost = streamsDoPost.filter(stream => {
              return isMatchingEpisode(stream.name, season, episode);
            });
            console.log(`[Provider] Filtro de Episódio (S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}): mantidos ${streamsDoPost.length} de ${totalAntes} magnet(s).`);
          }

          // FILTRO 3 (FILMES): Garante que os magnets pertençam ao filme buscado (evita listões com centenas de outros filmes)
          if (!isSeries && streamsDoPost.length > 0) {
            const totalAntes = streamsDoPost.length;
            streamsDoPost = streamsDoPost.filter(stream => {
              return isPostTitleRelevant(stream.name, '', title);
            });
            if (streamsDoPost.length !== totalAntes) {
              console.log(`[Provider] Filtro de Filme ("${title}"): mantidos ${streamsDoPost.length} de ${totalAntes} magnet(s).`);
            }
          }

          allStreams.push(...streamsDoPost);
        }

        // Se já encontrou streams correspondentes, encerra a busca pelos outros termos
        if (allStreams.length > 0) {
          break;
        }
      }
    }

    return allStreams;
  } catch (error) {
    console.error(`[Provider] Erro no fluxo dinâmico:`, error.message);
    return [];
  }
}

module.exports = {
  searchTorrents,
  buscarPostsNoSite,
  buildSearchQueries,
  isMatchingEpisode,
  isPostTitleRelevant,
  normalizeText
};
