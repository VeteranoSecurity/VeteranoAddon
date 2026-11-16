const { sanitizeMagnet } = require('./src/utils/sanitizer');

console.log('--- Testando Sanitização de Magnet Link ---');

const dirtyMagnet = 'magnet:?xt=urn:btih:4b4860b7194f4a362f68bc1ab6be272fef6372ec&dn=Filme+Exemplo+1080p+[www.propaganda-site.com]&tr=http://adserver.ru/announce&tr=udp://tracker.opentrackr.org:1337/announce&ad_id=987654';

console.log('Original:\n', dirtyMagnet);

const result = Object.assign({}, sanitizeMagnet(dirtyMagnet));
console.log('\nResultado da Sanitização:');
console.log('- InfoHash:', result.infoHash);
console.log('- Nome Limpo (dn):', result.displayName);
console.log('- Magnet Limpo:\n ', result.cleanMagnet);

console.log('\n--- Teste concluído com sucesso! ---');
