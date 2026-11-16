# Dublado Veterano - Stremio Addon

Addon dinâmico para **Stremio** focado em conteúdos dublados e dual áudio em português, desenvolvido em **Node.js** utilizando o **`stremio-addon-sdk`** oficial.

O addon realiza a resolução de metadados, busca automatizada no site configurado, raspagem com Cheerio, sanitização de links magnéticos e entrega os streams perfeitamente categorizados com bandeirinhas e tags de áudio no Stremio.

---

## ⚡ Principais Recursos

- **Busca Dinâmica Automatizada**: Converte o IMDb ID em buscas assertivas por título, ano, temporada e episódio.
- **Sanitização de Magnets**: Remove rastreadores de spam e publicidade dos links magnéticos, injetando OpenTrackers públicos de alta performance e gerando o array `sources` para conexão rápida a seeders.
- **Filtro Estrito de Episódios**: Ao selecionar o Episódio 1, apenas as fontes do Episódio 1 são exibidas.
- **Suporte a Season Packs**: Suporta torrents que contêm a temporada completa (`S01`, `1ª Temporada`), associando-os corretamente aos episódios daquela temporada.
- **Filtro Anti-Falsos Positivos**: Ignora links de menus, categorias, links externos (como IMDb) e rejeita páginas do tipo "listão/coletânea" para trazer apenas a mídia solicitada.
- **Badges Visuais**: Detecta e exibe tags organizadas no player:
  - Idiomas: `🇧🇷 Dublado`, `🇧🇷 🇺🇸 Dual Áudio`, `🇺🇸 💬 Legendado`
  - Resolução: `4K`, `1080p`, `720p`
  - Áudio: `🔊 5.1`, `🔊 7.1`
  - Formato e Tamanho: `🎞️ WEB-DL`, `💾 11.58 GB`

---

## 📁 Estrutura do Projeto

```text
VeteranoAddon/
├── .env.example                 # Exemplo de variáveis de ambiente
├── .gitignore                   # Arquivos ignorados pelo Git (node_modules, .env)
├── index.js                     # Ponto de entrada: servidor HTTP do Addon
├── package.json                 # Dependências e scripts
├── README.md                    # Documentação do projeto
├── test-sanitizer.js            # Teste unitário de sanitização de links
├── test-extractor.js            # Teste unitário do extrator Cheerio
└── src/
    ├── manifest.js              # Manifesto do Addon (nome, ID, recursos)
    ├── handlers/
    │   └── streamHandler.js     # Monta os cards e coordena a resposta do Stremio
    ├── providers/
    │   ├── customProvider.js    # Motor de busca, filtros de relevância e episódios
    │   └── pageExtractor.js     # Extrator de botões e links magnéticos via Cheerio
    └── utils/
        ├── metadata.js          # Resolução de IDs (IMDb) via Cinemeta
        └── sanitizer.js         # Sanitizador de Magnet Links e Trackers
```

---

## ⚙️ Pré-requisitos e Configuração

- **Node.js** >= 18.x
- **NPM** instalado

1. Clone o repositório:
   ```bash
   git clone https://github.com/VeteranoSecurity/VeteranoAddon.git
   cd VeteranoAddon
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure o arquivo `.env`:
   ```bash
   cp .env.example .env
   ```
   Abra o arquivo `.env` e configure a URL base do site de busca:
   ```env
   TARGET_SITE_URL=https://seusite.com
   PORT=7000
   ```

---

## 🚀 Execução Local

Para iniciar o servidor:
```bash
npm start
```
Ou em modo desenvolvimento com auto-reload:
```bash
npm run dev
```

O manifesto estará acessível em:
`http://localhost:7000/manifest.json`

---

## ☁️ Como Subir para uma Máquina Virtual (Linux / VPS)

### 1. Na sua VM (Ubuntu/Debian via SSH):

Atualize os pacotes e certifique-se de que o Node.js e Git estão instalados:
```bash
sudo apt update && sudo apt install -y git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Baixar o projeto:
```bash
cd /opt
sudo git clone https://github.com/VeteranoSecurity/VeteranoAddon.git
cd VeteranoAddon
sudo npm install
```

### 3. Criar o `.env` na VM:
```bash
sudo cp .env.example .env
sudo nano .env
```
*(Coloque a sua `TARGET_SITE_URL` e salve com `Ctrl + O`, `Enter` e `Ctrl + X`).*

### 4. Manter rodando 24/7 com PM2:
```bash
sudo npm install -g pm2
pm2 start index.js --name "veterano-addon"
pm2 startup
pm2 save
```

### 5. Liberar a porta no Firewall (UFW):
```bash
sudo ufw allow 7000/tcp
```

---

## 📲 Qual URL colocar no Stremio?

A URL que você insere na barra de pesquisa de Addons do Stremio é sempre a URL que aponta diretamente para o **`manifest.json`**:

### Cenário A: Rodando direto no IP da VM
Se você liberou a porta 7000 no firewall da sua VM:
```text
http://SEU_IP_PUBLICO:7000/manifest.json
```
*(Exemplo: `http://123.45.67.89:7000/manifest.json`)*

> [!NOTE]
> O aplicativo do Stremio no computador aceita URLs `http://`. No entanto, aplicativos em **Smart TVs, Fire Stick e Stremio Web** exigem conexões **HTTPS**.

### Cenário B: Rodando com Domínio e HTTPS (Recomendado para TVs)
Se você apontar um subdomínio para a sua VM e usar um proxy reverso (Nginx + Certbot/Let's Encrypt ou Cloudflare Tunnel):
```text
https://addon.seudominio.com/manifest.json
```

---

## 🧪 Testes

Para validar a integridade dos módulos sem precisar abrir o Stremio:
- Testar limpeza de trackers: `node test-sanitizer.js`
- Testar extração Cheerio: `node test-extractor.js`
