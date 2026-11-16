// Manifesto do Addon para Stremio
// Documentação: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md

module.exports = {
  id: 'community.dubladoveterano',
  version: '1.0.0',
  name: 'Dublado Veterano',
  description: 'Addon de streams e torrents dublados e dual áudio em português.',
  
  // Recursos que este addon fornece. 'stream' fornece fontes de reprodução para filmes e séries.
  resources: ['stream'],

  // Tipos de mídia suportados
  types: ['movie', 'series'],

  // Prefixos de ID aceitos. 'tt' indica IDs oficiais do IMDb (padrão utilizado pelo Cinemeta do Stremio).
  idPrefixes: ['tt'],

  // Catálogos: lista vazia pois este addon foca em fornecer streams para os filmes já listados no Stremio
  catalogs: [],

  // Configurações de comportamento
  behaviorHints: {
    configurable: false
  }
};
