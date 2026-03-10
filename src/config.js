/**
 * Parseia data YYYY-MM-DD para início/fim do dia em Unix timestamp (segundos).
 * @param {string} dateStr
 * @param {'start'|'end'} mode
 * @returns {number|null}
 */
function parseDateRange(dateStr, mode) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const s = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (mode === 'start') {
    const d0 = new Date(y, m - 1, d, 0, 0, 0, 0);
    return Math.floor(d0.getTime() / 1000);
  }
  const d1 = new Date(y, m - 1, d, 23, 59, 59, 999);
  return Math.floor(d1.getTime() / 1000);
}

/**
 * Configuração do script.
 * GROUP_ID: ID do grupo WhatsApp (ex: "123456789-1234567890@g.us")
 * GROUP_NAME: alternativa - nome do grupo para buscar (se GROUP_ID não definido)
 * START_DATE / END_DATE: filtro por data (YYYY-MM-DD). Só mensagens nesse intervalo entram no catálogo.
 * Use `npm run list-groups` para obter os IDs dos grupos.
 */
export const config = {
  /** ID do grupo. Para obter: npm run list-groups */
  GROUP_ID: process.env.GROUP_ID || '',
  /** Se GROUP_ID vazio, busca por este nome (case-insensitive) */
  GROUP_NAME: process.env.GROUP_NAME || '',
  /** Limite de mensagens a buscar (use Infinity para todas) */
  LIMIT: parseInt(process.env.LIMIT || '500', 10),
  /** Pasta de saída do catálogo */
  OUTPUT_DIR: process.env.OUTPUT_DIR || 'output',
  /** Filtro: só mensagens a partir desta data (YYYY-MM-DD). Opcional. */
  START_DATE: process.env.START_DATE || '',
  /** Filtro: só mensagens até esta data (YYYY-MM-DD). Opcional. */
  END_DATE: process.env.END_DATE || '',
  /** Timestamp Unix (s) início do intervalo. Preenchido a partir de START_DATE. */
  get START_TS() {
    return parseDateRange(config.START_DATE, 'start');
  },
  /** Timestamp Unix (s) fim do intervalo. Preenchido a partir de END_DATE. */
  get END_TS() {
    return parseDateRange(config.END_DATE, 'end');
  },
};
