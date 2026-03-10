import { config } from './config.js';

const IMAGE_TYPES = ['image', 'album'];

/**
 * Obtém o chat do grupo (por ID ou nome).
 * @param {import('whatsapp-web.js').Client} client
 * @returns {Promise<import('whatsapp-web.js').GroupChat|null>}
 */
export async function getGroupChat(client) {
  if (config.GROUP_ID && config.GROUP_ID.trim()) {
    return client.getChatById(config.GROUP_ID.trim());
  }
  if (!config.GROUP_NAME || !config.GROUP_NAME.trim()) return null;
  const chats = await client.getChats();
  const group = chats.find(
    (c) => c.isGroup && c.name.toLowerCase().includes(config.GROUP_NAME.toLowerCase())
  );
  return group || null;
}

/**
 * Coleta mensagens do grupo, ordenadas do mais antigo ao mais novo.
 * Inclui mensagens de imagem/álbum e de texto (para associar descrições).
 * Aplica filtro de data (START_DATE / END_DATE) quando definido.
 * @param {import('whatsapp-web.js').GroupChat} chat
 * @returns {Promise<import('whatsapp-web.js').Message[]>}
 */
export async function collectMessages(chat) {
  const messages = await chat.fetchMessages({ limit: config.LIMIT });
  const byType = messages.filter(
    (m) =>
      m.type === 'chat' ||
      m.type === 'image' ||
      m.type === 'album' ||
      (m.hasMedia && IMAGE_TYPES.includes(m.type))
  );
  const startTs = config.START_TS;
  const endTs = config.END_TS;
  if (startTs == null && endTs == null) return byType;
  return byType.filter((m) => {
    const t = m.timestamp;
    if (startTs != null && t < startTs) return false;
    if (endTs != null && t > endTs) return false;
    return true;
  });
}
