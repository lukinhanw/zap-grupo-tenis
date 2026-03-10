const IMAGE_TYPES = ['image', 'album'];
const MAX_PROXIMITY_MS = 2 * 60 * 1000; // 2 min para associar texto à mídia

const RE_SIZE = /Dispon[ií]vel\s*(\d+)\s*ao\s*(\d+)/i;
const RE_PRICE = /R[s$]\.?\s*([\d,]+(?:\.[\d]{2})?)\s*atacado/i;

const DELETED = /mensagem\s*apagada/i;
const EMOJI = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}✅✔️✓]/gu;

/**
 * Extrai nome, tamanhos e preço do texto da mensagem.
 * @param {string} text
 * @returns {{ name: string, sizes: { min: number, max: number } | null, price: string | null }}
 */
function parseProductText(text) {
  const cleaned = (text || '').replace(EMOJI, '').trim();
  if (!cleaned || DELETED.test(cleaned)) {
    return { name: 'Produto sem descrição', sizes: null, price: null };
  }

  const sizesMatch = cleaned.match(RE_SIZE);
  const priceMatch = cleaned.match(RE_PRICE);
  const sizes = sizesMatch
    ? { min: parseInt(sizesMatch[1], 10), max: parseInt(sizesMatch[2], 10) }
    : null;
  const price = priceMatch ? priceMatch[1].replace(',', '.') : null;

  // Nome: primeira linha útil (não só "Disponível..." nem só "Rs...")
  const lines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let name = 'Produto sem descrição';
  for (const line of lines) {
    if (!RE_SIZE.test(line) && !RE_PRICE.test(line) && line.length > 1) {
      name = line;
      break;
    }
  }

  return { name, sizes, price };
}

/**
 * Agrupa mensagens em blocos de produto: sequência de mídias do mesmo autor + texto associado.
 * @param {import('whatsapp-web.js').Message[]} messages
 * @returns {Array<{ messages: import('whatsapp-web.js').Message[], text: string }>}
 */
export function parseToProductBlocks(messages) {
  const blocks = [];
  let i = 0;

  while (i < messages.length) {
    const msg = messages[i];
    if (!msg.hasMedia || !IMAGE_TYPES.includes(msg.type)) {
      i++;
      continue;
    }

    const author = msg.author || msg.from;
    const mediaMessages = [];

    // Coletar sequência de mídias do mesmo autor
    while (i < messages.length) {
      const m = messages[i];
      const mAuthor = m.author || m.from;
      if (!m.hasMedia || !IMAGE_TYPES.includes(m.type)) break;
      if (mAuthor !== author) break;
      mediaMessages.push(m);
      i++;
    }

    if (mediaMessages.length === 0) continue;

    // Texto: caption da última mídia ou próxima mensagem de texto do mesmo autor
    let text = '';
    const lastMedia = mediaMessages[mediaMessages.length - 1];
    if (lastMedia.body && !DELETED.test(lastMedia.body)) {
      text = lastMedia.body;
    } else {
      // Próxima mensagem de texto do mesmo autor em até 2 min
      const lastTs = lastMedia.timestamp * 1000;
      for (let j = i; j < messages.length; j++) {
        const next = messages[j];
        if (next.type !== 'chat' || next.hasMedia) continue;
        const nextAuthor = next.author || next.from;
        if (nextAuthor !== author) continue;
        if (next.timestamp * 1000 - lastTs > MAX_PROXIMITY_MS) break;
        text = next.body || '';
        i = j + 1; // consumir a mensagem de texto
        break;
      }
    }

    blocks.push({ messages: mediaMessages, text });
  }

  return blocks;
}

/**
 * Converte blocos em produtos estruturados (nome, sizes, price, messages para download).
 * @param {Array<{ messages: import('whatsapp-web.js').Message[], text: string }>} blocks
 * @returns {Array<{ name: string, sizes: { min: number, max: number } | null, price: string | null, messages: import('whatsapp-web.js').Message[] }>}
 */
export function blocksToProducts(blocks) {
  return blocks.map(({ messages, text }) => {
    const { name, sizes, price } = parseProductText(text);
    return { name, sizes, price, messages };
  });
}
