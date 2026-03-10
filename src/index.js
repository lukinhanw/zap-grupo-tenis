import fs from 'fs';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { config } from './config.js';
import { getGroupChat, collectMessages } from './collector.js';
import { parseToProductBlocks, blocksToProducts } from './parser.js';
import { exportCatalog } from './exporter.js';

// WSL2/Linux: usar Chrome do sistema evita libnspr4 etc.
const CHROME_PATHS = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
const executablePath = CHROME_PATHS.find((p) => fs.existsSync(p));

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './wwebjs_auth' }),
  puppeteer: {
    ...(executablePath && { executablePath }),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    protocolTimeout: 120000, // 2 min (WSL2/slow env)
  },
});

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
  console.log('Escaneie o QR com WhatsApp > Dispositivos conectados');
});

client.on('ready', async () => {
  console.log('Client pronto');
  const chat = await getGroupChat(client);
  if (!chat) {
    console.error('Grupo não encontrado. Defina GROUP_ID ou GROUP_NAME em .env ou config.');
    process.exit(1);
  }
  console.log(`Grupo: ${chat.name}`);
  if (config.START_DATE || config.END_DATE) {
    console.log(`Filtro de data: ${config.START_DATE || '(início)'} a ${config.END_DATE || '(hoje)'}`);
  }

  const messages = await collectMessages(chat);
  console.log(`${messages.length} mensagens coletadas`);

  const blocks = parseToProductBlocks(messages);
  const products = blocksToProducts(blocks);
  console.log(`${products.length} produtos identificados`);

  await exportCatalog(products);
  process.exit(0);
});

client.on('auth_failure', (msg) => {
  console.error('Falha de autenticação:', msg);
  process.exit(1);
});

client.initialize();
