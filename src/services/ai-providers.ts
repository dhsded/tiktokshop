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
    name: 'Gemini 2.5 Flash (Recomendado)',
    tag: 'Visão HD • Mais Rápido • Gratuito',
    desc: 'Motor de última geração do Google. Máxima velocidade com compreensão visual detalhada de produtos e roupas.',
    hasVision: true,
    isFree: true
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    tag: 'Alta Estabilidade • Gratuito',
    desc: 'Versão estável e consagrada do Gemini com alta taxa de acerto para schemas JSON e descrições de moda.',
    hasVision: true,
    isFree: true
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    tag: 'Ultraleve • Econômico • Gratuito',
    desc: 'Modelo com menor consumo de cota por requisição, ideal para contas com limites restritos.',
    hasVision: true,
    isFree: true
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    tag: 'Baixa Latência • Gratuito',
    desc: 'Excelente para validação rápida de imagens e ordenação de cenas.',
    hasVision: true,
    isFree: true
  }
];

export const GROQ_MODELS: ModelOption[] = [
  {
    id: 'llama-3.2-11b-vision-preview',
    name: 'Llama 3.2 11B Vision (Recomendado Groq)',
    tag: 'Visão Multimodal • Ultra Rápido • FREE',
    desc: 'Modelo oficial da Meta com visão computacional acelerado por LPUs da Groq. Velocidade insana para analisar fotos.',
    hasVision: true,
    isFree: true
  },
  {
    id: 'llama-3.2-90b-vision-preview',
    name: 'Llama 3.2 90B Vision (Máxima Precisão)',
    tag: '90B Parâmetros • Visão Profunda • FREE',
    desc: 'Raciocínio visual refinado e compreensão detalhada de texturas e atributos do produto.',
    hasVision: true,
    isFree: true
  }
];

export const OPENROUTER_MODELS: ModelOption[] = [
  {
    id: 'openrouter/free',
    name: 'OpenRouter Free Router (Auto-Select Vision)',
    tag: 'Auto-Roteador • Gratuito',
    desc: 'Seleciona dinamicamente o melhor modelo gratuito disponível com suporte a imagens e formato JSON.',
    hasVision: true,
    isFree: true
  },
  {
    id: 'qwen/qwen2.5-vl-72b-instruct:free',
    name: 'Qwen 2.5 VL 72B Instruct (Free)',
    tag: '72B • Líder em Visão • FREE',
    desc: 'Um dos modelos de visão multimodal mais poderosos do mundo com 100% de gratuidade.',
    hasVision: true,
    isFree: true
  },
  {
    id: 'meta-llama/llama-3.2-11b-vision-instruct:free',
    name: 'Llama 3.2 11B Vision Instruct (Free)',
    tag: 'Meta Vision • Gratuito',
    desc: 'Versão instruída oficial do Llama 3.2 com capacidade de leitura de fotos de produtos.',
    hasVision: true,
    isFree: true
  },
  {
    id: 'google/gemma-3-27b-it:free',
    name: 'Google Gemma 3 27B IT (Free)',
    tag: '27B Multimodal • Google • FREE',
    desc: 'Modelo multimodal de peso intermediário do Google, excelente em respostas em português.',
    hasVision: true,
    isFree: true
  },
  {
    id: 'google/gemma-3-12b-it:free',
    name: 'Google Gemma 3 12B IT (Free)',
    tag: '12B Multimodal • Rápido • FREE',
    desc: 'Gemma 3 ágil e eficiente para inspeção visual e escrita de roteiros.',
    hasVision: true,
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
    model: 'llama-3.2-11b-vision-preview',
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
        return {
          activeProvider: parsed.activeProvider || DEFAULT_CONFIG.activeProvider,
          enableFailover: parsed.enableFailover !== undefined ? parsed.enableFailover : true,
          gemini: {
            model: parsed.gemini?.model || DEFAULT_CONFIG.gemini.model,
            keys: Array.isArray(parsed.gemini?.keys) ? parsed.gemini.keys : []
          },
          groq: {
            model: parsed.groq?.model || DEFAULT_CONFIG.groq.model,
            apiKey: parsed.groq?.apiKey || (groqKeys.length > 0 ? groqKeys[0] : ''),
            keys: groqKeys,
            baseUrl: parsed.groq?.baseUrl || DEFAULT_CONFIG.groq.baseUrl
          },
          openrouter: {
            model: parsed.openrouter?.model || DEFAULT_CONFIG.openrouter.model,
            apiKey: parsed.openrouter?.apiKey || (openrouterKeys.length > 0 ? openrouterKeys[0] : ''),
            keys: openrouterKeys,
            baseUrl: parsed.openrouter?.baseUrl || DEFAULT_CONFIG.openrouter.baseUrl
          }
        };
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
  public cleanJsonResponse(rawText: string): string {
    if (!rawText) return '{}';
    let clean = rawText.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    clean = clean.trim();
    try {
      JSON.parse(clean);
      return clean;
    } catch (e) {
      const match = clean.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) {
        return match[0];
      }
      return clean;
    }
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
   * Chamada direta ao Google Gemini com rotação de chaves e cadeia de modelos
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
      'gemini-2.0-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash-lite'
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
            options.onStatusUpdate(`Solicitando Google Gemini (${model} - chave ${keyIdx + 1}/${keysToTry.length})...`);
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
                             errorStr.includes('expired');

          if (isKeyError) {
            console.warn(`[Gemini] Chave ${keyIdx + 1} sem cota ou inválida. Tentando próxima...`);
            break; // Próxima chave
          }

          if (errorStr.includes('503') || errorStr.includes('overloaded')) {
            await new Promise(r => setTimeout(r, 500));
            continue; // Próximo modelo
          }
        }
      }
    }

    throw lastError || new Error("Falha ao comunicar com o Google Gemini.");
  }

  /**
   * Chamada ao Groq Cloud via API OpenAI-compatible com Visão e Rotação de Chaves
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

    const preferredModel = options.model || this.config.groq.model || 'llama-3.2-11b-vision-preview';
    const modelsToTry = [
      preferredModel,
      'llama-3.2-11b-vision-preview',
      'llama-3.2-90b-vision-preview'
    ].filter((m, i, a) => a.indexOf(m) === i);

    let baseUrl = (this.config.groq.baseUrl || 'https://api.groq.com/openai/v1').trim();
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    // Monta mensagens no formato OpenAI com image_url
    const userContent: any[] = [];
    let textAccumulator = '';

    if (options.parts && options.parts.length > 0) {
      for (const p of options.parts) {
        if (p.text) {
          textAccumulator += (textAccumulator ? '\n\n' : '') + p.text;
        } else if (p.inlineData) {
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

    // Loop de chaves com rotação inteligente
    for (let keyIdx = 0; keyIdx < keysToTry.length; keyIdx++) {
      const apiKey = keysToTry[keyIdx];

      for (const model of modelsToTry) {
        try {
          if (options.onStatusUpdate) {
            const rotInfo = keysToTry.length > 1 ? ` [Chave ${keyIdx + 1}/${keysToTry.length}]` : '';
            options.onStatusUpdate(`Solicitando Groq Cloud Vision (${model})${rotInfo}...`);
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
      'qwen/qwen2.5-vl-72b-instruct:free',
      'meta-llama/llama-3.2-11b-vision-instruct:free',
      'google/gemma-3-27b-it:free'
    ].filter((m, i, a) => a.indexOf(m) === i);

    let baseUrl = (this.config.openrouter.baseUrl || 'https://openrouter.ai/api/v1').trim();
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    const userContent: any[] = [];
    let textAccumulator = '';

    if (options.parts && options.parts.length > 0) {
      for (const p of options.parts) {
        if (p.text) {
          textAccumulator += (textAccumulator ? '\n\n' : '') + p.text;
        } else if (p.inlineData) {
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
              messages,
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
        res = await this.executeGroq({ parts: testParts, model: overrideModel }, validKeys);
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
      return {
        success: true,
        message: `Conexão e análise visual bem-sucedidas com ${res.provider.toUpperCase()} (${res.model}) em ${(elapsed / 1000).toFixed(2)}s!`,
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
