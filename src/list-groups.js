import fs from 'fs';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

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
  console.log('Escaneie o QR para listar grupos');
});

client.on('ready', async () => {
  const chats = await client.getChats();
  const groups = chats.filter((c) => c.isGroup);
  console.log('\nGrupos disponíveis:\n');
  for (const g of groups) {
    const idStr = typeof g.id === 'string' ? g.id : g.id?._serialized || g.id;
    console.log(`  ${g.name}`);
    console.log(`    ID: ${idStr}`);
  }
  process.exit(0);
});

client.on('auth_failure', (msg) => {
  console.error('Falha de autenticação:', msg);
  process.exit(1);
});

client.initialize();
