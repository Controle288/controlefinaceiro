<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/2d4095f7-f998-4edb-b436-4643b4c16a49

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Como subir para o Vercel

Para hospedar este projeto no Vercel, siga os passos abaixo:

1. **Importe o projeto** no seu Dashboard do Vercel.
2. Na seção **Build & Development Settings**, altere o **Root Directory** para `controlefinaceiro`.
3. Configure as **Environment Variables** (Variáveis de Ambiente) com os valores do seu projeto:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
4. Clique em **Deploy**.

O arquivo `vercel.json` incluído cuidará das rotas, garantindo que a aplicação funcione corretamente como uma Single Page Application (SPA).
