const axios = require('axios');

/**
 * Faz o parse do ID enviado pelo Stremio.
 * 
 * Exemplos de IDs recebidos:
 * - Filme: "tt0111161"
 * - Série: "tt0944947:1:1" (imdbId:temporada:episódio)
 */
function parseStreamId(rawId) {
  if (!rawId || typeof rawId !== 'string') {
    return null;
  }

  const parts = rawId.split(':');
  const imdbId = parts[0];

  if (parts.length === 3) {
    return {
      imdbId,
      season: parseInt(parts[1], 10),
      episode: parseInt(parts[2], 10),
      isSeries: true
    };
  }

  return {
    imdbId,
    season: null,
    episode: null,
    isSeries: false
  };
}

/**
 * Consulta a API pública do Cinemeta (usada pelo próprio Stremio)
 * para obter os metadados oficiais a partir do IMDb ID.
 */
async function fetchMetadata(type, imdbId) {
  try {
    const url = `https://v3-cinemeta.strem.io/meta/${type}/${imdbId}.json`;
    const response = await axios.get(url, { timeout: 5000 });
    
    if (response.data && response.data.meta) {
      const meta = response.data.meta;
      return {
        title: meta.name,
        year: meta.year,
        type: meta.type
      };
    }
    return null;
  } catch (error) {
    console.warn(`[Metadata] Não foi possível consultar Cinemeta para ${imdbId}:`, error.message);
    return null;
  }
}

module.exports = {
  parseStreamId,
  fetchMetadata
};
