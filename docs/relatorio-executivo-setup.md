# Relatório Executivo — setup do LLM

1. Criar chave grátis: https://aistudio.google.com/apikey (conta Google, sem cartão).
2. Variáveis de ambiente (Vercel → Project → Settings → Environment Variables, e `.env.local` em dev):
   - `LLM_PROVIDER=gemini`
   - `LLM_API_KEY=<a-tua-chave>`
   - `LLM_MODEL=gemini-flash-lite-latest`  ← alias que aponta sempre para a flash-lite atual; **não usar `gemini-2.5-flash-lite`** (a Google já não o dá a contas novas → 404).
   - Depois de adicionar/alterar env vars no Vercel, fazer **Redeploy** (só entram num deploy novo).
3. Sem chave/quota, a app cai automaticamente no template determinístico (parágrafo mais simples). Nunca fica partida.
4. Trocar de fornecedor (se a Google cortar o free tier): mudar `LLM_PROVIDER`/`LLM_API_KEY` no Vercel. Zero código.

**Privacidade:** o texto dos itens por fazer (elemento, sub-elemento, notas) é enviado para a API do Google. É estado de obra, sem dados pessoais sensíveis. Evitar pôr nomes/dados de pessoas no campo `notas`.
