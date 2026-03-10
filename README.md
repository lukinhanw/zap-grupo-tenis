# Zap Repicker

Extrai produtos (imagem + nome, tamanhos, preço) de um grupo WhatsApp e gera um catálogo web estático e responsivo.

**Requisitos:** Node 18+

## O que o script faz

- Conecta ao WhatsApp Web (QR na primeira vez; sessão salva em `wwebjs_auth/`)
- Busca mensagens do grupo (imagens + texto no padrão "Disponível X ao Y", "Rs XX atacado")
- Agrupa imagens com a descrição correspondente e gera `output/catalog.json` + `output/assets/` (fotos)
- Gera `output/index.html`: grid de cards, lightbox ao clicar na foto, swipe no mobile, filtro opcional por data

## Uso

1. **Instalar**
   ```bash
   npm install
   ```

2. **Primeira vez: escanear QR**  
   Rode `npm run list-groups` ou `npm run collect`. Escaneie o QR com WhatsApp > Dispositivos conectados.

3. **Descobrir o ID do grupo**
   ```bash
   npm run list-groups
   ```
   Copie o `ID` do grupo (ex.: `123456789-1234567890@g.us`).

4. **Gerar o catálogo**
   ```bash
   GROUP_ID="123456789-1234567890@g.us" npm run collect
   ```
   Ou por nome do grupo:
   ```bash
   GROUP_NAME="DARADJI" npm run collect
   ```
   Com filtro por período (só mensagens entre as datas):
   ```bash
   START_DATE=2025-01-01 END_DATE=2025-03-09 GROUP_ID="..." npm run collect
   ```

5. **Ver o catálogo**  
   Abra `output/index.html` no navegador ou use `npx serve output`.

## Configuração (variáveis de ambiente)

| Variável     | Descrição                                      | Padrão   |
|-------------|--------------------------------------------------|----------|
| GROUP_ID    | ID do grupo WhatsApp                            | -        |
| GROUP_NAME  | Nome (parcial) do grupo, se GROUP_ID não for usado | -     |
| LIMIT       | Quantidade máxima de mensagens a buscar         | 500      |
| OUTPUT_DIR  | Pasta onde são gerados o HTML e os assets      | output   |
| START_DATE  | Só mensagens a partir desta data (YYYY-MM-DD)  | -        |
| END_DATE    | Só mensagens até esta data (YYYY-MM-DD)        | -        |

## WSL2 / Linux

Se der erro de `libnspr4` ou ao abrir o Chrome:

- Instale as dependências do Chromium, por exemplo:
  ```bash
  sudo apt-get install -y libnss3 libnspr4 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2
  ```
- Ou instale o Chromium e use o binário do sistema:
  ```bash
  sudo apt install chromium-browser
  ```
  O script tenta usar `/usr/bin/google-chrome`, `/usr/bin/chromium` ou `/usr/bin/chromium-browser` automaticamente.

## Estrutura gerada

```
output/
  index.html    # Catálogo (abrir no navegador)
  catalog.json  # Dados dos produtos
  assets/       # Imagens (product_0_0.jpeg, ...)
```
