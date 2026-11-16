require('dotenv').config();
const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const manifest = require('./src/manifest');
const streamHandler = require('./src/handlers/streamHandler');

// Inicializa o construtor do Addon com o manifesto
const builder = new addonBuilder(manifest);

// Registra o handler de streams
builder.defineStreamHandler(streamHandler);

// Porta do servidor (padrão 7000 para addons de desenvolvimento)
const PORT = process.env.PORT || 7000;

serveHTTP(builder.getInterface(), { port: PORT }).then(({ url }) => {
  console.log('====================================================');
  console.log('🚀 Addon do Stremio iniciado com sucesso!');
  console.log(`📡 URL do Manifesto: ${url}`);
  console.log('----------------------------------------------------');
  console.log('Para instalar no Stremio:');
  console.log(`1. Abra o Stremio no computador.`);
  console.log(`2. Vá na aba de pesquisa ou Addons.`);
  console.log(`3. Cole a URL no campo de busca: ${url}`);
  console.log(`4. Clique em "Install".`);
  console.log('====================================================');
}).catch((err) => {
  console.error('Erro ao iniciar o servidor do Addon:', err);
});
