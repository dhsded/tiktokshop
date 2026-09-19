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
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash (Recomendado Google)',
    tag: 'Visão HD • Mais Rápido • Gratuito',
    desc: 'Motor de última geração do Google. Máxima velocidade com compreensão visual detalhada de produtos e roupas.',
    hasVision: true,
    isFree: true
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest (Estável)',
    tag: 'Alta Estabilidade • Gratuito',
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
    model: 'gemini-2.5-flash',
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
        if (geminiModel.includes('2.0') || geminiModel.includes('1.5') || geminiModel === 'gemini-2.5-flash-lite' || !GEMINI_MODELS.some(m => m.id === geminiModel)) {
          geminiModel = 'gemini-2.5-flash';
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
   * Sanitiza e limpa chaves de API
   */
  public sanitizeKey(key?: string): string {
    if (!key) return '';
    let k = key.trim();
    k = k.replace(/^["']|["']$/g, '').trim();
    k = k.replace(/^(?:GEMINI_API_KEY|GROQ_API_KEY|OPENROUTER_API_KEY|API_KEY)\s*=\s*/i, '').trim();
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

    const preferredModel = options.model || this.config.gemini.model || 'gemini-2.5-flash';
    const modelsToTry = [
      preferredModel,
      'gemini-2.5-flash',
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
          if (options.systemPrompt) {
            genConfig.systemInstruction = options.systemPrompt;
          }

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
          const errorStr = `${err?.message || ''} ${err?.status || ''}`.toLowerCase();
          const isKeyError = errorStr.includes('429') || 
                             errorStr.includes('quota') || 
                             errorStr.includes('resource_exhausted') || 
                             errorStr.includes('invalid') || 
                             errorStr.includes('expired') ||
                             (errorStr.includes('400') && errorStr.includes('key'));

          if (isKeyError) {
            console.warn(`[Gemini] Chave ${keyIdx + 1}/${keysToTry.length} sem cota ou inválida (${err?.message || ''}). Tentando próxima...`);
            break; // Próxima chave
          }

          if (errorStr.includes('503') || errorStr.includes('overloaded')) {
            await new Promise(r => setTimeout(r, 1000));
            continue; // Próximo modelo ou retry
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

    const messages: any[] = [];
    if (options.systemPrompt) {
      messages.push({
        role: "system",
        content: options.systemPrompt + "\nResponda estritamente em formato JSON válido."
      });
    } else {
      messages.push({
        role: "system",
        content: "Você é um assistente de IA especialista em marketing para TikTok Shop e e-commerce. Responda estritamente em formato JSON válido."
      });
    }

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
          const errMsg = (err?.message || String(err)).toLowerCase();
          console.warn(`[Groq] Falha na chave ${keyIdx + 1}/${keysToTry.length}, modelo ${model}:`, err.message);

          const isKeyError = errMsg.includes('401') || 
                             errMsg.includes('invalid_api_key') || 
                             errMsg.includes('429') || 
                             errMsg.includes('rate_limit') || 
                             errMsg.includes('quota');

          if (isKeyError) {
            console.warn(`[Groq] Chave ${keyIdx + 1} sem cota ou inválida. Tentando próxima chave...`);
            break; // Próxima chave
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

    const messages: any[] = [];
    if (options.systemPrompt) {
      messages.push({
        role: "system",
        content: options.systemPrompt + "\nResponda estritamente em formato JSON válido."
      });
    }
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
              ...(options.systemPrompt ? [{ role: "system", content: options.systemPrompt }] : []),
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
        return `Chave de API do ${provider.toUpperCase()} inválida ou expirada (API_KEY_INVALID). Verifique se copiou a chave correta (AIzaSy... sem aspas ou espaços) ou gere uma nova chave gratuita em https://aistudio.google.com/apikey`;
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
    return `Chave de API do ${provider.toUpperCase()} inválida ou expirada. Verifique se copiou a chave correta ou gere uma nova chave gratuita.`;
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

export interface NormalizedScriptResponse {
  campaignTitle: string;
  scenes: NormalizedScene[];
}

/**
 * Normaliza a resposta da IA para a estrutura esperada pelo aplicativo,
 * lidando com variações de chaves em português/inglês, arrays diretos,
 * objetos aninhados e campos ausentes.
 */
export function normalizeScriptResponse(raw: any, defaultDuration: string = '5s'): NormalizedScriptResponse | null {
  if (!raw) return null;

  let campaignTitle = 'Campanha TikTok Shop';
  let rawScenes: any[] = [];

  // Se o raw for um array direto [ { ... }, { ... } ]
  if (Array.isArray(raw)) {
    rawScenes = raw;
  } else if (typeof raw === 'object') {
    campaignTitle = raw.campaignTitle || raw.campaign_title || raw.titulo || raw.title || raw.nomeCampanha || campaignTitle;

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

  const normalizedScenes: NormalizedScene[] = rawScenes.map((item, index) => {
    if (typeof item !== 'object' || !item) {
      const textVal = String(item || '').trim();
      return {
        id: `scene_${index + 1}_${Date.now()}`,
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
      id: item.id || `scene_${index + 1}_${Date.now()}`,
      imageName: String(imageName).trim(),
      duration: String(duration).trim(),
      imagePrompt: String(imagePrompt).trim(),
      veoPrompt: String(veoPrompt).trim(),
      digenPrompt: String(digenPrompt).trim(),
      narration: String(narration).trim(),
      description: String(description).trim()
    };
  }).filter(sc => sc.veoPrompt.length > 0 || sc.imagePrompt.length > 0 || sc.narration.length > 0 || sc.description.length > 0);

  if (normalizedScenes.length === 0) {
    return null;
  }

  return {
    campaignTitle: String(campaignTitle).trim(),
    scenes: normalizedScenes
  };
}

