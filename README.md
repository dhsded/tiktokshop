# Gerador de Propagandas TikTok Shop 🛍️✨

Aplicativo desktop para criar roteiros narrativos e prompts de animação para campanhas do TikTok Shop usando IA (Google Gemini).

---

## ⚡ Pré-requisitos

Antes de tudo, instale o **Node.js** (versão 18 ou superior):

👉 [Baixar Node.js (https://nodejs.org)](https://nodejs.org)

> Escolha a versão **LTS** e instale normalmente. Após instalar, **feche e reabra** o terminal.

---

## 🚀 Como Rodar

### 1. Instalar dependências (primeira vez)
```bash
npm install
```

### 2. Rodar em modo desenvolvimento (abre o app Electron)
```bash
npm run dev
```

### 3. Gerar o instalador `.exe`
```bash
npm run electron:dist
```
O instalador será gerado na pasta `dist-installer/`.

---

## 🔑 Configurar a API Key do Gemini

Crie um arquivo `.env` na raiz do projeto:
```
GEMINI_API_KEY=SUA_CHAVE_AQUI
```

Ou carregue um arquivo `.txt` com as chaves diretamente no app (botão "Carregar Chaves").

---

## 📁 Estrutura do Projeto

```
├── electron/
│   ├── main.ts        # Processo principal do Electron (janela)
│   └── preload.ts     # Bridge segura entre Electron e React
├── src/
│   ├── App.tsx        # Aplicativo React principal
│   ├── main.tsx       # Entry point do React
│   └── index.css      # Estilos globais
├── resources/
│   └── icon.png       # Ícone do aplicativo
├── electron.vite.config.ts  # Configuração do electron-vite
└── package.json
```
