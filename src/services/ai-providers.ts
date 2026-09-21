import { GoogleGenAI } from "@google/genai";

export type AIProviderId = 'gemini' | 'groq' | 'openrouter';

export interface AIContentPart {
  text?: string;
  inlineData?: {
    data: string; // Base64 sem prefixo data:image/...
    mimeType: string;
  };
}

export interface UnifiedAIOptions {
  prompt?: string;
  parts?: AIContentPart[];
  systemPrompt?: string;
  responseSchema?: any;
  provider?: AIProviderId;
  model?: string;
  onStatusUpdate?: (status: string) => void;
}

export interface UnifiedAIResult {
  text: string;
  provider: AIProviderId;
  model: string;
  failoverUsed?: boolean;
  originalProvider?: AIProviderId;
  failoverReason?: string;
  elapsedMs: number;
}

export interface ModelOption {
  id: string;
  name: string;
  tag: string;
  desc: string;
  hasVision: boolean;
  isFree: boolean;
}

export const GEMINI_MODELS: ModelOption[] = [
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash (Recomendado Google)',
    tag: 'Visão HD • Mais Rápido • Gratuito',
    desc: 'Motor de última geração do Google. Máxima velocidade com compreensão visual detalhada de produtos e roupas.',
    hasVision: true,
    isFree: true
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash (Estável)',
    tag: 'Alta Estabilidade • Gratuito',
    desc: 'Versão estável e consagrada do Gemini Flash do Google.',
    hasVision: true,
    isFree: true
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest (Automático)',
    tag: 'Sempre Atualizado • Gratuito',
    desc: 'Versão estável e sempre atualizada do Gemini Flash do Google.',
    hasVision: true,
    isFree: true
  }
];

export const GROQ_MODELS: ModelOption[] = [
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT-OSS 120B (Recomendado Groq)',
    tag: '120B Parâmetros • Ultra Rápido LPU • FREE',
    desc: 'Modelo de alta escala (120 bilhões de parâmetros) com hardware LPU da Groq. Máxima qualidade de copywriting e velocidade instantânea.',
    hasVision: false,
    isFree: true
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'GPT-OSS 20B (Ultraleve)',
    tag: '20B Parâmetros • Resposta Instantânea • FREE',
    desc: 'Modelo compacto e superveloz, ideal para gerações rápidas de roteiros e variações.',
    hasVision: false,
    isFree: true
  },
  {
    id: 'groq/compound',
    name: 'Groq Compound AI',
    tag: 'Raciocínio Avançado • Groq LPU • FREE',
    desc: 'Arquitetura composta da Groq para estruturação refinada de campanhas e storytelling comercial.',
    hasVision: false,
    isFree: true
  },
  {
    id: 'qwen/qwen3.8-27b',
    name: 'Qwen 3.8 27B (Groq)',
    tag: '27B Parâmetros • Alta Criatividade • FREE',
    desc: 'Excelente vocabulário em português para roteiros dinâmicos e ganchos de alta retenção no TikTok Shop.',
    hasVision: false,
    isFree: true
  }
];

export const OPENROUTER_MODELS: ModelOption[] = [
  {
    id: 'openrouter/free',
    name: 'OpenRouter Free Router (Auto-Select Vision)',
    tag: 'Auto-Roteador • Visão Multimodal • FREE',
    desc: 'Seleciona dinamicamente o melhor modelo gratuito disponível com suporte completo a imagens e formato JSON.',
    hasVision: true,
    isFree: true
  },
  {
    id: 'inclusionai/ling-3.0-flash-vl:free',
    name: 'Ling 3.0 Flash VL (Free)',
    tag: 'Visão HD Multimodal • Ultra Rápido • FREE',
    desc: 'Modelo avançado com visão computacional para análise visual de produtos, cores e texturas.',
    hasVision: true,
    isFree: true
  },
  {
    id: 'google/gemma-4-31b-it:free',
    name: 'Google Gemma 4 31B IT (Free)',
    tag: '31B Multimodal • Google • FREE',
    desc: 'Nova geração do Google Gemma com visão multimodal e excelente escrita em português brasileiro.',
    hasVision: true,
    isFree: true
  },
  {
    id: 'qwen/qwen3.8-27b:free',
    name: 'Qwen 3.8 27B (Free)',
    tag: '27B Multimodal • FREE',
    desc: 'Excelente compreensão visual e raciocínio para geração de scripts e prompts de vídeo.',
    hasVision: true,
    isFree: true
  },
  {
    id: 'deepseek/deepseek-v4-flash-0731:free',
    name: 'DeepSeek V4 Flash (Free)',
    tag: 'Copywriting Persuasivo • Ultra Rápido • FREE',
    desc: 'Especialista em textos comerciais persuasivos, ganchos de retenção e storytelling para TikTok.',
    hasVision: false,
    isFree: true
  }
];

export interface ProvidersConfigState {
  activeProvider: AIProviderId;
  enableFailover: boolean;
  gemini: {
    model: string;
    keys: string[];
  };
  groq: {
    model: string;
    apiKey: string;
    keys: string[];
    baseUrl: string;
  };
  openrouter: {
    model: string;
    apiKey: string;
    keys: string[];
    baseUrl: string;
  };
}

const STORAGE_KEY = 'tiktok_shop_ai_providers_config_v1';

const DEFAULT_CONFIG: ProvidersConfigState = {
  activeProvider: 'gemini',
  enableFailover: true,
  gemini: {
    model: 'gemini-2.0-flash',
    keys: []
  },
  groq: {
    model: 'openai/gpt-oss-120b',
    apiKey: '',
    keys: [],
    baseUrl: 'https://api.groq.com/openai/v1'
  },
  openrouter: {
    model: 'openrouter/free',
    apiKey: '',
    keys: [],
    baseUrl: 'https://openrouter.ai/api/v1'
  }
};

/**
 * DIRETRIZ MESTRA DE HUMANIZAÇÃO E PROMPTS DE IA (PT-BR)
 * Injetada em todas as I.As (Google Gemini, Groq, OpenRouter) para garantir
 * que as falas soem 100% autênticas e os prompts de vídeo/imagem sejam de nível cinematográfico.
 */
export const MASTER_COPYWRITING_SYSTEM_INSTRUCTION = `VOCÊ É O DIRETOR CRIATIVO E COPYWRITER SÊNIOR NÚMERO #1 EM TIKTOK SHOP E VÍDEOS VIRAIS DO BRASIL.
Sua missão é gerar roteiros e prompts de altíssima conversão, com retenção máxima nos 3 primeiros segundos e taxa de clique no carrinho extraordinária.

================================================================================
DIRETRIZ #1: HUMANIZAÇÃO PROFUNDA DAS FALAS EM PORTUGUÊS BRASILEIRO (PT-BR)
================================================================================
1. ORALIDADE 100% NATURAL E COLOQUIAL (FALA FALADA, NUNCA LIDA):
   - Escreva exatamente como um criador ou criadora brasileira fala em um Story, Reel ou TikTok espontâneo, ou em um áudio de WhatsApp para um amigo íntimo.
   - Use contrações e termos cotidianos naturais do Brasil: "tá", "pra", "olha isso", "cê não tem noção", "gente", "sério mesmo", "dá uma olhada", "olha o detalhe disso", "eu precisava mostrar isso pra vocês".
   - NUNCA soe como locutor de comercial de TV dos anos 90, anúncio de rádio ou dublagem enlatada.

2. LISTA NEGRA DE CLICHÊS DE I.A. (EXPRESSAMENTE PROIBIDOS - NUNCA USE):
   ❌ "Não perca essa oportunidade incrível"
   ❌ "Revolucione seu dia a dia / sua rotina"
   ❌ "Adquira já o seu / garanta já o seu com desconto imperdível"
   ❌ "O produto que você sempre sonhou"
   ❌ "Prepare-se para se surpreender / se apaixonar"
   ❌ "Combinação perfeita entre elegância e sofisticação"
   ❌ "Venha conferir / Não fique de fora"
   ❌ "Descubra o segredo de..."
   ❌ Palavras corporativas artificiais: "solução indispensável", "inovador", "revolucionário", "funcionalidade ímpar".

3. GANCHOS HUMANOS QUE RETÊM (HOOKS DE CRIADOR):
   - Curiosidade / Quebra de Ceticismo: "Gente, eu não dava absolutamente nada por isso aqui até ver na prática...", "Se você também odeia quando [problema comum], para tudo e olha isso aqui..."
   - Experiência Sensorial / Detalhes: "Olha a textura disso aqui...", "O tecido é super geladinho e não amarrota por nada...", "Vocês tão vendo o brilho e a costura dessa peça?"
   - Prova Social Espontânea: "Tava todo mundo comentando disso aqui no TikTok e eu tive que testar..."

4. CADÊNCIA E PONTUAÇÃO PARA RESPIRAÇÃO HUMANA:
   - Frases curtas e rítmicas. Use vírgulas para indicar pausas respiratórias reais da locução. Use reticências (...) para suspense ou continuidade natural.
   - RESPEITO AO TEMPO DA CENA: Máximo de 2 a 2.5 palavras por segundo (ex: cena de 5s = entre 10 e 12 palavras; 8s = entre 16 e 20 palavras). Se passar disso, o narrador ficará afobado e artificial.

================================================================================
DIRETRIZ #2: CONSTRUÇÃO DE PROMPTS DE VÍDEO E IMAGEM COM VOZ E TOM PADRONIZADOS
================================================================================
⚠️ PADRÃO MANDATÓRIO DE ESPECIFICAÇÃO DE VOZ E TOM NOS PROMPTS DE VÍDEO:
Em TODO prompt de vídeo gerado ('veoPrompt' e 'digenPrompt'), você DEVE obrigatoriamente especificar se a voz é feminina ou masculina e o tipo de tom de locução (ex: entusiasta/espontâneo, confiante/persuasivo, suave/estético, achadinho/urgente) antes ou junto à fala falada em português. Isso é indispensável para manter o padrão e automação das ferramentas de geração de vídeo.

1. GOOGLE VEO ('veoPrompt'):
   - Sempre em INGLÊS com terminologia cinematográfica profissional.
   - Descreva iluminação de estúdio comercial (soft key light, warm rim lighting, clean subtle reflections), lentes e enquadramentos (85mm portrait lens, 100mm macro close-up for fabric/product details, f/1.8 shallow depth of field bokeh), movimentos de câmera suaves (slow cinematic dolly push-in, subtle 45-degree orbital pan, smooth tracking).
   - ESTRUTURA UNIFICADA OBRIGATÓRIA (COM GÊNERO E TOM DA VOZ):
     Visual & Camera: [Ação visual e movimento de câmera cinematográfico] | Voiceover/Dialogue: ([Female/Male voice], [tone: warm enthusiastic creator tone / confident persuasive tone / calm aesthetic tone / energetic promo tone]) '[Fala exata em PT-BR]' | Background Music & SFX: [Música de fundo comercial e efeitos sonoros táteis como unboxing, click, tecido].
     *(Se o modo for Sem Narração/no-speech): Voiceover/Dialogue: (No voiceover / Instrumental only) | Background Music & SFX: [Música instrumental dinâmica e SFX]

2. DIGEN ('digenPrompt') - AVATAR, VOZ E DIÁLOGO:
   - Sempre em INGLÊS para descrições técnicas e estéticas.
   - Descreva microexpressões humanas autênticas (natural warm smile, subtle eyebrow reactions, relaxed posture, direct friendly eye contact with lens).
   - Gesticulação de criador (naturally gesturing with hands, holding or pointing to the product, showing texture, fluid body language).
   - Sincronia labial fluida para o áudio falado em português.
   - ESTRUTURA UNIFICADA OBRIGATÓRIA (COM GÊNERO E TOM DA VOZ):
     Model/Action: [Comportamento do avatar, expressões faciais e gestos com produto] | Voice & Tone: [Female/Male voice], [tone: warm and enthusiastic creator tone / confident and persuasive tone / calm and aesthetic tone / fast dynamic promo tone] | Dialogue: '[Fala exata em PT-BR]' | Background Music: [Trilha comercial moderna].
     *(Se o modo for Sem Narração/no-speech): Model/Action: [Gestos naturais demonstrando o produto sem movimentos labiais] | Voice & Tone: No voiceover (Instrumental only) | Dialogue: None | Background Music: [Trilha instrumental comercial moderna].

3. NANO BANANA 2 / IMAGEN 3 ('imagePrompt'):
   - Sempre em INGLÊS.
   - Foto estática de produto ultra-fotorrealista 8K, padrão catálogo de luxo ou TikTok Shop top seller.
   - Detalhamento preciso de iluminação, textura, composição vertical 9:16 e nitidez de estúdio profissional.

================================================================================
DIRETRIZ #3: INCORPORAÇÃO ESTRUTURAL DA DESCRIÇÃO DO PRODUTO (TECIDO, MODELAGEM, MEDIDAS E DIFERENCIAIS)
================================================================================
Quando uma descrição do produto, especificações técnicas ou tabela de medidas do TikTok Shop forem fornecidas:
1. FIDELIDADE AOS MATERIAIS & TECIDO:
   - Se o produto cita "tecido sensorial", "algodão egípcio", "aço inoxidável", "modelagem ampla", "amarração nas costas", etc., mencione ESSES termos e atributos exatos na narração em PT-BR e nos prompts visuais de vídeo.
   - NUNCA invente materiais ou características contraditórias às especificações oficiais fornecidas.
2. ARGUMENTOS REAIS BASEADOS NA COPY:
   - Use os "Destaques do Produto", "Por que você vai amar" e recomendações de uso oficiais da loja como base para os benefícios do roteiro.
3. DETALHES DE MEDIDAS & CAIMENTO:
   - Se houver tabela de medidas (busto, cintura, comprimento, etc.) ou informação de tamanho único / grade, transmita segurança sobre o caimento perfeito no corpo nas falas em PT-BR.
4. PROMPTS CINEMATOGRÁFICOS (VEO/DIGEN):
   - Traduza os atributos físicos para os prompts de vídeo em inglês (ex: 'flowing sensory fabric with soft elegant drape', 'adjustable back-tie detail', 'wide sweeping hem creating natural dynamic movement while walking').

================================================================================
DIRETRIZ #4: FLUXOS DE GERAÇÃO DE IMAGENS E VÍDEOS (NANO BANANA vs FOTOS COLETADAS)
================================================================================
Quando o usuário definir o modo de fluxo de trabalho:

MODO A: 'nano_banana_first' (GERAR PRIMEIRO NO NANO BANANA 2 / PRO):
- O foco prioritário nesta etapa é a CRIAÇÃO DE NOVAS FOTOS DE CATÁLOGO no campo 'imagePrompt' (Nano Banana 2 / Imagen 3).
- Crie descrições fotográficas ricas em detalhes visuais, estilo editorial de luxo, enquadramentos perfeitos, iluminação de estúdio profissional 8K, modelos profissionais interagindo com a peça e poses dinâmicas com o produto, prontas para gerar fotos inéditas de alta qualidade antes de animar os vídeos.
- Os campos 'veoPrompt' e 'digenPrompt' devem indicar como dar vida e movimento fluído a ESSA NOVA IMAGEM que será gerada no Nano Banana.

MODO B: 'direct_collected' (USAR FOTOS COLETADAS DO PRODUTO):
- Os prompts visuais e cinematográficos devem utilizar diretamente as imagens originais já coletadas do produto como referência de cena final, adaptando a iluminação e câmera para destacar o produto real exatamente como ele é nas fotos enviadas.
`;

export class AIProvidersManager {
  private config: ProvidersConfigState;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): ProvidersConfigState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const groqKeys = Array.isArray(parsed.groq?.keys) ? parsed.groq.keys : (parsed.groq?.apiKey ? [parsed.groq.apiKey] : []);
        const openrouterKeys = Array.isArray(parsed.openrouter?.keys) ? parsed.openrouter.keys : (parsed.openrouter?.apiKey ? [parsed.openrouter.apiKey] : []);

        // Migração automática de modelos legados ou descontinuados salvos no localStorage do usuário
        let groqModel = parsed.groq?.model || DEFAULT_CONFIG.groq.model;
        if (groqModel.includes('llama-3.2') || groqModel.includes('vision-preview') || !GROQ_MODELS.some(m => m.id === groqModel)) {
          groqModel = 'openai/gpt-oss-120b';
        }

        let openrouterModel = parsed.openrouter?.model || DEFAULT_CONFIG.openrouter.model;
        if (openrouterModel.includes('gemma-3') || openrouterModel.includes('llama-3.2') || openrouterModel.includes('qwen2.5-vl') || !OPENROUTER_MODELS.some(m => m.id === openrouterModel)) {
          openrouterModel = 'openrouter/free';
        }

        let geminiModel = parsed.gemini?.model || DEFAULT_CONFIG.gemini.model;
        if (geminiModel.includes('2.5') || !GEMINI_MODELS.some(m => m.id === geminiModel)) {
          geminiModel = 'gemini-2.0-flash';
        }

        const migratedConfig: ProvidersConfigState = {
          activeProvider: parsed.activeProvider || DEFAULT_CONFIG.activeProvider,
          enableFailover: parsed.enableFailover !== undefined ? parsed.enableFailover : true,
          gemini: {
            model: geminiModel,
            keys: Array.isArray(parsed.gemini?.keys) ? parsed.gemini.keys : []
          },
          groq: {
            model: groqModel,
            apiKey: parsed.groq?.apiKey || (groqKeys.length > 0 ? groqKeys[0] : ''),
            keys: groqKeys,
            baseUrl: parsed.groq?.baseUrl || DEFAULT_CONFIG.groq.baseUrl
          },
          openrouter: {
            model: openrouterModel,
            apiKey: parsed.openrouter?.apiKey || (openrouterKeys.length > 0 ? openrouterKeys[0] : ''),
            keys: openrouterKeys,
            baseUrl: parsed.openrouter?.baseUrl || DEFAULT_CONFIG.openrouter.baseUrl
          }
        };

        // Salva silenciosamente a versão migrada se algum modelo obsoleto foi corrigido
        if (parsed.groq?.model !== groqModel || parsed.openrouter?.model !== openrouterModel || parsed.gemini?.model !== geminiModel) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedConfig));
            console.log('[AIProvidersManager] Modelos atualizados com sucesso para versões ativas:', {
              gemini: geminiModel,
              groq: groqModel,
              openrouter: openrouterModel
            });
          } catch {}
        }

        return migratedConfig;
      }
    } catch (e) {
      console.warn('[AIProvidersManager] Falha ao carregar configurações salvas:', e);
    }
    return { ...DEFAULT_CONFIG };
  }

  public saveConfig(newConfig: Partial<ProvidersConfigState>) {
    this.config = {
      ...this.config,
      ...newConfig,
      gemini: { ...this.config.gemini, ...(newConfig.gemini || {}) },
      groq: { ...this.config.groq, ...(newConfig.groq || {}) },
      openrouter: { ...this.config.openrouter, ...(newConfig.openrouter || {}) }
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.error('[AIProvidersManager] Erro ao salvar configurações:', e);
    }
  }

  public getConfig(): ProvidersConfigState {
    return this.config;
  }

  public getActiveProvider(): AIProviderId {
    return this.config.activeProvider;
  }

  public setActiveProvider(provider: AIProviderId) {
    this.saveConfig({ activeProvider: provider });
  }

  public setGeminiKeys(keys: string[]) {
    const sanitized = keys.map(k => this.sanitizeKey(k)).filter(k => k.length > 5 && k !== 'MY_GEMINI_API_KEY');
    this.saveConfig({ gemini: { ...this.config.gemini, keys: sanitized } });
  }

  public setGroqKey(apiKey: string) {
    const clean = this.sanitizeKey(apiKey);
    const otherKeys = (this.config.groq.keys || []).filter(k => k !== clean);
    const newKeys = clean ? [clean, ...otherKeys] : otherKeys;
    this.saveConfig({ groq: { ...this.config.groq, apiKey: clean, keys: newKeys } });
  }

  public setGroqKeys(keys: string[]) {
    const sanitized = keys.map(k => this.sanitizeKey(k)).filter(k => k.length > 5 && k !== 'MY_GROQ_API_KEY');
    const primary = sanitized.length > 0 ? sanitized[0] : '';
    this.saveConfig({ groq: { ...this.config.groq, apiKey: primary, keys: sanitized } });
  }

  public setOpenRouterKey(apiKey: string) {
    const clean = this.sanitizeKey(apiKey);
    const otherKeys = (this.config.openrouter.keys || []).filter(k => k !== clean);
    const newKeys = clean ? [clean, ...otherKeys] : otherKeys;
    this.saveConfig({ openrouter: { ...this.config.openrouter, apiKey: clean, keys: newKeys } });
  }

  public setOpenRouterKeys(keys: string[]) {
    const sanitized = keys.map(k => this.sanitizeKey(k)).filter(k => k.length > 5 && k !== 'MY_OPENROUTER_API_KEY');
    const primary = sanitized.length > 0 ? sanitized[0] : '';
    this.saveConfig({ openrouter: { ...this.config.openrouter, apiKey: primary, keys: sanitized } });
  }

  /**
   * Converte a resposta em JSON limpo e parseável
   */
  /**
   * Converte a resposta em JSON limpo e parseável,
   * removendo tags de pensamento (<think>...</think>), fences de markdown,
   * texto envolvente, caracteres de controle e reparando vírgulas e aspas.
   */
  public cleanJsonResponse(rawText: string): string {
    if (!rawText) return '{}';
    let clean = rawText.trim();

    // 1. Remove blocos de raciocínio de modelos open-source (<think>...</think>)
    clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // 2. Remove blocos de código markdown ```json ... ```
    const codeBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      clean = codeBlockMatch[1].trim();
    } else {
      clean = clean.replace(/^```(?:json)?\s*/gi, '').replace(/\s*```$/gi, '').trim();
    }

    // 3. Encontra os limites externos do objeto {...} ou array [...]
    const firstBrace = clean.indexOf('{');
    const firstBracket = clean.indexOf('[');
    let start = -1;
    let end = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      start = firstBrace;
      end = clean.lastIndexOf('}');
    } else if (firstBracket !== -1) {
      start = firstBracket;
      end = clean.lastIndexOf(']');
    }

    if (start !== -1 && end !== -1 && end > start) {
      clean = clean.substring(start, end + 1);
    } else if (start !== -1) {
      clean = clean.substring(start);
    }

    // 4. Limpa vírgulas extras (trailing commas) antes de fechar objetos ou listas
    clean = clean.replace(/,\s*([\}\]])/g, '$1');

    return clean;
  }

  /**
   * Tenta reparar JSONs incompletos ou truncados adicionando aspas ou fechamentos ausentes
   */
  public repairTruncatedJson(jsonStr: string): string {
    let str = jsonStr.trim();
    if (!str) return '{}';

    // Remove vírgula residual final
    str = str.replace(/,\s*$/, '');
    
    // Rastrear aspas e chaves/colchetes abertos
    let inString = false;
    let escape = false;
    const stack: string[] = [];

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{' || char === '[') {
          stack.push(char);
        } else if (char === '}') {
          if (stack.length > 0 && stack[stack.length - 1] === '{') stack.pop();
        } else if (char === ']') {
          if (stack.length > 0 && stack[stack.length - 1] === '[') stack.pop();
        }
      }
    }

    if (inString) {
      str += '"';
    }

    str = str.replace(/,\s*$/, '');

    // Fecha as chaves e colchetes abertos na ordem inversa
    while (stack.length > 0) {
      const open = stack.pop();
      if (open === '{') str += '}';
      else if (open === '[') str += ']';
    }

    return str;
  }

  /**
   * Faz o parse seguro do JSON retornado pela IA com múltiplas camadas de recuperação
   */
  public safeJsonParse<T>(rawText: string, fallback: T): T {
    if (!rawText) return fallback;

    // Tentativa 1: Parse direto após limpeza padrão
    try {
      const cleaned = this.cleanJsonResponse(rawText);
      const parsed = JSON.parse(cleaned);
      return parsed as T;
    } catch (e1) {}

    // Tentativa 2: Reparar JSON truncado ou com delimitadores ausentes
    try {
      const cleaned = this.cleanJsonResponse(rawText);
      const repaired = this.repairTruncatedJson(cleaned);
      const parsed = JSON.parse(repaired);
      return parsed as T;
    } catch (e2) {}

    // Tentativa 3: Extração cirúrgica de cenas via regex se JSON global estiver quebrado
    try {
      const campaignTitleMatch = rawText.match(/["']?(?:campaignTitle|campaign_title|titulo|title)["']?\s*:\s*["']([^"'\n\r]+)["']/i);
      const campaignTitle = campaignTitleMatch ? campaignTitleMatch[1].trim() : 'Campanha TikTok Shop';

      const sceneBlockRegex = /\{[^{}]*(?:veoPrompt|imagePrompt|narration|digenPrompt|duracao|duration)[^{}]*\}/gi;
      const sceneBlocks = rawText.match(sceneBlockRegex);

      if (sceneBlocks && sceneBlocks.length > 0) {
        const extractedScenes: any[] = [];
        for (let idx = 0; idx < sceneBlocks.length; idx++) {
          const block = sceneBlocks[idx];
          try {
            const sceneObj = JSON.parse(this.cleanJsonResponse(block));
            if (sceneObj) extractedScenes.push(sceneObj);
          } catch (bErr) {
            const getField = (keys: string[]) => {
              for (const k of keys) {
                const m = block.match(new RegExp(`["']?${k}["']?\\s*:\\s*["']([\\s\\S]*?)["']\\s*(?:,|\\})`, 'i'));
                if (m && m[1]) return m[1].trim();
              }
              return '';
            };

            const imageName = getField(['imageName', 'image_name', 'nomeImagem', 'image']) || `look_${idx + 1}`;
            const duration = getField(['duration', 'duracao', 'tempo']) || '5s';
            const imagePrompt = getField(['imagePrompt', 'image_prompt', 'prompt_imagem', 'nanoBananaPrompt', 'prompt']);
            const veoPrompt = getField(['veoPrompt', 'veo_prompt', 'prompt_veo', 'videoPrompt']);
            const digenPrompt = getField(['digenPrompt', 'digen_prompt', 'prompt_digen', 'avatarPrompt']);
            const narration = getField(['narration', 'narracao', 'voiceover', 'speech', 'fala']);
            const description = getField(['description', 'descricao', 'desc', 'cena']) || `Cena ${idx + 1}`;

            if (veoPrompt || imagePrompt || narration || digenPrompt) {
              extractedScenes.push({
                imageName,
                duration,
                imagePrompt: imagePrompt || veoPrompt,
                veoPrompt: veoPrompt || imagePrompt,
                digenPrompt: digenPrompt || veoPrompt,
                narration: narration || '',
                description
              });
            }
          }
        }

        if (extractedScenes.length > 0) {
          return {
            campaignTitle,
            scenes: extractedScenes
          } as unknown as T;
        }
      }
    } catch (e3) {
      console.warn('[AIProvidersManager] Falha na extração cirúrgica de cenas:', e3);
    }

    console.warn('[AIProvidersManager] Todas as tentativas de parse de JSON falharam:', rawText?.slice(0, 300));
    return fallback;
  }

  /**
   * Sanitiza e limpa chaves de API com extração cirúrgica de tokens
   */
  public sanitizeKey(key?: string): string {
    if (!key) return '';
    let k = String(key)
      .replace(/[\u200B-\u200D\uFEFF\u0000-\u001F\u007F-\u009F]/g, '')
      .trim();

    // 1. Extração cirúrgica de chave Google Gemini (AIzaSy...)
    const geminiMatch = k.match(/AIzaSy[A-Za-z0-9_-]{30,42}/);
    if (geminiMatch) {
      return geminiMatch[0];
    }

    // 2. Extração cirúrgica de chave Groq (gsk_...)
    const groqMatch = k.match(/gsk_[A-Za-z0-9]{40,75}/);
    if (groqMatch) {
      return groqMatch[0];
    }

    // 3. Extração cirúrgica de chave OpenRouter (sk-or-v1-...)
    const openrouterMatch = k.match(/sk-or-v1-[A-Za-z0-9]{55,80}/);
    if (openrouterMatch) {
      return openrouterMatch[0];
    }

    // 4. Limpeza padrão para outros formatos
    k = k.replace(/^[=\s:,"']+|[=\s:,"';]+$/g, '').trim();
    k = k.replace(/^(?:GEMINI_API_KEY|GROQ_API_KEY|OPENROUTER_API_KEY|API_KEY|KEY)\s*[:=]\s*/i, '').trim();
    k = k.replace(/^["']|["']$/g, '').trim();
    return k;
  }

  /**
   * Chamada direta ao Google Gemini com rotação de chaves e cadeia de modelos ativos
   */
  public async executeGemini(
    options: UnifiedAIOptions,
    externalKeys?: string[]
  ): Promise<UnifiedAIResult> {
    const t0 = Date.now();
    const rawKeys = (externalKeys && externalKeys.length > 0)
      ? externalKeys
      : (this.config.gemini.keys.length > 0 ? this.config.gemini.keys : (process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY] : []));

    const keysToTry = rawKeys
      .map(k => this.sanitizeKey(k))
      .filter(k => k.length > 5 && k !== 'MY_GEMINI_API_KEY');

    if (keysToTry.length === 0) {
      throw new Error("Nenhuma chave Gemini válida configurada. Insira sua chave de API (AIzaSy...) nas configurações.");
    }

    const preferredModel = options.model || this.config.gemini.model || 'gemini-2.0-flash';
    const modelsToTry = [
      preferredModel,
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-flash-latest'
    ].filter((m, i, a) => a.indexOf(m) === i);

    let lastError: any = null;

    // Converte parts para formato Gemini
    const contents: any[] = [];
    if (options.parts && options.parts.length > 0) {
      for (const p of options.parts) {
        if (p.text) {
          contents.push({ text: p.text });
        } else if (p.inlineData) {
          contents.push({
            inlineData: {
              data: p.inlineData.data,
              mimeType: p.inlineData.mimeType
            }
          });
        }
      }
    } else if (options.prompt) {
      contents.push({ text: options.prompt });
    }

    for (let keyIdx = 0; keyIdx < keysToTry.length; keyIdx++) {
      const key = keysToTry[keyIdx];

      for (const model of modelsToTry) {
        try {
          if (options.onStatusUpdate) {
            const rotInfo = keysToTry.length > 1 ? ` [Chave ${keyIdx + 1}/${keysToTry.length}]` : '';
            options.onStatusUpdate(`Solicitando Google Gemini (${model})${rotInfo}...`);
          }
          const ai = new GoogleGenAI({ apiKey: key });
          const genConfig: any = {
            responseMimeType: "application/json"
          };
          if (options.responseSchema) {
            genConfig.responseSchema = options.responseSchema;
          }
          const baseInstruction = MASTER_COPYWRITING_SYSTEM_INSTRUCTION;
          const sysPrompt = options.systemPrompt
            ? `${baseInstruction}\n\n[DIRETRIZ ESPECÍFICA DESTA OPERAÇÃO]:\n${options.systemPrompt}`
            : baseInstruction;
          genConfig.systemInstruction = sysPrompt;

          const response = await ai.models.generateContent({
            model,
            contents: {
              role: 'user',
              parts: contents
            },
            config: genConfig
          });

          const rawText = response.text || '';
          const cleanedText = this.cleanJsonResponse(rawText);

          return {
            text: cleanedText,
            provider: 'gemini',
            model,
            elapsedMs: Date.now() - t0
          };
        } catch (err: any) {
          lastError = err;
          const errorStr = `${err?.message || ''} ${err?.status || ''} ${err?.statusText || ''}`.toLowerCase();
          const errMsg = err?.message || String(err);

          // Erros específicos de chave: cota esgotada ou chave genuinamente inválida/revogada
          const isQuotaExhausted = errorStr.includes('429') || 
                                   errorStr.includes('resource_exhausted') ||
                                   errorStr.includes('quota_exceeded');
          const isKeyInvalid = errorStr.includes('api_key_invalid') ||
                               errorStr.includes('api key not valid') ||
                               errorStr.includes('api key expired') ||
                               (errorStr.includes('invalid') && errorStr.includes('api_key')) ||
                               (errorStr.includes('401'));

          if (isQuotaExhausted || isKeyInvalid) {
            console.warn(`[Gemini] Chave ${keyIdx + 1}/${keysToTry.length} com cota esgotada ou inválida (${errMsg}). Tentando próxima chave...`);
            break; // Próxima chave
          }

          // Erros de servidor ou sobrecarga — aguardar e tentar modelo alternativo
          if (errorStr.includes('503') || errorStr.includes('overloaded') || errorStr.includes('500')) {
            console.warn(`[Gemini] Servidor sobrecarregado para modelo ${model}. Aguardando 1.5s...`);
            await new Promise(r => setTimeout(r, 1500));
            continue;
          }

          // Erros de argumento inválido (imagem, parâmetro, prompt) — tentar próximo modelo mas NÃO trocar chave
          if (errorStr.includes('400') || errorStr.includes('invalid_argument') || errorStr.includes('invalid')) {
            console.warn(`[Gemini] Argumento inválido no modelo ${model} (${errMsg}). Tentando próximo modelo com mesma chave...`);
            continue;
          }
        }
      }
    }

    throw lastError || new Error("Falha ao comunicar com o Google Gemini.");
  }

  /**
   * Chamada ao Groq Cloud via API OpenAI-compatible em hardware LPU com Rotação de Chaves
   */
  public async executeGroq(
    options: UnifiedAIOptions,
    externalKeys?: string[]
  ): Promise<UnifiedAIResult> {
    const t0 = Date.now();
    const candidateKeys = (externalKeys && externalKeys.length > 0)
      ? externalKeys
      : (this.config.groq.keys && this.config.groq.keys.length > 0 ? this.config.groq.keys : (this.config.groq.apiKey ? [this.config.groq.apiKey] : []));

    const keysToTry = candidateKeys
      .map(k => this.sanitizeKey(k))
      .filter(k => k.length > 5 && k !== 'MY_GROQ_API_KEY');

    if (keysToTry.length === 0) {
      throw new Error("Nenhuma chave Groq Cloud configurada (gsk_...). Adicione sua chave ou carregue um arquivo .txt.");
    }

    const preferredModel = options.model || this.config.groq.model || 'openai/gpt-oss-120b';
    const modelsToTry = [
      preferredModel,
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'groq/compound',
      'qwen/qwen3.8-27b'
    ].filter((m, i, a) => a.indexOf(m) === i);

    let baseUrl = (this.config.groq.baseUrl || 'https://api.groq.com/openai/v1').trim();
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    // Groq models require message content to be a single string
    let textAccumulator = '';
    let imageCount = 0;

    if (options.parts && options.parts.length > 0) {
      for (const p of options.parts) {
        if (p.text) {
          textAccumulator += (textAccumulator ? '\n\n' : '') + p.text;
        } else if (p.inlineData) {
          imageCount++;
        }
      }
    } else if (options.prompt) {
      textAccumulator = options.prompt;
    }

    if (imageCount > 0) {
      textAccumulator += `\n\n[Referência Visual: O usuário enviou ${imageCount} foto(s) de produto/look. Considere todas as especificações, nomes e diretrizes visuais informadas para construir o roteiro e os prompts de VEO, DIGEN e Nano Banana.]`;
    }

    const baseInstruction = MASTER_COPYWRITING_SYSTEM_INSTRUCTION;
    const sysPrompt = options.systemPrompt
      ? `${baseInstruction}\n\n[DIRETRIZ ESPECÍFICA DESTA OPERAÇÃO]:\n${options.systemPrompt}\n\nResponda estritamente em formato JSON válido.`
      : `${baseInstruction}\n\nResponda estritamente em formato JSON válido.`;

    const messages: any[] = [{ role: "system", content: sysPrompt }];

    messages.push({
      role: "user",
      content: textAccumulator + "\n\nIMPORTANTE: Responda ESTRITAMENTE em formato JSON parseável válido."
    });

    let lastError: any = null;

    // Loop de chaves com rotação inteligente
    for (let keyIdx = 0; keyIdx < keysToTry.length; keyIdx++) {
      const apiKey = keysToTry[keyIdx];

      for (const model of modelsToTry) {
        try {
          if (options.onStatusUpdate) {
            const rotInfo = keysToTry.length > 1 ? ` [Chave ${keyIdx + 1}/${keysToTry.length}]` : '';
            options.onStatusUpdate(`Solicitando Groq Cloud LPU (${model})${rotInfo}...`);
          }

          const response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`
            },
            signal: AbortSignal.timeout(90000),
            body: JSON.stringify({
              model,
              messages,
              temperature: 0.7,
              max_tokens: 4096,
              response_format: { type: "json_object" }
            })
          });

          if (!response.ok) {
            const errText = await response.text();
            let errJson: any = null;
            try { errJson = JSON.parse(errText); } catch {}
            const errMsg = errJson?.error?.message || errText || `HTTP ${response.status}`;
            throw new Error(`Groq ${model} (${response.status}): ${errMsg}`);
          }

          const data = await response.json();
          const rawContent = data?.choices?.[0]?.message?.content;
          if (!rawContent) {
            throw new Error(`Groq retornou resposta vazia no modelo ${model}.`);
          }

          const cleanedText = this.cleanJsonResponse(rawContent);

          return {
            text: cleanedText,
            provider: 'groq',
            model,
            elapsedMs: Date.now() - t0
          };
        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || String(err);
          const errLower = errMsg.toLowerCase();
          console.warn(`[Groq] Falha na chave ${keyIdx + 1}/${keysToTry.length}, modelo ${model}:`, errMsg);

          const isKeyError = errLower.includes('401') ||
                             errLower.includes('invalid_api_key') ||
                             errLower.includes('429') ||
                             errLower.includes('rate_limit') ||
                             errLower.includes('quota');

          if (isKeyError) {
            console.warn(`[Groq] Chave ${keyIdx + 1} com cota esgotada ou inválida. Tentando próxima chave...`);
            break; // Próxima chave
          }

          // Servidor sobrecarregado — aguardar e tentar próximo modelo
          if (errLower.includes('503') || errLower.includes('overloaded') || errLower.includes('500')) {
            await new Promise(r => setTimeout(r, 1500));
            continue;
          }
        }
      }
    }

    throw lastError || new Error("Falha ao comunicar com o Groq Cloud.");
  }

  /**
   * Chamada ao OpenRouter via API OpenAI-compatible com suporte a modelos multimodais Free e Rotação de Chaves
   */
  public async executeOpenRouter(
    options: UnifiedAIOptions,
    externalKeys?: string[]
  ): Promise<UnifiedAIResult> {
    const t0 = Date.now();
    const candidateKeys = (externalKeys && externalKeys.length > 0)
      ? externalKeys
      : (this.config.openrouter.keys && this.config.openrouter.keys.length > 0 ? this.config.openrouter.keys : (this.config.openrouter.apiKey ? [this.config.openrouter.apiKey] : []));

    const keysToTry = candidateKeys
      .map(k => this.sanitizeKey(k))
      .filter(k => k.length > 5 && k !== 'MY_OPENROUTER_API_KEY');

    if (keysToTry.length === 0) {
      throw new Error("Nenhuma chave OpenRouter configurada (sk-or-v1-...). Adicione sua chave ou carregue um arquivo .txt.");
    }

    const preferredModel = options.model || this.config.openrouter.model || 'openrouter/free';
    const modelsToTry = [
      preferredModel,
      'openrouter/free',
      'inclusionai/ling-3.0-flash-vl:free',
      'google/gemma-4-31b-it:free',
      'qwen/qwen3.8-27b:free',
      'deepseek/deepseek-v4-flash-0731:free'
    ].filter((m, i, a) => a.indexOf(m) === i);

    let baseUrl = (this.config.openrouter.baseUrl || 'https://openrouter.ai/api/v1').trim();
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    const userContent: any[] = [];
    let textAccumulator = '';
    let hasImages = false;

    if (options.parts && options.parts.length > 0) {
      for (const p of options.parts) {
        if (p.text) {
          textAccumulator += (textAccumulator ? '\n\n' : '') + p.text;
        } else if (p.inlineData) {
          hasImages = true;
          userContent.push({
            type: "image_url",
            image_url: {
              url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`
            }
          });
        }
      }
    } else if (options.prompt) {
      textAccumulator = options.prompt;
    }

    if (textAccumulator) {
      userContent.unshift({
        type: "text",
        text: textAccumulator + "\n\nIMPORTANTE: Responda ESTRITAMENTE em formato JSON parseável válido."
      });
    }

    const baseInstruction = MASTER_COPYWRITING_SYSTEM_INSTRUCTION;
    const sysPrompt = options.systemPrompt
      ? `${baseInstruction}\n\n[DIRETRIZ ESPECÍFICA DESTA OPERAÇÃO]:\n${options.systemPrompt}\n\nResponda estritamente em formato JSON válido.`
      : `${baseInstruction}\n\nResponda estritamente em formato JSON válido.`;

    const messages: any[] = [{ role: "system", content: sysPrompt }];
    messages.push({
      role: "user",
      content: userContent.length === 1 && userContent[0].type === "text" ? userContent[0].text : userContent
    });

    let lastError: any = null;

    for (let keyIdx = 0; keyIdx < keysToTry.length; keyIdx++) {
      const apiKey = keysToTry[keyIdx];

      for (const model of modelsToTry) {
        try {
          if (options.onStatusUpdate) {
            const rotInfo = keysToTry.length > 1 ? ` [Chave ${keyIdx + 1}/${keysToTry.length}]` : '';
            options.onStatusUpdate(`Solicitando OpenRouter (${model})${rotInfo}...`);
          }

          // Se o modelo for texto-puro (como deepseek) e tiver imagens, usa apenas a parte de texto
          let reqMessages = messages;
          if (model.includes('deepseek') && hasImages) {
            reqMessages = [
              { role: "system", content: sysPrompt },
              { role: "user", content: textAccumulator + "\n\nIMPORTANTE: Responda ESTRITAMENTE em formato JSON parseável válido." }
            ];
          }

          const response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
              "HTTP-Referer": "https://tiktokshop.app",
              "X-Title": "Gerador TikTok Shop"
            },
            signal: AbortSignal.timeout(90000),
            body: JSON.stringify({
              model,
              messages: reqMessages,
              temperature: 0.7,
              max_tokens: 4096
            })
          });

          if (!response.ok) {
            const errText = await response.text();
            let errJson: any = null;
            try { errJson = JSON.parse(errText); } catch {}
            const errMsg = errJson?.error?.message || errText || `HTTP ${response.status}`;
            throw new Error(`OpenRouter ${model} (${response.status}): ${errMsg}`);
          }

          const data = await response.json();
          const rawContent = data?.choices?.[0]?.message?.content;
          if (!rawContent) {
            throw new Error(`OpenRouter retornou resposta vazia no modelo ${model}.`);
          }

          const cleanedText = this.cleanJsonResponse(rawContent);

          return {
            text: cleanedText,
            provider: 'openrouter',
            model,
            elapsedMs: Date.now() - t0
          };
        } catch (err: any) {
          lastError = err;
          const errMsg = (err?.message || String(err)).toLowerCase();
          console.warn(`[OpenRouter] Falha na chave ${keyIdx + 1}/${keysToTry.length}, modelo ${model}:`, err.message);

          const isKeyError = errMsg.includes('401') || 
                             errMsg.includes('user not found') || 
                             errMsg.includes('429') || 
                             errMsg.includes('rate-limit') || 
                             errMsg.includes('quota');

          if (isKeyError) {
            console.warn(`[OpenRouter] Chave ${keyIdx + 1} sem cota ou inválida. Tentando próxima chave...`);
            break; // Próxima chave
          }
        }
      }
    }

    throw lastError || new Error("Falha ao comunicar com o OpenRouter.");
  }

  /**
   * Ponto de entrada unificado para todas as chamadas de IA do app,
   * com suporte a Failover Automático Triplo (Gemini ⇄ Groq ⇄ OpenRouter)
   */
  public async execute(
    options: UnifiedAIOptions,
    externalGeminiKeys?: string[],
    externalGroqKeys?: string[],
    externalOpenRouterKeys?: string[]
  ): Promise<UnifiedAIResult> {
    const activeProvider = options.provider || this.config.activeProvider;
    const enableFailover = this.config.enableFailover;

    // Ordem de tentativas de failover baseada no provedor ativo
    const providerChain: AIProviderId[] = [activeProvider];
    if (enableFailover) {
      if (activeProvider === 'gemini') {
        const hasGroq = (externalGroqKeys && externalGroqKeys.length > 0) || this.config.groq.keys.length > 0 || Boolean(this.config.groq.apiKey);
        if (hasGroq) providerChain.push('groq');
        const hasOpenRouter = (externalOpenRouterKeys && externalOpenRouterKeys.length > 0) || this.config.openrouter.keys.length > 0 || Boolean(this.config.openrouter.apiKey);
        if (hasOpenRouter) providerChain.push('openrouter');
      } else if (activeProvider === 'groq') {
        const envGemini = this.sanitizeKey(process.env.GEMINI_API_KEY);
        const hasGemini = (externalGeminiKeys && externalGeminiKeys.length > 0) || this.config.gemini.keys.length > 0 || Boolean(envGemini && envGemini !== 'MY_GEMINI_API_KEY');
        if (hasGemini) providerChain.push('gemini');
        const hasOpenRouter = (externalOpenRouterKeys && externalOpenRouterKeys.length > 0) || this.config.openrouter.keys.length > 0 || Boolean(this.config.openrouter.apiKey);
        if (hasOpenRouter) providerChain.push('openrouter');
      } else if (activeProvider === 'openrouter') {
        const envGemini = this.sanitizeKey(process.env.GEMINI_API_KEY);
        const hasGemini = (externalGeminiKeys && externalGeminiKeys.length > 0) || this.config.gemini.keys.length > 0 || Boolean(envGemini && envGemini !== 'MY_GEMINI_API_KEY');
        if (hasGemini) providerChain.push('gemini');
        const hasGroq = (externalGroqKeys && externalGroqKeys.length > 0) || this.config.groq.keys.length > 0 || Boolean(this.config.groq.apiKey);
        if (hasGroq) providerChain.push('groq');
      }
    }

    let lastError: any = null;

    for (let i = 0; i < providerChain.length; i++) {
      const currentProvider = providerChain[i];
      const isFailover = i > 0;

      try {
        if (isFailover && options.onStatusUpdate) {
          options.onStatusUpdate(`⚡ Failover ativado: alternando para ${currentProvider.toUpperCase()}...`);
        }

        let result: UnifiedAIResult;
        if (currentProvider === 'gemini') {
          result = await this.executeGemini(options, externalGeminiKeys);
        } else if (currentProvider === 'groq') {
          result = await this.executeGroq(options, externalGroqKeys);
        } else {
          result = await this.executeOpenRouter(options, externalOpenRouterKeys);
        }

        if (isFailover) {
          result.failoverUsed = true;
          result.originalProvider = activeProvider;
          result.failoverReason = `${activeProvider.toUpperCase()} indisponível ou esgotado. Geração concluída com sucesso via ${currentProvider.toUpperCase()}!`;
        }

        return result;
      } catch (err: any) {
        lastError = err;
        console.warn(`[AIProviders] Falha no provedor ${currentProvider}:`, err?.message || err);
        if (!enableFailover) {
          throw err;
        }
      }
    }

    throw lastError || new Error("Todos os provedores de I.A configurados falharam.");
  }

  /**
   * Testa a conexão e a capacidade multimodal de um provedor específico
   */
  public async testProviderConnection(
    provider: AIProviderId,
    overrideKey?: string,
    overrideModel?: string
  ): Promise<{ success: boolean; message: string; elapsedMs: number }> {
    const t0 = Date.now();
    try {
      // 1x1 transparent PNG pixel base64 para testar visão
      const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const testParts: AIContentPart[] = [
        { text: "Responda apenas com este JSON: {\"status\": \"ok\", \"provider\": \"" + provider + "\"}" },
        { inlineData: { data: testImageBase64, mimeType: "image/png" } }
      ];

      let res: UnifiedAIResult;
      if (provider === 'gemini') {
        const candidateKeys = (overrideKey && overrideKey.trim())
          ? [overrideKey]
          : this.config.gemini.keys;
        const validKeys = candidateKeys
          .map(k => this.sanitizeKey(k))
          .filter(k => k.length > 5 && k !== 'MY_GEMINI_API_KEY');

        if (validKeys.length === 0) {
          return {
            success: false,
            message: "Nenhuma chave Gemini válida informada. Insira sua chave de API (AIzaSy...) ou carregue um arquivo .txt.",
            elapsedMs: 0
          };
        }
        res = await this.executeGemini({ parts: testParts, model: overrideModel }, validKeys);
      } else if (provider === 'groq') {
        const candidateKeys = (overrideKey && overrideKey.trim())
          ? [overrideKey]
          : (this.config.groq.keys.length > 0 ? this.config.groq.keys : [this.config.groq.apiKey]);
        const validKeys = candidateKeys
          .map(k => this.sanitizeKey(k))
          .filter(k => k.length > 5 && k !== 'MY_GROQ_API_KEY');

        if (validKeys.length === 0) {
          return {
            success: false,
            message: "Nenhuma chave Groq Cloud informada. Cole sua chave de API (gsk_...) ou carregue um arquivo .txt.",
            elapsedMs: 0
          };
        }
        res = await this.executeGroq({ prompt: "Responda estritamente com este JSON: {\"status\": \"ok\", \"provider\": \"groq\"}", model: overrideModel }, validKeys);
      } else {
        const candidateKeys = (overrideKey && overrideKey.trim())
          ? [overrideKey]
          : (this.config.openrouter.keys.length > 0 ? this.config.openrouter.keys : [this.config.openrouter.apiKey]);
        const validKeys = candidateKeys
          .map(k => this.sanitizeKey(k))
          .filter(k => k.length > 5 && k !== 'MY_OPENROUTER_API_KEY');

        if (validKeys.length === 0) {
          return {
            success: false,
            message: "Nenhuma chave OpenRouter informada. Cole sua chave de API (sk-or-v1-...) ou carregue um arquivo .txt.",
            elapsedMs: 0
          };
        }
        res = await this.executeOpenRouter({ parts: testParts, model: overrideModel }, validKeys);
      }

      const elapsed = Date.now() - t0;
      const modeDesc = provider === 'groq' ? 'Conexão ultra-rápida LPU' : 'Conexão e análise visual';
      return {
        success: true,
        message: `${modeDesc} bem-sucedidas com ${res.provider.toUpperCase()} (${res.model}) em ${(elapsed / 1000).toFixed(2)}s!`,
        elapsedMs: elapsed
      };
    } catch (err: any) {
      const elapsed = Date.now() - t0;
      return {
        success: false,
        message: formatAIError(err, provider),
        elapsedMs: elapsed
      };
    }
  }
}

export function formatAIError(err: any, provider: AIProviderId): string {
  if (!err) return "Erro desconhecido";
  const rawMsg = err?.message || String(err);
  
  try {
    if (rawMsg.includes('{') && rawMsg.includes('}')) {
      const start = rawMsg.indexOf('{');
      const end = rawMsg.lastIndexOf('}');
      const jsonMatch = rawMsg.substring(start, end + 1);
      const parsed = JSON.parse(jsonMatch);
      const innerErr = parsed?.error || parsed;
      const code = innerErr?.code || innerErr?.status;
      const msg = innerErr?.message || innerErr?.details?.[0]?.message;
      
      if (msg && (msg.toLowerCase().includes('api key not valid') || msg.toLowerCase().includes('api_key_invalid'))) {
        return `Chave do ${provider.toUpperCase()} não autorizada pelo Google (API_KEY_INVALID). Motivos frequentes:\n1. A chave precisa ser criada diretamente em https://aistudio.google.com/apikey (Google AI Studio) e estar sem restrições de aplicativo/HTTP no Google Cloud.\n2. Se foi criada no Google Cloud Console geral, é obrigatório ativar a "Generative Language API" nas APIs do projeto.\n3. Em contas empresariais (Google Workspace), o Gemini pode estar bloqueado pelo administrador. Use uma conta @gmail.com pessoal.\n👉 Dica: Você pode usar o GROQ ou OPENROUTER no topo para gerar roteiros gratuitamente e sem restrições de conta!`;
      }
      if (code === 400 && msg) {
        return `Requisição inválida (${code}): ${msg}`;
      }
      if (code === 429) {
        return `Limite de requisições excedido (${code}) no ${provider.toUpperCase()}. Cota esgotada temporariamente. Experimente alternar para Groq/OpenRouter ou aguarde a renovação da cota.`;
      }
      if (msg) {
        return `${msg}`;
      }
    }
  } catch {}

  const lower = rawMsg.toLowerCase();
  if (lower.includes('api key not valid') || lower.includes('api_key_invalid') || lower.includes('invalid api key')) {
    return `Chave do ${provider.toUpperCase()} inválida ou não autorizada pelo Google. Gere uma nova chave gratuita em https://aistudio.google.com/apikey ou alterne para Groq/OpenRouter no topo.`;
  }
  if (lower.includes('429') || lower.includes('quota') || lower.includes('resource_exhausted')) {
    return `Limite de cota gratuito atingido no ${provider.toUpperCase()} (429 - Cota esgotada). Experimente usar Groq ou OpenRouter no topo.`;
  }

  return rawMsg;
}

export const aiProvidersManager = new AIProvidersManager();

export interface NormalizedScene {
  id: string;
  imageName: string;
  duration: string;
  imagePrompt: string;
  veoPrompt: string;
  digenPrompt: string;
  narration: string;
  description: string;
}

export interface NormalizedSequence {
  id: string;
  sequenceNumber: number;
  title: string;
  approach: string;
  scenes: NormalizedScene[];
}

export interface NormalizedScriptResponse {
  campaignTitle: string;
  scenes: NormalizedScene[];
  sequences: NormalizedSequence[];
}

/**
 * Converte uma lista bruta de cenas em NormalizedScene[]
 */
export function normalizeScenesList(rawScenes: any[], defaultDuration: string = '5s'): NormalizedScene[] {
  if (!Array.isArray(rawScenes)) return [];

  return rawScenes.map((item, index) => {
    if (typeof item !== 'object' || !item) {
      const textVal = String(item || '').trim();
      return {
        id: `scene_${index + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        imageName: `look_${index + 1}`,
        duration: defaultDuration,
        imagePrompt: textVal,
        veoPrompt: textVal,
        digenPrompt: textVal,
        narration: '',
        description: `Cena ${index + 1}`
      };
    }

    const duration = item.duration || item.duracao || item.tempo || defaultDuration;
    const imageName = item.imageName || item.image_name || item.nomeImagem || item.nome_imagem || item.image || item.foto || `look_${index + 1}`;

    const veoPrompt = item.veoPrompt || item.veo_prompt || item.prompt_veo || item.videoPrompt || item.prompt_video || item.imagePrompt || item.image_prompt || '';
    const imagePrompt = item.imagePrompt || item.image_prompt || item.prompt_imagem || item.nanoBananaPrompt || item.prompt || veoPrompt;
    const digenPrompt = item.digenPrompt || item.digen_prompt || item.prompt_digen || item.avatarPrompt || item.prompt_avatar || veoPrompt;
    const narration = item.narration || item.narracao || item.voiceover || item.speech || item.fala || item.texto || '';
    const description = item.description || item.descricao || item.desc || item.cena || item.titulo || `Cena ${index + 1}`;

    return {
      id: item.id || `scene_${index + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      imageName: String(imageName).trim(),
      duration: String(duration).trim(),
      imagePrompt: String(imagePrompt).trim(),
      veoPrompt: String(veoPrompt).trim(),
      digenPrompt: String(digenPrompt).trim(),
      narration: String(narration).trim(),
      description: String(description).trim()
    };
  }).filter(sc => sc.veoPrompt.length > 0 || sc.imagePrompt.length > 0 || sc.narration.length > 0 || sc.description.length > 0);
}

/**
 * Normaliza a resposta da IA para a estrutura esperada pelo aplicativo,
 * lidando com variações de chaves em português/inglês, sequências múltiplas paginadas,
 * arrays diretos, objetos aninhados e campos ausentes.
 */
export function normalizeScriptResponse(raw: any, defaultDuration: string = '5s'): NormalizedScriptResponse | null {
  if (!raw) return null;

  let campaignTitle = 'Campanha TikTok Shop';

  // 1. Suporte prioritário a MÚLTIPLAS SEQUÊNCIAS (Sequência 1, 2, 3, 4, 5...)
  if (typeof raw === 'object' && raw !== null) {
    campaignTitle = raw.campaignTitle || raw.campaign_title || raw.titulo || raw.title || raw.nomeCampanha || campaignTitle;

    const rawSequences = raw.sequences || raw.sequencias || raw.variacoes || raw.videos || raw.sequencesList;
    if (Array.isArray(rawSequences) && rawSequences.length > 0) {
      const normalizedSequences: NormalizedSequence[] = [];

      rawSequences.forEach((seqItem: any, sIdx: number) => {
        if (!seqItem || typeof seqItem !== 'object') return;
        const seqNumber = Number(seqItem.sequenceNumber || seqItem.numero || seqItem.seqIndex || sIdx + 1);
        const title = String(seqItem.title || seqItem.titulo || `Sequência ${seqNumber}`);
        const approach = String(seqItem.approach || seqItem.abordagem || seqItem.estilo || `Variação ${seqNumber}`);
        const seqScenesRaw = seqItem.scenes || seqItem.cenas || seqItem.items || seqItem.roteiro || [];

        if (Array.isArray(seqScenesRaw) && seqScenesRaw.length > 0) {
          const normScenes = normalizeScenesList(seqScenesRaw, defaultDuration);
          if (normScenes.length > 0) {
            normalizedSequences.push({
              id: `seq_${seqNumber}_${Date.now()}_${sIdx}`,
              sequenceNumber: seqNumber,
              title,
              approach,
              scenes: normScenes
            });
          }
        }
      });

      if (normalizedSequences.length > 0) {
        return {
          campaignTitle: String(campaignTitle).trim(),
          scenes: normalizedSequences[0].scenes,
          sequences: normalizedSequences
        };
      }
    }
  }

  // 2. Extração padrão de cenas únicas
  let rawScenes: any[] = [];

  // Se o raw for um array direto [ { ... }, { ... } ]
  if (Array.isArray(raw)) {
    rawScenes = raw;
  } else if (typeof raw === 'object') {
    // Possíveis chaves onde o array de cenas pode estar alocado
    const possibleSceneArrays = [
      raw.scenes,
      raw.cenas,
      raw.items,
      raw.itens,
      raw.roteiro,
      raw.script,
      raw.scenesList,
      raw.video_scenes
    ];

    for (const arr of possibleSceneArrays) {
      if (Array.isArray(arr) && arr.length > 0) {
        rawScenes = arr;
        break;
      }
    }

    // Se ainda não encontrou array, pode ser um mapa de cenas indexadas {"scene1": {...}, "scene2": {...}}
    if (rawScenes.length === 0) {
      const sceneKeys = Object.keys(raw).filter(k =>
        /^(?:scene|cena|item)?\d+$/i.test(k) || (!isNaN(Number(k)) && typeof raw[k] === 'object')
      );
      if (sceneKeys.length > 0) {
        rawScenes = sceneKeys.map(k => raw[k]);
      }
    }
  }

  if (!Array.isArray(rawScenes) || rawScenes.length === 0) {
    return null;
  }

  const normalizedScenes = normalizeScenesList(rawScenes, defaultDuration);
  if (normalizedScenes.length === 0) {
    return null;
  }

  return {
    campaignTitle: String(campaignTitle).trim(),
    scenes: normalizedScenes,
    sequences: [{
      id: `seq_1_${Date.now()}`,
      sequenceNumber: 1,
      title: campaignTitle || 'Sequência 1',
      approach: 'Padrão',
      scenes: normalizedScenes
    }]
  };
}

