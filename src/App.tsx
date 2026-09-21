/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect, ChangeEvent, DragEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactCrop, { type Crop as ReactCropType, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}
import { 
  Upload, 
  Trash2, 
  Play, 
  Settings2, 
  Settings,
  X,
  Activity,
  Image as ImageIcon, 
  ChevronRight, 
  ChevronLeft,
  Loader2,
  Copy,
  Check,
  FileJson,
  Sparkles,
  RefreshCcw,
  GripVertical,
  User,
  Package,
  Key,
  Crop,
  Volume2,
  Mic,
  FileText,
  Download,
  Layers,
  Camera,
  Globe,
  Sun,
  Moon,
  AlertTriangle,
  History,
  Save,
  GripHorizontal,
  EyeOff,
  Pause,
  Square,
  Eye,
  Terminal,
  Filter,
  Link,
  ExternalLink,
  Maximize2,
  Minimize2,
  LogIn,
  ArrowLeft,
  ArrowRight,
  Archive,
  MessageSquareQuote,
  Star,
  Zap,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Cpu,
  RefreshCw,
  XCircle,
  Flame
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { ViralsFinder } from './components/ViralsFinder';
import { 
  aiProvidersManager, 
  AIProviderId, 
  GEMINI_MODELS, 
  GROQ_MODELS, 
  OPENROUTER_MODELS, 
  AIContentPart, 
  UnifiedAIOptions,
  UnifiedAIResult,
  formatAIError,
  normalizeScriptResponse,
  MASTER_COPYWRITING_SYSTEM_INSTRUCTION,
  NormalizedSequence
} from './services/ai-providers';

// ============================================================
// Versão e Histórico
// ============================================================
const APP_VERSION = '1.7.1';

interface VersionEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

const VERSION_HISTORY: VersionEntry[] = [
  {
    version: '1.7.1',
    date: '21/09/2026',
    title: 'Padronização Obrigatória de Gênero da Voz e Tipo de Tom nos Prompts de Vídeo',
    changes: [
      'Novo: Especificação obrigatória e padronizada de gênero da voz (Feminina / Masculina) e tipo de tom nos prompts de vídeo VEO e DIGEN',
      'Novo: Seletor visual de Tom da Voz / Estilo de Locução no Passo 2 (Entusiasta, Confiante, Suave, Achadinho)',
      'Novo: Diretriz #2 atualizada no sistema mestre da IA para garantir unificação estrutural com voz e tom',
      'Novo: Suporte a modo Sem Narração (No voiceover / Instrumental only) mantendo consistência total nos prompts'
    ],
  },
  {
    version: '1.7.0',
    date: '21/09/2026',
    title: 'Buscador de Virais Anônimo, Validação de Produto & Fluxo Nano Banana',
    changes: [
      'Novo: Buscador de Virais opera em partição anônima 100% isolada e deslogada, sem carregar conta de vendedor',
      'Novo: Análise semântica e validação de correspondência de produto (🟢 Match Exato vs 🟡 Variação)',
      'Novo: Filtro dedicado "Apenas Match Exato" e métrica consolidada de correspondência',
      'Novo: Chips de termos sugeridos para refinar buscas com palavras-chave dinâmicas',
      'Novo: Seletor de Fluxo de Imagens e Vídeos: "Fotos Coletadas Diretamente" vs "Nano Banana Primeiro"',
      'Novo: Diretriz #4 na inteligência artificial para orquestração do pipeline em dois estágios'
    ],
  },
  {
    version: '1.6.0',
    date: '21/09/2026',
    title: 'Extração Completa de Descrição e Tabela de Medidas do TikTok Shop',
    changes: [
      'Novo: Extração estruturada da Tabela de Medidas (Busto, Cintura, Quadris, Comprimento, etc.) e especificações técnicas completas',
      'Novo: Extração profunda do copywriting oficial do produto (Destaques, Tecido sensorial, Modelagem e Recomendações)',
      'Novo: Auto-expansão de accordions e botões "Ver mais" no TikTok Shop PDP para garantir extração 100% íntegra',
      'Novo: Card dedicado "Descrição Oficial & Medidas do Produto" na aba de criação com botões de cópia rápida, edição e controle de uso na I.A',
      'Novo: Visualização e cópia da descrição completa no Buscador de Virais e na aba de Detalhes do importador',
      'Novo: Diretriz #3 na inteligência artificial para incorporar fidelidade a tecidos, medidas e modelagens reais nas falas e prompts cinematográficos'
    ],
  },
  {
    version: '1.5.0',
    date: '21/09/2026',
    title: 'Aba Buscador de Virais por ID do TikTok Shop & Ícone Nativo',
    changes: [
      'Novo: Nova aba "Buscador de Virais" para encontrar os 30 vídeos mais vistos com total relação ao produto pelo seu ID',
      'Novo: Métricas consolidadas (Total de Views somadas, Top 1 Maior Viral e Média de Views por vídeo)',
      'Novo: Player de vídeo embutido em modal sem necessidade de sair do aplicativo',
      'Novo: Botão "Criar Roteiro com I.A" em cada card viral para inspirar novas campanhas',
      'Fix: Ícone oficial multi-resolução (.ico) integrado aos executáveis portáteis e instaladores Windows',
      'Fix: Atualização dos modelos Gemini para versões oficiais do Google (2.0-flash e 1.5-flash)'
    ],
  },
  {
    version: '1.4.0',
    date: '18/09/2026',
    title: 'Central Multi-Provedores de I.A com Visão Computacional Gratuita',
    changes: [
      'Novo: Integração oficial com Groq Cloud LPU Vision (Llama 3.2 11B e 90B Vision Preview) 100% gratuito',
      'Novo: Integração com OpenRouter Free Vision (Qwen 2.5 VL 72B, Meta Llama 3.2 Vision, Google Gemma 3)',
      'Novo: Failover Automático Triplo (se o provedor ativo atingir a cota 429, comuta automaticamente)',
      'Novo: Central de I.As dedicada com abas para cada provedor, cartões de seleção e teste em tempo real de visão computacional',
      'Novo: Badge no cabeçalho indicando o provedor ativo e status do failover instantâneo',
      'Novo: Rotação e persistência automática de chaves e configurações no armazenamento local seguro'
    ],
  },
  {
    version: '1.3.0',
    date: '17/09/2026',
    title: 'Importador TikTok Shop por Link',
    changes: [
      'Novo: Importação instantânea de produtos colando o link do TikTok Shop',
      'Novo: Extração automática de todas as fotos em alta resolução original (Full HD/4K)',
      'Novo: Extração de título, preço, benefícios e especificações detalhadas do produto',
      'Novo: Sessão persistente contra verificações de segurança do TikTok',
      'Novo: Seleção visual de fotos com importação direta para a galeria de referências',
    ],
  },
  {
    version: '1.2.0',
    date: '15/07/2026',
    title: 'Espião Auto-Detect & Melhorias',
    changes: [
      'Novo: Espião Auto-Detect — detecta automaticamente campos do DIGEN e Flow',
      'Novo: Mapa visual de campos detectados por categoria (prompts, uploads, configs, ações)',
      'Novo: MutationObserver para detectar campos carregados dinamicamente',
      'Novo: Highlight visual dos campos na webview',
      'Melhoria: Corte de imagens agora é LIVRE (não mais quadrado fixo)',
      'Melhoria: Presets de proporção para corte (Livre, 9:16, 16:9, 1:1, 4:5)',
      'Fix: Prompts VEO/DIGEN agora são puros sem [nome_arquivo.jpg] no início',
      'Fix: Vídeos serão gerados a partir de novas imagens, não das originais',
      'Removido: Sistema de gravação de macros (substituído pelo Auto-Detect)',
    ],
  },
  {
    version: '1.1.0',
    date: '15/07/2026',
    title: 'Espião de Ações (Legado)',
    changes: [
      'Ferramenta Espião de Ações (substituída na v1.2.0)',
    ],
  },
  {
    version: '1.0.0',
    date: '14/07/2026',
    title: 'Lançamento Inicial',
    changes: [
      'Gerador de roteiros narrativos com IA (Gemini)',
      'Modo Coleção: múltiplas imagens com sequenciamento automático',
      'Modo Produto: ângulos únicos com geração por produto',
      'Prompts de imagem, VEO e Digen para cada cena',
      'Narração automática por cena',
      'Injetor de Prompts com webview integrado',
      'Suporte a múltiplas chaves de API com rotação',
      'Exportação em PDF e JSON',
      'Tema claro/escuro',
      'Crop de imagens integrado',
    ],
  },
];

declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: any;
    }
  }
  interface Window {
    electronAPI: {
      platform: string;
      openInjectorWindow: (data: any) => void;
      injectorReady: () => void;
      onLoadPrompts: (callback: (data: any) => void) => () => void;
      // Espião de Ações — Auto-Detect
      openSpyWindow: (data?: any) => void;
      spyReady: () => void;
      onSpyData: (callback: (data: any) => void) => () => void;
      writeSpyScanResults: (data: any) => void;
      saveProjectAssets: (payload: any) => Promise<{ success: boolean; path?: string; error?: string }>;
      loadSiteSchema: (siteName: string) => Promise<any>;
      saveSiteSchema: (payload: any) => Promise<{ success: boolean; error?: string }>;
      setCurrentDownloadInfo: (info: any) => Promise<boolean>;
      uploadFileToWebview: (payload: { webContentsId: number, projectIndex: number, imageName?: string, sceneIndex?: number, imageIndex?: number, isFinal?: boolean }) => Promise<{ success: boolean; error?: string }>;
      onDownloadEvent: (callback: (data: any) => void) => () => void;
      fetchImageAsBase64: (url: string) => Promise<{ success: boolean; dataUrl?: string; mimeType?: string; error?: string }>;
    };
  }
}

type TabMode = 'collection' | 'product' | 'virals';

// --- Types ---

interface SceneImage {
  id: string;
  file: File;
  preview: string;
  originalPreview?: string;
  croppedPreview?: string;
  name: string;
  cropState?: {
    crop?: any;
    zoom: number;
    aspect?: number;
    cropSize?: { width: number; height: number };
    croppedAreaPixels: Area;
  };
}

interface SiteSchema {
  siteName: string;
  configs: Array<{
    label: string;
    selector: string;
    type: string;
    options?: string[];
  }>;
  actions: Array<{
    label: string;
    selector: string;
    type: string;
  }>;
}

interface GeneratedScene {
  id: string;
  imageName: string;
  duration: string;
  imagePrompt: string;
  veoPrompt: string;
  digenPrompt: string;
  narration: string;
  description: string;
}

interface ScriptSequence {
  id: string;
  sequenceNumber: number;
  title: string;
  approach: string;
  scenes: GeneratedScene[];
}

interface ScriptResponse {
  campaignTitle: string;
  scenes: GeneratedScene[];
  sequences?: ScriptSequence[];
}

interface GeneratedAngle {
  angleName: string;
  imagePrompt: string;
  veoPrompt: string;
  digenPrompt: string;
  narration: string;
}

// --- Constants ---

const DURATIONS = ['4s', '6s', '8s'];
const THEMES = [
  'Roupas Casuais',
  'Coleção de Verão',
  'Noite Elegante',
  'Estilo Streetwear',
  'Moda Fitness / Esportiva',
  'Profissional / Social',
  'Boho Chic',
  'Essenciais Minimalistas'
];

function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

const TIKTOK_PDP_SCRAPER_SCRIPT = `
(() => {
  try {
    const currentUrl = window.location.href || '';
    if (
      currentUrl.includes('/login') ||
      currentUrl.includes('/auth') ||
      currentUrl.includes('/signup') ||
      currentUrl.includes('/passport')
    ) {
      try {
        const u = new URL(currentUrl);
        const redirectUrl = u.searchParams.get('redirect_url');
        if (redirectUrl && (redirectUrl.includes('tiktok.com') || redirectUrl.includes('shop.tiktok.com'))) {
          window.location.href = decodeURIComponent(redirectUrl);
          return { status: 'redirecting_back', title: '' };
        }
      } catch (e) {}
      return { status: 'auth_page', title: '' };
    }

    const bodyText = (document.body ? (document.body.innerText || document.body.textContent || '') : '');
    const hasProductContent = !!(
      document.querySelector('h1') ||
      document.querySelector('[data-testid*="title"]') ||
      document.querySelector('[class*="product-title"]') ||
      document.querySelector('[class*="product_name"]') ||
      document.querySelector('[class*="sale-price"]') ||
      document.querySelector('[class*="price-val"]') ||
      document.querySelector('[class*="price"]') ||
      bodyText.includes('R$') ||
      bodyText.includes('Vendido por') ||
      bodyText.includes('Frete grátis') ||
      bodyText.includes('Comprar agora')
    );

    const isSecurityTitle = (document.title || '').toLowerCase().includes('security check');
    let isCaptchaImgVisible = false;
    try {
      const captchaImg = document.getElementById('captcha-verify-image');
      isCaptchaImgVisible = !!(captchaImg && (captchaImg.offsetParent !== null || captchaImg.offsetWidth > 20));
    } catch (e) {}

    let isContainerVisible = false;
    try {
      const captchaContainer = document.getElementById('captcha_container');
      isContainerVisible = !!(
        captchaContainer &&
        captchaContainer.style &&
        captchaContainer.style.display !== 'none' &&
        captchaContainer.style.visibility !== 'hidden' &&
        (captchaContainer.offsetWidth > 30 || captchaContainer.offsetHeight > 30)
      );
    } catch (e) {}

    const isCaptcha = !hasProductContent && (isSecurityTitle || isCaptchaImgVisible || isContainerVisible);
    if (isCaptcha) {
      return { status: 'captcha', title: document.title || '' };
    }

    try {
      const closeSelectors = ['[data-e2e="modal-close-icon"]','button[aria-label="Close"]','button[aria-label="Fechar"]','[class*="modal-close"]','[class*="close-icon"]','[class*="DivClose"]','[class*="login-modal"] button','div[role="dialog"] button'];
      for (const sel of closeSelectors) {
        const btn = document.querySelector(sel);
        if (btn && typeof btn.click === 'function') { btn.click(); break; }
      }
      const overlays = document.querySelectorAll('[class*="DivLoginModal"],[class*="login-modal"],div[role="dialog"],[class*="Mask"]');
      overlays.forEach(ov => {
        const text = (ov.innerText || ov.textContent || '').toLowerCase();
        if (text.includes('entrar') || text.includes('log in') || text.includes('login') || text.includes('criar conta') || text.includes('realmente você')) ov.remove();
      });
      document.body.style.overflow = 'auto';
      if (document.documentElement) document.documentElement.style.overflow = 'auto';
    } catch (e) {}

    let title = '';
    const titleEl = document.querySelector('h1') || document.querySelector('[data-testid*="title"]') || document.querySelector('[class*="title"]') || document.querySelector('[class*="product_name"]');
    if (titleEl) {
      title = (titleEl.textContent || titleEl.innerText || '').trim();
    } else {
      title = (document.title || '').replace(/\\s*\\|\\s*TikTok\\s*Shop.*/i, '').replace(/\\s*\\|\\s*TikTok.*/i, '').trim();
    }

    let price = '';
    const priceEl = document.querySelector('[class*="price-val"],[class*="price_val"],[class*="sale-price"],[class*="product-price"],[data-testid*="price"]');
    if (priceEl) price = (priceEl.textContent || priceEl.innerText || '').trim();

    // 1. Tentar auto-expandir accordions / botões de descrição do produto
    try {
      const expandTargets = Array.from(document.querySelectorAll('button, div, span, p, h2, h3, h4, h5, h6, [role="button"], summary, a')).filter(el => {
        if (el.children.length > 3) return false;
        const t = (el.innerText || el.textContent || '').trim().toLowerCase();
        return (
          t === 'descrição do produto' ||
          t === 'medidas do produto' ||
          t === 'detalhes do produto' ||
          t === 'sobre este produto' ||
          t === 'especificações' ||
          t === 'product description' ||
          t === 'tabela de medidas' ||
          t === 'tabela de tamanhos' ||
          t === 'ver mais' ||
          t === 'leia mais' ||
          t === 'mostrar mais'
        );
      });
      for (const target of expandTargets) {
        try {
          const isExpanded = target.getAttribute('aria-expanded') === 'true' || target.closest('[aria-expanded="true"]');
          if (!isExpanded) {
            target.click();
            target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          }
        } catch (e) {}
      }
    } catch (e) {}

    // 2. Extração da Tabela de Medidas (HTML Table e CSS Grid/Divs)
    let extractedSizeTable = '';
    try {
      const tableEls = Array.from(document.querySelectorAll('table, [class*="size-chart"], [class*="size_chart"], [class*="sizeTable"], [class*="SizeChart"], [role="table"]'));
      for (const tb of tableEls) {
        const rows = Array.from(tb.querySelectorAll('tr, [role="row"]'));
        if (rows.length > 0) {
          const tableLines = [];
          rows.forEach(r => {
            const cells = Array.from(r.querySelectorAll('th, td, [role="columnheader"], [role="cell"]'))
              .map(c => (c.innerText || c.textContent || '').trim())
              .filter(Boolean);
            if (cells.length > 0) {
              tableLines.push(cells.join(' | '));
            }
          });
          if (tableLines.length >= 2 && !extractedSizeTable) {
            extractedSizeTable = '📏 TABELA DE MEDIDAS DO PRODUTO:\\n' + tableLines.join('\\n');
            break;
          }
        }
      }

      if (!extractedSizeTable) {
        const measureHeaders = Array.from(document.querySelectorAll('*')).filter(el => {
          if (el.children.length > 2) return false;
          const t = (el.innerText || el.textContent || '').trim().toLowerCase();
          return t === 'medidas do produto' || t === 'tabela de medidas' || t === 'size guide';
        });
        for (const mh of measureHeaders) {
          const container = mh.parentElement || mh.nextElementSibling;
          if (container) {
            const raw = (container.innerText || '').trim();
            if (raw && (raw.includes('Busto') || raw.includes('Cintura') || raw.includes('Tamanho') || raw.includes('cm'))) {
              const lines = raw.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
              if (lines.length > 2) {
                extractedSizeTable = '📏 ' + lines.join('\\n');
                break;
              }
            }
          }
        }
      }
    } catch (e) {}

    // 3. Extração dos textos da descrição
    const descParts = [];
    const seenTexts = new Set();
    const addCleanText = (txt) => {
      if (!txt || typeof txt !== 'string') return;
      const clean = txt.trim();
      if (clean.length < 4) return;
      const lower = clean.toLowerCase();
      if (
        lower === 'descrição do produto' ||
        lower === 'product description' ||
        lower === 'comprar agora' ||
        lower === 'adicionar ao carrinho' ||
        lower === 'frete grátis' ||
        lower === 'cupom de desconto' ||
        lower.includes('política de devolução') ||
        lower.includes('todos os direitos reservados') ||
        lower.includes('denunciar este produto') ||
        lower.includes('tiktok shop')
      ) return;
      if (!seenTexts.has(clean)) {
        seenTexts.add(clean);
        descParts.push(clean);
      }
    };

    try {
      const descHeaders = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,div,span,p,strong,b,summary,button')).filter(el => {
        if (el.children.length > 2) return false;
        const t = (el.innerText || el.textContent || '').trim().toLowerCase();
        return (
          t === 'descrição do produto' ||
          t === 'detalhes do produto' ||
          t === 'sobre este produto' ||
          t === 'especificações' ||
          t === 'product description' ||
          t === 'about this item'
        );
      });

      for (const h of descHeaders) {
        let container = h.closest('section, article, [class*="detail"], [class*="desc"], [class*="about"], [class*="collapse"], [class*="panel"], [class*="module"], [class*="Specification"], [class*="Content"]');
        if (!container) {
          container = h.nextElementSibling || (h.parentElement && h.parentElement.nextElementSibling) || h.parentElement;
        }
        if (container) {
          const rawInnerText = (container.innerText || '').trim();
          if (rawInnerText.length > 20) {
            const rawLines = rawInnerText.split('\\n').map(l => l.trim()).filter(Boolean);
            rawLines.forEach(l => {
              if (l.toLowerCase() !== (h.innerText || '').trim().toLowerCase()) {
                addCleanText(l);
              }
            });
          }
        }
      }
    } catch (e) {}

    if (descParts.length < 3) {
      try {
        const directSelectors = [
          '[class*="desc-content"]',
          '[class*="detail-desc"]',
          '[class*="product-desc"]',
          '[class*="rich-text"]',
          '[class*="Specification"]',
          '[class*="specification"]',
          '[data-testid*="desc"]',
          '[data-testid*="detail"]',
          '[data-testid*="specification"]'
        ];
        directSelectors.forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            const lines = (el.innerText || '').split('\\n').map(l => l.trim()).filter(Boolean);
            lines.forEach(l => addCleanText(l));
          });
        });
      } catch (e) {}
    }

    try {
      const scanObjForDesc = (obj, depth) => {
        if (!obj || depth > 8 || typeof obj !== 'object') return;
        try {
          for (const k of Object.keys(obj)) {
            const lk = k.toLowerCase();
            const val = obj[k];
            if (
              (lk === 'description' || lk === 'product_description' || lk === 'product_desc' || lk === 'detail_desc' || lk === 'specifications' || lk === 'desc' || lk === 'rich_text' || lk === 'introduction') &&
              typeof val === 'string' && val.trim().length > 10
            ) {
              const cleaned = val
                .replace(/<br\\s*[\\/]?>/gi, '\\n')
                .replace(/<\\/p>/gi, '\\n')
                .replace(/<\\/li>/gi, '\\n')
                .replace(/<[^>]*>/g, ' ')
                .trim();
              cleaned.split('\\n').map(l => l.trim()).filter(Boolean).forEach(l => addCleanText(l));
            }
            if (lk.includes('size_chart') || lk.includes('size_table')) {
              if (typeof val === 'string' && val.length > 10 && !extractedSizeTable) {
                extractedSizeTable = '📏 ' + val.replace(/<[^>]*>/g, ' ').trim();
              }
            }
            if (Array.isArray(val)) {
              val.forEach(item => {
                if (typeof item === 'string' && item.length > 15 && depth < 5 && (lk.includes('desc') || lk.includes('highlight') || lk.includes('feature') || lk.includes('prop'))) {
                  addCleanText(item);
                } else if (typeof item === 'object') {
                  scanObjForDesc(item, depth + 1);
                }
              });
            } else if (typeof val === 'object') {
              scanObjForDesc(val, depth + 1);
            }
          }
        } catch (e) {}
      };

      if (window.__UNIVERSAL_DATA_FOR_REHYDRATION__) scanObjForDesc(window.__UNIVERSAL_DATA_FOR_REHYDRATION__, 0);
      if (window.SIGI_STATE) scanObjForDesc(window.SIGI_STATE, 0);
      if (window.__INIT_DATA__) scanObjForDesc(window.__INIT_DATA__, 0);
      if (window.__RENDER_DATA__) scanObjForDesc(window.__RENDER_DATA__, 0);
    } catch (e) {}

    let finalDescription = '';
    if (extractedSizeTable) {
      finalDescription += extractedSizeTable + '\\n\\n';
    }
    if (descParts.length > 0) {
      finalDescription += descParts.join('\\n');
    }
    finalDescription = finalDescription.trim();

    const rawImages = [];
    const seenUrls = new Set();
    const addImageCandidate = (originalSrc) => {
      if (!originalSrc || typeof originalSrc !== 'string' || !originalSrc.startsWith('http')) return;
      if (originalSrc.startsWith('data:image/svg') || originalSrc.includes('.svg')) return;
      const lower = originalSrc.toLowerCase();
      if (lower.includes('-avt-') || lower.includes('/avatar/') || lower.includes('user_avatar') || lower.includes('shop_logo') || lower.includes('shop-logo') || lower.includes('shop_icon') || lower.includes('favicon') || lower.includes('captcha') || lower.includes('secsdk')) return;
      const rawPart = originalSrc.split('?')[0].split('/').pop() || '';
      const baseKey = rawPart.length > 4 ? rawPart.split('~')[0] : originalSrc;
      if (seenUrls.has(baseKey)) return;
      seenUrls.add(baseKey);
      let highResUrl = originalSrc;
      if (highResUrl.includes('~tplv-')) {
        const parts = highResUrl.split('~tplv-');
        const bucketMatch = highResUrl.match(/~tplv-([a-z0-9_-]+)-/i);
        const bucketKey = bucketMatch ? bucketMatch[1] : '';
        if (parts[0].includes('.jpeg') || parts[0].includes('.jpg') || parts[0].includes('.png') || parts[0].includes('.webp')) highResUrl = parts[0];
        else if (bucketKey) highResUrl = parts[0] + '~tplv-' + bucketKey + '-origin-jpeg.jpeg';
        else highResUrl = highResUrl.replace(/resize-[^:]+:[0-9]+:[0-9]+/i,'resize-jpeg:1080:1080').replace(/shrink:[0-9]+:[0-9]+/i,'resize-jpeg:1080:1080').replace(/c5_[0-9]+x[0-9]+/i,'1080x1080');
      }
      if (highResUrl.includes('?') && !highResUrl.includes('x-tos-') && !highResUrl.includes('signature=')) highResUrl = highResUrl.split('?')[0];
      rawImages.push({ highResUrl, fallbackUrl: originalSrc });
    };

    try {
      const scanObjForImages = (obj, depth) => {
        if (!obj || depth > 8 || typeof obj !== 'object') return;
        try {
          for (const k of Object.keys(obj)) {
            const lk = k.toLowerCase();
            const val = obj[k];
            if ((lk.includes('image') || lk.includes('cover') || lk.includes('pic') || lk === 'photos' || lk === 'gallery' || lk === 'images') && Array.isArray(val)) {
              val.forEach(item => { const u = typeof item === 'string' ? item : ((item.url_list && item.url_list[0]) || item.url || item.src || item.uri || item.origin_url || ''); if (u && typeof u === 'string' && u.startsWith('http')) addImageCandidate(u); });
            }
            if (typeof val === 'string' && val.startsWith('http') && (val.includes('.jpeg') || val.includes('.jpg') || val.includes('.png') || val.includes('.webp') || val.includes('ibyteimg') || val.includes('tos-')) && (lk.includes('url') || lk.includes('image') || lk.includes('thumb') || lk.includes('pic') || lk.includes('src'))) addImageCandidate(val);
            if (typeof val === 'object') scanObjForImages(val, depth + 1);
          }
        } catch (e) {}
      };
      if (window.__UNIVERSAL_DATA_FOR_REHYDRATION__) scanObjForImages(window.__UNIVERSAL_DATA_FOR_REHYDRATION__, 0);
      if (window.SIGI_STATE) scanObjForImages(window.SIGI_STATE, 0);
      if (window.__INIT_DATA__) scanObjForImages(window.__INIT_DATA__, 0);
      if (window.__RENDER_DATA__) scanObjForImages(window.__RENDER_DATA__, 0);
      if (window.__PAGE_DATA__) scanObjForImages(window.__PAGE_DATA__, 0);
      if (window.__APP_DATA__) scanObjForImages(window.__APP_DATA__, 0);
      if (window.__STORE__) scanObjForImages(window.__STORE__, 0);
      Array.from(document.querySelectorAll('script[type="application/json"],script[id*="DATA"],script[id*="STATE"],script[id*="render"],script[id*="app"]')).forEach(s => {
        try { const txt = s.textContent || ''; if (txt.includes('http') && (txt.includes('image') || txt.includes('tos-') || txt.includes('ibyteimg') || txt.includes('tiktokcdn'))) scanObjForImages(JSON.parse(txt), 0); } catch (e) {}
      });
    } catch (e) {}

    try {
      Array.from(document.querySelectorAll('img')).forEach(img => {
        if (img.closest('header,nav,footer,[class*="avatar"],[class*="profile"],#captcha_container,[class*="captcha"]')) return;
        const w = img.naturalWidth || img.width || 0, h = img.naturalHeight || img.height || 0;
        if (w > 0 && w < 30 && h > 0 && h < 30) return;
        let src = '';
        if (img.srcset) { const cands = img.srcset.split(',').map(s => s.trim().split(/\\s+/)[0]).filter(Boolean); if (cands.length > 0) src = cands[cands.length - 1]; }
        if (!src) src = img.currentSrc || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-origin-src') || img.getAttribute('data-highres') || img.src || img.getAttribute('src') || '';
        if (src && src.startsWith('http')) addImageCandidate(src);
      });
      Array.from(document.querySelectorAll('picture source[srcset]')).forEach(s => { const cands = (s.getAttribute('srcset') || '').split(',').map(str => str.trim().split(/\\s+/)[0]).filter(Boolean); if (cands.length > 0) addImageCandidate(cands[cands.length - 1]); });
      Array.from(document.querySelectorAll('[style*="background-image"]')).forEach(el => { const m = (el.style.backgroundImage || '').match(/url\\(['"]?(https?:[^'"\\)]+)['"]?\\)/i); if (m && m[1]) addImageCandidate(m[1]); });
    } catch (e) {}

    if (rawImages.length === 0) {
      try { Array.from(document.querySelectorAll('img')).forEach(img => { const s = img.currentSrc || img.src || img.getAttribute('data-src') || ''; if (s && s.startsWith('http') && !s.includes('.svg') && !s.includes('-avt-') && !s.includes('avatar')) addImageCandidate(s); }); } catch (e) {}
    }

    const uniqueImages = [];
    const finalHashes = new Set();
    rawImages.forEach(item => {
      const raw = item.fallbackUrl.split('/').pop() || item.fallbackUrl;
      const key = raw.split('~')[0];
      if (!finalHashes.has(key)) { finalHashes.add(key); uniqueImages.push(item); }
    });

    if (uniqueImages.length === 0) return { status: 'no_product_images', title, price, images: [] };

    const reviewsData = { rating: '', totalReviews: '', tags: [], comments: [] };
    try {
      const ratingEl = document.querySelector('[class*="rating-score"],[class*="rating_score"],[class*="rate-num"],[class*="rating-val"],[data-testid*="rating"]');
      if (ratingEl) { const m = (ratingEl.textContent || '').match(/([1-5]\\.[0-9])/); if (m) reviewsData.rating = m[1]; }
      const countEl = document.querySelector('[class*="review-count"],[class*="rate-count"],[class*="evaluation-count"],[data-testid*="review-count"]');
      if (countEl) { const m = (countEl.textContent || '').match(/(\\d+[\\d.,]*[kK]?)/); if (m) reviewsData.totalReviews = m[1]; }
      Array.from(document.querySelectorAll('[class*="tag-item"],[class*="review-tag"],[class*="tag_item"],[class*="filter-item"],[class*="chip-item"],[data-testid*="review-tag"]')).forEach(el => { const t = (el.textContent || '').trim(); if (t && t.length > 2 && t.length < 40 && !reviewsData.tags.includes(t)) reviewsData.tags.push(t); });
      const parseCard = (card, idx) => {
        const rawText = (card.textContent || '').trim();
        if (!rawText || rawText.length < 6) return null;
        let author = '';
        const am = rawText.match(/^([^\\n·]+?)\\s*·\\s*(?:Compras verificadas|Verified purchase)/im);
        if (am) { author = am[1].trim(); } else { const ae = card.querySelector('[class*="user"],[class*="name"],[class*="nick"],[class*="author"]'); if (ae) author = (ae.textContent || '').trim(); }
        let variant = ''; const vm = rawText.match(/Item:\\s*([^\\n]+)/i); if (vm) variant = vm[1].trim();
        let date = ''; const dm = rawText.match(/(\\d{4}[-/.]\\d{2}[-/.]\\d{2}|\\d{2}[-/.]\\d{2}[-/.]\\d{4})/); if (dm) date = dm[1].trim();
        const lines = rawText.split('\\n').map(l => l.trim()).filter(l => {
          if (!l || l.length < 2) return false;
          if (author && (l === author || l.startsWith(author + ' ·'))) return false;
          if (l === 'BR' || l.includes('Compras verificadas') || l.includes('Verified purchase')) return false;
          if (/^item:\\s*/i.test(l) || (date && l === date) || /^\\d{4}[-/.]\\d{2}[-/.]\\d{2}/.test(l)) return false;
          if (l.includes('Exibindo') || l.includes('Limpar filtros') || l.includes('Tudo') || l.includes('Inclui imagens') || l.includes('Anterior') || l.includes('Próximo') || l.includes('Next')) return false;
          return true;
        });
        const commentText = lines.join(' ').trim();
        if (!commentText || commentText.length < 5) return null;
        return { id: 'rev_dom_' + idx + '_' + Math.random().toString(36).substring(2, 6), text: commentText, author: author || undefined, variant: variant ? ('Item: ' + variant) : undefined, date: date || undefined, rating: '5' };
      };
      const badges = Array.from(document.querySelectorAll('span,div,p,b,strong')).filter(el => { if (el.children.length > 1) return false; const txt = (el.textContent || '').trim(); return txt.includes('Compras verificadas') || txt.includes('Verified purchase'); });
      let detectedCards = [];
      if (badges.length > 0) {
        const cardSet = new Set();
        badges.forEach(b => { let cur = b.parentElement; for (let s = 0; s < 5; s++) { if (!cur || cur === document.body) break; if (cur.parentElement && (cur.parentElement.children.length >= 2 || cur.tagName === 'LI')) { cardSet.add(cur); break; } cur = cur.parentElement; } });
        detectedCards = Array.from(cardSet);
      }
      if (detectedCards.length === 0) detectedCards = Array.from(document.querySelectorAll('[class*="review-item"],[class*="review_item"],[class*="ReviewItem"],[class*="comment-item"],[class*="feedback-item"],[data-testid*="review-item"]'));
      detectedCards.forEach((card, idx) => { const parsed = parseCard(card, idx); if (parsed && !reviewsData.comments.some(c => c.text === parsed.text)) reviewsData.comments.push(parsed); });
    } catch (e) {}

    if (reviewsData.comments.length > 100) reviewsData.comments = reviewsData.comments.slice(0, 100);

    return {
      status: 'success',
      title,
      price,
      description: finalDescription,
      images: uniqueImages.map((img, i) => ({ id: 'img_' + i, url: img.highResUrl, fallbackUrl: img.fallbackUrl })),
      reviews: reviewsData
    };
  } catch (fatalError) {
    return {
      status: 'error',
      message: String(fatalError && fatalError.message ? fatalError.message : fatalError),
      title: (document.title || '').replace(/\\s*\\|\\s*TikTok\\s*Shop.*/i, '').trim(),
      price: '',
      description: '',
      images: []
    };
  }
})()
`;

// Script para extrair unicamente avaliações do DOM da página atual do Webview
export const TIKTOK_REVIEWS_EXTRACTOR_SCRIPT = `
(() => {
  try {
    const reviewsData = {
      rating: '',
      totalReviews: '',
      tags: [],
      comments: []
    };

    const ratingEl = document.querySelector('[class*="rating-score"], [class*="rating_score"], [class*="rate-num"], [class*="rating-val"], [data-testid*="rating"]');
    if (ratingEl) {
      const m = (ratingEl.innerText || '').match(/([1-5]\\.[0-9])/);
      if (m) reviewsData.rating = m[1];
    }

    const countEl = document.querySelector('[class*="review-count"], [class*="rate-count"], [class*="evaluation-count"], [data-testid*="review-count"]');
    if (countEl) {
      const m = (countEl.innerText || '').match(/(\\d+[\\d.,]*[kK]?)/);
      if (m) reviewsData.totalReviews = m[1];
    }

    const exibindoEl = Array.from(document.querySelectorAll('*')).find(el => {
      const t = el.textContent || '';
      return t.includes('Exibindo') && t.includes('avaliações') && el.children.length === 0;
    });
    if (exibindoEl) {
      const m = exibindoEl.textContent.match(/(\\d+)\\s*(?:de|of)\\s*(\\d+)/i);
      if (m && !reviewsData.totalReviews) {
        reviewsData.totalReviews = m[2];
      }
    }

    const tagEls = Array.from(document.querySelectorAll('[class*="tag-item"], [class*="review-tag"], [class*="tag_item"], [class*="tagItem"], [class*="filter-item"], [class*="chip-item"], [data-testid*="review-tag"]'));
    tagEls.forEach(el => {
      const t = el.innerText ? el.innerText.trim() : '';
      if (t && t.length > 2 && t.length < 40 && !reviewsData.tags.includes(t)) {
        reviewsData.tags.push(t);
      }
    });

    const parseCard = (card, idx) => {
      const rawText = card.innerText ? card.innerText.trim() : '';
      if (!rawText || rawText.length < 6) return null;

      let author = '';
      const authorMatch = rawText.match(/^([^\\n·]+?)\\s*·\\s*(?:Compras verificadas|Verified purchase)/im);
      if (authorMatch) {
        author = authorMatch[1].trim();
      } else {
        const authorEl = card.querySelector('[class*="user"], [class*="name"], [class*="nick"], [class*="author"]');
        if (authorEl) author = authorEl.innerText.trim();
      }

      let variant = '';
      const varMatch = rawText.match(/Item:\\s*([^\\n]+)/i);
      if (varMatch) {
        variant = varMatch[1].trim();
      }

      let date = '';
      const dateMatch = rawText.match(/(\\d{4}[-/.]\\d{2}[-/.]\\d{2}|\\d{2}[-/.]\\d{2}[-/.]\\d{4})/);
      if (dateMatch) {
        date = dateMatch[1].trim();
      }

      const lines = rawText.split('\\n')
        .map(l => l.trim())
        .filter(l => {
          if (!l || l.length < 2) return false;
          if (author && (l === author || l.startsWith(author + ' ·'))) return false;
          if (l === 'BR' || l.includes('Compras verificadas') || l.includes('Verified purchase')) return false;
          if (/^item:\\s*/i.test(l)) return false;
          if (date && l === date) return false;
          if (/^\\d{4}[-/.]\\d{2}[-/.]\\d{2}/.test(l)) return false;
          if (l.includes('Exibindo') || l.includes('Limpar filtros') || l.includes('Tudo') || l.includes('Inclui imagens')) return false;
          if (l.includes('Anterior') || l.includes('Próximo') || l.includes('Next')) return false;
          return true;
        });

      let commentText = lines.join(' ').trim();
      if (!commentText || commentText.length < 5) return null;

      return {
        id: 'rev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7),
        text: commentText,
        author: author || undefined,
        variant: variant ? ('Item: ' + variant) : undefined,
        date: date || undefined,
        rating: '5'
      };
    };

    const verifiedBadges = Array.from(document.querySelectorAll('span, div, p, b, strong')).filter(el => {
      if (el.children.length > 1) return false;
      const txt = (el.textContent || '').trim();
      return txt === 'Compras verificadas' || txt === 'Verified purchase' || txt.includes('Compras verificadas') || txt.includes('Verified purchase');
    });

    let detectedCards = [];
    if (verifiedBadges.length > 0) {
      const cardSet = new Set();
      verifiedBadges.forEach(b => {
        let cur = b.parentElement;
        for (let step = 0; step < 5; step++) {
          if (!cur || cur === document.body) break;
          if (cur.parentElement && (cur.parentElement.children.length >= 2 || cur.tagName === 'LI')) {
            cardSet.add(cur);
            break;
          }
          cur = cur.parentElement;
        }
      });
      detectedCards = Array.from(cardSet);
    }

    if (detectedCards.length === 0) {
      detectedCards = Array.from(document.querySelectorAll('[class*="review-item"], [class*="review_item"], [class*="ReviewItem"], [class*="comment-item"], [class*="feedback-item"], [data-testid*="review-item"]'));
    }

    detectedCards.forEach((card, idx) => {
      const parsed = parseCard(card, idx);
      if (parsed && !reviewsData.comments.some(c => c.text === parsed.text)) {
        reviewsData.comments.push(parsed);
      }
    });

    return reviewsData;
  } catch (err) {
    return { error: err.message, comments: [] };
  }
})()
`;

// Script para avançar para a próxima página de avaliações no Webview
export const createTikTokReviewsAdvanceScript = (targetPageNum: number) => `
(() => {
  try {
    const allClickables = Array.from(document.querySelectorAll('button, a, div[role="button"], li, span'));

    const pageNumBtn = allClickables.find(el => {
      const txt = (el.innerText || el.textContent || '').trim();
      return txt === String(\${targetPageNum}) && !el.classList.contains('active') && !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true';
    });

    if (pageNumBtn) {
      pageNumBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      pageNumBtn.click();
      return { success: true, method: 'page_number', page: \${targetPageNum} };
    }

    const nextBtn = allClickables.find(el => {
      const txt = (el.innerText || el.textContent || '').trim();
      const isNextText = txt === 'Próximo' || txt === 'Next' || txt.includes('Próximo') || txt.includes('Next') || txt === '>';
      const isNotDisabled = !el.hasAttribute('disabled') && 
                            el.getAttribute('aria-disabled') !== 'true' && 
                            !el.classList.contains('disabled') &&
                            !el.classList.contains('is-disabled');
      return isNextText && isNotDisabled;
    });

    if (nextBtn) {
      nextBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      nextBtn.click();
      return { success: true, method: 'next_button' };
    }

    const pagContainer = document.querySelector('[class*="pagination"], [class*="pager"], [class*="page-list"]');
    if (pagContainer) {
      const items = Array.from(pagContainer.querySelectorAll('button, a, div[role="button"], li'));
      if (items.length > 1) {
        const last = items[items.length - 1];
        if (!last.hasAttribute('disabled') && last.getAttribute('aria-disabled') !== 'true' && !last.classList.contains('disabled')) {
          last.scrollIntoView({ behavior: 'smooth', block: 'center' });
          last.click();
          return { success: true, method: 'pagination_last_item' };
        }
      }
    }

    return { success: false, reason: 'no_next_page' };
  } catch (err) {
    return { success: false, error: err.message };
  }
})()
`;

interface N8NFlowchartProps {
  queueLength: number;
  activeNode: number; // 0 a 5
  isGenerating: boolean;
  injectionTarget: 'flow' | 'digen' | 'none';
  autoConfigStatus: string;
  injectionProgressText: string;
  downloadStatus: string;
  queueDelayRemaining: number;
  downloadDelayRemaining: number;
  themeMode: 'dark' | 'light';
}

function N8NFlowchart({
  queueLength,
  activeNode,
  isGenerating,
  injectionTarget,
  autoConfigStatus,
  injectionProgressText,
  downloadStatus,
  queueDelayRemaining,
  downloadDelayRemaining,
  themeMode
}: N8NFlowchartProps) {
  const [isMinimized, setIsMinimized] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const isLight = themeMode === 'light';

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!(e.target as HTMLElement).closest('.drag-handle')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  const nodes = [
    {
      id: 'queue',
      title: 'Fila',
      icon: <Layers className="w-4.5 h-4.5" />,
      getStatus: () => {
        if (queueDelayRemaining > 0) return `⏳ Cooldown (${queueDelayRemaining}s)`;
        return queueLength > 0 ? `${queueLength} pendentes` : 'Aguardando';
      }
    },
    {
      id: 'ai',
      title: 'Roteiro IA',
      icon: <Sparkles className="w-4.5 h-4.5" />,
      getStatus: () => {
        if (isGenerating) return 'Gerando...';
        return activeNode > 1 ? 'Concluído' : 'Pendente';
      }
    },
    {
      id: 'platform',
      title: 'Plataforma',
      icon: <Globe className="w-4.5 h-4.5" />,
      getStatus: () => {
        if (injectionTarget === 'flow') return 'Google Flow';
        if (injectionTarget === 'digen') return 'DIGEN.ai';
        return 'Apenas Criar';
      }
    },
    {
      id: 'config',
      title: 'Auto-Config',
      icon: <Settings2 className="w-4.5 h-4.5" />,
      getStatus: () => {
        return autoConfigStatus || 'Pendente';
      }
    },
    {
      id: 'inject',
      title: 'Injeção',
      icon: <Play className="w-4.5 h-4.5 animate-pulse" />,
      getStatus: () => {
        return injectionProgressText || 'Pendente';
      }
    },
    {
      id: 'download',
      title: 'Download',
      icon: <Download className="w-4.5 h-4.5" />,
      getStatus: () => {
        if (downloadDelayRemaining > 0) return `⏳ Cooldown (${downloadDelayRemaining}s)`;
        return downloadStatus || 'Pendente';
      }
    }
  ];

  if (isMinimized) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className={`fixed bottom-6 right-6 z-50 py-2.5 px-4 rounded-2xl border shadow-lg cursor-pointer transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider select-none animate-bounce ${isLight ? 'bg-white/90 hover:bg-zinc-100 text-zinc-800 border-zinc-300/80 shadow-zinc-200/50' : 'bg-zinc-900/90 hover:bg-zinc-800 text-white border-zinc-700/80 shadow-black/40'}`}
      >
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
        </span>
        📊 Exibir Fluxo
      </div>
    );
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`
      }}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[780px] backdrop-blur-md rounded-2xl shadow-2xl p-4 touch-none select-none transition-shadow duration-200 ${isLight ? 'bg-white/95 border border-zinc-300 text-zinc-800 shadow-zinc-300/30' : 'bg-zinc-900/95 border border-zinc-700/80 text-zinc-100 shadow-black/50'}`}
    >
      <style>{`
        @keyframes flowDash {
          to { stroke-dashoffset: -20; }
        }
        .active-flow-path {
          animation: flowDash 0.8s linear infinite;
        }
      `}</style>

      {/* Barra de título / Drag handle */}
      <div className={`drag-handle flex items-center justify-between pb-3.5 mb-3 border-b cursor-move ${isLight ? 'border-zinc-200' : 'border-zinc-800/80'}`}>
        <div className="flex items-center gap-2">
          <GripHorizontal className={`w-4 h-4 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`} />
          <span className={`text-[10px] uppercase tracking-widest font-bold font-display ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>Fluxo de Automação Ativo</span>
        </div>
        <button 
          onClick={() => setIsMinimized(true)}
          className={`p-1 rounded-lg transition-colors ${isLight ? 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
          title="Minimizar Fluxo"
        >
          <EyeOff className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid de Nós */}
      <div className="relative flex items-center justify-between px-3 h-20">
        
        {/* SVG de Linhas do Fluxo */}
        <svg className="absolute inset-0 w-full h-full -z-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          {/* Linha inativa brilhante */}
          <line
            x1="45" y1="40" x2="715" y2="40"
            stroke={isLight ? "#d4d4d8" : "#3f3f46"}
            strokeWidth="3"
            strokeLinecap="round"
          />
          {activeNode > 0 && (
            <path
              d={`M 45,40 L ${45 + activeNode * 134},40`}
              stroke={isLight ? "#8b5cf6" : "#a855f7"}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="6,4"
              className="active-flow-path"
              fill="none"
            />
          )}
        </svg>

        {nodes.map((node, index) => {
          const isCompleted = index < activeNode;
          const isActive = index === activeNode;
          
          let circleBg = isLight 
            ? 'bg-zinc-100 border-zinc-300 text-zinc-600 hover:border-zinc-400' 
            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500';
            
          if (isCompleted) {
            circleBg = isLight 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.05)]' 
              : 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.1)]';
          }
          if (isActive) {
            circleBg = isLight 
              ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_15px_rgba(139,92,246,0.5)] animate-pulse' 
              : 'bg-purple-600 border-purple-300 text-white shadow-[0_0_15px_rgba(168,85,247,0.6)] animate-pulse';
          }

          return (
            <div key={node.id} className="flex flex-col items-center space-y-2 w-24 relative">
              <div className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300 ${circleBg}`}>
                {node.icon}
              </div>
              
              <div className="text-center space-y-0.5">
                <p className={`text-[10px] font-bold ${isActive ? (isLight ? 'text-purple-600 font-extrabold' : 'text-purple-300 font-extrabold') : (isLight ? 'text-zinc-800' : 'text-zinc-100')}`}>{node.title}</p>
                <p className={`text-[8px] font-bold tracking-wide truncate max-w-[90px] ${
                  isActive 
                    ? (isLight ? 'text-purple-500' : 'text-purple-400') 
                    : (isCompleted 
                        ? (isLight ? 'text-emerald-600 font-extrabold' : 'text-emerald-400 font-extrabold') 
                        : (isLight ? 'text-zinc-500' : 'text-zinc-400'))
                }`}>
                  {node.getStatus()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {(queueDelayRemaining > 0 || downloadDelayRemaining > 0) && (
        <div className={`mt-2.5 p-2 border rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider animate-pulse ${isLight ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-amber-500/20 border-amber-500/40 text-amber-400'}`}>
          ⏳ {queueDelayRemaining > 0 
            ? `Fila em Cooldown: Aguardando ${queueDelayRemaining}s para o próximo produto...` 
            : `Download em Cooldown: Aguardando ${downloadDelayRemaining}s antes do próximo arquivo...`}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const isInjectorWindow = params.get('window') === 'injector' || window.location.hash === '#injector';
  const isSpyWindow = params.get('window') === 'spy' || window.location.hash === '#spy';

  if (isInjectorWindow) {
    return <PromptInjector />;
  }
  if (isSpyWindow) {
    return <SpyWindow />;
  }

  return <MainApp />;
}

function MainApp() {
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setThemeMode(savedTheme);
    }

    // Carregar schemas aprendidos pelo Espião
    if (window.electronAPI) {
      window.electronAPI.loadSiteSchema('digen').then((schema) => {
        if (schema && schema.configs) setDigenSchema(schema);
      });
      window.electronAPI.loadSiteSchema('flow').then((schema) => {
        if (schema && schema.configs) setFlowSchema(schema);
      });
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextTheme);
    localStorage.setItem('app-theme', nextTheme);
  };

  const [activeTab, setActiveTab] = useState<TabMode>('collection');
  const [showChangelog, setShowChangelog] = useState(false);
  
  // Tab 1: Collection
  const [images, setImages] = useState<SceneImage[]>([]);
  const [theme, setTheme] = useState(THEMES[0]);
  const [customTheme, setCustomTheme] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isSequencing, setIsSequencing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFit, setImageFit] = useState<'contain' | 'cover'>('contain');

  // Tab 2: Product & Model
  const [modelImage, setModelImage] = useState<SceneImage | null>(null);
  const [productImages, setProductImages] = useState<SceneImage[]>([]);
  const [numScenes, setNumScenes] = useState(3);
  const [numSequences, setNumSequences] = useState(3);
  const [activeSequenceIndex, setActiveSequenceIndex] = useState(0);
  const [videoStyle, setVideoStyle] = useState<'standard' | 'pov'>('standard');
  const [voiceGender, setVoiceGender] = useState<'female' | 'male' | 'none'>('female');
  const [voiceTone, setVoiceTone] = useState<'enthusiastic' | 'persuasive' | 'calm' | 'promo'>('enthusiastic');
  const [imageWorkflowMode, setImageWorkflowMode] = useState<'direct_collected' | 'nano_banana_first'>('direct_collected');
  const modelInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);

  // TikTok Shop Importer State
  const [tiktokInputUrl, setTiktokInputUrl] = useState('');
  const [isTikTokModalOpen, setIsTikTokModalOpen] = useState(false);
  const [activeTikTokUrl, setActiveTikTokUrl] = useState('');
  const [isExtractingTikTok, setIsExtractingTikTok] = useState(false);
  const [isTikTokCaptchaDetected, setIsTikTokCaptchaDetected] = useState(false);
  interface TikTokExtractedImage {
    id: string;
    url: string;
    fallbackUrl: string;
  }

  interface TikTokCommentItem {
    id: string;
    text: string;
    author?: string;
    rating?: string;
    variant?: string;
    date?: string;
  }

  interface TikTokProductReviews {
    rating?: string;
    totalReviews?: string;
    tags: string[];
    comments: TikTokCommentItem[];
  }

  const [tiktokExtractionStatus, setTiktokExtractionStatus] = useState('');
  const [extractedTikTokProduct, setExtractedTikTokProduct] = useState<{
    title: string;
    price: string;
    description: string;
    images: TikTokExtractedImage[];
    reviews?: TikTokProductReviews;
  } | null>(null);
  const [selectedTikTokImageIds, setSelectedTikTokImageIds] = useState<string[]>([]);
  const [includeTikTokReviews, setIncludeTikTokReviews] = useState(true);
  const [selectedTikTokCommentIds, setSelectedTikTokCommentIds] = useState<string[]>([]);
  const [isPaginatingReviews, setIsPaginatingReviews] = useState(false);
  const [reviewsTargetCount, setReviewsTargetCount] = useState<number>(30);
  const [reviewPaginationStatus, setReviewPaginationStatus] = useState<string>('');
  const abortPaginationRef = useRef<boolean>(false);
  const [productReviews, setProductReviews] = useState<{
    rating?: string;
    totalReviews?: string;
    tags: string[];
    comments: string[];
    includeInPrompt: boolean;
  } | null>(null);
  const [isImportingTikTokImages, setIsImportingTikTokImages] = useState(false);
  const [tiktokImportProgress, setTiktokImportProgress] = useState<string | null>(null);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [zipDownloadProgress, setZipDownloadProgress] = useState<string | null>(null);
  const [isWebviewExpanded, setIsWebviewExpanded] = useState(false);
  const [tiktokModalTab, setTiktokModalTab] = useState<'photos' | 'reviews' | 'details' | 'browser'>('browser');
  const tiktokWebviewRef = useRef<any>(null);
  const webviewDomReadyRef = useRef<boolean>(false);

  // TikTok Shop Fila de Links (Queue) State & Types
  interface TikTokQueueItem {
    id: string;
    url: string;
    status: 'pending' | 'extracting' | 'completed' | 'error' | 'cancelled';
    error?: string;
    title?: string;
    price?: string;
    description?: string;
    imagesCount?: number;
    downloadedImagesCount?: number;
  }

  const [tiktokQueue, setTiktokQueue] = useState<TikTokQueueItem[]>([]);
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(-1);
  const [queueProgressText, setQueueProgressText] = useState<string>('');
  const abortQueueRef = useRef<boolean>(false);

  const extractUrls = (text: string): string[] => {
    if (!text) return [];
    const tokens = text.split(/[\r\n,;\s]+/);
    const urls: string[] = [];
    const seen = new Set<string>();

    for (let token of tokens) {
      let t = token.trim();
      if (!t) continue;
      // Suporte a ID numérico do produto colado diretamente (ex: 72127078848654 ou 72127078848654?source=anchor)
      if (/^\d{10,25}(\?.*)?$/.test(t)) {
        t = 'https://shop.tiktok.com/view/product/' + t;
      }
      if (!t.startsWith('http://') && !t.startsWith('https://')) {
        if (t.includes('tiktok.com') || t.includes('shop.tiktok.com')) {
          t = 'https://' + t;
        }
      }
      if (t.startsWith('http://') || t.startsWith('https://')) {
        if (!seen.has(t)) {
          seen.add(t);
          urls.push(t);
        }
      }
    }
    return urls;
  };

  const handleAddLinksToQueue = (overrideText?: string) => {
    const textToParse = overrideText !== undefined ? overrideText : tiktokInputUrl;
    const urls = extractUrls(textToParse);
    if (urls.length === 0) return;

    setTiktokQueue(prev => {
      const existingUrls = new Set(prev.map(p => p.url));
      const newItems: TikTokQueueItem[] = urls
        .filter(url => !existingUrls.has(url))
        .map(url => ({
          id: Math.random().toString(36).substring(2, 9),
          url,
          status: 'pending'
        }));
      return [...prev, ...newItems];
    });

    setTiktokInputUrl('');
  };

  const handleRemoveQueueItem = (id: string) => {
    if (isQueueRunning) return;
    setTiktokQueue(prev => prev.filter(item => item.id !== id));
  };

  const handleClearQueue = () => {
    if (isQueueRunning) {
      abortQueueRef.current = true;
      setIsQueueRunning(false);
      setIsExtractingTikTok(false);
    }
    setTiktokQueue([]);
    setTiktokInputUrl('');
    setQueueProgressText('');
    setCurrentQueueIndex(-1);
  };

  const handleCancelSingleImport = () => {
    setIsExtractingTikTok(false);
    setIsQueueRunning(false);
    setIsTikTokCaptchaDetected(false);
    abortQueueRef.current = true;
    setTiktokExtractionStatus('Extração cancelada pelo usuário.');
    const webview = tiktokWebviewRef.current;
    if (webview) {
      try {
        webview.stop();
      } catch (e) {}
    }
  };

  const handleCancelQueue = () => {
    abortQueueRef.current = true;
    setIsQueueRunning(false);
    setIsExtractingTikTok(false);
    setTiktokExtractionStatus('Extração da fila interrompida pelo usuário.');
    setQueueProgressText('Fila cancelada.');
    setTiktokQueue(prev => prev.map(item => 
      item.status === 'extracting' ? { ...item, status: 'cancelled', error: 'Cancelado pelo usuário' } : item
    ));
    const webview = tiktokWebviewRef.current;
    if (webview) {
      try {
        webview.stop();
      } catch (e) {}
    }
  };

  const handleStartQueueExtraction = async () => {
    let currentQueue = [...tiktokQueue];
    if (currentQueue.length === 0 && tiktokInputUrl.trim()) {
      const urls = extractUrls(tiktokInputUrl);
      if (urls.length > 0) {
        currentQueue = urls.map(url => ({
          id: Math.random().toString(36).substring(2, 9),
          url,
          status: 'pending'
        }));
        setTiktokQueue(currentQueue);
        setTiktokInputUrl('');
      }
    }

    const pendingCount = currentQueue.filter(item => item.status === 'pending').length;
    if (pendingCount === 0) {
      if (currentQueue.length > 0) {
        currentQueue = currentQueue.map(it => ({ ...it, status: 'pending', error: undefined }));
        setTiktokQueue(currentQueue);
      } else {
        return;
      }
    }

    abortQueueRef.current = false;
    setIsQueueRunning(true);
    setIsTikTokModalOpen(true);
    setTiktokModalTab('browser');

    for (let idx = 0; idx < currentQueue.length; idx++) {
      if (abortQueueRef.current) break;

      const item = currentQueue[idx];
      if (item.status === 'completed') continue;

      setCurrentQueueIndex(idx);
      setTiktokQueue(prev => prev.map((it, i) => i === idx ? { ...it, status: 'extracting', error: undefined } : it));
      setQueueProgressText(`Extraindo produto ${idx + 1} de ${currentQueue.length}...`);
      setTiktokExtractionStatus(`Processando produto ${idx + 1}/${currentQueue.length}: carregando página...`);

      setActiveTikTokUrl(item.url);
      setExtractedTikTokProduct(null);
      setSelectedTikTokImageIds([]);
      setIsExtractingTikTok(true);

      const webview = tiktokWebviewRef.current;
      if (webview) {
        try {
          webviewDomReadyRef.current = false;
          webview.loadURL(item.url);
        } catch (e) {}
      }

      let productResult: any = null;
      const startTime = Date.now();
      const maxWaitMs = 30000;

      while (!productResult && (Date.now() - startTime < maxWaitMs)) {
        if (abortQueueRef.current) break;

        await new Promise(r => setTimeout(r, 1000));
        if (abortQueueRef.current) break;

        // Wait until webview DOM is ready before injecting script
        if (!webviewDomReadyRef.current) continue;

        const el = tiktokWebviewRef.current;
        if (el) {
          try {
            const res = await el.executeJavaScript(TIKTOK_PDP_SCRAPER_SCRIPT);
            if (res && res.status === 'captcha') {
              setIsTikTokCaptchaDetected(true);
              setTiktokExtractionStatus(`⚠️ Captcha detectado no produto ${idx + 1}. Por favor, resolva na tela.`);
            } else if (res && res.status === 'success' && res.images && res.images.length > 0) {
              productResult = res;
              break;
            } else if (res && res.title) {
              setTiktokExtractionStatus(`Identificando mídia de: ${res.title.slice(0, 40)}...`);
            }
          } catch (e) {}
        }
      }

      if (abortQueueRef.current) {
        setTiktokQueue(prev => prev.map((it, i) => i === idx ? { ...it, status: 'cancelled', error: 'Cancelado pelo usuário' } : it));
        break;
      }

      if (productResult && productResult.images && productResult.images.length > 0) {
        const imagesToDownload = productResult.images.slice(0, 10);
        setTiktokExtractionStatus(`Baixando fotos do produto ${idx + 1}...`);

        const newSceneImages: SceneImage[] = [];
        for (let imgIdx = 0; imgIdx < imagesToDownload.length; imgIdx++) {
          if (abortQueueRef.current) break;
          const imgItem = imagesToDownload[imgIdx];
          try {
            let dataUrl = '';
            if (window.electronAPI?.fetchImageAsBase64) {
              const fetchRes = await window.electronAPI.fetchImageAsBase64(imgItem.url);
              if (fetchRes && fetchRes.success && fetchRes.dataUrl) {
                dataUrl = fetchRes.dataUrl;
              } else if (imgItem.fallbackUrl) {
                const fbRes = await window.electronAPI.fetchImageAsBase64(imgItem.fallbackUrl);
                if (fbRes && fbRes.success && fbRes.dataUrl) dataUrl = fbRes.dataUrl;
              }
            }
            if (!dataUrl) {
              const resp = await fetch(imgItem.url);
              const blob = await resp.blob();
              dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
            }
            if (dataUrl) {
              const cleanFileName = `prod_${idx + 1}_foto_${imgIdx + 1}_${Date.now()}.jpg`;
              const file = dataUrlToFile(dataUrl, cleanFileName);
              newSceneImages.push({
                id: Math.random().toString(36).substring(2, 9),
                file,
                preview: dataUrl,
                originalPreview: dataUrl,
                name: cleanFileName
              });
            }
          } catch (e) {}
        }

        if (newSceneImages.length > 0) {
          // Criar um projeto separado para cada produto da fila
          const productTitle = (productResult.title || `Produto ${idx + 1}`).substring(0, 60);
          let productObs = `📌 PRODUTO IMPORTADO DO TIKTOK SHOP:\n`;
          if (productResult.title) productObs += `Nome: ${productResult.title}\n`;
          if (productResult.price) productObs += `Preço: ${productResult.price}\n`;
          if (productResult.description) {
            productObs += `\nEspecificações / Detalhes:\n${productResult.description}\n`;
          }

          const newProj: ProjectItem = {
            id: Math.random().toString(36).substr(2, 9),
            name: productTitle,
            type: 'collection',
            images: newSceneImages,
            modelImage: null,
            productImages: [],
            theme: theme,
            customTheme: customTheme,
            numScenes: numScenes,
            videoStyle: videoStyle,
            voiceGender: voiceGender,
            observations: productObs,
            duration: duration,
            generatedScript: null,
            generatedAngles: null,
            status: 'pending',
            projectIndex: 0,
            injectionTarget: injectionTarget,
            targetConfigs: targetConfigs,
            productReviews: null,
            productDescription: productResult.description || ''
          };

          setProjects(prev => [...prev, newProj]);
          setProjectCounter(prev => prev + 1);
          setShowQueue(true);
        }

        setTiktokQueue(prev => prev.map((it, i) => i === idx ? {
          ...it,
          status: 'completed',
          title: productResult.title,
          price: productResult.price,
          description: productResult.description,
          imagesCount: productResult.images.length,
          downloadedImagesCount: newSceneImages.length
        } : it));

        setExtractedTikTokProduct(productResult);
        setSelectedTikTokImageIds(productResult.images.map((img: any) => img.id));
      } else {
        setTiktokQueue(prev => prev.map((it, i) => i === idx ? {
          ...it,
          status: 'error',
          error: 'Tempo esgotado ou nenhuma foto detectada'
        } : it));
      }
    }

    setIsQueueRunning(false);
    setIsExtractingTikTok(false);
    setCurrentQueueIndex(-1);

    if (!abortQueueRef.current) {
      setQueueProgressText('Fila concluída com sucesso!');
      setTiktokExtractionStatus('✅ Fila de produtos finalizada! Todas as fotos e descrições foram inseridas.');
      setValidationAlert({
        title: "Fila de Produtos Concluída!",
        message: "Os produtos da fila foram processados com sucesso. As fotos foram adicionadas ao seu projeto e as descrições inseridas em 'Observações Importantes'."
      });
    }
  };

  const handleStartTikTokImport = () => {
    // Se houver itens na fila, inicia a fila
    if (tiktokQueue.length > 0) {
      handleStartQueueExtraction();
      return;
    }

    let cleanUrl = tiktokInputUrl.trim();
    if (!cleanUrl) return;

    // Se o usuário colou apenas o ID do produto (ex: 72127078848654 ou 72127078848654?source=anchor)
    if (/^\d{10,25}(\?.*)?$/.test(cleanUrl)) {
      cleanUrl = 'https://shop.tiktok.com/view/product/' + cleanUrl;
    }

    // Se múltiplos links foram colados no campo
    const detectedUrls = extractUrls(cleanUrl);
    if (detectedUrls.length > 1) {
      handleAddLinksToQueue(cleanUrl);
      setTimeout(() => {
        handleStartQueueExtraction();
      }, 50);
      return;
    }

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      if (cleanUrl.includes('tiktok.com') || cleanUrl.includes('shop.tiktok.com')) {
        cleanUrl = 'https://' + cleanUrl;
      } else {
        setValidationAlert({
          title: "Link Inválido",
          message: "Por favor, cole um link válido do produto do TikTok Shop (ex: https://shop.tiktok.com/view/product/... ou https://www.tiktok.com/...)."
        });
        return;
      }
    }
    setActiveTikTokUrl(cleanUrl);
    setExtractedTikTokProduct(null);
    setSelectedTikTokImageIds([]);
    setSelectedTikTokCommentIds([]);
    setIncludeTikTokReviews(true);
    setIsTikTokCaptchaDetected(false);
    setIsExtractingTikTok(true);
    setTiktokModalTab('browser');
    setTiktokExtractionStatus('Iniciando navegador seguro do TikTok Shop...');
    webviewDomReadyRef.current = false;
    setIsTikTokModalOpen(true);
    setTimeout(() => {
      try {
        const webview = tiktokWebviewRef.current;
        if (webview && typeof webview.loadURL === 'function') {
          webview.loadURL(cleanUrl);
        }
      } catch (e) {}
    }, 100);
  };

  const handleOpenTikTokLogin = () => {
    const loginUrl = 'https://www.tiktok.com/login';
    setActiveTikTokUrl(loginUrl);
    setExtractedTikTokProduct(null);
    setSelectedTikTokImageIds([]);
    setIsTikTokCaptchaDetected(false);
    setIsExtractingTikTok(false);
    setIsWebviewExpanded(true);
    setTiktokModalTab('browser');
    setTiktokExtractionStatus('Página de login do TikTok aberta em janela expandida.');
    setIsTikTokModalOpen(true);
    const webview = tiktokWebviewRef.current;
    if (webview) {
      try {
        webview.loadURL(loginUrl);
      } catch (e) {}
    }
  };

  const handleApplyTikTokProduct = async () => {
    if (!extractedTikTokProduct) return;
    const selectedImages = extractedTikTokProduct.images.filter(img => selectedTikTokImageIds.includes(img.id));
    if (selectedImages.length === 0) return;

    setIsImportingTikTokImages(true);
    setTiktokImportProgress(`Baixando 0/${selectedImages.length} imagens...`);

    const newSceneImages: SceneImage[] = [];

    for (let i = 0; i < selectedImages.length; i++) {
      const item = selectedImages[i];
      setTiktokImportProgress(`Baixando foto ${i + 1}/${selectedImages.length}...`);
      
      try {
        let dataUrl = '';
        if (window.electronAPI?.fetchImageAsBase64) {
          const res = await window.electronAPI.fetchImageAsBase64(item.url);
          if (res && res.success && res.dataUrl) {
            dataUrl = res.dataUrl;
          } else if (item.fallbackUrl) {
            const resFallback = await window.electronAPI.fetchImageAsBase64(item.fallbackUrl);
            if (resFallback && resFallback.success && resFallback.dataUrl) {
              dataUrl = resFallback.dataUrl;
            }
          }
        }
        
        if (!dataUrl) {
          try {
            const resp = await fetch(item.url);
            const blob = await resp.blob();
            dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          } catch (e) {
            if (item.fallbackUrl) {
              const resp2 = await fetch(item.fallbackUrl);
              const blob2 = await resp2.blob();
              dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob2);
              });
            }
          }
        }

        if (dataUrl) {
          const cleanFileName = `tiktok_${i + 1}_${Date.now()}.jpg`;
          const file = dataUrlToFile(dataUrl, cleanFileName);
          const sceneImg: SceneImage = {
            id: Math.random().toString(36).substring(2, 9),
            file,
            preview: dataUrl,
            originalPreview: dataUrl,
            name: cleanFileName
          };
          newSceneImages.push(sceneImg);
        }
      } catch (err) {
        console.error(`Falha ao baixar imagem ${item.url}:`, err);
      }
    }

    if (activeTab === 'collection') {
      setImages(prev => [...prev, ...newSceneImages]);
    } else {
      setProductImages(prev => [...prev, ...newSceneImages]);
    }

    // Processar avaliações de clientes se selecionadas pelo usuário
    let selectedComments: string[] = [];
    if (includeTikTokReviews && extractedTikTokProduct.reviews) {
      selectedComments = (extractedTikTokProduct.reviews.comments || [])
        .filter(c => selectedTikTokCommentIds.includes(c.id))
        .map(c => {
          let commentStr = c.text;
          if (c.variant) commentStr += ` [${c.variant}]`;
          if (c.author) commentStr += ` — ${c.author}`;
          return commentStr;
        });

      setProductReviews({
        rating: extractedTikTokProduct.reviews.rating || '',
        totalReviews: extractedTikTokProduct.reviews.totalReviews || '',
        tags: extractedTikTokProduct.reviews.tags || [],
        comments: selectedComments,
        includeInPrompt: true
      });
    } else {
      setProductReviews(null);
    }

    let updatedObs = observations ? observations + '\n\n' : '';
    updatedObs += `📌 PRODUTO IMPORTADO DO TIKTOK SHOP:\n`;
    if (extractedTikTokProduct.title) updatedObs += `Nome: ${extractedTikTokProduct.title}\n`;
    if (extractedTikTokProduct.price) updatedObs += `Preço: ${extractedTikTokProduct.price}\n`;
    if (extractedTikTokProduct.description) {
      setProductDescription(extractedTikTokProduct.description);
      setIncludeProductDescription(true);
      updatedObs += `\nEspecificações / Detalhes:\n${extractedTikTokProduct.description}\n`;
    }

    if (includeTikTokReviews && extractedTikTokProduct.reviews && (selectedComments.length > 0 || (extractedTikTokProduct.reviews.tags && extractedTikTokProduct.reviews.tags.length > 0))) {
      updatedObs += `\n💬 AVALIAÇÕES E DEPOIMENTOS DE CLIENTES:\n`;
      if (extractedTikTokProduct.reviews.rating) {
        updatedObs += `Nota Média: ${extractedTikTokProduct.reviews.rating} ★`;
        if (extractedTikTokProduct.reviews.totalReviews) updatedObs += ` (${extractedTikTokProduct.reviews.totalReviews} avaliações)`;
        updatedObs += `\n`;
      }
      if (extractedTikTokProduct.reviews.tags && extractedTikTokProduct.reviews.tags.length > 0) {
        updatedObs += `Destaques mais elogiados: ${extractedTikTokProduct.reviews.tags.join(', ')}\n`;
      }
      if (selectedComments.length > 0) {
        updatedObs += `Comentários reais selecionados (${selectedComments.length}):\n`;
        selectedComments.forEach((c, idx) => {
          updatedObs += `  ${idx + 1}. "${c}"\n`;
        });
      }
    }
    setObservations(updatedObs);

    setIsImportingTikTokImages(false);
    setTiktokImportProgress(null);
    setIsTikTokModalOpen(false);

    const reviewMsg = (includeTikTokReviews && selectedComments.length > 0) 
      ? `, ${selectedComments.length} comentários de clientes` 
      : '';
    setValidationAlert({
      title: "Produto Importado com Sucesso!",
      message: `${newSceneImages.length} fotos em alta resolução${reviewMsg} e informações do produto foram adicionadas ao seu projeto.`
    });
  };

  const handleDownloadZip = async () => {
    if (!extractedTikTokProduct) return;
    const selectedImages = extractedTikTokProduct.images.filter(img => selectedTikTokImageIds.includes(img.id));
    if (selectedImages.length === 0) return;

    setIsDownloadingZip(true);
    setZipDownloadProgress(`Preparando download de ${selectedImages.length} fotos...`);

    try {
      const zip = new JSZip();
      const rawTitle = extractedTikTokProduct.title || 'produto_tiktok';
      const cleanTitle = rawTitle
        .replace(/[/\\?%*:|"<>]/g, '')
        .replace(/\s+/g, '_')
        .trim()
        .substring(0, 60) || 'produto_tiktok';

      for (let i = 0; i < selectedImages.length; i++) {
        const item = selectedImages[i];
        setZipDownloadProgress(`Baixando foto ${i + 1}/${selectedImages.length}...`);

        let dataUrl = '';
        if (window.electronAPI?.fetchImageAsBase64) {
          const res = await window.electronAPI.fetchImageAsBase64(item.url);
          if (res && res.success && res.dataUrl) {
            dataUrl = res.dataUrl;
          } else if (item.fallbackUrl) {
            const resFallback = await window.electronAPI.fetchImageAsBase64(item.fallbackUrl);
            if (resFallback && resFallback.success && resFallback.dataUrl) {
              dataUrl = resFallback.dataUrl;
            }
          }
        }

        if (!dataUrl) {
          try {
            const resp = await fetch(item.url);
            const blob = await resp.blob();
            dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          } catch (e) {
            if (item.fallbackUrl) {
              const resp2 = await fetch(item.fallbackUrl);
              const blob2 = await resp2.blob();
              dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob2);
              });
            }
          }
        }

        if (dataUrl && dataUrl.includes(',')) {
          const base64Data = dataUrl.split(',')[1];
          const mime = dataUrl.split(';')[0].split(':')[1] || 'image/jpeg';
          const ext = mime.includes('png') ? 'png' : (mime.includes('webp') ? 'webp' : 'jpg');
          const num = String(i + 1).padStart(2, '0');
          const fileName = `${cleanTitle}_foto_${num}.${ext}`;
          zip.file(fileName, base64Data, { base64: true });
        }
      }

      setZipDownloadProgress('Compactando arquivo .ZIP...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFileName = `${cleanTitle}_fotos.zip`;

      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = zipFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      setValidationAlert({
        title: "Download Concluído com Sucesso!",
        message: `O arquivo ZIP "${zipFileName}" com ${selectedImages.length} fotos em alta resolução foi baixado na sua pasta de Downloads.`
      });
    } catch (err: any) {
      console.error('Erro ao gerar arquivo ZIP:', err);
      setValidationAlert({
        title: "Erro no Download",
        message: `Não foi possível gerar o arquivo ZIP: ${err?.message || err}`
      });
    } finally {
      setIsDownloadingZip(false);
      setZipDownloadProgress(null);
    }
  };

  const handleDownloadSceneImagesZip = async (imagesList: SceneImage[], prefix: string = 'fotos_produto') => {
    if (!imagesList || imagesList.length === 0) return;
    setIsDownloadingZip(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < imagesList.length; i++) {
        const img = imagesList[i];
        const num = String(i + 1).padStart(2, '0');
        const urlToFetch = img.croppedPreview || img.preview;
        let blob: Blob | null = null;
        let ext = 'jpg';

        if (urlToFetch && (urlToFetch.startsWith('data:') || urlToFetch.startsWith('blob:'))) {
          try {
            const resp = await fetch(urlToFetch);
            blob = await resp.blob();
            if (blob.type.includes('png')) ext = 'png';
            else if (blob.type.includes('webp')) ext = 'webp';
          } catch (e) {}
        }

        if (!blob && img.file && img.file.size > 0) {
          blob = img.file;
          if (img.file.type.includes('png')) ext = 'png';
          else if (img.file.type.includes('webp')) ext = 'webp';
          else if (img.file.name && img.file.name.includes('.')) ext = img.file.name.split('.').pop() || 'jpg';
        }

        if (!blob && urlToFetch) {
          try {
            const resp = await fetch(urlToFetch);
            blob = await resp.blob();
          } catch (e) {}
        }

        if (blob) {
          const fileName = `${prefix}_${num}.${ext}`;
          zip.file(fileName, blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${prefix}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      setValidationAlert({
        title: "Download Concluído com Sucesso!",
        message: `O arquivo ZIP "${prefix}.zip" com ${imagesList.length} fotos foi baixado na sua pasta de Downloads.`
      });
    } catch (err: any) {
      console.error('Erro ao baixar fotos em ZIP:', err);
      setValidationAlert({
        title: "Erro no Download",
        message: `Não foi possível gerar o arquivo ZIP: ${err?.message || err}`
      });
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleStopPagination = () => {
    abortPaginationRef.current = true;
    setIsPaginatingReviews(false);
    setReviewPaginationStatus('⏹️ Coleta interrompida pelo usuário.');
  };

  const handlePaginateReviews = async (targetCount: number = reviewsTargetCount) => {
    const webview = tiktokWebviewRef.current;
    if (!webview) {
      setReviewPaginationStatus('⚠️ Navegador do TikTok Shop não está ativo.');
      return;
    }

    setIsPaginatingReviews(true);
    abortPaginationRef.current = false;
    setReviewPaginationStatus(`Iniciando coleta automática de avaliações (Meta: ${targetCount})...`);

    try {
      // 1. Rolar suavemente até o container de reviews no webview
      await webview.executeJavaScript(`
        (() => {
          const revEl = document.querySelector('[class*="review"], [class*="comment"], [data-testid*="review"], #reviews') ||
                        document.body;
          if (revEl) {
            revEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        })()
      `);
      await new Promise(r => setTimeout(r, 600));

      let allReviews: TikTokCommentItem[] = extractedTikTokProduct?.reviews?.comments 
        ? [...extractedTikTokProduct.reviews.comments] 
        : [];
      let page = 1;
      const maxPages = Math.ceil(targetCount / 3) + 7;

      while (allReviews.length < targetCount && page <= maxPages) {
        if (abortPaginationRef.current) {
          setReviewPaginationStatus(`⏹️ Coleta interrompida. ${allReviews.length} avaliações preservadas.`);
          break;
        }

        setReviewPaginationStatus(`🔄 Paginando... Página ${page} (${allReviews.length} de ${targetCount} avaliações coletadas)`);

        // Extrai avaliações da página atual
        const pageResult = await webview.executeJavaScript(TIKTOK_REVIEWS_EXTRACTOR_SCRIPT);

        if (pageResult && Array.isArray(pageResult.comments) && pageResult.comments.length > 0) {
          for (const newRev of pageResult.comments) {
            const exists = allReviews.some(r => r.text === newRev.text);
            if (!exists) {
              allReviews.push(newRev);
            }
          }

          // Atualizar o estado em tempo real para o usuário ver cada novo comentário chegando
          setExtractedTikTokProduct(prev => {
            if (!prev) return prev;
            const prevRev = prev.reviews || { tags: [], comments: [] };
            return {
              ...prev,
              reviews: {
                ...prevRev,
                rating: pageResult.rating || prevRev.rating,
                totalReviews: pageResult.totalReviews || prevRev.totalReviews,
                tags: pageResult.tags && pageResult.tags.length > 0 
                  ? Array.from(new Set([...prevRev.tags, ...pageResult.tags])) 
                  : prevRev.tags,
                comments: [...allReviews]
              }
            };
          });

          // Marcar todos os comentários coletados como selecionados
          setSelectedTikTokCommentIds(allReviews.map(c => c.id));
        }

        if (allReviews.length >= targetCount) {
          setReviewPaginationStatus(`🎉 Meta atingida! ${allReviews.length} avaliações coletadas com sucesso.`);
          break;
        }

        // Avançar para a próxima página
        const nextPageNum = page + 1;
        const advanceScript = createTikTokReviewsAdvanceScript(nextPageNum);
        const advanceRes = await webview.executeJavaScript(advanceScript);

        if (!advanceRes || !advanceRes.success) {
          setReviewPaginationStatus(`ℹ️ Todas as avaliações disponíveis no TikTok Shop foram coletadas (${allReviews.length} avaliações).`);
          break;
        }

        page++;
        // Aguardar atualização do DOM
        await new Promise(r => setTimeout(r, 900));
      }

      if (allReviews.length > 0 && !abortPaginationRef.current) {
        setReviewPaginationStatus(`✅ Concluído: ${allReviews.length} avaliações reais prontas para o roteiro!`);
      }
    } catch (err: any) {
      console.error('Erro na paginação de avaliações:', err);
      setReviewPaginationStatus(`Erro durante a paginação: ${err?.message || 'Falha de comunicação'}`);
    } finally {
      setIsPaginatingReviews(false);
    }
  };

  // Polling automático da extração do produto no Webview do TikTok Shop
  useEffect(() => {
    if (!isTikTokModalOpen || !activeTikTokUrl || extractedTikTokProduct) return;
    if (!isExtractingTikTok) return;
    if (isQueueRunning) return;
    if (activeTikTokUrl.includes('/login') || activeTikTokUrl.includes('/auth')) return;

    let startTime = Date.now();
    const timeoutMs = 45000;

    const interval = setInterval(async () => {
      // Se captcha estiver ativo aguardando resolução humana, não consome tempo de timeout
      if (isTikTokCaptchaDetected) {
        startTime = Date.now();
        // Only check if webview DOM is stable
        if (!webviewDomReadyRef.current) return;
        const webview = tiktokWebviewRef.current;
        if (webview) {
          try {
            // Verificar se o captcha foi resolvido e a página do produto abriu
            const checkRes = await webview.executeJavaScript(`(() => {
              try {
                const bodyText = (document.body ? (document.body.innerText || document.body.textContent || '') : '');
                const hasProduct = !!(
                  document.querySelector('h1') || 
                  document.querySelector('[data-testid*="title"]') || 
                  document.querySelector('[class*="product-title"]') || 
                  document.querySelector('[class*="product_name"]') || 
                  document.querySelector('[class*="sale-price"]') || 
                  document.querySelector('[class*="price-val"]') || 
                  document.querySelector('[class*="price"]') || 
                  bodyText.includes('R$') || 
                  bodyText.includes('Vendido por') || 
                  bodyText.includes('Frete grátis') || 
                  bodyText.includes('Comprar agora')
                );
                const isSecTitle = (document.title || '').toLowerCase().includes('security check');
                const captchaImg = document.getElementById('captcha-verify-image');
                const isCaptchaVisible = captchaImg && (captchaImg.offsetParent !== null || captchaImg.offsetWidth > 20);
                return hasProduct || (!isSecTitle && !isCaptchaVisible);
              } catch (e) {
                return false;
              }
            })()`);
            if (checkRes) {
              setIsTikTokCaptchaDetected(false);
              setTiktokExtractionStatus('Verificação concluída! Extraindo fotos...');
            }
          } catch (e) {}
        }
        return;
      }

      // Evitar loop infinito: timeout de 45s
      if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval);
        setIsExtractingTikTok(false);
        setTiktokExtractionStatus('⏱️ Tempo limite de extração esgotado. Clique em "Capturar Fotos Agora" se a página estiver visível.');
        return;
      }

      const webview = tiktokWebviewRef.current;
      if (!webview) return;
      
      // Only run script when webview DOM is ready — prevents GUEST_VIEW_MANAGER_CALL errors
      if (!webviewDomReadyRef.current) return;

      try {
        let currentUrl = '';
        try {
          currentUrl = await webview.getURL();
        } catch (e) {
          currentUrl = activeTikTokUrl;
        }

        if (currentUrl.includes('/login') || currentUrl.includes('/auth') || currentUrl.includes('/passport')) {
          return;
        }

        const result = await webview.executeJavaScript(TIKTOK_PDP_SCRAPER_SCRIPT);
        if (result) {
          if (result.status === 'captcha') {
            setIsTikTokCaptchaDetected(true);
            setTiktokModalTab('browser');
            setTiktokExtractionStatus('Verificação visual do TikTok detectada. Por favor, deslize o quebra-cabeça abaixo para continuar.');
          } else if (result.status === 'auth_page') {
            setIsTikTokCaptchaDetected(false);
          } else if (result.status === 'success' && result.images && result.images.length > 0) {
            setIsTikTokCaptchaDetected(false);
            setExtractedTikTokProduct(result);
            setSelectedTikTokImageIds(result.images.map((img: any) => img.id));
            if (result.reviews?.comments && result.reviews.comments.length > 0) {
              setSelectedTikTokCommentIds(result.reviews.comments.map((c: any) => c.id));
            }
            setIsExtractingTikTok(false);
            setTiktokModalTab('photos');
            const reviewCount = result.reviews?.comments?.length || 0;
            const reviewText = reviewCount > 0 ? ` e ${reviewCount} avaliações de clientes` : '';
            setTiktokExtractionStatus(`✅ Extração concluída! ${result.images.length} fotos${reviewText} encontradas.`);
            clearInterval(interval);
          } else if (result.title) {
            setTiktokExtractionStatus(`Identificando fotos para: ${result.title.slice(0, 45)}...`);
          }
        }
      } catch (err) {
        // Ignora erros temporários enquanto carrega
      }
    }, 800);

    return () => clearInterval(interval);
  }, [isTikTokModalOpen, activeTikTokUrl, extractedTikTokProduct, isExtractingTikTok, isQueueRunning, isTikTokCaptchaDetected]);

  // Shared
  const [observations, setObservations] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [includeProductDescription, setIncludeProductDescription] = useState(true);
  const [isEditingProductDescription, setIsEditingProductDescription] = useState(false);
  const [copiedProductDescription, setCopiedProductDescription] = useState(false);
  const [duration, setDuration] = useState(DURATIONS[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [generatedScript, setGeneratedScript] = useState<ScriptResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // API Keys & Provedores de I.A
  const [apiKeys, setApiKeys] = useState<string[]>(() => {
    const saved = aiProvidersManager.getConfig().gemini.keys;
    return Array.isArray(saved) && saved.length > 0 ? saved : [];
  });
  const [currentKeyIndex, setCurrentKeyIndex] = useState(0);
  const keysFileInputRef = useRef<HTMLInputElement>(null);
  const groqFileInputRef = useRef<HTMLInputElement>(null);
  const openrouterFileInputRef = useRef<HTMLInputElement>(null);
  const [isKeysExhaustedAlertOpen, setIsKeysExhaustedAlertOpen] = useState(false);

  // Central Multi-Provedores de I.A
  const [activeAIProvider, setActiveAIProvider] = useState<AIProviderId>(() => aiProvidersManager.getActiveProvider());
  const [providerTab, setProviderTab] = useState<AIProviderId | 'general'>('gemini');
  const [groqApiKey, setGroqApiKey] = useState<string>(() => aiProvidersManager.getConfig().groq.apiKey);
  const [groqModel, setGroqModel] = useState<string>(() => aiProvidersManager.getConfig().groq.model);
  const [groqApiKeys, setGroqApiKeys] = useState<string[]>(() => {
    const saved = aiProvidersManager.getConfig().groq.keys;
    if (Array.isArray(saved) && saved.length > 0) return saved;
    const single = aiProvidersManager.getConfig().groq.apiKey;
    return single ? [single] : [];
  });
  const [openrouterApiKey, setOpenrouterApiKey] = useState<string>(() => aiProvidersManager.getConfig().openrouter.apiKey);
  const [openrouterModel, setOpenrouterModel] = useState<string>(() => aiProvidersManager.getConfig().openrouter.model);
  const [openrouterApiKeys, setOpenrouterApiKeys] = useState<string[]>(() => {
    const saved = aiProvidersManager.getConfig().openrouter.keys;
    if (Array.isArray(saved) && saved.length > 0) return saved;
    const single = aiProvidersManager.getConfig().openrouter.apiKey;
    return single ? [single] : [];
  });
  const [geminiModel, setGeminiModel] = useState<string>(() => aiProvidersManager.getConfig().gemini.model);
  const [enableFailover, setEnableFailover] = useState<boolean>(() => aiProvidersManager.getConfig().enableFailover);
  const [isTestingProvider, setIsTestingProvider] = useState<AIProviderId | null>(null);
  const [testFeedback, setTestFeedback] = useState<{ provider: AIProviderId; success: boolean; message: string } | null>(null);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState<string>(() => {
    const saved = aiProvidersManager.getConfig().gemini.keys;
    return (Array.isArray(saved) && saved.length > 0) ? saved[0] : '';
  });
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  // Cropping State (ReactCrop Interativo)
  const [imageToCrop, setImageToCrop] = useState<{ id: string, type: 'collection' | 'model' | 'product', preview: string, originalPreview?: string } | null>(null);
  const [crop, setCrop] = useState<ReactCropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isCropping, setIsCropping] = useState(false);
  const [cropAspect, setCropAspect] = useState<number | undefined>(undefined); // undefined = livre
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Fila de Produtos (Multi-Project Queue)
  interface ProjectItem {
    id: string;
    name: string;
    type: TabMode;
    images: SceneImage[];
    modelImage: SceneImage | null;
    productImages: SceneImage[];
    theme: string;
    customTheme: string;
    numScenes: number;
    videoStyle: 'standard' | 'pov';
    voiceGender: 'female' | 'male' | 'none';
    voiceTone?: 'enthusiastic' | 'persuasive' | 'calm' | 'promo';
    observations: string;
    duration: string;
    generatedScript: ScriptResponse | null;
    generatedAngles: GeneratedAngle[] | null;
    status: 'pending' | 'done';
    projectIndex: number;
    injectionTarget: 'digen' | 'flow' | 'none';
    targetConfigs: Record<string, string>;
    productReviews?: {
      rating?: string;
      totalReviews?: string;
      tags: string[];
      comments: string[];
      includeInPrompt: boolean;
    } | null;
    productDescription?: string;
    imageWorkflowMode?: 'direct_collected' | 'nano_banana_first';
  }

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectCounter, setProjectCounter] = useState(1);
  const [showQueue, setShowQueue] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAutomationFlow, setShowAutomationFlow] = useState<boolean>(() => {
    return localStorage.getItem('show-automation-flow') === 'true';
  });

  const toggleAutomationFlow = (enabled: boolean) => {
    setShowAutomationFlow(enabled);
    localStorage.setItem('show-automation-flow', String(enabled));
  };

  // States do Injetor Auto-adaptável
  const [injectionTarget, setInjectionTarget] = useState<'digen' | 'flow' | 'none'>('none');
  const [targetConfigs, setTargetConfigs] = useState<Record<string, string>>({});
  
  // Schemas locais carregados
  const [digenSchema, setDigenSchema] = useState<SiteSchema | null>(null);
  const [flowSchema, setFlowSchema] = useState<SiteSchema | null>(null);

  // Ângulos do Produto
  const [generatedAngles, setGeneratedAngles] = useState<GeneratedAngle[] | null>(null);
  const [isGeneratingAngles, setIsGeneratingAngles] = useState(false);
  const [numAngles, setNumAngles] = useState(4);
  const [validationAlert, setValidationAlert] = useState<{ title: string; message: string; buttonText?: string } | null>(null);

  // --- Handlers ---

  const getPixelCrop = useCallback((cropObj: PixelCrop | ReactCropType | null | undefined, image: HTMLImageElement): Area | null => {
    if (!cropObj || !image) return null;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    let pxX = cropObj.x;
    let pxY = cropObj.y;
    let pxW = cropObj.width;
    let pxH = cropObj.height;

    if (cropObj.unit === '%') {
      pxX = (cropObj.x / 100) * image.width;
      pxY = (cropObj.y / 100) * image.height;
      pxW = (cropObj.width / 100) * image.width;
      pxH = (cropObj.height / 100) * image.height;
    }

    const result = {
      x: Math.round(pxX * scaleX),
      y: Math.round(pxY * scaleY),
      width: Math.round(pxW * scaleX),
      height: Math.round(pxH * scaleY),
    };

    if (result.width <= 0 || result.height <= 0) return null;
    return result;
  }, []);

  const onCropperImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    imgRef.current = e.currentTarget;

    const initialCrop = centerCrop(
      makeAspectCrop(
        { unit: '%', width: 90 },
        cropAspect || (width / height),
        width,
        height
      ),
      width,
      height
    );
    setCrop(initialCrop);
    setCompletedCrop(null);
  }, [cropAspect]);

  const handleAspectChange = useCallback((aspectValue: number | undefined) => {
    setCropAspect(aspectValue);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      if (aspectValue) {
        setCrop(
          centerCrop(
            makeAspectCrop(
              { unit: '%', width: 90 },
              aspectValue,
              width,
              height
            ),
            width,
            height
          )
        );
      }
    }
  }, []);

  const handleSelectAll = useCallback(() => {
    setCropAspect(undefined);
    setCrop({
      unit: '%',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
  }, []);

  const handleCenterCrop = useCallback(() => {
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      const currentWidth = crop?.width || 80;
      setCrop(
        centerCrop(
          makeAspectCrop(
            { unit: '%', width: typeof currentWidth === 'number' ? currentWidth : 80 },
            cropAspect || (width / height),
            width,
            height
          ),
          width,
          height
        )
      );
    }
  }, [crop, cropAspect]);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<Blob | null> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg');
    });
  };

  const getCroppedImgDataUrl = async (imageSrc: string, pixelCrop: Area): Promise<string | null> => {
    try {
      const image = await createImage(imageSrc);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) return null;

      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );

      return canvas.toDataURL('image/jpeg', 0.92);
    } catch (err) {
      console.error("Erro ao gerar preview cortado:", err);
      return null;
    }
  };

  const saveCrop = useCallback(async () => {
    if (!imageToCrop || !imgRef.current) return;
    setIsCropping(true);

    try {
      const pixelCropResult = getPixelCrop(completedCrop || crop, imgRef.current);
      if (!pixelCropResult) {
        console.warn("Nenhuma área de corte válida selecionada.");
        setIsCropping(false);
        return;
      }

      const cropState = {
        crop,
        zoom,
        aspect: cropAspect,
        croppedAreaPixels: pixelCropResult
      };

      const sourceSrc = imageToCrop.originalPreview || imageToCrop.preview;
      const croppedDataUrl = await getCroppedImgDataUrl(sourceSrc, pixelCropResult);

      if (imageToCrop.type === 'collection') {
        setImages(prev => prev.map(img => img.id === imageToCrop.id ? { 
          ...img, 
          originalPreview: img.originalPreview || img.preview,
          croppedPreview: croppedDataUrl || img.croppedPreview || img.preview,
          preview: croppedDataUrl || img.preview,
          cropState 
        } : img));
      } else if (imageToCrop.type === 'model') {
        setModelImage(prev => prev ? { 
          ...prev, 
          originalPreview: prev.originalPreview || prev.preview,
          croppedPreview: croppedDataUrl || prev.croppedPreview || prev.preview,
          preview: croppedDataUrl || prev.preview,
          cropState 
        } : null);
      } else if (imageToCrop.type === 'product') {
        setProductImages(prev => prev.map(img => img.id === imageToCrop.id ? { 
          ...img, 
          originalPreview: img.originalPreview || img.preview,
          croppedPreview: croppedDataUrl || img.croppedPreview || img.preview,
          preview: croppedDataUrl || img.preview,
          cropState 
        } : img));
      }

      setImageToCrop(null);
      setCrop(undefined);
      setCompletedCrop(null);
      setZoom(1);
    } catch (err) {
      console.error("Erro ao salvar corte:", err);
    } finally {
      setIsCropping(false);
    }
  }, [imageToCrop, completedCrop, crop, zoom, cropAspect, getPixelCrop]);

  useEffect(() => {
    if (!imageToCrop) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveCrop();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setImageToCrop(null);
        setCrop(undefined);
        setCompletedCrop(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageToCrop, saveCrop]);

  const downloadCroppedImage = async (img: SceneImage) => {
    if (!img.cropState) return;
    try {
      const croppedBlob = await getCroppedImg(img.preview, img.cropState.croppedAreaPixels);
      if (!croppedBlob) throw new Error("Failed to crop image");
      const croppedFile = new File([croppedBlob], `cropped_${img.name}`, { type: 'image/jpeg' });
      const croppedPreview = URL.createObjectURL(croppedFile);
      const link = document.createElement('a');
      link.href = croppedPreview;
      link.download = `cropped_${img.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(croppedPreview), 100);
    } catch (err) {
      console.error("Error downloading cropped image:", err);
    }
  };

  const saveProjectToFolder = async (customProjectIndex?: number) => {
    if (!generatedScript) return;
    
    let pIndex = customProjectIndex;
    if (pIndex === undefined) {
      if (activeProjectId) {
        const proj = projects.find(p => p.id === activeProjectId);
        pIndex = proj ? proj.projectIndex : projectCounter;
      } else {
        pIndex = projectCounter;
      }
    }

    try {
      const txtContent = buildExportContent();

      const buildSectionHtml = (label: string, color: string, content: string) =>
        `<p style="font-weight:bold;font-size:9pt;color:${color};text-transform:uppercase;margin:8px 0 2px">${label}</p>
         <div style="background:#f5f5f5;padding:8px 10px;border-left:3px solid ${color};margin-bottom:10px;font-size:10pt">${content}</div>`;

      const scenesHtml = generatedScript.scenes.map((scene, i) => `
        <h2 style="font-size:13pt;color:#333;border-bottom:2px solid #E65C00;padding-bottom:4px">Cena ${i + 1} &bull; ${scene.duration} &bull; ${scene.imageName}</h2>
        ${buildSectionHtml('Imagem (Nano Banana 2)', '#b45309', scene.imagePrompt)}
        ${buildSectionHtml('VEO — Animação', '#2563eb', scene.veoPrompt)}
        ${buildSectionHtml('DIGEN — Fala', '#7c3aed', scene.digenPrompt)}
        <p style="font-weight:bold;font-size:9pt;color:#ea580c;text-transform:uppercase;margin:8px 0 2px">Narração (PT-BR)</p>
        <div style="background:#fff7ed;padding:8px 10px;border-left:3px solid #ea580c;margin-bottom:10px;font-style:italic;font-size:11pt">${scene.narration}</div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
      `).join('');

      const anglesHtml = (generatedAngles && generatedAngles.length > 0) ? `
        <h1 style="font-size:18pt;color:#E65C00;margin-top:24px">Ângulos do Produto</h1>
        ${generatedAngles.map((angle, i) => `
          <h2 style="font-size:13pt;color:#333;border-bottom:2px solid #E65C00;padding-bottom:4px">Ângulo ${i + 1}: ${angle.angleName}</h2>
          ${buildSectionHtml('Imagem (Nano Banana 2)', '#b45309', angle.imagePrompt)}
          ${buildSectionHtml('VEO — Animação', '#2563eb', angle.veoPrompt)}
          ${buildSectionHtml('DIGEN — Fala', '#7c3aed', angle.digenPrompt)}
          <p style="font-weight:bold;font-size:9pt;color:#ea580c;text-transform:uppercase;margin:8px 0 2px">Narração (PT-BR)</p>
          <div style="background:#fff7ed;padding:8px 10px;border-left:3px solid #ea580c;margin-bottom:10px;font-style:italic;font-size:11pt">${angle.narration}</div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
        `).join('')}
      ` : '';

      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><title>${generatedScript.campaignTitle}</title></head>
        <body style="font-family:Arial,sans-serif;line-height:1.4">
          <h1 style="font-size:22pt;color:#E65C00;border-bottom:3px solid #E65C00;padding-bottom:6px;margin-bottom:20px">${generatedScript.campaignTitle}</h1>
          ${scenesHtml}
          ${anglesHtml}
        </body>
        </html>
      `;

      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;
      const maxW = pageW - margin * 2;
      let y = margin;

      const checkPage = (heightNeeded: number) => {
        if (y + heightNeeded > pageH - margin) {
          doc.addPage(); y = margin;
        }
      };

      const addLabel = (text: string, r: number, g: number, b: number) => {
        checkPage(10);
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(r, g, b);
        doc.text(text.toUpperCase(), margin, y); y += 5;
      };

      const addBody = (text: string) => {
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
        const lines = doc.splitTextToSize(text, maxW);
        checkPage(lines.length * 4.5);
        doc.text(lines, margin, y); y += lines.length * 4.5 + 4;
      };

      const addDivider = () => {
        checkPage(6);
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageW - margin, y); y += 6;
      };

      doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(230, 92, 0);
      const titleLines = doc.splitTextToSize(generatedScript.campaignTitle, maxW);
      doc.text(titleLines, margin, y); y += titleLines.length * 8 + 4;
      doc.setDrawColor(230, 92, 0); doc.line(margin, y, pageW - margin, y); y += 8;

      generatedScript.scenes.forEach((scene, i) => {
        checkPage(20);
        doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 50, 50);
        doc.text(`Cena ${i + 1}  •  ${scene.duration}  •  ${scene.imageName}`, margin, y); y += 7;
        addLabel('Imagem (Nano Banana 2)', 180, 83, 9); addBody(scene.imagePrompt);
        addLabel('VEO — Animação', 37, 99, 235); addBody(scene.veoPrompt);
        addLabel('DIGEN — Fala', 124, 58, 237); addBody(scene.digenPrompt);
        addLabel('Narração PT-BR', 234, 88, 12);
        doc.setFontSize(10); doc.setFont('helvetica', 'italic'); doc.setTextColor(30, 30, 30);
        const nlines = doc.splitTextToSize(scene.narration, maxW);
        checkPage(nlines.length * 5); doc.text(nlines, margin, y); y += nlines.length * 5 + 4;
        addDivider();
      });

      if (generatedAngles && generatedAngles.length > 0) {
        checkPage(20);
        doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(230, 92, 0);
        doc.text('ÂNGULOS DO PRODUTO', margin, y); y += 10;
        generatedAngles.forEach((angle, i) => {
          checkPage(20);
          doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 50, 50);
          doc.text(`Ângulo ${i + 1}: ${angle.angleName}`, margin, y); y += 7;
          addLabel('Imagem (Nano Banana 2)', 180, 83, 9); addBody(angle.imagePrompt);
          addLabel('VEO — Animação', 37, 99, 235); addBody(angle.veoPrompt);
          addLabel('DIGEN — Fala', 124, 58, 237); addBody(angle.digenPrompt);
          addLabel('Narração PT-BR', 234, 88, 12);
          doc.setFontSize(10); doc.setFont('helvetica', 'italic'); doc.setTextColor(30, 30, 30);
          const nlines = doc.splitTextToSize(angle.narration, maxW);
          checkPage(nlines.length * 5); doc.text(nlines, margin, y); y += nlines.length * 5 + 4;
          addDivider();
        });
      }

      const pdfBase64 = doc.output('datauristring').split(',')[1];

      const rawImages = activeTab === 'collection' ? images : [...productImages, ...(modelImage ? [modelImage] : [])];
      const imagesPayload = await Promise.all(rawImages.map(async (img) => {
        const payloadBase64 = await getImagePayload(img);
        return {
          name: img.name,
          base64: payloadBase64.split(',')[1]
        };
      }));

      if (window.electronAPI && window.electronAPI.saveProjectAssets) {
        const result = await window.electronAPI.saveProjectAssets({
          projectIndex: pIndex,
          campaignTitle: generatedScript.campaignTitle,
          txtContent,
          htmlContent,
          pdfBase64,
          images: imagesPayload
        });

        if (result.success) {
          setValidationAlert({
            title: "Projeto Salvo",
            message: `Todos os arquivos do projeto foram salvos em:\nDownloads/TikTok Shop/produto${pIndex}/`
          });
          
          if (activeProjectId) {
            setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, status: 'done' } : p));
          }
        } else {
          throw new Error(result.error);
        }
      }
    } catch (err: any) {
      console.error("Failed to save project assets:", err);
      setValidationAlert({
        title: "Erro ao Salvar Assets",
        message: `Ocorreu um erro ao salvar os assets do produto:\n${err.message || String(err)}`
      });
    }
  };

  // Sincroniza estados locais com o projeto ativo na fila
  useEffect(() => {
    if (!activeProjectId) return;
    setProjects(prev => prev.map(proj => {
      if (proj.id === activeProjectId) {
        return {
          ...proj,
          type: activeTab,
          images,
          modelImage,
          productImages,
          theme,
          customTheme,
          numScenes,
          videoStyle,
          voiceGender,
          voiceTone,
          observations,
          duration,
          generatedScript,
          generatedAngles,
          injectionTarget,
          targetConfigs,
          productReviews,
          imageWorkflowMode
        };
      }
      return proj;
    }));
  }, [
    activeProjectId,
    activeTab,
    images,
    modelImage,
    productImages,
    theme,
    customTheme,
    numScenes,
    videoStyle,
    voiceGender,
    voiceTone,
    observations,
    duration,
    generatedScript,
    generatedAngles,
    injectionTarget,
    targetConfigs,
    productReviews,
    imageWorkflowMode
  ]);

  const loadProject = (proj: ProjectItem) => {
    setActiveProjectId(null);
    setActiveTab(proj.type);
    setImages(proj.images);
    setModelImage(proj.modelImage);
    setProductImages(proj.productImages);
    setTheme(proj.theme);
    setCustomTheme(proj.customTheme);
    setNumScenes(proj.numScenes);
    setVideoStyle(proj.videoStyle);
    setVoiceGender(proj.voiceGender);
    setVoiceTone(proj.voiceTone || 'enthusiastic');
    setImageWorkflowMode(proj.imageWorkflowMode || 'direct_collected');
    setObservations(proj.observations);
    setDuration(proj.duration);
    setGeneratedScript(proj.generatedScript);
    setGeneratedAngles(proj.generatedAngles);
    setInjectionTarget(proj.injectionTarget || 'none');
    setTargetConfigs(proj.targetConfigs || {});
    setProductReviews(proj.productReviews || null);
    setProductDescription(proj.productDescription || '');
    setIncludeProductDescription(true);
    
    setTimeout(() => {
      setActiveProjectId(proj.id);
    }, 50);
  };

  const createNewProject = () => {
    const nextIndex = projectCounter;
    const newProj: ProjectItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Produto ${nextIndex}`,
      type: 'collection',
      images: [],
      modelImage: null,
      productImages: [],
      theme: THEMES[0],
      customTheme: '',
      numScenes: 3,
      videoStyle: 'standard',
      voiceGender: 'female',
      voiceTone: 'enthusiastic',
      imageWorkflowMode: 'direct_collected',
      observations: '',
      duration: DURATIONS[0],
      generatedScript: null,
      generatedAngles: null,
      status: 'pending',
      projectIndex: nextIndex,
      injectionTarget: 'none',
      targetConfigs: {},
      productReviews: null,
      productDescription: ''
    };

    setProjects(prev => [...prev, newProj]);
    setProjectCounter(prev => prev + 1);
    
    loadProject(newProj);
    setShowQueue(true); 
  };

  const removeProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeProjectId === id) {
      setActiveProjectId(null);
      setImages([]);
      setModelImage(null);
      setProductImages([]);
      setProductDescription('');
      setIncludeProductDescription(true);
      setGeneratedScript(null);
      setGeneratedAngles(null);
      setInjectionTarget('none');
      setTargetConfigs({});
    }
  };

  const handleApiKeysUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const keys = text
        .split('\n')
        .map(line => aiProvidersManager.sanitizeKey(line))
        .filter(line => line.length > 5 && line !== 'MY_GEMINI_API_KEY');
      setApiKeys(keys);
      if (keys.length > 0) {
        setGeminiApiKeyInput(keys[0]);
      }
      aiProvidersManager.setGeminiKeys(keys);
      setCurrentKeyIndex(0);
      if(keys.length > 0) {
        setValidationAlert({
          title: "Chaves Carregadas",
          message: `${keys.length} chaves de API carregadas e salvas com sucesso!`
        });
      }
    };
    reader.readAsText(file);
    if (keysFileInputRef.current) keysFileInputRef.current.value = '';
  };

  const handleSaveGeminiSingleKey = (rawKey: string) => {
    setGeminiApiKeyInput(rawKey);
    const cleanKey = aiProvidersManager.sanitizeKey(rawKey);
    if (cleanKey && cleanKey.length > 5 && cleanKey !== 'MY_GEMINI_API_KEY') {
      const otherKeys = apiKeys.filter(k => k !== cleanKey);
      const newKeys = [cleanKey, ...otherKeys];
      setApiKeys(newKeys);
      aiProvidersManager.setGeminiKeys(newKeys);
    } else if (!rawKey.trim()) {
      setApiKeys([]);
      aiProvidersManager.setGeminiKeys([]);
    }
  };

  const checkHasValidKey = (): boolean => {
    const currentProvider = aiProvidersManager.getActiveProvider();
    const cfg = aiProvidersManager.getConfig();
    if (currentProvider === 'gemini') {
      const cleanInput = aiProvidersManager.sanitizeKey(geminiApiKeyInput);
      return (Boolean(cleanInput) && cleanInput !== 'MY_GEMINI_API_KEY') || 
             apiKeys.some(k => k && k !== 'MY_GEMINI_API_KEY') || 
             (Boolean(cfg.gemini.keys) && cfg.gemini.keys.some(k => k && k !== 'MY_GEMINI_API_KEY'));
    } else if (currentProvider === 'groq') {
      const cleanInput = aiProvidersManager.sanitizeKey(groqApiKey);
      return (Boolean(cleanInput) && cleanInput !== 'MY_GROQ_API_KEY') ||
             groqApiKeys.some(k => k && k !== 'MY_GROQ_API_KEY') ||
             (Boolean(cfg.groq.keys) && cfg.groq.keys.some(k => k && k !== 'MY_GROQ_API_KEY'));
    } else if (currentProvider === 'openrouter') {
      const cleanInput = aiProvidersManager.sanitizeKey(openrouterApiKey);
      return (Boolean(cleanInput) && cleanInput !== 'MY_OPENROUTER_API_KEY') ||
             openrouterApiKeys.some(k => k && k !== 'MY_OPENROUTER_API_KEY') ||
             (Boolean(cfg.openrouter.keys) && cfg.openrouter.keys.some(k => k && k !== 'MY_OPENROUTER_API_KEY'));
    }
    return false;
  };

  const getMissingKeyMessage = (): string => {
    const prov = aiProvidersManager.getActiveProvider();
    if (prov === 'gemini') {
      return "Nenhuma chave de API do Gemini configurada. Cole sua chave de API (AIzaSy...) ou carregue um .txt nas configurações (ícone de engrenagem).";
    } else if (prov === 'groq') {
      return "Nenhuma chave de API do Groq configurada (gsk_...). Cole sua chave ou carregue um .txt nas configurações (ícone de engrenagem).";
    } else {
      return "Nenhuma chave de API do OpenRouter configurada (sk-or-v1-...). Cole sua chave ou carregue um .txt nas configurações (ícone de engrenagem).";
    }
  };

  const handleSelectActiveProvider = (prov: AIProviderId) => {
    setActiveAIProvider(prov);
    aiProvidersManager.setActiveProvider(prov);
  };

  const handleSaveGroqKey = (rawKey: string) => {
    setGroqApiKey(rawKey);
    const cleanKey = aiProvidersManager.sanitizeKey(rawKey);
    if (cleanKey && cleanKey.length > 5 && cleanKey !== 'MY_GROQ_API_KEY') {
      const otherKeys = groqApiKeys.filter(k => k !== cleanKey);
      const newKeys = [cleanKey, ...otherKeys];
      setGroqApiKeys(newKeys);
      aiProvidersManager.setGroqKeys(newKeys);
    } else if (!rawKey.trim()) {
      if (groqApiKeys.length <= 1) {
        setGroqApiKeys([]);
        aiProvidersManager.setGroqKeys([]);
      } else {
        const remaining = groqApiKeys.slice(1);
        setGroqApiKeys(remaining);
        aiProvidersManager.setGroqKeys(remaining);
      }
    }
  };

  const handleGroqKeysUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const keys = text
        .split('\n')
        .map(line => aiProvidersManager.sanitizeKey(line))
        .filter(line => line.length > 5 && line !== 'MY_GROQ_API_KEY');
      setGroqApiKeys(keys);
      if (keys.length > 0) {
        setGroqApiKey(keys[0]);
      }
      aiProvidersManager.setGroqKeys(keys);
      if (keys.length > 0) {
        setValidationAlert({
          title: "Chaves Groq Carregadas",
          message: `${keys.length} chaves de API do Groq Cloud carregadas e salvas com sucesso!`
        });
      }
    };
    reader.readAsText(file);
    if (groqFileInputRef.current) groqFileInputRef.current.value = '';
  };

  const handleSaveGroqModel = (model: string) => {
    setGroqModel(model);
    aiProvidersManager.saveConfig({ groq: { ...aiProvidersManager.getConfig().groq, model } });
  };

  const handleSaveOpenRouterKey = (rawKey: string) => {
    setOpenrouterApiKey(rawKey);
    const cleanKey = aiProvidersManager.sanitizeKey(rawKey);
    if (cleanKey && cleanKey.length > 5 && cleanKey !== 'MY_OPENROUTER_API_KEY') {
      const otherKeys = openrouterApiKeys.filter(k => k !== cleanKey);
      const newKeys = [cleanKey, ...otherKeys];
      setOpenrouterApiKeys(newKeys);
      aiProvidersManager.setOpenRouterKeys(newKeys);
    } else if (!rawKey.trim()) {
      if (openrouterApiKeys.length <= 1) {
        setOpenrouterApiKeys([]);
        aiProvidersManager.setOpenRouterKeys([]);
      } else {
        const remaining = openrouterApiKeys.slice(1);
        setOpenrouterApiKeys(remaining);
        aiProvidersManager.setOpenRouterKeys(remaining);
      }
    }
  };

  const handleOpenRouterKeysUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const keys = text
        .split('\n')
        .map(line => aiProvidersManager.sanitizeKey(line))
        .filter(line => line.length > 5 && line !== 'MY_OPENROUTER_API_KEY');
      setOpenrouterApiKeys(keys);
      if (keys.length > 0) {
        setOpenrouterApiKey(keys[0]);
      }
      aiProvidersManager.setOpenRouterKeys(keys);
      if (keys.length > 0) {
        setValidationAlert({
          title: "Chaves OpenRouter Carregadas",
          message: `${keys.length} chaves de API do OpenRouter carregadas e salvas com sucesso!`
        });
      }
    };
    reader.readAsText(file);
    if (openrouterFileInputRef.current) openrouterFileInputRef.current.value = '';
  };

  const handleSaveOpenRouterModel = (model: string) => {
    setOpenrouterModel(model);
    aiProvidersManager.saveConfig({ openrouter: { ...aiProvidersManager.getConfig().openrouter, model } });
  };

  const handleSaveGeminiModel = (model: string) => {
    setGeminiModel(model);
    aiProvidersManager.saveConfig({ gemini: { ...aiProvidersManager.getConfig().gemini, model } });
  };

  const handleToggleFailover = (enabled: boolean) => {
    setEnableFailover(enabled);
    aiProvidersManager.saveConfig({ enableFailover: enabled });
  };

  const handleTestConnection = async (provider: AIProviderId) => {
    setIsTestingProvider(provider);
    setTestFeedback(null);
    try {
      let keyOverride: string | undefined;
      let modelOverride: string | undefined;
      if (provider === 'gemini') {
        const candidate = geminiApiKeyInput.trim() || apiKeys[0];
        const clean = aiProvidersManager.sanitizeKey(candidate);
        if (!clean || clean === 'MY_GEMINI_API_KEY') {
          setTestFeedback({
            provider: 'gemini',
            success: false,
            message: 'Nenhuma chave Gemini informada. Por favor, cole sua chave de API (AIzaSy...) ou carregue um arquivo .txt.'
          });
          setIsTestingProvider(null);
          return;
        }
        keyOverride = clean;
        modelOverride = geminiModel;
      } else if (provider === 'groq') {
        const candidate = groqApiKey.trim() || groqApiKeys[0];
        const clean = aiProvidersManager.sanitizeKey(candidate);
        if (!clean || clean === 'MY_GROQ_API_KEY') {
          setTestFeedback({
            provider: 'groq',
            success: false,
            message: 'Nenhuma chave Groq Cloud informada. Cole sua chave de API (gsk_...) ou carregue um arquivo .txt.'
          });
          setIsTestingProvider(null);
          return;
        }
        keyOverride = clean;
        modelOverride = groqModel;
      } else if (provider === 'openrouter') {
        const candidate = openrouterApiKey.trim() || openrouterApiKeys[0];
        const clean = aiProvidersManager.sanitizeKey(candidate);
        if (!clean || clean === 'MY_OPENROUTER_API_KEY') {
          setTestFeedback({
            provider: 'openrouter',
            success: false,
            message: 'Nenhuma chave OpenRouter informada. Cole sua chave de API (sk-or-v1-...) ou carregue um arquivo .txt.'
          });
          setIsTestingProvider(null);
          return;
        }
        keyOverride = clean;
        modelOverride = openrouterModel;
      }
      const res = await aiProvidersManager.testProviderConnection(provider, keyOverride, modelOverride);
      setTestFeedback({ provider, success: res.success, message: res.message });
    } catch (err: any) {
      setTestFeedback({ provider, success: false, message: formatAIError(err, provider) });
    } finally {
      setIsTestingProvider(null);
    }
  };

  const executeUnifiedAI = async (
    options: UnifiedAIOptions
  ): Promise<UnifiedAIResult> => {
    const rawKeys = apiKeys.length > 0 ? [...apiKeys] : (geminiApiKeyInput ? [geminiApiKeyInput] : (process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY] : []));
    const keysToTry = rawKeys
      .map(k => aiProvidersManager.sanitizeKey(k))
      .filter(k => k.length > 5 && k !== 'MY_GEMINI_API_KEY');

    const rawGroq = groqApiKeys.length > 0 ? [...groqApiKeys] : (groqApiKey ? [groqApiKey] : []);
    const groqKeysToTry = rawGroq
      .map(k => aiProvidersManager.sanitizeKey(k))
      .filter(k => k.length > 5 && k !== 'MY_GROQ_API_KEY');

    const rawOpenRouter = openrouterApiKeys.length > 0 ? [...openrouterApiKeys] : (openrouterApiKey ? [openrouterApiKey] : []);
    const openrouterKeysToTry = rawOpenRouter
      .map(k => aiProvidersManager.sanitizeKey(k))
      .filter(k => k.length > 5 && k !== 'MY_OPENROUTER_API_KEY');

    try {
      const result = await aiProvidersManager.execute(options, keysToTry, groqKeysToTry, openrouterKeysToTry);
      if (result.failoverUsed) {
        console.info(`[Failover] ${result.failoverReason}`);
      }
      return result;
    } catch (error: any) {
      setIsKeysExhaustedAlertOpen(true);
      playAlertSound();
      throw error;
    }
  };

  const getGeminiKey = () => {
    const validKeys = (apiKeys.length > 0 ? apiKeys : (geminiApiKeyInput ? [geminiApiKeyInput] : []))
      .map(k => aiProvidersManager.sanitizeKey(k))
      .filter(k => k.length > 5 && k !== 'MY_GEMINI_API_KEY');
    if (validKeys.length > 0) {
      const key = validKeys[currentKeyIndex % validKeys.length];
      setCurrentKeyIndex(prev => prev + 1);
      return key;
    }
    const envKey = aiProvidersManager.sanitizeKey(process.env.GEMINI_API_KEY);
    return (envKey && envKey !== 'MY_GEMINI_API_KEY') ? envKey : '';
  };

  // Modelo primário + fallbacks ativos (suportados na API oficial do Google)
  const GEMINI_MODEL_CHAIN = [
    "gemini-2.0-flash",      // Modelo primário ativo oficial
    "gemini-1.5-flash",      // Fallback oficial estável
    "gemini-flash-latest",   // Fallback automático
  ];

  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playBeep = (delay: number, frequency: number, duration: number) => {
        setTimeout(() => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
          
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
          
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + duration);
        }, delay);
      };

      playBeep(0, 880, 0.15);
      playBeep(200, 880, 0.15);
      playBeep(400, 523, 0.35);
    } catch (err) {
      console.error("Falha ao tocar o som de alerta:", err);
    }
  };

  const executeGeminiCall = async <T,>(apiCall: (ai: GoogleGenAI, model: string) => Promise<T>): Promise<T> => {
    // Captura as chaves no momento da chamada (evita problema de React state assíncrono)
    const rawKeys = apiKeys.length > 0 ? [...apiKeys] : (geminiApiKeyInput ? [geminiApiKeyInput] : (process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY] : []));
    const keysToTry = rawKeys
      .map(k => aiProvidersManager.sanitizeKey(k))
      .filter(k => k.length > 5 && k !== 'MY_GEMINI_API_KEY');
    
    if (keysToTry.length === 0) {
      throw new Error("Nenhuma chave de API do Gemini configurada. Cole sua chave de API (AIzaSy...) nas configurações.");
    }

    let lastError: any = null;

    // Loop externo: percorre cada chave disponível
    for (let keyIdx = 0; keyIdx < keysToTry.length; keyIdx++) {
      const key = keysToTry[keyIdx];
      
      // Loop interno: percorre a cadeia de modelos (primário → fallbacks)
      for (const model of GEMINI_MODEL_CHAIN) {
        try {
          const ai = new GoogleGenAI({ apiKey: key });
          console.log(`Tentando chave ${keyIdx + 1}/${keysToTry.length} com modelo: ${model}`);
          return await apiCall(ai, model);
        } catch (error: any) {
          lastError = error;
          
          const errorMsg = error?.message || "";
          const errorStatus = error?.status || "";
          const errorDetails = typeof error === 'object' ? JSON.stringify(error) : "";
          const errorStr = `${errorMsg} ${errorStatus} ${errorDetails} ${String(error)}`.toLowerCase();
          
          // Erros de chave ou cota de requisições esgotada (429, quota, invalid key): pular para a próxima chave imediatamente
          const isKeyError = errorStr.includes("api key expired") || 
                             errorStr.includes("api key not valid") || 
                             errorStr.includes("api_key_invalid") ||
                             errorStr.includes("key expired") ||
                             errorStr.includes("invalid api key") ||
                             errorStr.includes("resource_exhausted") ||
                             errorStr.includes("quota") ||
                             errorStr.includes("429") ||
                             errorStr.includes("permission_denied") ||
                             (errorStr.includes("invalid_argument") && errorStr.includes("key")) ||
                             (errorStr.includes("400") && errorStr.includes("key"));
          
          if (isKeyError) {
            console.warn(`Chave ${keyIdx + 1} sem cota ou inválida. Alternando para próxima chave...`);
            break; // Sai do loop de modelos, vai para a próxima chave
          }
          
          // Erros de modelo sobrecarregado / temporariamente indisponível (503): aguarda 600ms e tenta o próximo modelo da cadeia
          const isOverloadError = errorStr.includes("503") ||
                                  errorStr.includes("overloaded") ||
                                  errorStr.includes("unavailable") ||
                                  errorStr.includes("service unavailable");

          if (isOverloadError) {
            console.warn(`Modelo ${model} temporariamente sobrecarregado (503). Alternando para o próximo modelo...`);
            await new Promise(r => setTimeout(r, 600));
            continue; // Tenta o próximo modelo na cadeia
          }

          // Erros de modelo não encontrado / descontinuado (404)
          const isModelNotFoundError = errorStr.includes("model not found") ||
                                       errorStr.includes("not found") ||
                                       errorStr.includes("404") ||
                                       errorStr.includes("model_not_found") ||
                                       errorStr.includes("unsupported");
          
          if (isModelNotFoundError) {
            console.warn(`Modelo ${model} indisponível. Tentando próximo modelo...`);
            continue; // Tenta o próximo modelo na cadeia
          }
          
          // Outros erros: lança imediatamente (erro de lógica, timeout, etc.)
          throw error;
        }
      }
    }

    // Se todas as chaves falharem, dispara o popup e o sinal sonoro de alerta
    setIsKeysExhaustedAlertOpen(true);
    playAlertSound();
    
    // Monta mensagem de erro amigável
    const lastMsg = (lastError?.message || String(lastError) || "").toLowerCase();
    if (lastMsg.includes("key expired") || lastMsg.includes("api key") || lastMsg.includes("invalid_argument")) {
      throw new Error(`Todas as ${keysToTry.length} chave(s) de API estão expiradas ou inválidas.\nRenove suas chaves em: https://aistudio.google.com/apikey`);
    }
    throw lastError || new Error("Todos os modelos e chaves falharam. Verifique sua conexão e chaves de API.");
  };

  const autoSequence = async () => {
    if (images.length < 2) return;
    setIsSequencing(true);
    try {
      const finalTheme = customTheme || theme;

      const imageListData = images.map((img, idx) => ({
        index: idx,
        name: img.name
      }));

      const response = await executeUnifiedAI({
        prompt: `Analise estas imagens para uma campanha de moda com o tema "${finalTheme}". 
Nomes das imagens: ${JSON.stringify(imageListData)}.
Retorne um array JSON indicando a sequência ideal baseada no nome/descrição das imagens para um fluxo narrativo fluido.
Exemplo: [2, 0, 1].
Retorne APENAS o array JSON.`,
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.INTEGER }
        }
      });

      const newOrder = aiProvidersManager.safeJsonParse<number[]>(response.text || '[]', []);
      if (Array.isArray(newOrder) && newOrder.length === images.length) {
        const sortedImages = newOrder.map(idx => images[idx]);
        setImages(sortedImages);
      }
    } catch (error) {
      console.error("Erro na sequência:", error);
    } finally {
      setIsSequencing(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    addImages(files);
  };

  const handleSingleFileChange = (e: ChangeEvent<HTMLInputElement>, type: 'model' | 'product') => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;
    
    if (type === 'model') {
      const newImage = {
        id: Math.random().toString(36).substr(2, 9),
        file: files[0],
        preview: URL.createObjectURL(files[0]),
        name: files[0].name
      };
      setModelImage(newImage);
    } else {
      const newImages = files.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: URL.createObjectURL(file),
        name: file.name
      }));
      setProductImages(prev => [...prev, ...newImages]);
    }
  };

  const removeSingleImage = (type: 'model' | 'product', id?: string) => {
    if (type === 'model' && modelImage) {
      URL.revokeObjectURL(modelImage.preview);
      setModelImage(null);
    } else if (type === 'product' && id) {
      setProductImages(prev => {
        const removed = prev.find(img => img.id === id);
        if (removed) URL.revokeObjectURL(removed.preview);
        return prev.filter(img => img.id !== id);
      });
    }
  };

  const addImages = (files: File[]) => {
    const newImages = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      const removed = prev.find(img => img.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return filtered;
    });
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files) as File[];
    addImages(files);
  };

  const handleSortDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleSortDragOver = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    const newImages = [...images];
    const draggedItem = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setImages(newImages);
  };

  const cancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  const generateProductScript = async () => {
    if (!checkHasValidKey()) {
      setValidationAlert({
        title: "Chave de API Faltando",
        message: getMissingKeyMessage()
      });
      return;
    }
    if (productImages.length === 0) {
      setValidationAlert({
        title: "Fotos do Produto Faltando",
        message: "Por favor, adicione pelo menos uma foto do produto na seção 'Produto (Várias Fotos)' para que possamos gerar o roteiro do seu produto."
      });
      return;
    }
    if (videoStyle === 'standard' && !modelImage) {
      setValidationAlert({
        title: "Modelo/Apresentador Faltando",
        message: "Você selecionou o estilo de vídeo 'Apresentador', que exige uma imagem de referência do apresentador. Por favor, envie uma foto na seção 'Modelo / Apresentador(a)' ou altere o estilo do vídeo para 'POV (Mãos)'."
      });
      return;
    }
    if (!numScenes || numScenes <= 0) {
      setValidationAlert({
        title: "Número de Cenas Inválido",
        message: "Por favor, insira um número válido de cenas (mínimo 1) para o roteiro do seu produto."
      });
      return;
    }
    
    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    try {
      const parts: any[] = [];
      
      if (modelImage) {
        const modelBase64 = await getImagePayload(modelImage);
        parts.push({ inlineData: { mimeType: modelImage.file.type, data: modelBase64.split(',')[1] } });
      }
      
      const productParts = await Promise.all(productImages.map(async (img) => {
        const base64 = await getImagePayload(img);
        return { inlineData: { mimeType: img.file.type, data: base64.split(',')[1] } };
      }));
      parts.push(...productParts);

      const styleInstruction = videoStyle === 'pov' 
        ? `ESTILO DO VÍDEO: POV (APENAS MÃOS / PRIMEIRA PESSOA)
- O apresentador/modelo NÃO deve aparecer de corpo inteiro ou mostrar o rosto. Apenas suas mãos (de acordo com o gênero e produto) devem aparecer manipulando, segurando, demonstrando, tocando ou usando o produto.
- No campo 'imagePrompt' (Nano Banana 2 / Imagen 3), NUNCA inclua descrições do rosto ou corpo do modelo. Descreva um close-up extremo ou macro focado apenas nas mãos (femininas ou masculinas conforme o produto) segurando e demonstrando o produto com extremo realismo e qualidade.
- No campo 'veoPrompt' (Animação VEO), descreva movimentos de câmera focados nas ações das mãos: girando o produto, aplicando, mostrando texturas, detalhes e close-ups das mãos em ação.
- No campo 'digenPrompt' (DIGEN), descreva uma narração em off (voiceover) apropriada para acompanhar a demonstração do produto, sem movimentos labiais do avatar (pois é POV).`
        : `ESTILO DO VÍDEO: APRESENTADOR PADRÃO (VISÍVEL NO VÍDEO)
- O apresentador/modelo aparece na cena interagindo e apresentando o produto.
- O campo 'imageName' deve indicar qual referência usar principalmente na cena (use "${modelImage?.name || ''}" se o foco principal for a modelo ou o nome de um dos arquivos de foto do produto se for um detalhe).
- No campo 'imagePrompt' (Nano Banana 2 / Imagen 3), descreva a modelo apresentando e interagindo com o produto de forma fotorrealista e natural.`;

      const toneMap: Record<string, { pt: string; en: string }> = {
        enthusiastic: {
          pt: 'Entusiasta & Espontâneo (Voz animada, alegre, calorosa e estilo criador autêntico do TikTok)',
          en: 'warm, enthusiastic and authentic TikTok creator tone'
        },
        persuasive: {
          pt: 'Confiante & Persuasivo (Voz firme, segura, elegante com postura de autoridade)',
          en: 'confident, authoritative, persuasive and elegant commercial tone'
        },
        calm: {
          pt: 'Suave & Estético (Voz suave, calma, intimista e elegante para moda/lifestyle)',
          en: 'calm, soft, intimate, gentle and aesthetic storytelling tone'
        },
        promo: {
          pt: 'Achadinho & Urgente (Voz dinâmica, empolgada, ritmo acelerado de oportunidade imperdível)',
          en: 'fast-paced, excited, promotional and dynamic deal hunter tone'
        }
      };

      const currentTone = toneMap[voiceTone] || toneMap.enthusiastic;
      const genderLabel = voiceGender === 'female' ? 'FEMININA' : (voiceGender === 'male' ? 'MASCULINA' : 'SEM VOZ');
      const genderEn = voiceGender === 'female' ? 'Female voice' : (voiceGender === 'male' ? 'Male voice' : 'No voice');

      const voiceInstruction = voiceGender === 'none'
        ? `GÊNERO DA VOZ & TOM / NARRADOR: SEM NARRAÇÃO (SEM FALA).
- O vídeo NÃO terá nenhuma narração falada, voz humana ou diálogo (no-voiceover / no-speech).
- O foco é 100% visual: mostrar o produto de vários ângulos, destacando detalhes, qualidade e texturas com uma música de fundo instrumental.
- No campo 'narration' (em PT-BR), em vez de fala falada, você DEVE escrever descrições detalhadas da trilha sonora (SFX / Música de fundo) e legendas de texto para aparecer na tela (ex: '[Música instrumental animada de fundo] [Legenda de tela: Conheça a qualidade do...]').
- OBRIGATÓRIO EM 'veoPrompt' (GOOGLE VEO):
  No segmento de áudio, especifique explicitamente:
  "Voiceover/Dialogue: (No voiceover / Instrumental only)"
- OBRIGATÓRIO EM 'digenPrompt' (DIGEN):
  No segmento de voz e diálogo, especifique explicitamente:
  "Voice & Tone: No voiceover (Instrumental only) | Dialogue: None"`
        : `GÊNERO DA VOZ & TOM DE LOCUÇÃO PADRONIZADO (OBRIGATÓRIO NOS PROMPTS DE VÍDEO):
- GÊNERO DA VOZ SELECIONADO: OBRIGATORIAMENTE ${genderLabel} (${genderEn}).
- TIPO DE TOM SELECIONADO: OBRIGATORIAMENTE ${currentTone.pt.toUpperCase()} (${currentTone.en}).

🎯 PADRÃO ESTRUTURAL OBRIGATÓRIO NOS PROMPTS DE VÍDEO (NUNCA OMITA GÊNERO OU TOM):
1. ⚠️ NO CAMPO 'veoPrompt' (GOOGLE VEO):
   O segmento de voz e diálogo DEVE conter obrigatoriamente a especificação (${genderEn}, ${currentTone.en}):
   Visual & Camera: [Ação visual e movimento de câmera cinematográfico] | Voiceover/Dialogue: (${genderEn}, ${currentTone.en}) '[Texto exato da fala em PT-BR]' | Background Music & SFX: [Trilha comercial e efeitos sonoros táteis].
2. ⚠️ NO CAMPO 'digenPrompt' (DIGEN.ai):
   O prompt DEVE conter explicitamente o segmento padronizado 'Voice & Tone':
   Model/Action: [Microexpressões faciais e gestos com produto] | Voice & Tone: ${genderEn}, ${currentTone.en} | Dialogue: '[Texto exato da fala em PT-BR]' | Background Music: [Trilha comercial moderna].
3. ⚠️ NO CAMPO 'narration' (PORTUGUÊS BRASILEIRO PT-BR):
   A narração em PT-BR DEVE ser redigida respeitando a concordância, adjetivos e o estilo para voz ${genderLabel} no tom ${currentTone.pt}.`;

      const configList = Object.entries(targetConfigs)
        .filter(([key]) => key.startsWith(`${injectionTarget}-`))
        .map(([key, val]) => {
          let label = key.replace(`${injectionTarget}-`, '');
          if (label === 'Variacoes') label = 'Quantidade de Variações (em paralelo)';
          return `${label}: ${val}`;
        })
        .join('\n');

      const platformInstruction = injectionTarget !== 'none'
        ? `PLATAFORMA DE DESTINO DA AUTOMAÇÃO: ${injectionTarget.toUpperCase()}
CONFIGURAÇÕES SELECIONADAS:
${configList}
- Certifique-se de que os prompts gerados em 'veoPrompt' e 'digenPrompt' reflitam e respeitem essas escolhas (por exemplo, se o formato é vertical 9:16, descreva enquadramentos verticais móveis; se o narrador selecionado é Jenny, monte o tom de voz e estilo adequados).`
        : '';

      const productDescriptionInstruction = (productDescription && includeProductDescription)
        ? `\n📦 ESPECIFICAÇÕES TÉCNICAS E DESCRIÇÃO OFICIAL DO PRODUTO (TIKTOK SHOP):
${productDescription}

🎯 DIRETRIZES DE USO DA DESCRIÇÃO E MEDIDAS DO PRODUTO:
1. FIDELIDADE AOS MATERIAIS & MODELAGEM: Use o tecido exato (ex: tecido sensorial, caimento fluido, amarração, barra ampla), acabamentos e diferenciais da peça nas falas da narração em PT-BR.
2. CAIMENTO E MEDIDAS: Se houver tabela de medidas ou dados de tamanho, mencione com naturalidade a precisão do caimento no corpo para passar segurança aos compradores.
3. PROMPTS DE VÍDEO E IMAGEM: Descreva nos prompts visuais (veoPrompt, digenPrompt e imagePrompt) as texturas, drapeados e detalhes reais destacados na descrição oficial.\n`
        : '';

      const reviewsInstruction = (productReviews && productReviews.includeInPrompt && (productReviews.comments.length > 0 || productReviews.tags.length > 0))
        ? `\n💬 ORIENTAÇÃO ESPECIAL BASEADA EM AVALIAÇÕES E FEEDBACK REAL DE CLIENTES (TIKTOK SHOP):
O usuário optou expressamente por incluir as avaliações reais de compradores do TikTok Shop para orientar este roteiro.
${productReviews.rating ? `- Avaliação Média dos Compradores: ${productReviews.rating} estrelas\n` : ''}${productReviews.totalReviews ? `- Total de Avaliações Registradas: ${productReviews.totalReviews}\n` : ''}${productReviews.tags.length > 0 ? `- Destaques mais elogiados pelos clientes: ${productReviews.tags.join(', ')}\n` : ''}${productReviews.comments.length > 0 ? `- Depoimentos reais de quem comprou:\n${productReviews.comments.map((c, i) => `  ${i + 1}. "${c}"`).join('\n')}\n` : ''}
🎯 DIRETRIZES OBRIGATÓRIAS DE ROTEIRO & COPYWRITING (SOCIAL PROOF):
1. GANCHOS AUTÊNTICOS: Use as dores, desejos e motivos reais citados pelos compradores para criar ganchos atrativos no início do vídeo.
2. PROVA SOCIAL NA NARRAÇÃO: Inclua na narração em PT-BR citações e menções naturais a depoimentos (ex: "quem comprou amou o caimento", "comentários só elogiam o acabamento", etc.).
3. QUEBRA DE OBJEÇÕES: Responda no texto da fala às principais dúvidas de compra citadas e resolvidas nos comentários.
4. PROMPTS DE VÍDEO (veoPrompt e digenPrompt): Oriente as ações do apresentador e os movimentos de câmera para demonstrar visualmente e em close exatamente os aspectos que os clientes mais elogiaram.\n`
        : '';

      const workflowInstruction = imageWorkflowMode === 'nano_banana_first'
        ? `\n🎨 FLUXO DE PRODUÇÃO SELECIONADO: CRIAR NOVAS FOTOS NO NANO BANANA 2 PRIMEIRO (PIPELINE DE DOIS ESTÁGIOS)
- O usuário escolheu expressamente gerar primeiro cada prompt de imagem no Nano Banana 2 / Imagen 3 para criar fotos novas de estúdio e catálogo antes dos vídeos.
- No campo 'imagePrompt': Crie prompts ultra-detalhados para o Nano Banana 2 gerar fotografias estáticas profissionais de alta costura e estúdio comercial baseadas no produto.
- Nos campos 'veoPrompt' e 'digenPrompt': Construa os prompts de animação e vídeo especificando que a animação parte destas NOVAS imagens criadas no Nano Banana (não das fotos originais brutas coletadas).\n`
        : `\n📸 FLUXO DE PRODUÇÃO SELECIONADO: USAR FOTOS COLETADAS DIRETAMENTE NO VÍDEO (FLUXO DIRETO)
- O usuário escolheu criar os prompts de vídeo diretamente a partir das imagens já coletadas do produto.
- No campo 'imagePrompt': Crie prompts de imagem de backup consistentes com as fotos originais.
- Nos campos 'veoPrompt' e 'digenPrompt': Construa os prompts de animação e movimentação de câmera direcionados diretamente para as fotos já coletadas do produto (referenciadas em 'imageName').\n`;

      const humanVoiceGuidelines = `
🗣️ DIRETRIZES DE HUMANIZAÇÃO DAS FALAS EM PT-BR (100% CRIADOR DO TIKTOK):
- ORALIDADE REAL: Escreva exatamente como uma pessoa real brasileira fala em vídeos espontâneos do TikTok ou áudios para amigos. Use contrações e termos naturais ("tá", "pra", "olha isso", "gente", "cê não tem noção", "sério mesmo", "dá uma olhada", "olha o detalhe disso", "eu precisava mostrar isso pra vocês").
- 🚫 LISTA NEGRA DE CLICHÊS DE I.A. (TOTALMENTE PROIBIDOS): NUNCA use "Não perca essa oportunidade", "revolucione sua rotina", "adquira já o seu", "produto indispensável", "prepare-se para se apaixonar", "combinação perfeita entre elegância e sofisticação", "venha conferir", "descubra o segredo".
- CADÊNCIA & FÔLEGO: Frases curtas e diretas. Use vírgulas para demarcar onde o narrador/avatar respira.
- TEMPO DA CENA (${duration}): A narração deve ter rigorosamente entre ${parseInt(duration) * 2} e ${Math.round(parseInt(duration) * 2.4)} palavras, para ser dita com calma e naturalidade.`;

      const superiorPromptGuidelines = `
🎬 DIRETRIZES CINEMATOGRÁFICAS PARA PROMPTS (VEO, DIGEN e IMAGEM):
- GOOGLE VEO ('veoPrompt'): Em inglês com terminologia cinematográfica profissional (85mm portrait lens, 100mm macro for textures, f/1.8 shallow depth of field, slow dynamic dolly push-in, subtle 45-degree orbital pan), iluminação de estúdio comercial (soft key light, warm rim light) e a estrutura unificada obrigatória contendo GÊNERO e TOM DA VOZ:
  Visual & Camera: [Ação e movimento de câmera] | Voiceover/Dialogue: (${genderEn}, ${currentTone.en}) '[Fala exata em PT-BR]' | Background Music & SFX: [Trilha comercial e efeitos sonoros táteis como unboxing, click, tecido].
  *(Se no-voiceover): Visual & Camera: [Ação e câmera] | Voiceover/Dialogue: (No voiceover / Instrumental only) | Background Music & SFX: [Trilha comercial instrumental]
- DIGEN ('digenPrompt'): Em inglês. Avatar com microexpressões humanas (natural warm smile, relaxed breathing, friendly direct eye contact, subtle eyebrow reactions), gesticulação natural com o produto nas mãos, sincronia labial e o segmento padronizado de voz e tom:
  Model/Action: [Comportamento do avatar e gestos] | Voice & Tone: ${genderEn}, ${currentTone.en} | Dialogue: '[Fala exata em PT-BR]' | Background Music: [Trilha comercial moderna].
  *(Se no-voiceover): Model/Action: [Gestos naturais demonstrando o produto sem movimentos labiais] | Voice & Tone: No voiceover (Instrumental only) | Dialogue: None | Background Music: [Trilha instrumental comercial moderna].
- NANO BANANA 2 ('imagePrompt'): Em inglês. Fotografia estática hiper-realista 8K, padrão catálogo de luxo ou TikTok Shop oficial, iluminação tridimensional suave.`;

      const multiSequencesInstruction = numSequences > 1
        ? `\n🎯 ATENÇÃO CRÍTICA - GERAÇÃO DE ${numSequences} SEQUÊNCIAS / VÍDEOS COMPLETOS (VARIAÇÕES):
Você DEVE gerar exatamente ${numSequences} sequências de vídeos completas no array 'sequences'.
Cada sequência representa um vídeo completo diferente do produto para postar no TikTok, contendo ${numScenes} cenas cada e explorando uma linha narrativa e falas exclusivas:
${numSequences >= 1 ? '- Sequência 1: "Gancho de Curiosidade & Quebra de Ceticismo" (Gancho forte nos 3 primeiros segundos, quebrando desconfiança: "Gente, eu não dava nada por isso até ver funcionando...").\n' : ''}${numSequences >= 2 ? '- Sequência 2: "Quebra de Objeção Principal" (Responde diretamente às principais dúvidas e medos dos compradores: durabilidade, se funciona mesmo, se vale o preço).\n' : ''}${numSequences >= 3 ? '- Sequência 3: "Benefício Prático no Dia a Dia" (Mostra o produto resolvendo um problema real da rotina de forma simples, visual e rápida).\n' : ''}${numSequences >= 4 ? '- Sequência 4: "Detalhes, Acabamento & Percepção de Luxo" (Enfatiza a textura, costura, encaixe, material premium e o custo-benefício surpreendente).\n' : ''}${numSequences >= 5 ? '- Sequência 5: "Prova Social & Viral" (Foco no feedback dos compradores, na febre do produto no TikTok Shop e na urgência).\n' : ''}
Cada sequência no array 'sequences' deve conter:
- "sequenceNumber": número de 1 a ${numSequences}
- "title": título temático da sequência
- "approach": abordagem narrativa (ex: "Curiosidade", "Quebra de Objeção", "Benefício Real", "Acabamento & Detalhes", "Prova Social")
- "scenes": array com exatamente ${numScenes} cenas completas.`
        : `Gere 1 sequência de roteiro completa com exatamente ${numScenes} cenas detalhando a apresentação do produto.`;

      parts.push({
        text: `Gere um roteiro narrativo e prompts de animação focados na apresentação de um produto.
Imagens fornecidas: 
1. Modelo/Apresentador(a): ${modelImage ? modelImage.name : "Nenhuma (Vídeo em POV)"}
2. Fotos do Produto: ${productImages.map(p => p.name).join(', ')}

Duração de cada vídeo: ${duration}
Número de cenas por vídeo: ${numScenes}
Quantidade de Variações de Sequências (Vídeos): ${numSequences}
Observações específicas: ${observations || "INSTRUÇÃO: Se este campo estiver vazio, por favor analise as imagens enviadas e extraia qualquer texto, marca, benefício ou característica visível do produto para usar no roteiro e narração."}

${productDescriptionInstruction}

${reviewsInstruction}

${platformInstruction}

${workflowInstruction}

${styleInstruction}

${voiceInstruction}

${humanVoiceGuidelines}

${superiorPromptGuidelines}

${multiSequencesInstruction}

REGRAS OBRIGATÓRIAS:
1. Crie exatamente ${numScenes} cenas por vídeo detalhando a apresentação do produto. Varie as fotos do produto nas cenas se houver mais de uma.
2. O campo 'imageName' deve indicar qual das fotos fornecidas (modelo ou produto) serve de referência visual principal para aquela cena (apenas referência interna, NÃO inclua esse nome nos prompts).
3. ⚠️ UNIFICAÇÃO CRÍTICA DO PROMPT DE VÍDEO ('veoPrompt' e 'digenPrompt'): O prompt de animação de vídeo DEVE vir COMPLETO e UNIFICADO, contendo obrigatoriamente dentro da própria string do prompt em inglês:
   - (1) Descrição visual da cena e movimento de câmera (Camera Movement & Visual Action);
   - (2) Especificação de Gênero e Tom da Voz junto à fala em PT-BR ('Voiceover/Dialogue: (${genderEn}, ${currentTone.en}) [Fala em PT-BR]' para VEO e 'Voice & Tone: ${genderEn}, ${currentTone.en} | Dialogue: [Fala em PT-BR]' para DIGEN);
   - (3) Música de fundo e efeitos sonoros (Background Music & SFX).
4. As roupas, cenário da modelo (se houver) e o produto original devem ser mantidos intactos.
5. ⚠️ CRÍTICO — IDIOMA DA NARRAÇÃO: O campo 'narration' DEVE ser OBRIGATORIAMENTE escrito em PORTUGUÊS BRASILEIRO (PT-BR). NUNCA escreva a narração em inglês. ${voiceGender === 'none' ? 'No modo Sem Narração, descreva a trilha sonora/SFX e legendas de tela em PT-BR.' : 'A narração é o texto falado em voz alta para o público brasileiro do TikTok com oralidade 100% natural e zero clichês.'}
6. CRÍTICO: A narração (campo 'narration') DEVE SE ADEQUAR EXATAMENTE à duração do vídeo de ${duration}.
7. Os campos 'veoPrompt' e 'digenPrompt' devem estar em INGLÊS com as partes faladas em PT-BR indicadas claramente entre aspas simples (ex: 'fala').
8. ⚠️ FORMATAÇÃO JSON ESTREITA: NUNCA use aspas duplas (") dentro dos textos de prompts, narrações ou descrições. Use SEMPRE aspas simples (') para falas e diálogos, evitando quebrar a sintaxe JSON.

Retorne em estrutura JSON:
{
  "campaignTitle": "Nome da Campanha",
  "sequences": [
    {
      "sequenceNumber": 1,
      "title": "Sequência 1: [Nome do Gancho]",
      "approach": "Curiosidade / Quebra de Ceticismo",
      "scenes": [
        { 
          "imageName": "Nome exato do arquivo de referência (uso interno)", 
          "duration": "${duration}", 
          "imagePrompt": "Detailed English still image generation prompt for Nano Banana 2/Imagen...",
          "veoPrompt": "Visual & Camera: Cinematic camera pan across product. | Voiceover/Dialogue: (${genderEn}, ${currentTone.en}) '[Narração em PT-BR]' | Background Music & SFX: Upbeat commercial soundtrack with ambient SFX.", 
          "digenPrompt": "Model/Action: Natural talking head model presenting product. | Voice & Tone: ${genderEn}, ${currentTone.en} | Dialogue: '[Narração em PT-BR]' | Background Music: Upbeat commercial music.", 
          "narration": "Fala em PT-BR 100% humana...", 
          "description": "Explicação da cena" 
        }
      ]
    }
  ],
  "scenes": [
    { 
      "imageName": "Nome exato do arquivo de referência (uso interno)", 
      "duration": "${duration}", 
      "imagePrompt": "Detailed English still image generation prompt for Nano Banana 2/Imagen...",
      "veoPrompt": "Visual & Camera: Cinematic camera pan across product. | Voiceover/Dialogue: (${genderEn}, ${currentTone.en}) '[Narração em PT-BR]' | Background Music & SFX: Upbeat commercial soundtrack with ambient SFX.", 
      "digenPrompt": "Model/Action: Natural talking head model presenting product. | Voice & Tone: ${genderEn}, ${currentTone.en} | Dialogue: '[Narração em PT-BR]' | Background Music: Upbeat commercial music.", 
      "narration": "Fala em PT-BR 100% humana...", 
      "description": "Explicação da cena" 
    }
  ]
}`
      });

      const response = await executeUnifiedAI({
        parts: parts,
        systemPrompt: MASTER_COPYWRITING_SYSTEM_INSTRUCTION,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            campaignTitle: { type: Type.STRING },
            sequences: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sequenceNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  approach: { type: Type.STRING },
                  scenes: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        imageName: { type: Type.STRING },
                        duration: { type: Type.STRING },
                        imagePrompt: { type: Type.STRING },
                        veoPrompt: { type: Type.STRING },
                        digenPrompt: { type: Type.STRING },
                        narration: { type: Type.STRING },
                        description: { type: Type.STRING }
                      },
                      required: ["imageName", "duration", "imagePrompt", "veoPrompt", "digenPrompt", "narration", "description"]
                    }
                  }
                },
                required: ["sequenceNumber", "title", "approach", "scenes"]
              }
            },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  imageName: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  imagePrompt: { type: Type.STRING },
                  veoPrompt: { type: Type.STRING },
                  digenPrompt: { type: Type.STRING },
                  narration: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["imageName", "duration", "imagePrompt", "veoPrompt", "digenPrompt", "narration", "description"]
              }
            }
          },
          required: ["campaignTitle"]
        }
      });

      if (abortControllerRef.current?.signal.aborted) return;

      const parsedRaw = aiProvidersManager.safeJsonParse<any>(response.text || '{}', {});
      const parsed = normalizeScriptResponse(parsedRaw, duration) as ScriptResponse | null;
      if (!parsed || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
        throw new Error("A IA respondeu mas o roteiro não pôde ser estruturado. Tente novamente ou alterne para outro provedor de IA no topo.");
      }
      setGeneratedScript(parsed);
      setActiveSequenceIndex(0);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Geração cancelada pelo usuário');
      } else {
        console.error("Erro ao gerar roteiro de produto:", error);
        const msg = error?.message || String(error);
        setValidationAlert({
          title: "Erro na Geração",
          message: msg
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const generateScript = async () => {
    if (!checkHasValidKey()) {
      setValidationAlert({
        title: "Chave de API Faltando",
        message: getMissingKeyMessage()
      });
      return;
    }
    if (images.length === 0) {
      setValidationAlert({
        title: "Fotos de Look Faltando",
        message: "Por favor, envie pelo menos uma foto de look na seção 'Imagens da Coleção' para que possamos gerar o roteiro da coleção."
      });
      return;
    }
    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    try {
      const finalTheme = customTheme || theme;

      const toneMap: Record<string, { pt: string; en: string }> = {
        enthusiastic: {
          pt: 'Entusiasta & Espontâneo (Voz animada, alegre, calorosa e estilo criador autêntico do TikTok)',
          en: 'warm, enthusiastic and authentic TikTok creator tone'
        },
        persuasive: {
          pt: 'Confiante & Persuasivo (Voz firme, segura, elegante com postura de autoridade)',
          en: 'confident, authoritative, persuasive and elegant commercial tone'
        },
        calm: {
          pt: 'Suave & Estético (Voz suave, calma, intimista e elegante para moda/lifestyle)',
          en: 'calm, soft, intimate, gentle and aesthetic storytelling tone'
        },
        promo: {
          pt: 'Achadinho & Urgente (Voz dinâmica, empolgada, ritmo acelerado de oportunidade imperdível)',
          en: 'fast-paced, excited, promotional and dynamic deal hunter tone'
        }
      };

      const currentTone = toneMap[voiceTone] || toneMap.enthusiastic;
      const genderLabel = voiceGender === 'female' ? 'FEMININA' : (voiceGender === 'male' ? 'MASCULINA' : 'SEM VOZ');
      const genderEn = voiceGender === 'female' ? 'Female voice' : (voiceGender === 'male' ? 'Male voice' : 'No voice');

      const voiceInstruction = voiceGender === 'none'
        ? `GÊNERO DA VOZ & TOM / NARRADOR: SEM NARRAÇÃO (SEM FALA).
- O vídeo NÃO terá nenhuma narração falada, voz humana ou diálogo (no-voiceover / no-speech).
- O foco é 100% visual: mostrar a coleção sob vários ângulos, destacando detalhes e tecidos com música de fundo instrumental.
- No campo 'narration' (em PT-BR), em vez de fala falada, você DEVE escrever descrições detalhadas da trilha sonora (SFX / Música de fundo) e legendas de texto para aparecer na tela (ex: '[Música instrumental animada de fundo] [Legenda de tela: Coleção de verão exclusiva...]').
- OBRIGATÓRIO EM 'veoPrompt' (GOOGLE VEO):
  No segmento de áudio, especifique explicitamente:
  "Voiceover/Dialogue: (No voiceover / Instrumental only)"
- OBRIGATÓRIO EM 'digenPrompt' (DIGEN):
  No segmento de voz e diálogo, especifique explicitamente:
  "Voice & Tone: No voiceover (Instrumental only) | Dialogue: None"`
        : `GÊNERO DA VOZ & TOM DE LOCUÇÃO PADRONIZADO (OBRIGATÓRIO NOS PROMPTS DE VÍDEO):
- GÊNERO DA VOZ SELECIONADO: OBRIGATORIAMENTE ${genderLabel} (${genderEn}).
- TIPO DE TOM SELECIONADO: OBRIGATORIAMENTE ${currentTone.pt.toUpperCase()} (${currentTone.en}).

🎯 PADRÃO ESTRUTURAL OBRIGATÓRIO NOS PROMPTS DE VÍDEO (NUNCA OMITA GÊNERO OU TOM):
1. ⚠️ NO CAMPO 'veoPrompt' (GOOGLE VEO):
   O segmento de voz e diálogo DEVE conter obrigatoriamente a especificação (${genderEn}, ${currentTone.en}):
   Visual & Camera: [Ação visual e movimento de câmera cinematográfico] | Voiceover/Dialogue: (${genderEn}, ${currentTone.en}) '[Texto exato da fala em PT-BR]' | Background Music & SFX: [Trilha comercial e efeitos sonoros táteis].
2. ⚠️ NO CAMPO 'digenPrompt' (DIGEN.ai):
   O prompt DEVE conter explicitamente o segmento padronizado 'Voice & Tone':
   Model/Action: [Comportamento da modelo digital e gestos] | Voice & Tone: ${genderEn}, ${currentTone.en} | Dialogue: '[Texto exato da fala em PT-BR]' | Background Music: [Trilha comercial moderna].
3. ⚠️ NO CAMPO 'narration' (PORTUGUÊS BRASILEIRO PT-BR):
   A narração em PT-BR DEVE ser redigida respeitando a concordância, adjetivos e o estilo para voz ${genderLabel} no tom ${currentTone.pt}.`;

      const configList = Object.entries(targetConfigs)
        .filter(([key]) => key.startsWith(`${injectionTarget}-`))
        .map(([key, val]) => {
          let label = key.replace(`${injectionTarget}-`, '');
          if (label === 'Variacoes') label = 'Quantidade de Variações (em paralelo)';
          return `${label}: ${val}`;
        })
        .join('\n');

      const platformInstruction = injectionTarget !== 'none'
        ? `PLATAFORMA DE DESTINO DA AUTOMAÇÃO: ${injectionTarget.toUpperCase()}
CONFIGURAÇÕES SELECIONADAS:
${configList}
- Certifique-se de que os prompts gerados em 'veoPrompt' e 'digenPrompt' reflitam e respeitem essas escolhas (por exemplo, se o formato é vertical 9:16, descreva enquadramentos verticais móveis; se o narrador selecionado é Jenny, monte o tom de voz e estilo adequados).`
        : '';

      const reviewsInstruction = (productReviews && productReviews.includeInPrompt && (productReviews.comments.length > 0 || productReviews.tags.length > 0))
        ? `\n💬 ORIENTAÇÃO ESPECIAL BASEADA EM AVALIAÇÕES E FEEDBACK REAL DE CLIENTES (TIKTOK SHOP):
O usuário optou por incluir avaliações e comentários reais de compradores do TikTok Shop para orientar este roteiro.
${productReviews.rating ? `- Avaliação Média dos Compradores: ${productReviews.rating} estrelas\n` : ''}${productReviews.totalReviews ? `- Total de Avaliações Registradas: ${productReviews.totalReviews}\n` : ''}${productReviews.tags.length > 0 ? `- Destaques mais elogiados pelos clientes: ${productReviews.tags.join(', ')}\n` : ''}${productReviews.comments.length > 0 ? `- Depoimentos reais de quem comprou:\n${productReviews.comments.map((c, i) => `  ${i + 1}. "${c}"`).join('\n')}\n` : ''}
🎯 DIRETRIZES DE SOCIAL PROOF: Destaque na narração e nos visuais os pontos fortes e a satisfação expressa pelos clientes.\n`
        : '';

      const imageParts = await Promise.all(images.map(async (img) => {
        const base64 = await getImagePayload(img);
        return {
          inlineData: {
            mimeType: img.file.type,
            data: base64.split(',')[1]
          }
        };
      }));

      const humanVoiceGuidelines = `
🗣️ DIRETRIZES DE HUMANIZAÇÃO DAS FALAS EM PT-BR (100% CRIADOR DO TIKTOK):
- ORALIDADE REAL: Escreva exatamente como uma pessoa real brasileira fala em vídeos de moda/lifestyle no TikTok. Use contrações e termos naturais ("tá", "pra", "olha isso", "gente", "cê não tem noção", "sério mesmo", "dá uma olhada no caimento", "olha o detalhe dessa peça").
- 🚫 LISTA NEGRA DE CLICHÊS DE I.A. (TOTALMENTE PROIBIDOS): NUNCA use "Não perca essa oportunidade", "revolucione sua rotina", "adquira já o seu", "produto indispensável", "prepare-se para se apaixonar", "combinação perfeita entre elegância e sofisticação", "venha conferir", "descubra o segredo".
- CADÊNCIA & FÔLEGO: Frases curtas e diretas. Use vírgulas para demarcar onde o narrador/avatar respira.
- TEMPO DA CENA (${duration}): A narração deve ter rigorosamente entre ${parseInt(duration) * 2} e ${Math.round(parseInt(duration) * 2.4)} palavras, para ser dita com calma e naturalidade.`;

      const superiorPromptGuidelines = `
🎬 DIRETRIZES CINEMATOGRÁFICAS PARA PROMPTS (VEO, DIGEN e IMAGEM):
- GOOGLE VEO ('veoPrompt'): Em inglês com terminologia cinematográfica profissional (85mm portrait lens, 100mm macro for textures, f/1.8 shallow depth of field, slow dynamic dolly push-in, subtle 45-degree orbital pan), iluminação de estúdio comercial (soft key light, warm rim light) e a estrutura unificada obrigatória contendo GÊNERO e TOM DA VOZ:
  Visual & Camera: [Ação visual e movimento de câmera] | Voiceover/Dialogue: (${genderEn}, ${currentTone.en}) '[Fala exata em PT-BR]' | Background Music & SFX: [Trilha comercial e efeitos sonoros táteis como unboxing, click, tecido].
  *(Se no-voiceover): Visual & Camera: [Ação e câmera] | Voiceover/Dialogue: (No voiceover / Instrumental only) | Background Music & SFX: [Trilha comercial instrumental]
- DIGEN ('digenPrompt'): Em inglês. Avatar com microexpressões humanas (natural warm smile, relaxed breathing, friendly direct eye contact, subtle eyebrow reactions), gesticulação natural, sincronia labial fluida e o segmento padronizado de voz e tom:
  Model/Action: [Comportamento do avatar e gestos] | Voice & Tone: ${genderEn}, ${currentTone.en} | Dialogue: '[Fala exata em PT-BR]' | Background Music: [Trilha comercial moderna].
  *(Se no-voiceover): Model/Action: [Gestos naturais demonstrando a peça sem movimentos labiais] | Voice & Tone: No voiceover (Instrumental only) | Dialogue: None | Background Music: [Trilha instrumental comercial moderna].
- NANO BANANA 2 ('imagePrompt'): Em inglês. Fotografia estática hiper-realista 8K, padrão editorial de moda / catálogo de luxo, iluminação tridimensional suave.`;

      const workflowInstruction = imageWorkflowMode === 'nano_banana_first'
        ? `\n🎨 FLUXO DE PRODUÇÃO SELECIONADO: CRIAR NOVAS FOTOS NO NANO BANANA 2 PRIMEIRO (PIPELINE DE DOIS ESTÁGIOS)
- O usuário escolheu expressamente gerar primeiro cada prompt de imagem no Nano Banana 2 / Imagen 3 para criar fotos novas de estúdio e catálogo antes dos vídeos.
- No campo 'imagePrompt': Crie prompts ultra-detalhados para o Nano Banana 2 gerar fotografias estáticas profissionais de alta costura e estúdio comercial baseadas nas roupas das fotos.
- Nos campos 'veoPrompt' e 'digenPrompt': Construa os prompts de animação e vídeo especificando que a animação parte destas NOVAS imagens criadas no Nano Banana (não das fotos originais brutas coletadas).\n`
        : `\n📸 FLUXO DE PRODUÇÃO SELECIONADO: USAR FOTOS COLETADAS DIRETAMENTE NO VÍDEO (FLUXO DIRETO)
- O usuário escolheu criar os prompts de vídeo diretamente a partir das imagens já coletadas da coleção.
- No campo 'imagePrompt': Crie prompts de imagem de backup consistentes com as fotos originais.
- Nos campos 'veoPrompt' e 'digenPrompt': Construa os prompts de animação e movimentação de câmera direcionados diretamente para as fotos já coletadas (referenciadas em 'imageName').\n`;

      const response = await executeUnifiedAI({
        parts: [
          ...imageParts,
          {
            text: `Gere um roteiro de campanha profissional para loja de roupas baseado nestas imagens. 
Tema: ${finalTheme}
Duração de cada vídeo: ${duration}
Observações específicas: ${observations || "Seguir estilo padrão de alta costura."}

${reviewsInstruction}

${platformInstruction}

${workflowInstruction}

${voiceInstruction}

${humanVoiceGuidelines}

${superiorPromptGuidelines}

REGRAS OBRIGATÓRIAS:
1. ⚠️ UNIFICAÇÃO CRÍTICA DO PROMPT DE VÍDEO ('veoPrompt' e 'digenPrompt'): O prompt de animação de vídeo DEVE vir COMPLETO e UNIFICADO, contendo obrigatoriamente dentro da própria string em inglês:
   - (1) Animação/movimento de câmera;
   - (2) Especificação de Gênero e Tom da Voz junto à fala em PT-BR ('Voiceover/Dialogue: (${genderEn}, ${currentTone.en}) [Fala em PT-BR]' para VEO e 'Voice & Tone: ${genderEn}, ${currentTone.en} | Dialogue: [Fala em PT-BR]' para DIGEN);
   - (3) Música de fundo e SFX ('Background Music: [Música de fundo]').
2. As roupas e o CENÁRIO devem ser mantidos idênticos. Não mude cores, tecidos ou o ambiente.
3. Foque em animações cinematográficas para VEO: movimento de câmera (pan, tilt, zoom), partículas de luz, vento sutil no cabelo e expressões faciais, sempre incluindo a narração/falas e a trilha sonora.
4. Para DIGEN, foque na naturalidade do modelo digital falando ou reagindo.
5. ⚠️ CRÍTICO — IDIOMA DA NARRAÇÃO: O campo 'narration' DEVE ser OBRIGATORIAMENTE escrito em PORTUGUÊS BRASILEIRO (PT-BR). NUNCA escreva a narração em inglês. ${voiceGender === 'none' ? 'No modo Sem Narração, descreva a trilha sonora/SFX e legendas de tela em PT-BR.' : 'A narração é o texto falado em voz alta para o público brasileiro do TikTok com oralidade 100% natural e zero clichês.'}
6. Os campos 'veoPrompt' e 'digenPrompt' devem estar em INGLÊS para as partes técnicas de câmera e áudio, mantendo as falas em PT-BR dentro de aspas simples (ex: 'fala').
7. CRÍTICO (Prompt de Imagem Estática da Cena - Nano Banana 2): Para cada cena, crie um prompt detalhado em inglês no campo 'imagePrompt'. O prompt deve ser riquíssimo em detalhes visuais, estilo fotográfico realista, iluminação profissional, mantendo consistência total com a imagem original. Não inclua texto explicativo, apenas a descrição visual em inglês.
8. CRÍTICO: A narração (campo 'narration') DEVE SE ADEQUAR EXATAMENTE à duração do vídeo de ${duration}.
9. ⚠️ FORMATAÇÃO JSON ESTREITA: NUNCA use aspas duplas (") dentro dos textos de prompts, narrações ou descrições. Use SEMPRE aspas simples (') para falas e diálogos, evitando quebrar a sintaxe JSON.

Retorne em estrutura JSON:
{
  "campaignTitle": "Nome da Campanha",
  "scenes": [
    { 
      "imageName": "Nome exato do arquivo (referência interna)", 
      "duration": "${duration}", 
      "imagePrompt": "Detailed English still image generation prompt for Nano Banana 2/Imagen...",
      "veoPrompt": "Visual & Camera: Cinematic camera pan across model. | Voiceover/Dialogue: (${genderEn}, ${currentTone.en}) '[Narração em PT-BR]' | Background Music & SFX: Soft acoustic fashion soundtrack with ambient room reverb.", 
      "digenPrompt": "Model/Action: Natural talking head model presenting clothing. | Voice & Tone: ${genderEn}, ${currentTone.en} | Dialogue: '[Narração em PT-BR]' | Background Music: Modern fashion beat.", 
      "narration": "Narração em PT-BR...", 
      "description": "Explicação da cena" 
    }
  ]
}`
          }
        ],
        systemPrompt: MASTER_COPYWRITING_SYSTEM_INSTRUCTION,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            campaignTitle: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  imageName: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  imagePrompt: { type: Type.STRING },
                  veoPrompt: { type: Type.STRING },
                  digenPrompt: { type: Type.STRING },
                  narration: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["imageName", "duration", "imagePrompt", "veoPrompt", "digenPrompt", "narration", "description"]
              }
            }
          },
          required: ["campaignTitle", "scenes"]
        }
      });

      if (abortControllerRef.current?.signal.aborted) return;

      const parsedRaw = aiProvidersManager.safeJsonParse<any>(response.text || '{}', {});
      const parsed = normalizeScriptResponse(parsedRaw, duration) as ScriptResponse | null;
      if (!parsed || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
        throw new Error("A IA respondeu mas o roteiro não pôde ser estruturado. Tente novamente ou alterne para outro provedor de IA no topo.");
      }
      setGeneratedScript(parsed);
      setActiveSequenceIndex(0);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Geração cancelada pelo usuário');
      } else {
        console.error("Erro ao gerar roteiro:", error);
        const msg = error?.message || String(error);
        setValidationAlert({
          title: "Erro na Geração",
          message: msg
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const getImagePayload = async (img: SceneImage): Promise<string> => {
    if (img.cropState) {
      try {
        const croppedBlob = await getCroppedImg(img.preview, img.cropState.croppedAreaPixels);
        if (croppedBlob) {
          const base64 = await fileToBase64(new File([croppedBlob], img.name, { type: 'image/jpeg' }));
          return base64;
        }
      } catch (err) {
        console.error("Failed to crop image on-the-fly, falling back to original:", err);
      }
    }
    return await fileToBase64(img.file);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyScene = (scene: GeneratedScene) => {
    const text = `Scene: ${scene.imageName}\nDuration: ${scene.duration}\nNano Banana 2 (Still Image): ${scene.imagePrompt}\nVEO: ${scene.veoPrompt}\nDIGEN: ${scene.digenPrompt}\nNarration: ${scene.narration}`;
    copyText(text);
  };

  const copyToClipboard = () => {
    if (!generatedScript) return;
    navigator.clipboard.writeText(JSON.stringify(generatedScript, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateProductAngles = async () => {
    if (!checkHasValidKey()) {
      setValidationAlert({
        title: "Chave de API Faltando",
        message: getMissingKeyMessage()
      });
      return;
    }
    if (productImages.length === 0) {
      setValidationAlert({
        title: "Fotos do Produto Faltando",
        message: "Por favor, adicione pelo menos uma foto do produto na seção 'Produto (Várias Fotos)' para gerar as variações de ângulos."
      });
      return;
    }
    setIsGeneratingAngles(true);
    try {
      const productParts = await Promise.all(productImages.map(async (img) => {
        const base64 = await getImagePayload(img);
        return { inlineData: { mimeType: img.file.type, data: base64.split(',')[1] } };
      }));

      const configList = Object.entries(targetConfigs)
        .filter(([key]) => key.startsWith(`${injectionTarget}-`))
        .map(([key, val]) => {
          let label = key.replace(`${injectionTarget}-`, '');
          if (label === 'Variacoes') label = 'Quantidade de Variações (em paralelo)';
          return `${label}: ${val}`;
        })
        .join('\n');

      const platformInstruction = injectionTarget !== 'none'
        ? `PLATAFORMA DE DESTINO DA AUTOMAÇÃO: ${injectionTarget.toUpperCase()}
CONFIGURAÇÕES SELECIONADAS:
${configList}
- Certifique-se de que os prompts gerados em 'veoPrompt' e 'digenPrompt' reflitam e respeitem essas escolhas (por exemplo, se o formato é vertical 9:16, descreva enquadramentos verticais móveis; se o narrador selecionado é Jenny, monte o tom de voz e estilo adequados).`
        : '';

      const toneMap: Record<string, { pt: string; en: string }> = {
        enthusiastic: {
          pt: 'Entusiasta & Espontâneo (Voz animada, alegre, calorosa e estilo criador autêntico do TikTok)',
          en: 'warm, enthusiastic and authentic TikTok creator tone'
        },
        persuasive: {
          pt: 'Confiante & Persuasivo (Voz firme, segura, elegante com postura de autoridade)',
          en: 'confident, authoritative, persuasive and elegant commercial tone'
        },
        calm: {
          pt: 'Suave & Estético (Voz suave, calma, intimista e elegante para moda/lifestyle)',
          en: 'calm, soft, intimate, gentle and aesthetic storytelling tone'
        },
        promo: {
          pt: 'Achadinho & Urgente (Voz dinâmica, empolgada, ritmo acelerado de oportunidade imperdível)',
          en: 'fast-paced, excited, promotional and dynamic deal hunter tone'
        }
      };

      const currentTone = toneMap[voiceTone] || toneMap.enthusiastic;
      const genderLabel = voiceGender === 'female' ? 'FEMININA' : (voiceGender === 'male' ? 'MASCULINA' : 'SEM VOZ');
      const genderEn = voiceGender === 'female' ? 'Female voice' : (voiceGender === 'male' ? 'Male voice' : 'No voice');

      const voiceInstruction = voiceGender === 'none'
        ? `GÊNERO DA VOZ & TOM / NARRADOR: SEM NARRAÇÃO (SEM FALA).
- O vídeo NÃO terá nenhuma narração falada, voz humana ou diálogo (no-voiceover / no-speech).
- O foco é 100% visual: mostrar o produto no ângulo especificado com música instrumental.
- No campo 'narration' (em PT-BR), escreva descrições de trilha e efeitos sonoros ou legendas de tela.
- OBRIGATÓRIO EM 'veoPrompt' (GOOGLE VEO):
  No segmento de áudio, especifique explicitamente:
  "Voiceover/Dialogue: (No voiceover / Instrumental only)"
- OBRIGATÓRIO EM 'digenPrompt' (DIGEN):
  No segmento de voz e diálogo, especifique explicitamente:
  "Voice & Tone: No voiceover (Instrumental only) | Dialogue: None"`
        : `GÊNERO DA VOZ & TOM DE LOCUÇÃO PADRONIZADO (OBRIGATÓRIO NOS PROMPTS DE VÍDEO):
- GÊNERO DA VOZ SELECIONADO: OBRIGATORIAMENTE ${genderLabel} (${genderEn}).
- TIPO DE TOM SELECIONADO: OBRIGATORIAMENTE ${currentTone.pt.toUpperCase()} (${currentTone.en}).

🎯 PADRÃO ESTRUTURAL OBRIGATÓRIO NOS PROMPTS DE VÍDEO (NUNCA OMITA GÊNERO OU TOM):
1. No campo 'veoPrompt' (Google VEO):
   O segmento de áudio DEVE conter explicitamente o gênero e o tom no formato:
   "Voiceover/Dialogue: (${genderEn}, ${currentTone.en}) '[Narração em PT-BR curta sobre o ângulo/detalhe]'"
2. No campo 'digenPrompt' (DIGEN.ai):
   DEVE conter a seção padronizada:
   "Voice & Tone: ${genderEn}, ${currentTone.en} | Dialogue: '[Narração em PT-BR curta sobre o ângulo/detalhe]' | Background Music: [Trilha e SFX]"`;

      const textPart = {
        text: `Você é um especialista em fotografia de produto e marketing digital para TikTok Shop.

Com base nas imagens do produto fornecidas, gere exatamente ${numAngles} variações de prompts para mostrar o produto em ângulos e perspectivas diferentes.

PRODUTO(S): ${productImages.map(p => p.name).join(', ')}
DURAÇÃO: ${duration}
${voiceInstruction}

${platformInstruction}

REGRAS ABSOLUTAS — NUNCA VIOLE:
1. O PRODUTO DEVE SER MANTIDO 100% IDÊNTICO — mesmas cores, formato, textura, tamanho, marca, logotipo e TODAS as características visuais originais. NUNCA altere o produto.
2. Apenas o ÂNGULO DA CÂMERA e a COMPOSIÇÃO DA CENA mudam.
3. Nos campos imagePrompt, veoPrompt e digenPrompt, SEMPRE mencione "exact same product, identical colors, textures and design unchanged" para garantir fidelidade absoluta.
4. Os campos veoPrompt e digenPrompt DEVEM vir COMPLETOS e UNIFICADOS, respeitando OBRIGATORIAMENTE a especificação de GÊNERO (${genderEn}) e TOM (${currentTone.en}):
   - VEO: "Visual & Camera: [câmera e cena do produto neste ângulo] | Voiceover/Dialogue: (${genderEn}, ${currentTone.en}) '[narração curta em PT-BR]' | Background Music & SFX: [trilha]"
   - DIGEN: "Model/Action: [ação/apresentação neste ângulo] | Voice & Tone: ${genderEn}, ${currentTone.en} | Dialogue: '[narração curta em PT-BR]' | Background Music: [trilha]"
   ${voiceGender === 'none' ? 'Como está Sem Narração (no-speech), siga as diretrizes acima de "(No voiceover / Instrumental only)".' : ''}
5. ⚠️ O campo narration DEVE ser em PORTUGUÊS BRASILEIRO (PT-BR) — NUNCA em inglês. Linguagem 100% humana, espontânea, como criador do TikTok mostrando o detalhe do produto para um amigo ("olha esse acabamento...", "sente a textura...", "dá uma olhada nesse fecho..."). ZERO clichês de IA.
6. Os campos veoPrompt e digenPrompt devem ser prompts PUROS e AUTO-CONTIDOS — NUNCA inclua nomes de arquivo, colchetes com nomes ou referências a imagens originais. As imagens servem apenas como referência visual para a IA.

Angulos a variar (escolha os mais relevantes para o produto):
- Vista frontal (Front view straight on)
- Vista traseira (Back view)
- Vista lateral direita/esquerda (Side profile)
- Vista em 45° diagonal (Three-quarter view)
- Close-up de detalhes (Detail macro close-up)
- Vista superior (Top-down flat lay)
- Perspectiva dinâmica (Low angle dynamic view)
- Produto em contexto de uso (Lifestyle in-use shot)`
      };

      const response = await executeUnifiedAI({
        parts: [...productParts, textPart],
        systemPrompt: MASTER_COPYWRITING_SYSTEM_INSTRUCTION,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            angles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  angleName: { type: Type.STRING },
                  imagePrompt: { type: Type.STRING },
                  veoPrompt: { type: Type.STRING },
                  digenPrompt: { type: Type.STRING },
                  narration: { type: Type.STRING },
                },
                required: ['angleName', 'imagePrompt', 'veoPrompt', 'digenPrompt', 'narration']
              }
            }
          },
          required: ['angles']
        }
      });

      const parsed = aiProvidersManager.safeJsonParse<{ angles: GeneratedAngle[] }>(response.text || '{}', { angles: [] });
      if (!parsed || !Array.isArray(parsed.angles) || parsed.angles.length === 0) {
        throw new Error("A IA respondeu mas os ângulos não puderam ser estruturados. Tente novamente.");
      }
      setGeneratedAngles(parsed.angles || []);
    } catch (error: any) {
      console.error('Erro ao gerar ângulos:', error);
      setValidationAlert({
        title: "Erro na Geração de Ângulos",
        message: "Ocorreu um erro ao gerar as variações de ângulos:\n" + (error?.message || String(error))
      });
    } finally {
      setIsGeneratingAngles(false);
    }
  };

  // --- Exportar Prompts ---

  const downloadBlob = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const buildExportContent = () => {
    const lines: string[] = [];
    if (generatedScript) {
      lines.push(`ROTEIRO: ${generatedScript.campaignTitle}`);
      lines.push('='.repeat(60));
      generatedScript.scenes.forEach((scene, i) => {
        lines.push(`\nCENA ${i + 1} • ${scene.duration} • ${scene.imageName}`);
        lines.push('-'.repeat(40));
        lines.push(`\n[IMAGEM — Nano Banana 2]\n${scene.imagePrompt}`);
        lines.push(`\n[VEO — Animação]\n${scene.veoPrompt}`);
        lines.push(`\n[DIGEN — Fala]\n${scene.digenPrompt}`);
        lines.push(`\n[NARRAÇÃO PT-BR]\n${scene.narration}`);
        lines.push(`\n[CONTEXTO]\n${scene.description}`);
        lines.push('\n' + '='.repeat(60));
      });
    }
    if (generatedAngles && generatedAngles.length > 0) {
      lines.push(`\n\nÂNGULOS DO PRODUTO`);
      lines.push('='.repeat(60));
      generatedAngles.forEach((angle, i) => {
        lines.push(`\nÂNGULO ${i + 1}: ${angle.angleName}`);
        lines.push('-'.repeat(40));
        lines.push(`\n[IMAGEM — Nano Banana 2]\n${angle.imagePrompt}`);
        lines.push(`\n[VEO — Animação]\n${angle.veoPrompt}`);
        lines.push(`\n[DIGEN — Fala]\n${angle.digenPrompt}`);
        lines.push(`\n[NARRAÇÃO PT-BR]\n${angle.narration}`);
        lines.push('\n' + '='.repeat(60));
      });
    }
    return lines.join('\n');
  };

  const exportAsTxt = () => {
    const content = buildExportContent();
    const title = (generatedScript?.campaignTitle || 'roteiro').replace(/[^a-zA-Z0-9]/g, '_');
    downloadBlob(content, `${title}.txt`, 'text/plain;charset=utf-8');
  };

  const exportAsDoc = () => {
    if (!generatedScript) return;
    const title = generatedScript.campaignTitle;
    const buildSectionHtml = (label: string, color: string, content: string) =>
      `<p style="font-weight:bold;font-size:9pt;color:${color};text-transform:uppercase;margin:8px 0 2px">${label}</p>
       <div style="background:#f5f5f5;padding:8px 10px;border-left:3px solid ${color};margin-bottom:10px;font-size:10pt">${content}</div>`;

    const sequencesToExport = (generatedScript.sequences && generatedScript.sequences.length > 0)
      ? generatedScript.sequences
      : [{ id: 'seq-1', sequenceNumber: 1, title: generatedScript.campaignTitle, approach: 'Padrão', scenes: generatedScript.scenes }];

    const scenesHtml = sequencesToExport.map((seq, sIdx) => `
      ${sequencesToExport.length > 1 ? `<h1 style="font-size:16pt;color:#E65C00;margin-top:28px;border-bottom:2px solid #E65C00;padding-bottom:4px">SEQUÊNCIA ${sIdx + 1}: ${seq.title} (${seq.approach})</h1>` : ''}
      ${seq.scenes.map((scene, i) => `
        <h2 style="font-size:13pt;color:#333;border-bottom:1px solid #ddd;padding-bottom:4px">Cena ${i + 1} &bull; ${scene.duration} &bull; ${scene.imageName}</h2>
        ${buildSectionHtml('Imagem (Nano Banana 2)', '#b45309', scene.imagePrompt)}
        ${buildSectionHtml('VEO — Animação', '#2563eb', scene.veoPrompt)}
        ${buildSectionHtml('DIGEN — Fala', '#7c3aed', scene.digenPrompt)}
        <p style="font-weight:bold;font-size:9pt;color:#ea580c;text-transform:uppercase;margin:8px 0 2px">Narração (PT-BR)</p>
        <div style="background:#fff7ed;padding:8px 10px;border-left:3px solid #ea580c;margin-bottom:10px;font-style:italic;font-size:11pt">${scene.narration}</div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
      `).join('')}
    `).join('');

    const anglesHtml = (generatedAngles && generatedAngles.length > 0) ? `
      <h1 style="font-size:18pt;color:#E65C00;margin-top:24px">Ângulos do Produto</h1>
      ${generatedAngles.map((angle, i) => `
        <h2 style="font-size:13pt;color:#333;border-bottom:2px solid #E65C00;padding-bottom:4px">Ângulo ${i + 1}: ${angle.angleName}</h2>
        ${buildSectionHtml('Imagem (Nano Banana 2)', '#b45309', angle.imagePrompt)}
        ${buildSectionHtml('VEO — Animação', '#2563eb', angle.veoPrompt)}
        ${buildSectionHtml('DIGEN — Fala', '#7c3aed', angle.digenPrompt)}
        <p style="font-weight:bold;font-size:9pt;color:#ea580c;text-transform:uppercase;margin:8px 0 2px">Narração (PT-BR)</p>
        <div style="background:#fff7ed;padding:8px 10px;border-left:3px solid #ea580c;font-style:italic;font-size:11pt">${angle.narration}</div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
      `).join('')}
    ` : '';

    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
      <head><meta charset="utf-8"><title>${title}</title></head>
      <body style="font-family:Calibri,Arial,sans-serif;max-width:800px;margin:auto;padding:20px">
        <h1 style="font-size:22pt;color:#E65C00">${title}</h1>
        <hr style="border:none;border-top:2px solid #E65C00;margin-bottom:24px"/>
        ${scenesHtml}
        ${anglesHtml}
      </body></html>`;

    const filename = title.replace(/[^a-zA-Z0-9]/g, '_');
    downloadBlob(html, `${filename}.doc`, 'application/msword');
  };

  const exportAsPdf = () => {
    if (!generatedScript) return;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 18;
    const maxW = pageW - margin * 2;
    let y = margin;

    const checkPage = (needed: number) => {
      if (y + needed > pageH - margin) { doc.addPage(); y = margin; }
    };

    const addLabel = (text: string, r: number, g: number, b: number) => {
      checkPage(8);
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(r, g, b);
      doc.text(text.toUpperCase(), margin, y); y += 5;
    };

    const addBody = (text: string) => {
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
      const lines = doc.splitTextToSize(text, maxW);
      checkPage(lines.length * 4.5);
      doc.text(lines, margin, y); y += lines.length * 4.5 + 4;
    };

    const addDivider = () => {
      checkPage(6);
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageW - margin, y); y += 6;
    };

    // Title
    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(230, 92, 0);
    const titleLines = doc.splitTextToSize(generatedScript.campaignTitle, maxW);
    doc.text(titleLines, margin, y); y += titleLines.length * 8 + 4;
    doc.setDrawColor(230, 92, 0); doc.line(margin, y, pageW - margin, y); y += 8;

    const sequencesToPdf = (generatedScript.sequences && generatedScript.sequences.length > 0)
      ? generatedScript.sequences
      : [{ id: 'seq-1', sequenceNumber: 1, title: generatedScript.campaignTitle, approach: 'Padrão', scenes: generatedScript.scenes }];

    sequencesToPdf.forEach((seq, sIdx) => {
      if (sIdx > 0) {
        doc.addPage();
        y = margin;
      }
      if (sequencesToPdf.length > 1) {
        doc.setFontSize(15); doc.setFont('helvetica', 'bold'); doc.setTextColor(230, 92, 0);
        doc.text(`SEQUÊNCIA ${sIdx + 1}: ${seq.title.toUpperCase()} (${seq.approach})`, margin, y); y += 9;
        doc.setDrawColor(230, 92, 0); doc.line(margin, y, pageW - margin, y); y += 6;
      }

      seq.scenes.forEach((scene, i) => {
        checkPage(20);
        doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 50, 50);
        doc.text(`Cena ${i + 1}  •  ${scene.duration}  •  ${scene.imageName}`, margin, y); y += 7;
        addLabel('Imagem (Nano Banana 2)', 180, 83, 9); addBody(scene.imagePrompt);
        addLabel('VEO — Animação', 37, 99, 235); addBody(scene.veoPrompt);
        addLabel('DIGEN — Fala', 124, 58, 237); addBody(scene.digenPrompt);
        addLabel('Narração PT-BR', 234, 88, 12);
        doc.setFontSize(10); doc.setFont('helvetica', 'italic'); doc.setTextColor(30, 30, 30);
        const nlines = doc.splitTextToSize(scene.narration, maxW);
        checkPage(nlines.length * 5); doc.text(nlines, margin, y); y += nlines.length * 5 + 4;
        addDivider();
      });
    });

    if (generatedAngles && generatedAngles.length > 0) {
      checkPage(20);
      doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(230, 92, 0);
      doc.text('ÂNGULOS DO PRODUTO', margin, y); y += 10;
      generatedAngles.forEach((angle, i) => {
        checkPage(20);
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 50, 50);
        doc.text(`Ângulo ${i + 1}: ${angle.angleName}`, margin, y); y += 7;
        addLabel('Imagem (Nano Banana 2)', 180, 83, 9); addBody(angle.imagePrompt);
        addLabel('VEO — Animação', 37, 99, 235); addBody(angle.veoPrompt);
        addLabel('DIGEN — Fala', 124, 58, 237); addBody(angle.digenPrompt);
        addLabel('Narração PT-BR', 234, 88, 12);
        doc.setFontSize(10); doc.setFont('helvetica', 'italic'); doc.setTextColor(30, 30, 30);
        const nlines = doc.splitTextToSize(angle.narration, maxW);
        checkPage(nlines.length * 5); doc.text(nlines, margin, y); y += nlines.length * 5 + 4;
        addDivider();
      });
    }

    const filename = generatedScript.campaignTitle.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`${filename}.pdf`);
  };

  const renderTikTokImporter = () => {
    const pendingCount = tiktokQueue.filter(i => i.status === 'pending').length;
    const completedCount = tiktokQueue.filter(i => i.status === 'completed').length;
    const progressPercent = tiktokQueue.length > 0 ? Math.round((completedCount / tiktokQueue.length) * 100) : 0;

    return (
      <div className="bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-orange-500/10 border border-pink-500/25 rounded-2xl p-4 space-y-3.5 shadow-lg shadow-pink-500/5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-pink-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
            <Link className="w-4 h-4" /> Importar do TikTok Shop por Link ou Fila
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenTikTokLogin}
              className="text-[10px] text-pink-300 hover:text-white bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
              title="Fazer login no TikTok em janela expandida"
            >
              <LogIn className="w-3 h-3" /> Fazer Login
            </button>
            <span className="text-[10px] text-pink-400/90 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
              {tiktokQueue.length > 0 ? `Fila: ${tiktokQueue.length}` : 'Auto-Sync'}
            </span>
          </div>
        </div>

        <p className="text-xs text-white/50 leading-relaxed">
          Cole um ou vários links (um por linha) para puxar automaticamente fotos em alta resolução original e extrair a descrição completa para as Observações.
        </p>

        {/* Input box */}
        <div className="space-y-2">
          <div className="flex gap-2 items-start">
            <div className="relative flex-1">
              <textarea
                rows={tiktokInputUrl.includes('\n') ? 3 : 1}
                placeholder="Cole um ou múltiplos links (ex: https://shop.tiktok.com/br/pdp/...)"
                value={tiktokInputUrl}
                onChange={(e) => setTiktokInputUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !tiktokInputUrl.includes('\n')) {
                    e.preventDefault();
                    if (extractUrls(tiktokInputUrl).length > 1) {
                      handleAddLinksToQueue();
                    } else {
                      handleStartTikTokImport();
                    }
                  }
                }}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-pink-500/60 transition-all font-mono resize-none leading-relaxed"
              />
              {tiktokInputUrl && (
                <button
                  type="button"
                  onClick={() => setTiktokInputUrl('')}
                  className="absolute right-2.5 top-2 text-white/40 hover:text-white text-xs p-1"
                  title="Limpar campo"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => handleAddLinksToQueue()}
                disabled={!tiktokInputUrl.trim() || isQueueRunning}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/15 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl text-xs font-bold transition-all border border-white/10 cursor-pointer"
                title="Adicionar links digitados à fila"
              >
                <Layers className="w-3.5 h-3.5 text-pink-400" />
                <span>+ Fila</span>
              </button>

              {tiktokQueue.length === 0 ? (
                isExtractingTikTok ? (
                  <button
                    type="button"
                    onClick={handleCancelSingleImport}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer animate-pulse"
                    title="Cancelar extração em andamento"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancelar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartTikTokImport}
                    disabled={!tiktokInputUrl.trim() || isQueueRunning}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 via-rose-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-pink-600/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Puxar Produto
                  </button>
                )
              ) : null}
            </div>
          </div>

          {/* Barra de Status e Cancelamento Rápido em Andamento */}
          {isExtractingTikTok && (
            <div className="flex items-center justify-between text-xs bg-pink-500/15 border border-pink-500/30 rounded-xl px-3.5 py-2">
              <span className="text-pink-300 font-mono flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-400" />
                {tiktokExtractionStatus || 'Puxando fotos do produto...'}
              </span>
              <button
                type="button"
                onClick={handleCancelSingleImport}
                className="text-xs text-rose-300 hover:text-white bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all"
                title="Cancelar extração imediatamente"
              >
                <XCircle className="w-3.5 h-3.5" /> Cancelar
              </button>
            </div>
          )}
        </div>

        {/* PAINEL DA FILA DE EXTRAÇÃO */}
        {tiktokQueue.length > 0 && (
          <div className="bg-black/40 border border-pink-500/30 rounded-xl p-3 space-y-2.5 shadow-inner">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-pink-400" />
                  Fila de Links ({tiktokQueue.length} {tiktokQueue.length === 1 ? 'produto' : 'produtos'})
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-300 border border-pink-500/20">
                  {completedCount} concluídos • {pendingCount} pendentes
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {isQueueRunning ? (
                  <button
                    type="button"
                    onClick={handleCancelQueue}
                    className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer animate-pulse"
                    title="Interromper a extração da fila imediatamente"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Cancelar Extração</span>
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleClearQueue}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                  title="Limpar todos os produtos da fila"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                  <span>Limpar Fila</span>
                </button>
              </div>
            </div>

            {/* Barra de Progresso quando ativa */}
            {isQueueRunning && (
              <div className="space-y-1">
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-pink-500 to-orange-500 h-full transition-all duration-300"
                    style={{ width: `${Math.max(5, progressPercent)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-pink-300/80 font-mono">
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    {queueProgressText || 'Processando fila...'}
                  </span>
                  <span>{progressPercent}%</span>
                </div>
              </div>
            )}

            {/* Lista de itens da Fila */}
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 divide-y divide-white/5">
              {tiktokQueue.map((item, idx) => {
                const shortUrl = item.url.replace(/^https?:\/\//, '').substring(0, 45) + (item.url.length > 50 ? '...' : '');
                return (
                  <div key={item.id} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[10px] font-mono text-white/40 flex-shrink-0 w-4">
                        #{idx + 1}
                      </span>
                      <span className="truncate font-mono text-[11px] text-white/80" title={item.url}>
                        {item.title ? item.title : shortUrl}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {item.status === 'pending' && (
                        <span className="text-[10px] bg-white/10 text-white/70 px-2 py-0.5 rounded-full font-mono">
                          Aguardando
                        </span>
                      )}
                      {item.status === 'extracting' && (
                        <span className="text-[10px] bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2 py-0.5 rounded-full font-mono flex items-center gap-1 font-bold animate-pulse">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" /> Extraindo...
                        </span>
                      )}
                      {item.status === 'completed' && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono flex items-center gap-1 font-bold">
                          <Check className="w-2.5 h-2.5" /> OK ({item.downloadedImagesCount || item.imagesCount || 0} fotos)
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full font-mono" title={item.error}>
                          Falhou
                        </span>
                      )}
                      {item.status === 'cancelled' && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                          Cancelado
                        </span>
                      )}

                      {!isQueueRunning && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQueueItem(item.id)}
                          className="text-white/40 hover:text-red-400 p-0.5 transition-colors"
                          title="Remover link da fila"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Botões de Ação da Fila */}
            <div className="pt-1 flex gap-2">
              {isQueueRunning ? (
                <button
                  type="button"
                  onClick={handleCancelQueue}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/20 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Cancelar Extração da Fila
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartQueueExtraction}
                  disabled={pendingCount === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-pink-600 via-rose-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-pink-600/20 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {pendingCount > 0 ? `Iniciar Extração da Fila (${pendingCount} pendentes)` : 'Todos os Produtos já Extraídos'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${themeMode} bg-zinc-950 text-zinc-100 font-sans selection:bg-orange-500/30`}>
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-orange-500/5 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <main className="relative max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-16">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 text-orange-500"
              >
                <img src="/icon.png" alt="TikTok Shop Logo" className="w-7 h-7 rounded-lg shadow-md border border-orange-500/30 object-cover shadow-orange-500/10" />
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-bold tracking-[0.2em] uppercase text-orange-500">Produção com IA</span>
                </div>
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent font-display"
              >
                Gerador de <br /> Propagandas<br/><span className="text-orange-500">TikTok Shop</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-white/50 max-w-xl text-lg font-light leading-relaxed"
              >
                Crie roteiros narrativos e prompts de animação para suas coleções de produtos em segundos.
              </motion.p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-3">
              <button
                onClick={() => setShowChangelog(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 transition-all cursor-pointer group"
              >
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-xs font-bold text-orange-400 tracking-wide">v{APP_VERSION}</span>
                <History className="w-3 h-3 text-orange-400/60 group-hover:text-orange-400 transition-colors" />
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-white flex items-center justify-center"
                  title="Alternar Tema Claro/Escuro"
                >
                  {themeMode === 'dark' ? <Sun className="w-4 h-4 text-orange-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
                </button>
                {/* Badge do Provedor de I.A Ativo */}
                <button
                  onClick={() => {
                    setProviderTab(activeAIProvider);
                    setShowSettingsModal(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all hover:opacity-90"
                  style={{
                    backgroundColor: activeAIProvider === 'gemini' 
                      ? 'rgba(16, 185, 129, 0.12)' 
                      : activeAIProvider === 'groq'
                      ? 'rgba(249, 115, 22, 0.12)'
                      : 'rgba(168, 85, 247, 0.12)',
                    borderColor: activeAIProvider === 'gemini' 
                      ? 'rgba(16, 185, 129, 0.3)' 
                      : activeAIProvider === 'groq'
                      ? 'rgba(249, 115, 22, 0.3)'
                      : 'rgba(168, 85, 247, 0.3)',
                    color: activeAIProvider === 'gemini' 
                      ? '#34d399' 
                      : activeAIProvider === 'groq'
                      ? '#fb923c'
                      : '#c084fc'
                  }}
                  title="Clique para alternar ou configurar Provedores de I.A"
                >
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeAIProvider === 'gemini' ? 'bg-emerald-400' : activeAIProvider === 'groq' ? 'bg-orange-400' : 'bg-purple-400'}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${activeAIProvider === 'gemini' ? 'bg-emerald-500' : activeAIProvider === 'groq' ? 'bg-orange-500' : 'bg-purple-500'}`}></span>
                  </span>
                  <span className="font-bold">
                    {activeAIProvider === 'gemini' ? 'Gemini 2.5' : activeAIProvider === 'groq' ? 'Groq Vision' : 'OpenRouter Free'}
                  </span>
                  {enableFailover && (
                    <span className="text-[10px] px-1 py-0.2 rounded bg-black/20 font-mono tracking-tighter" title="Failover Automático Ativo">
                      ⚡Auto
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => setShowSettingsModal(true)}
                  className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-white flex items-center justify-center relative group"
                  title="Configurações (Chaves API e Automação)"
                >
                  <Settings className="w-4 h-4 text-orange-400 group-hover:rotate-45 transition-transform duration-300" />
                  {apiKeys.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-zinc-900" />
                  )}
                </button>
                <button 
                  onClick={() => setShowQueue(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-orange-500/10 border border-orange-500/25 rounded-xl hover:bg-orange-500/20 transition-all text-xs font-bold uppercase tracking-wider text-orange-400"
                >
                  <Layers className="w-4 h-4" />
                  Fila ({projects.length})
                </button>
              </div>
              <input 
                type="file" 
                ref={keysFileInputRef}
                onChange={handleApiKeysUpload}
                accept=".txt"
                className="hidden" 
              />
              <input 
                type="file" 
                ref={groqFileInputRef}
                onChange={handleGroqKeysUpload}
                accept=".txt"
                className="hidden" 
              />
              <input 
                type="file" 
                ref={openrouterFileInputRef}
                onChange={handleOpenRouterKeysUpload}
                accept=".txt"
                className="hidden" 
              />
            </div>
          </div>
        </header>

        {/* Module Switcher */}
        <div className="flex justify-center mb-12">
          <div className="bg-white/5 p-1 rounded-2xl flex border border-white/10 overflow-hidden flex-wrap justify-center gap-1">
            <button 
              onClick={() => setActiveTab('collection')}
              className={`px-6 md:px-8 py-3 rounded-xl transition-all font-bold tracking-widest text-xs uppercase cursor-pointer ${activeTab === 'collection' ? 'bg-orange-500 text-white shadow-lg' : 'text-white/40 hover:text-white/80'}`}
            >
              Fotos Diversas / Coleção
            </button>
            <button 
              onClick={() => setActiveTab('product')}
              className={`px-6 md:px-8 py-3 rounded-xl transition-all font-bold tracking-widest text-xs uppercase cursor-pointer ${activeTab === 'product' ? 'bg-orange-500 text-white shadow-lg' : 'text-white/40 hover:text-white/80'}`}
            >
              Apresentador & Produto
            </button>
            <button 
              onClick={() => setActiveTab('virals')}
              className={`px-6 md:px-8 py-3 rounded-xl transition-all font-bold tracking-widest text-xs uppercase flex items-center gap-2 cursor-pointer ${activeTab === 'virals' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25' : 'text-white/40 hover:text-white/80'}`}
            >
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Buscador de Virais</span>
            </button>
          </div>
        </div>

        {activeTab === 'virals' ? (
          <ViralsFinder
            themeMode={themeMode}
            onUseForScript={(data) => {
              setActiveTab('product');
              setExtractedTikTokProduct({
                title: data.title,
                price: data.price,
                description: data.description,
                images: data.image ? [{ id: 'img_viral_0', url: data.image, fallbackUrl: data.image }] : []
              });
              if (data.description) {
                setProductDescription(data.description);
                setIncludeProductDescription(true);
                setObservations(data.description);
              }
            }}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: UI Controls */}
          <div className="lg:col-span-12 xl:col-span-5 space-y-10">
            
            {activeTab === 'collection' ? (
              <>
                {/* Step 1: Upload (Collection) */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-medium flex items-center gap-2">
                      <span className="bg-white/5 w-8 h-8 rounded-full flex items-center justify-center text-sm border border-white/10">1</span>
                      Enviar Fotos
                    </h2>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setImageFit(prev => prev === 'contain' ? 'cover' : 'contain')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-[10px] font-bold uppercase tracking-wider text-blue-400"
                      >
                        {imageFit === 'contain' ? 'Modo: Fit' : 'Modo: Preencher (Cortar)'}
                      </button>
                      {images.length > 1 && (
                        <button 
                          onClick={autoSequence}
                          disabled={isSequencing}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-[10px] font-bold uppercase tracking-wider text-orange-400"
                        >
                          {isSequencing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />}
                          Sequência IA
                        </button>
                      )}
                      <span className="text-xs text-white/40">{images.length} fotos</span>
                      {images.length > 0 && (
                        <>
                          <button
                            onClick={() => handleDownloadSceneImagesZip(images, 'fotos_colecao')}
                            disabled={isDownloadingZip}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full hover:bg-blue-500/20 transition-all text-[10px] font-bold uppercase tracking-wider text-blue-400 cursor-pointer disabled:opacity-50"
                            title="Baixar todas as fotos da coleção em arquivo .ZIP"
                          >
                            {isDownloadingZip ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                            Baixar .ZIP
                          </button>
                          <button
                            onClick={() => { if (confirm('Remover todas as imagens?')) setImages([]); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full hover:bg-red-500/20 transition-all text-[10px] font-bold uppercase tracking-wider text-red-400 cursor-pointer"
                            title="Limpar todas as imagens"
                          >
                            <Trash2 className="w-3 h-3" />
                            Limpar
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* TikTok Shop Link Importer Box & Fila */}
                  {renderTikTokImporter()}
                  
                  <div 
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative h-48 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center transition-all hover:border-orange-500/50 hover:bg-white/5 cursor-pointer"
                  >
                    <div className="bg-white/5 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6 text-white/40 group-hover:text-orange-500" />
                    </div>
                    <p className="mt-4 text-sm text-white/40">Arraste fotos aqui ou clique para buscar</p>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      multiple 
                      accept="image/*"
                      className="hidden" 
                    />
                  </div>

                  {/* Image Grid */}
                  <AnimatePresence>
                    {images.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-3 gap-4"
                      >
                        {images.map((img, index) => (
                          <motion.div
                            key={img.id}
                            layout
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            draggable
                            onDragStart={() => handleSortDragStart(index)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              handleSortDragOver(index);
                            }}
                            onDragEnd={() => setDraggedIndex(null)}
                            className={`group relative aspect-square rounded-2xl overflow-hidden border border-white/10 ${draggedIndex === index ? 'opacity-20' : 'opacity-100'}`}
                          >
                            <img 
                              src={img.preview} 
                              alt={img.name} 
                              className="w-full h-full object-contain bg-black/20 p-1"
                            />
                            {img.cropState && (
                              <div className="absolute top-2 right-2 bg-emerald-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-md shadow-md z-10">
                                ✂️ Cortada
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-wrap items-center justify-center gap-1 p-1 z-20">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setImageToCrop({ id: img.id, type: 'collection', preview: img.originalPreview || img.preview, originalPreview: img.originalPreview || img.preview }); }}
                                className="w-6 h-6 shrink-0 bg-blue-600/90 hover:bg-blue-500 text-white rounded-md transition-all shadow-md flex items-center justify-center"
                                title="Recortar Imagem"
                              >
                                <Crop className="w-3 h-3" />
                              </button>
                              {img.cropState && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); downloadCroppedImage(img); }}
                                  className="w-6 h-6 shrink-0 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-md transition-all shadow-md flex items-center justify-center"
                                  title="Baixar Imagem Cortada"
                                >
                                  <Save className="w-3 h-3" />
                                </button>
                              )}
                              <button 
                                onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                                className="w-6 h-6 shrink-0 bg-red-600/90 hover:bg-red-500 text-white rounded-md transition-all shadow-md flex items-center justify-center"
                                title="Remover Imagem"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-mono z-10">
                              {index + 1}
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {images.length > 1 && (
                    <p className="text-[10px] text-white/30 text-center italic">Arraste as imagens para reordenar a sequência manual</p>
                  )}
                </section>

                {/* Step 2: Configuration (Collection) */}
                <section className="space-y-6">
                  <h2 className="text-xl font-medium flex items-center gap-2">
                    <span className="bg-white/5 w-8 h-8 rounded-full flex items-center justify-center text-sm border border-white/10">2</span>
                    Configuração
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                        <Sparkles className="w-3 h-3" />
                        Tema da Campanha
                      </label>
                      <select 
                        value={theme}
                        onChange={(e) => { setTheme(e.target.value); setCustomTheme(''); }}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-white/20 transition-colors appearance-none cursor-pointer"
                      >
                        {THEMES.map(t => <option key={t} value={t} className="bg-[#1a1a1c]">{t}</option>)}
                        <option value="Personalizado" className="bg-[#1a1a1c]">Outro Tema...</option>
                      </select>
                      {theme === 'Personalizado' && (
                        <input 
                          type="text"
                          placeholder="Ex: Coleção Inverno Nordestino"
                          value={customTheme}
                          onChange={(e) => setCustomTheme(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-white/20"
                        />
                      )}
                    </div>

                    {(injectionTarget === 'flow' || injectionTarget === 'digen') && (
                      <div className="space-y-3">
                        <label className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                          <Settings2 className="w-3 h-3" />
                          Duração do Vídeo
                        </label>
                        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                          {DURATIONS.map(d => (
                            <button
                              key={d}
                              onClick={() => setDuration(d)}
                              className={`flex-1 py-3 text-sm rounded-xl transition-all ${duration === d ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <label className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                      <Volume2 className="w-3 h-3 text-purple-400" />
                      Gênero da Voz / Narrador
                    </label>
                    <div className="grid grid-cols-3 bg-white/5 p-1 rounded-2xl border border-white/10 gap-1">
                      <button
                        type="button"
                        onClick={() => setVoiceGender('female')}
                        className={`h-10 px-1 rounded-xl text-[11px] font-bold uppercase tracking-tight transition-all flex items-center justify-center text-center min-w-0 ${
                          voiceGender === 'female' ? 'bg-purple-600 text-white shadow-md' : 'text-white/50 hover:text-white/80'
                        }`}
                      >
                        <span className="truncate">Feminino</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVoiceGender('male')}
                        className={`h-10 px-1 rounded-xl text-[11px] font-bold uppercase tracking-tight transition-all flex items-center justify-center text-center min-w-0 ${
                          voiceGender === 'male' ? 'bg-purple-600 text-white shadow-md' : 'text-white/50 hover:text-white/80'
                        }`}
                      >
                        <span className="truncate">Masculino</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVoiceGender('none')}
                        className={`h-10 px-1 rounded-xl text-[11px] font-bold uppercase tracking-tight transition-all flex items-center justify-center text-center min-w-0 ${
                          voiceGender === 'none' ? 'bg-purple-600 text-white shadow-md' : 'text-white/50 hover:text-white/80'
                        }`}
                      >
                        <span className="truncate">Sem Narração</span>
                      </button>
                    </div>
                  </div>

                  {/* Tom da Voz / Estilo de Locução */}
                  <div className="space-y-2.5 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                        <Mic className="w-3.5 h-3.5 text-pink-400" />
                        Tom da Voz / Estilo de Locução
                      </label>
                      {voiceGender !== 'none' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-400 font-semibold border border-pink-500/20">
                          {voiceTone === 'enthusiastic' ? '🌟 Entusiasta' : voiceTone === 'persuasive' ? '💎 Confiante' : voiceTone === 'calm' ? '🍃 Suave' : '⚡ Achadinho'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-white/30 italic">
                          Desativado (Sem Narração)
                        </span>
                      )}
                    </div>
                    <div className={`grid grid-cols-2 sm:grid-cols-4 bg-white/5 p-1 rounded-2xl border border-white/10 gap-1 ${voiceGender === 'none' ? 'opacity-40 pointer-events-none' : ''}`}>
                      <button
                        type="button"
                        onClick={() => setVoiceTone('enthusiastic')}
                        className={`p-2 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                          voiceTone === 'enthusiastic' && voiceGender !== 'none'
                            ? 'bg-pink-600 text-white shadow-md'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="text-xs font-bold">🌟 Entusiasta</span>
                        <span className="text-[9px] opacity-75 leading-tight">TikTok Creator</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVoiceTone('persuasive')}
                        className={`p-2 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                          voiceTone === 'persuasive' && voiceGender !== 'none'
                            ? 'bg-pink-600 text-white shadow-md'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="text-xs font-bold">💎 Confiante</span>
                        <span className="text-[9px] opacity-75 leading-tight">Persuasivo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVoiceTone('calm')}
                        className={`p-2 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                          voiceTone === 'calm' && voiceGender !== 'none'
                            ? 'bg-pink-600 text-white shadow-md'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="text-xs font-bold">🍃 Suave</span>
                        <span className="text-[9px] opacity-75 leading-tight">Aesthetic</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVoiceTone('promo')}
                        className={`p-2 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                          voiceTone === 'promo' && voiceGender !== 'none'
                            ? 'bg-pink-600 text-white shadow-md'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="text-xs font-bold">⚡ Achadinho</span>
                        <span className="text-[9px] opacity-75 leading-tight">Promoção</span>
                      </button>
                    </div>
                  </div>

                  {/* Sequência do Fluxo de Imagens e Vídeos */}
                  <div className="space-y-2.5 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Sequência do Fluxo (Fotos & Vídeos)
                      </label>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                        {imageWorkflowMode === 'nano_banana_first' ? 'Dois Estágios' : 'Direto'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 bg-white/5 p-1 rounded-2xl border border-white/10 gap-1">
                      <button
                        type="button"
                        onClick={() => setImageWorkflowMode('direct_collected')}
                        className={`p-2.5 rounded-xl text-left transition-all flex flex-col gap-1 cursor-pointer ${
                          imageWorkflowMode === 'direct_collected'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <span>📸 Fotos Coletadas</span>
                          {imageWorkflowMode === 'direct_collected' && <Check className="w-3 h-3" />}
                        </span>
                        <span className={`text-[10px] leading-tight ${imageWorkflowMode === 'direct_collected' ? 'text-white/80' : 'text-white/40'}`}>
                          Usa as fotos já coletadas diretamente para animar os vídeos.
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageWorkflowMode('nano_banana_first')}
                        className={`p-2.5 rounded-xl text-left transition-all flex flex-col gap-1 cursor-pointer ${
                          imageWorkflowMode === 'nano_banana_first'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <span>🍌 Nano Banana Primeiro</span>
                          {imageWorkflowMode === 'nano_banana_first' && <Check className="w-3 h-3" />}
                        </span>
                        <span className={`text-[10px] leading-tight ${imageWorkflowMode === 'nano_banana_first' ? 'text-white/80' : 'text-white/40'}`}>
                          Cria fotos novas no Nano Banana 2 antes; vídeos usam as novas fotos.
                        </span>
                      </button>
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <>
                {/* Step 1: Upload (Product & Model) */}
                <section className="space-y-6">
                  <h2 className="text-xl font-medium flex items-center gap-2">
                    <span className="bg-white/5 w-8 h-8 rounded-full flex items-center justify-center text-sm border border-white/10">1</span>
                    Imagens de Referência
                  </h2>
                  
                  {/* TikTok Shop Link Importer Box & Fila */}
                  {renderTikTokImporter()}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Model Image */}
                    <div className="space-y-3">
                      <label className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                        <User className="w-3 h-3" />
                        Modelo / Apresentador(a)
                      </label>
                      <div 
                        onClick={() => !modelImage && modelInputRef.current?.click()}
                        className={`relative h-40 border-2 rounded-2xl flex flex-col items-center justify-center transition-all ${modelImage ? 'border-white/10 overflow-hidden' : 'border-dashed border-white/10 hover:border-orange-500/50 hover:bg-white/5 cursor-pointer'}`}
                      >
                        {modelImage ? (
                          <>
                            <img src={modelImage.preview} alt="Model" className="w-full h-full object-contain p-2 bg-black/40" />
                            {modelImage.cropState && (
                              <div className="absolute top-2 left-2 bg-emerald-500/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md shadow-md z-10 flex items-center gap-1">
                                <span>✂️</span> Cortada
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 z-20">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setImageToCrop({ id: modelImage.id, type: 'model', preview: modelImage.originalPreview || modelImage.preview, originalPreview: modelImage.originalPreview || modelImage.preview }); }}
                                className="p-2 bg-blue-600/90 hover:bg-blue-500 text-white rounded-xl transition-all shadow-md"
                                title="Recortar Imagem"
                              >
                                <Crop className="w-4 h-4" />
                              </button>
                              {modelImage.cropState && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); downloadCroppedImage(modelImage); }}
                                  className="p-2 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-md"
                                  title="Baixar Imagem Cortada"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                              )}
                              <button 
                                onClick={(e) => { e.stopPropagation(); removeSingleImage('model'); }} 
                                className="p-2 bg-red-600/90 hover:bg-red-500 text-white rounded-xl transition-all shadow-md"
                                title="Remover Imagem"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-white/40 mb-2" />
                            <span className="text-xs text-white/40">Selecionar Modelo</span>
                          </>
                        )}
                        <input 
                          type="file" ref={modelInputRef} accept="image/*" className="hidden"
                          onChange={(e) => handleSingleFileChange(e, 'model')} 
                        />
                      </div>
                    </div>

                    {/* Product Image */}
                    <div className="space-y-3">
                      <label className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                        <Package className="w-3 h-3" />
                        Produto (Várias Fotos)
                      </label>
                      <div 
                        onClick={() => productInputRef.current?.click()}
                        className="group relative h-40 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center transition-all hover:border-blue-500/50 hover:bg-white/5 cursor-pointer"
                      >
                        <Upload className="w-5 h-5 text-white/40 mb-2 group-hover:text-blue-500 transition-colors" />
                        <span className="text-xs text-white/40">Adicionar Fotos do Produto</span>
                        <input 
                          type="file" ref={productInputRef} accept="image/*" multiple className="hidden"
                          onChange={(e) => handleSingleFileChange(e, 'product')} 
                        />
                      </div>

                      {/* Product Images List */}
                      <AnimatePresence>
                        {productImages.length > 0 && (
                          <>
                            <div className="flex items-center justify-between mt-2 mb-1">
                              <span className="text-[10px] text-white/30">{productImages.length} foto(s) de produto</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleDownloadSceneImagesZip(productImages, 'fotos_produto')}
                                  disabled={isDownloadingZip}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full hover:bg-blue-500/20 transition-all text-[9px] font-bold uppercase tracking-wider text-blue-400 cursor-pointer disabled:opacity-50"
                                  title="Baixar todas as fotos de produto em arquivo .ZIP"
                                >
                                  {isDownloadingZip ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Download className="w-2.5 h-2.5" />}
                                  Baixar .ZIP
                                </button>
                                <button
                                  onClick={() => { if (confirm('Remover todas as imagens de produto?')) setProductImages([]); }}
                                  className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-full hover:bg-red-500/20 transition-all text-[9px] font-bold uppercase tracking-wider text-red-400 cursor-pointer"
                                  title="Limpar todas as imagens de produto"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                  Limpar tudo
                                </button>
                              </div>
                            </div>
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="grid grid-cols-3 gap-2"
                          >
                            {productImages.map((img) => (
                              <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border border-white/5 group">
                                <img src={img.preview} alt="Product" className={`w-full h-full ${imageFit === 'contain' ? 'object-contain' : 'object-cover'} bg-black/40 p-1`} />
                                {img.cropState && (
                                  <div className="absolute top-1.5 left-1.5 bg-emerald-500/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded backdrop-blur-md shadow-md z-10 flex items-center gap-0.5">
                                    <span>✂️</span> Cortada
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-wrap items-center justify-center gap-1 p-1 z-20">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setImageToCrop({ id: img.id, type: 'product', preview: img.originalPreview || img.preview, originalPreview: img.originalPreview || img.preview }); }}
                                    className="w-6 h-6 shrink-0 bg-blue-600/90 hover:bg-blue-500 text-white rounded-md transition-all shadow-md flex items-center justify-center"
                                    title="Recortar Imagem"
                                  >
                                    <Crop className="w-3 h-3" />
                                  </button>
                                  {img.cropState && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); downloadCroppedImage(img); }}
                                      className="w-6 h-6 shrink-0 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-md transition-all shadow-md flex items-center justify-center"
                                      title="Baixar Imagem Cortada"
                                    >
                                      <Save className="w-3 h-3" />
                                    </button>
                                  )}
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); removeSingleImage('product', img.id); }} 
                                    className="w-6 h-6 shrink-0 bg-red-600/90 hover:bg-red-500 text-white rounded-md transition-all shadow-md flex items-center justify-center"
                                    title="Remover Imagem"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </section>

                {/* Step 2: Configuration (Product & Model) */}
                <section className="space-y-6">
                  <h2 className="text-xl font-medium flex items-center gap-2">
                    <span className="bg-white/5 w-8 h-8 rounded-full flex items-center justify-center text-sm border border-white/10">2</span>
                    Configuração
                  </h2>
                  
                  <div className="space-y-5">
                    {/* Estilo do Vídeo */}
                    <div className="space-y-2.5">
                      <label className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-orange-400" />
                        Estilo do Vídeo
                      </label>
                      <div className="grid grid-cols-2 bg-white/5 p-1 rounded-2xl border border-white/10 gap-1">
                        <button
                          type="button"
                          onClick={() => setVideoStyle('standard')}
                          className={`h-11 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center text-center ${
                            videoStyle === 'standard' ? 'bg-orange-500 text-white shadow-md' : 'text-white/50 hover:text-white/80'
                          }`}
                        >
                          <span>Apresentador</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setVideoStyle('pov')}
                          className={`h-11 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center text-center ${
                            videoStyle === 'pov' ? 'bg-orange-500 text-white shadow-md' : 'text-white/50 hover:text-white/80'
                          }`}
                        >
                          <span>POV (Mãos)</span>
                        </button>
                      </div>
                    </div>

                    {/* Gênero da Voz / Narrador */}
                    <div className="space-y-2.5 pt-2 border-t border-white/5">
                      <label className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                        <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                        Gênero da Voz / Narrador
                      </label>
                      <div className="grid grid-cols-3 bg-white/5 p-1 rounded-2xl border border-white/10 gap-1">
                        <button
                          type="button"
                          onClick={() => setVoiceGender('female')}
                          className={`h-11 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center text-center ${
                            voiceGender === 'female' ? 'bg-purple-600 text-white shadow-md' : 'text-white/50 hover:text-white/80'
                          }`}
                        >
                          <span>Feminino</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setVoiceGender('male')}
                          className={`h-11 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center text-center ${
                            voiceGender === 'male' ? 'bg-purple-600 text-white shadow-md' : 'text-white/50 hover:text-white/80'
                          }`}
                        >
                          <span>Masculino</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setVoiceGender('none')}
                          className={`h-11 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center text-center ${
                            voiceGender === 'none' ? 'bg-purple-600 text-white shadow-md' : 'text-white/50 hover:text-white/80'
                          }`}
                        >
                          <span>Sem Narração</span>
                        </button>
                      </div>
                    </div>

                    {/* Tom da Voz / Estilo de Locução */}
                    <div className="space-y-2.5 pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                          <Mic className="w-3.5 h-3.5 text-pink-400" />
                          Tom da Voz / Estilo de Locução
                        </label>
                        {voiceGender !== 'none' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-400 font-semibold border border-pink-500/20">
                            {voiceTone === 'enthusiastic' ? '🌟 Entusiasta' : voiceTone === 'persuasive' ? '💎 Confiante' : voiceTone === 'calm' ? '🍃 Suave' : '⚡ Achadinho'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-white/30 italic">
                            Desativado (Sem Narração)
                          </span>
                        )}
                      </div>
                      <div className={`grid grid-cols-2 sm:grid-cols-4 bg-white/5 p-1 rounded-2xl border border-white/10 gap-1 ${voiceGender === 'none' ? 'opacity-40 pointer-events-none' : ''}`}>
                        <button
                          type="button"
                          onClick={() => setVoiceTone('enthusiastic')}
                          className={`p-2 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                            voiceTone === 'enthusiastic' && voiceGender !== 'none'
                              ? 'bg-pink-600 text-white shadow-md'
                              : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span className="text-xs font-bold">🌟 Entusiasta</span>
                          <span className="text-[9px] opacity-75 leading-tight">TikTok Creator</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setVoiceTone('persuasive')}
                          className={`p-2 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                            voiceTone === 'persuasive' && voiceGender !== 'none'
                              ? 'bg-pink-600 text-white shadow-md'
                              : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span className="text-xs font-bold">💎 Confiante</span>
                          <span className="text-[9px] opacity-75 leading-tight">Persuasivo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setVoiceTone('calm')}
                          className={`p-2 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                            voiceTone === 'calm' && voiceGender !== 'none'
                              ? 'bg-pink-600 text-white shadow-md'
                              : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span className="text-xs font-bold">🍃 Suave</span>
                          <span className="text-[9px] opacity-75 leading-tight">Aesthetic</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setVoiceTone('promo')}
                          className={`p-2 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                            voiceTone === 'promo' && voiceGender !== 'none'
                              ? 'bg-pink-600 text-white shadow-md'
                              : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span className="text-xs font-bold">⚡ Achadinho</span>
                          <span className="text-[9px] opacity-75 leading-tight">Promoção</span>
                        </button>
                      </div>
                    </div>

                    {/* Sequência do Fluxo de Imagens e Vídeos */}
                    <div className="space-y-2.5 pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          Sequência do Fluxo (Fotos & Vídeos)
                        </label>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                          {imageWorkflowMode === 'nano_banana_first' ? 'Dois Estágios' : 'Direto'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 bg-white/5 p-1 rounded-2xl border border-white/10 gap-1">
                        <button
                          type="button"
                          onClick={() => setImageWorkflowMode('direct_collected')}
                          className={`p-2.5 rounded-xl text-left transition-all flex flex-col gap-1 cursor-pointer ${
                            imageWorkflowMode === 'direct_collected'
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                              : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span className="text-xs font-bold flex items-center gap-1.5">
                            <span>📸 Fotos Coletadas</span>
                            {imageWorkflowMode === 'direct_collected' && <Check className="w-3 h-3" />}
                          </span>
                          <span className={`text-[10px] leading-tight ${imageWorkflowMode === 'direct_collected' ? 'text-white/80' : 'text-white/40'}`}>
                            Usa as fotos já coletadas diretamente para animar os vídeos.
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageWorkflowMode('nano_banana_first')}
                          className={`p-2.5 rounded-xl text-left transition-all flex flex-col gap-1 cursor-pointer ${
                            imageWorkflowMode === 'nano_banana_first'
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                              : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span className="text-xs font-bold flex items-center gap-1.5">
                            <span>🍌 Nano Banana Primeiro</span>
                            {imageWorkflowMode === 'nano_banana_first' && <Check className="w-3 h-3" />}
                          </span>
                          <span className={`text-[10px] leading-tight ${imageWorkflowMode === 'nano_banana_first' ? 'text-white/80' : 'text-white/40'}`}>
                            Cria fotos novas no Nano Banana 2 antes; vídeos usam as novas fotos.
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Seção Inteligente de Plataforma de Injeção */}
                  <div className="space-y-4 pt-6 border-t border-white/5">
                    <div className="space-y-3">
                      <label className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                        <Globe className="w-3 h-3 text-teal-400" />
                        Plataforma de Injeção (Onde rodar o vídeo)
                      </label>
                      <div className="grid grid-cols-3 bg-white/5 p-1 rounded-2xl border border-white/10 gap-1">
                        <button
                          type="button"
                          onClick={() => setInjectionTarget('none')}
                          className={`h-11 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center text-center ${
                            injectionTarget === 'none' ? 'bg-white text-black dark:bg-zinc-800 dark:text-white shadow-md border border-white/10 dark:border-zinc-700' : 'text-white/50 hover:text-white/80'
                          }`}
                        >
                          <span>Apenas Criar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInjectionTarget('digen')}
                          className={`h-11 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center text-center ${
                            injectionTarget === 'digen' ? 'bg-purple-600 text-white shadow-md' : 'text-white/50 hover:text-white/80'
                          }`}
                        >
                          <span>DIGEN.ai</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInjectionTarget('flow')}
                          className={`h-11 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center text-center ${
                            injectionTarget === 'flow' ? 'bg-blue-600 text-white shadow-md' : 'text-white/50 hover:text-white/80'
                          }`}
                        >
                          <span>Google Flow</span>
                        </button>
                      </div>
                    </div>

                    {/* Bloco de Configurações Gerais de Geração */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4.5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                          Configurações Gerais de Geração
                        </span>
                        {injectionTarget !== 'none' && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase font-bold tracking-wider">
                            Conectado
                          </span>
                        )}
                      </div>

                      {/* Campos Comuns Lado a Lado: Número de Cenas e Duração */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                        <div className="space-y-1.5">
                          <label className="text-[11px] text-white/60 font-medium block leading-tight">
                            Número de Cenas / Prompts de Cena
                          </label>
                          <div className="flex bg-white/5 rounded-xl border border-white/10 items-center px-3 h-10 focus-within:border-white/20">
                            <input 
                              type="number"
                              min="1"
                              max="15"
                              value={numScenes}
                              onChange={(e) => setNumScenes(Number(e.target.value) || 1)}
                              className="w-full bg-transparent text-xs text-white focus:outline-none"
                            />
                          </div>
                        </div>

                        {injectionTarget !== 'digen' && (
                          <div className="space-y-1.5">
                            <label className="text-[11px] text-white/60 font-medium block leading-tight">Duração do Vídeo</label>
                            <select
                              value={duration}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDuration(val);
                                setTargetConfigs(prev => ({ ...prev, 'flow-Duração': val }));
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 h-10 text-xs text-white focus:outline-none focus:border-white/20"
                            >
                              <option value="4s">4s</option>
                              <option value="6s">6s</option>
                              <option value="8s">8s</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Variações de Vídeo (Sequências do Produto - Até 5 Vídeos) */}
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] text-white/70 font-bold block leading-tight flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-orange-400" />
                            Variações de Vídeo do Produto (Sequências)
                          </label>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 font-semibold border border-orange-500/20">
                            {numSequences} {numSequences === 1 ? 'vídeo' : 'vídeos diferentes'}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/40 leading-relaxed">
                          Gera até 5 sequências completas de vídeos divididas em páginas (Sequência 1, 2, 3, 4, 5) com abordagens narrativas e falas exclusivas para o mesmo produto.
                        </p>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[1, 2, 3, 4, 5].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setNumSequences(num)}
                              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                                numSequences === num
                                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25 ring-1 ring-orange-400'
                                  : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/5'
                              }`}
                              title={`${num} vídeo(s) completo(s) com diferentes ganchos e falas`}
                            >
                              <span>{num} {num === 1 ? 'Vídeo' : 'Vídeos'}</span>
                              <span className="text-[8px] opacity-70 font-normal">
                                {num === 1 ? 'Padrão' : num === 2 ? '2 Ângulos' : num === 3 ? 'Recomendado' : num === 4 ? 'Avançado' : 'Máximo'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Configurações Dinâmicas para Digen */}
                      {injectionTarget === 'digen' && (
                        !digenSchema || digenSchema.configs.length === 0 ? (
                          <p className="text-xs text-white/30 italic">Nenhuma configuração mapeada para o DIGEN ainda.</p>
                        ) : (
                          digenSchema.configs.map((cfg) => (
                            <div key={cfg.label} className="space-y-1.5">
                              <label className="text-[11px] text-white/60 font-medium block">{cfg.label}</label>
                              {cfg.options && cfg.options.length > 0 ? (
                                <select
                                  value={targetConfigs[`digen-${cfg.label}`] || ''}
                                  onChange={(e) => setTargetConfigs(prev => ({ ...prev, [`digen-${cfg.label}`]: e.target.value }))}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                                >
                                  <option value="">Selecione...</option>
                                  {cfg.options.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={targetConfigs[`digen-${cfg.label}`] || ''}
                                  onChange={(e) => setTargetConfigs(prev => ({ ...prev, [`digen-${cfg.label}`]: e.target.value }))}
                                  placeholder={`Seletor: ${cfg.selector}`}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                                />
                              )}
                            </div>
                          ))
                        )
                      )}

                      {/* Configurações Específicas para Flow */}
                      {injectionTarget === 'flow' && (
                        <div className="space-y-4">
                          {/* Modelo de Imagem (Nano Banana) */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] text-white/60 font-medium block">Modelo de Imagem (Nano Banana)</label>
                            <select
                              value={targetConfigs['flow-ModeloImagem'] || 'Nano Banana 2'}
                              onChange={(e) => setTargetConfigs(prev => ({ ...prev, 'flow-ModeloImagem': e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                            >
                              <option value="Nano Banana Pro">🍌 Nano Banana Pro</option>
                              <option value="Nano Banana 2">🍌 Nano Banana 2</option>
                              <option value="Nano Banana 2 Lite">🍌 Nano Banana 2 Lite</option>
                            </select>
                          </div>

                          {/* Modelo de Vídeo (VEO) */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] text-white/60 font-medium block">Modelo de Vídeo (VEO)</label>
                            <select
                              value={targetConfigs['flow-ModeloVideo'] || 'Veo 3.1 - Lite [Lower Priority]'}
                              onChange={(e) => setTargetConfigs(prev => ({ ...prev, 'flow-ModeloVideo': e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                            >
                              <option value="Veo 3.1 - Lite [Lower Priority]">Veo 3.1 - Lite [Lower Priority]</option>
                              <option value="Veo 3.1 - Lite">Veo 3.1 - Lite</option>
                              <option value="Veo 3.1 - Fast">Veo 3.1 - Fast</option>
                              <option value="Veo 3.1 - Quality">Veo 3.1 - Quality</option>
                              <option value="Omni Flash">Omni Flash</option>
                            </select>
                          </div>

                          {/* Proporção (Aspect Ratio) */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] text-white/60 font-medium block">Proporção (Aspect Ratio)</label>
                            <select
                              value={targetConfigs['flow-Aspecto'] || ''}
                              onChange={(e) => setTargetConfigs(prev => ({ ...prev, 'flow-Aspecto': e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                            >
                              <option value="">Selecione...</option>
                              <option value="9:16">9:16 (Vertical)</option>
                              <option value="16:9">16:9 (Horizontal)</option>
                              <option value="1:1">1:1 (Quadrado)</option>
                              <option value="4:3">4:3 (Padrão)</option>
                              <option value="3:4">3:4 (Retrato)</option>
                            </select>
                          </div>

                          {/* Imagens por Cena */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] text-white/60 font-medium block">Imagens por Cena</label>
                            <select
                              value={targetConfigs['flow-ImagensPerCena'] || '1'}
                              onChange={(e) => setTargetConfigs(prev => ({ ...prev, 'flow-ImagensPerCena': e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                            >
                              <option value="1">1 Imagem por cena</option>
                              <option value="2">2 Imagens por cena</option>
                              <option value="3">3 Imagens por cena</option>
                              <option value="4">4 Imagens por cena</option>
                            </select>
                          </div>

                          {/* Quantidade por Geração */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] text-white/60 font-medium block">Quantidade por Geração</label>
                            <select
                              value={targetConfigs['flow-Quantidade'] || 'x4'}
                              onChange={(e) => setTargetConfigs(prev => ({ ...prev, 'flow-Quantidade': e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                            >
                              <option value="x1">x1 (1 variação)</option>
                              <option value="x2">x2 (2 variações)</option>
                              <option value="x3">x3 (3 variações)</option>
                              <option value="x4">x4 (4 variações simultâneas)</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Campo Compartilhado: Gerações por Prompt (Exibido para DIGEN ou outros destinos onde 'Vídeos por Imagem' não se aplica) */}
                      {injectionTarget !== 'none' && injectionTarget !== 'flow' && (
                        <div className="space-y-1.5 pt-3 border-t border-white/5">
                          <label className="text-[11px] text-white/60 font-medium block flex items-center gap-1.5">
                            🔁 Gerações por Prompt / Variações
                          </label>
                          <select
                            value={targetConfigs['generationsPerPrompt'] || '1'}
                            onChange={(e) => setTargetConfigs(prev => ({ ...prev, 'generationsPerPrompt': e.target.value }))}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                          >
                            <option value="1">1 geração (Padrão)</option>
                            <option value="2">2 gerações sequenciais</option>
                            <option value="3">3 gerações sequenciais</option>
                            <option value="4">4 gerações sequenciais</option>
                            <option value="5">5 gerações sequenciais</option>
                            <option value="6">6 gerações sequenciais</option>
                            <option value="8">8 gerações sequenciais</option>
                            <option value="10">10 gerações sequenciais</option>
                          </select>
                          <p className="text-[9px] text-white/30 leading-relaxed">
                            O injetor repetirá a geração sequencialmente o número de vezes escolhido, salvando como cenaX_1.mp4, cenaX_2.mp4, etc.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* Step 3: Observations & Action (Shared) */}
            <section className="space-y-6">
              {/* Card de Descrição Oficial & Medidas do Produto (TikTok Shop) */}
              {productDescription && (
                <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/25 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-400" />
                      <span className="text-xs font-bold text-orange-200">
                        Descrição Oficial & Medidas (TikTok Shop)
                      </span>
                      <span className="text-[10px] bg-orange-500/20 text-orange-300 font-mono font-bold px-2 py-0.5 rounded-full">
                        {productDescription.length} caracteres
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(productDescription);
                          setCopiedProductDescription(true);
                          setTimeout(() => setCopiedProductDescription(false), 2000);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Copiar texto completo da descrição e medidas"
                      >
                        {copiedProductDescription ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedProductDescription ? 'Copiado!' : 'Copiar'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsEditingProductDescription(prev => !prev)}
                        className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold transition-all cursor-pointer"
                        title="Editar descrição do produto"
                      >
                        {isEditingProductDescription ? 'Concluir' : 'Editar'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Remover esta descrição do produto?')) {
                            setProductDescription('');
                            setIsEditingProductDescription(false);
                          }
                        }}
                        className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all cursor-pointer"
                        title="Remover descrição"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setIncludeProductDescription(prev => !prev)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          includeProductDescription
                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                            : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white'
                        }`}
                        title="Ativar ou desativar uso da descrição pelo gerador de I.A"
                      >
                        {includeProductDescription && <Check className="w-3.5 h-3.5" />}
                        <span>{includeProductDescription ? 'Usar na IA: SIM' : 'Usar na IA: NÃO'}</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] opacity-75 leading-relaxed">
                    {includeProductDescription
                      ? '✅ A I.A utilizará as medidas exatas, tecido sensorial, modelagem e destaques oficiais do produto para criar falas em PT-BR autênticas e prompts visuais fiéis.'
                      : '⏸️ Descrição desativada. A I.A gerará o roteiro baseando-se apenas nas fotos e observações gerais.'}
                  </p>

                  {isEditingProductDescription ? (
                    <textarea
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white leading-relaxed font-mono resize-y min-h-[140px] focus:outline-none focus:border-orange-500/50"
                      placeholder="Edite as especificações ou tabela de medidas do produto..."
                    />
                  ) : (
                    <div className="text-xs opacity-90 bg-black/40 p-3.5 rounded-xl border border-white/5 max-h-60 overflow-y-auto leading-relaxed whitespace-pre-line font-mono select-text">
                      {productDescription}
                    </div>
                  )}
                </div>
              )}

              {/* Card de Controle de Avaliações de Clientes no Roteiro */}
              {productReviews && (productReviews.comments.length > 0 || productReviews.tags.length > 0) && (
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/25 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <MessageSquareQuote className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-purple-200">
                        Avaliações de Clientes (TikTok Shop)
                      </span>
                      {productReviews.rating && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                          ★ {productReviews.rating}
                        </span>
                      )}
                      <span className="text-[10px] bg-purple-500/20 text-purple-300 font-mono font-bold px-2 py-0.5 rounded-full">
                        {productReviews.comments.length} comentários
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProductReviews(prev => prev ? { ...prev, includeInPrompt: !prev.includeInPrompt } : null)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        productReviews.includeInPrompt
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                          : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white'
                      }`}
                      title="Clique para ativar ou desativar o uso dos comentários pela inteligência artificial"
                    >
                      {productReviews.includeInPrompt && <Check className="w-3.5 h-3.5" />}
                      <span>{productReviews.includeInPrompt ? 'Usar na IA: SIM' : 'Usar na IA: NÃO'}</span>
                    </button>
                  </div>

                  <p className="text-[11px] opacity-75 leading-relaxed">
                    {productReviews.includeInPrompt
                      ? '✅ A I.A utilizará as avaliações reais dos clientes para gerar ganchos de prova social, quebrar objeções e orientar as cenas de vídeo.'
                      : '⏸️ Avaliações desativadas. A I.A gerará o roteiro sem considerar os comentários de compradores.'}
                  </p>

                  {productReviews.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {productReviews.tags.map((tag, i) => (
                        <span key={i} className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-purple-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3 pb-8">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                    <GripVertical className="w-3 h-3" />
                    Observações Importantes
                  </label>
                  {observations.trim().length > 0 && (
                    <button
                      onClick={() => { if (confirm('Limpar todo o texto de observações?')) setObservations(''); }}
                      className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-full hover:bg-red-500/20 transition-all text-[9px] font-bold uppercase tracking-wider text-red-400"
                      title="Limpar texto"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      Limpar texto
                    </button>
                  )}
                </div>
                <textarea 
                  placeholder="Ex: Foco no público jovem, tom de voz entusiasmado, use gírias atuais, destaque a leveza do tecido..."
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-white/20 min-h-[100px] resize-none"
                />
              </div>

              {/* Action Button */}
              {isGenerating ? (
                <div className="flex gap-4">
                  <button
                    onClick={cancelGeneration}
                    className="flex-1 rounded-3xl py-6 bg-red-500/10 border border-red-500/20 text-red-500 font-bold tracking-tight text-lg hover:bg-red-500/20 transition-all active:scale-[0.98]"
                  >
                    Cancelar Geração
                  </button>
                  <div className="flex-[2] rounded-3xl py-6 bg-white/5 border border-white/10 flex items-center justify-center gap-3 text-white/40 font-bold tracking-tight text-lg">
                    <Loader2 className="w-6 h-6 animate-spin" /> Gerando...
                  </div>
                </div>
              ) : (
                <button
                  disabled={isGenerating}
                  onClick={activeTab === 'collection' ? generateScript : generateProductScript}
                  className="group relative w-full overflow-hidden rounded-3xl py-6 transition-all font-bold tracking-tight text-lg bg-white text-black active:scale-[0.98]"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-orange-400 to-white opacity-0 group-hover:opacity-20 transition-opacity" />
                  <span className="relative flex items-center justify-center gap-3 font-display">
                    <Play className="w-5 h-5 fill-current" /> Gerar Roteiro Completo
                  </span>
                </button>
              )}
            </section>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-12 xl:col-span-7">
            <AnimatePresence mode="wait">
              {generatedScript ? (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xs uppercase tracking-[0.3em] text-orange-500 font-bold mb-2">Roteiro Gerado</h3>
                        <h2 className="text-3xl font-bold font-display">{generatedScript.campaignTitle}</h2>
                      </div>
                      <button 
                        onClick={copyToClipboard}
                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white hover:text-black transition-all"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span className="text-xs font-bold uppercase tracking-widest">{copied ? 'Copiado' : 'JSON'}</span>
                      </button>
                    </div>
                    {/* Export buttons */}
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={exportAsTxt} className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-xs font-bold text-white/60 hover:text-white">
                        <FileText className="w-3.5 h-3.5" />.TXT
                      </button>
                      <button onClick={exportAsDoc} className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-xs font-bold text-white/60 hover:text-white">
                        <FileText className="w-3.5 h-3.5" />.DOC
                      </button>
                      <button onClick={exportAsPdf} className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-xs font-bold text-white/60 hover:text-white">
                        <Download className="w-3.5 h-3.5" />.PDF
                      </button>
                      {window.electronAPI && (
                        <button 
                          onClick={() => saveProjectToFolder()}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all text-xs font-bold shadow-md hover:shadow-emerald-500/10"
                          title="Salvar tudo estruturado em subpasta dentro do Downloads"
                        >
                          <Save className="w-3.5 h-3.5" /> Salvar Pasta do Projeto
                        </button>
                      )}
                      {window.electronAPI ? (
                        <>
                          <button 
                            onClick={async () => {
                              const proj = activeProjectId ? projects.find(p => p.id === activeProjectId) : null;
                              const pIndex = proj ? proj.projectIndex : projectCounter;
                              try {
                                await saveProjectToFolder(pIndex);
                              } catch (err) {
                                console.warn("Aviso ao salvar assets antes de abrir o injetor:", err);
                              }
                              const seqsList = (generatedScript.sequences && generatedScript.sequences.length > 0)
                                ? generatedScript.sequences
                                : [{ id: 'seq-1', sequenceNumber: 1, title: generatedScript.campaignTitle, approach: 'Padrão', scenes: generatedScript.scenes }];
                              const scenesToInject = seqsList[Math.min(activeSequenceIndex, seqsList.length - 1)]?.scenes || generatedScript.scenes;

                              window.electronAPI.openInjectorWindow({ 
                                generatedScript: {
                                  ...generatedScript,
                                  scenes: scenesToInject
                                }, 
                                generatedAngles,
                                injectionTarget: 'flow',
                                targetConfigs,
                                projectIndex: pIndex
                              });
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all text-xs font-bold shadow-md hover:shadow-blue-500/10"
                            title="Abrir o injetor de prompts configurado para o Google Labs Flow"
                          >
                            <Sparkles className="w-3.5 h-3.5" /> Injetar no Google Flow
                          </button>
                          <button 
                            onClick={async () => {
                              const proj = activeProjectId ? projects.find(p => p.id === activeProjectId) : null;
                              const pIndex = proj ? proj.projectIndex : projectCounter;
                              try {
                                await saveProjectToFolder(pIndex);
                              } catch (err) {
                                console.warn("Aviso ao salvar assets antes de abrir o injetor:", err);
                              }
                              const seqsList = (generatedScript.sequences && generatedScript.sequences.length > 0)
                                ? generatedScript.sequences
                                : [{ id: 'seq-1', sequenceNumber: 1, title: generatedScript.campaignTitle, approach: 'Padrão', scenes: generatedScript.scenes }];
                              const scenesToInject = seqsList[Math.min(activeSequenceIndex, seqsList.length - 1)]?.scenes || generatedScript.scenes;

                              window.electronAPI.openInjectorWindow({ 
                                generatedScript: {
                                  ...generatedScript,
                                  scenes: scenesToInject
                                }, 
                                generatedAngles,
                                injectionTarget: 'digen',
                                targetConfigs,
                                projectIndex: pIndex
                              });
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all text-xs font-bold shadow-md hover:shadow-purple-500/10"
                            title="Abrir o injetor de prompts configurado para o DIGEN.ai"
                          >
                            <Sparkles className="w-3.5 h-3.5" /> Injetar no DIGEN.ai
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => {
                            setValidationAlert({
                              title: "Recurso Exclusivo",
                              message: "Esta funcionalidade de injeção automática está disponível apenas rodando no aplicativo Electron."
                            });
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-orange-500/20 to-teal-500/20 border border-orange-500/30 rounded-xl hover:from-orange-500/30 hover:to-teal-500/30 transition-all text-xs font-bold text-orange-400 hover:text-white"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Injetar Prompts (Digen/Flow)
                        </button>
                      )}
                    </div>
                  </div>

                  {(() => {
                    const sequencesList = (generatedScript.sequences && generatedScript.sequences.length > 0)
                      ? generatedScript.sequences
                      : [{ id: 'seq-1', sequenceNumber: 1, title: generatedScript.campaignTitle || 'Sequência 1', approach: 'Padrão', scenes: generatedScript.scenes }];
                    const safeSeqIndex = Math.min(activeSequenceIndex, sequencesList.length - 1);
                    const currentSequence = sequencesList[safeSeqIndex] || sequencesList[0];
                    const currentScenes = currentSequence.scenes || generatedScript.scenes;

                    return (
                      <>
                        {/* Barra de Paginação de Sequências (Sequência 1, 2, 3, 4, 5...) */}
                        {sequencesList.length > 1 && (
                          <div className="bg-white/5 border border-white/10 rounded-3xl p-5 mb-6 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-white/5">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                  <Layers className="w-4 h-4" />
                                </div>
                                <div>
                                  <h3 className="text-xs uppercase tracking-wider text-white font-bold font-display">
                                    Variações de Roteiro do Produto
                                  </h3>
                                  <p className="text-[10px] text-white/40">
                                    Dividido em páginas &bull; {sequencesList.length} vídeos com falas e abordagens diferentes
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                <button
                                  onClick={() => setActiveSequenceIndex(prev => Math.max(0, prev - 1))}
                                  disabled={safeSeqIndex === 0}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold transition-all cursor-pointer"
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                                </button>
                                <span className="px-2.5 py-1 rounded-xl bg-black/30 border border-white/5 text-[11px] font-bold text-orange-400">
                                  Página {safeSeqIndex + 1} de {sequencesList.length}
                                </span>
                                <button
                                  onClick={() => setActiveSequenceIndex(prev => Math.min(sequencesList.length - 1, prev + 1))}
                                  disabled={safeSeqIndex === sequencesList.length - 1}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold transition-all cursor-pointer"
                                >
                                  Próxima <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Abas das Páginas das Sequências */}
                            <div className="flex flex-wrap gap-2">
                              {sequencesList.map((seq, idx) => {
                                const isActive = safeSeqIndex === idx;
                                return (
                                  <button
                                    key={seq.id || idx}
                                    onClick={() => setActiveSequenceIndex(idx)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                                      isActive
                                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 scale-[1.02]'
                                        : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5'
                                    }`}
                                  >
                                    <span>Sequência {idx + 1}</span>
                                    {seq.approach && (
                                      <span className={`text-[10px] font-normal px-2 py-0.5 rounded-full ${isActive ? 'bg-black/25 text-white' : 'bg-white/10 text-white/50'}`}>
                                        {seq.approach}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Descrição e Gancho da Sequência Ativa */}
                            <div className="bg-black/30 rounded-2xl p-3.5 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-white/40">Abordagem Desta Sequência:</span>
                                <span className="font-semibold text-orange-300">{currentSequence.title || `Sequência ${safeSeqIndex + 1}`}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-white/40">{currentScenes.length} cena(s)</span>
                                <button
                                  onClick={() => {
                                    const allSeqText = sequencesList.map((s, si) => 
                                      `=== SEQUÊNCIA ${si + 1}: ${s.title} (${s.approach}) ===\n` +
                                      s.scenes.map((sc, sci) => `Cena ${sci + 1} (${sc.duration}):\nImagem: ${sc.imagePrompt}\nVEO: ${sc.veoPrompt}\nDIGEN: ${sc.digenPrompt}\nFala PT-BR: "${sc.narration}"`).join('\n\n')
                                    ).join('\n\n=========================================\n\n');
                                    copyText(allSeqText);
                                  }}
                                  className="text-[10px] text-orange-400 hover:text-orange-300 flex items-center gap-1 cursor-pointer font-bold"
                                  title="Copiar todas as sequências juntas"
                                >
                                  <Copy className="w-3 h-3" /> Copiar Todas as Sequências
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-6">
                          {currentScenes.map((scene, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="group bg-white/5 rounded-[2.5rem] p-8 border border-white/10 hover:bg-white/[0.07] transition-colors"
                      >
                        <div className="flex flex-col md:flex-row items-start gap-8">
                          {/* Image preview in Scene */}
                          <div className="w-full md:w-48 aspect-square rounded-3xl overflow-hidden shadow-2xl bg-black border border-white/5 flex-shrink-0 relative">
                            {(images.find(img => img.name === scene.imageName) || 
                              (modelImage?.name === scene.imageName ? modelImage : null) || 
                              (productImages.find(img => img.name === scene.imageName))) && (
                              <img 
                                src={(images.find(img => img.name === scene.imageName) || 
                                     (modelImage?.name === scene.imageName ? modelImage : (productImages.find(img => img.name === scene.imageName) || productImages[0])))?.preview} 
                                alt={scene.imageName}
                                className={`w-full h-full ${imageFit === 'contain' ? 'object-contain p-2' : 'object-cover'}`}
                              />
                            )}
                            {!(images.find(img => img.name === scene.imageName) || 
                               (modelImage?.name === scene.imageName) || 
                               (productImages.some(img => img.name === scene.imageName))) && (
                              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                                <ImageIcon className="w-8 h-8 text-white/20 mb-2" />
                                <span className="text-[10px] text-white/30 truncate w-full">{scene.imageName}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 space-y-6">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="text-xs font-mono font-bold text-white/30 uppercase tracking-widest font-display">Cena {i + 1} &bull; {scene.duration}</span>
                                <span className="text-[10px] text-orange-400/60 font-mono mt-1">{scene.imageName}</span>
                              </div>
                              <button 
                                onClick={() => copyScene(scene)}
                                className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                                title="Copiar bloco desta cena"
                              >
                                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                              {/* 1. Still Image (Nano Banana 2 / Imagen) */}
                              <div className="space-y-2 group/card bg-black/10 hover:bg-amber-500/[0.02] p-5 rounded-3xl border border-white/5 hover:border-amber-500/20 transition-all">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-amber-400 font-display">1. Imagem (Nano Banana 2)</h4>
                                  <button 
                                    onClick={() => copyText(scene.imagePrompt)} 
                                    className="text-white/20 hover:text-amber-400 transition-colors flex items-center gap-1"
                                    title="Copiar Prompt de Imagem"
                                  >
                                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                                <p className="text-xs text-white/80 leading-relaxed italic bg-black/20 p-4 rounded-2xl border border-white/5 break-words overflow-hidden min-h-[80px]">
                                  "{scene.imagePrompt}"
                                </p>
                              </div>

                              {/* 2. Video Animation (VEO) */}
                              <div className="space-y-2 group/card bg-black/10 hover:bg-blue-500/[0.02] p-5 rounded-3xl border border-white/5 hover:border-blue-500/20 transition-all">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-blue-400 font-display">2. Animação (VEO)</h4>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => {
                                        const imgData = (images.find(img => img.name === scene.imageName) || 
                                                       (modelImage?.name === scene.imageName ? modelImage : (productImages.find(img => img.name === scene.imageName) || productImages[0])))?.preview;
                                        if (imgData) {
                                          const link = document.createElement('a');
                                          link.href = imgData;
                                          link.download = `scene_${i+1}_${scene.imageName}`;
                                          link.click();
                                        }
                                      }} 
                                      className="text-white/20 hover:text-orange-400 transition-colors flex items-center gap-1"
                                      title="Baixar Imagem de Referência"
                                    >
                                      <Upload className="w-3 h-3 rotate-180" />
                                    </button>
                                    <button 
                                      onClick={() => copyText(`${scene.veoPrompt}\n\nNarração (PT-BR):\n${scene.narration}`)} 
                                      className="text-white/20 hover:text-blue-400 transition-colors flex items-center gap-1.5"
                                      title="Copiar Prompt VEO + Narração"
                                    >
                                      <span className="text-[9px] font-bold text-blue-400/80 tracking-wider font-mono">+ Narração</span>
                                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                  </div>
                                </div>
                                <p className="text-xs text-white/80 leading-relaxed italic bg-black/20 p-4 rounded-2xl border border-white/5 break-words overflow-hidden min-h-[80px]">
                                  "{scene.veoPrompt}"
                                </p>
                                </div>

                              {/* 3. Digital Avatar (DIGEN) */}
                              <div className="space-y-2 group/card bg-black/10 hover:bg-purple-500/[0.02] p-5 rounded-3xl border border-white/5 hover:border-purple-500/20 transition-all">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-purple-400 font-display">3. Fala (DIGEN)</h4>
                                  <button 
                                    onClick={() => copyText(`${scene.digenPrompt}\n\nNarração (PT-BR):\n${scene.narration}`)} 
                                    className="text-white/20 hover:text-purple-400 transition-colors flex items-center gap-1.5"
                                    title="Copiar Prompt DIGEN + Narração"
                                  >
                                    <span className="text-[9px] font-bold text-purple-400/80 tracking-wider font-mono">+ Narração</span>
                                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                                <p className="text-xs text-white/80 leading-relaxed italic bg-black/20 p-4 rounded-2xl border border-white/5 break-words overflow-hidden min-h-[80px]">
                                  "{scene.digenPrompt}"
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2 bg-orange-500/5 p-6 rounded-3xl border border-orange-500/10">
                              <div className="flex items-center justify-between">
                                <h4 className="text-[10px] uppercase font-bold tracking-widest text-orange-500 font-display">Narração / Diálogo (PT-BR)</h4>
                                <button onClick={() => copyText(scene.narration)} className="text-white/20 hover:text-orange-500 transition-colors">
                                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                              <p className="text-lg font-medium text-white/90">
                                {scene.narration}
                              </p>
                              <p className="text-xs text-white/40 mt-3 pt-3 border-t border-white/5">
                                <strong>Contexto:</strong> {scene.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              );
            })()}

                  {/* Product Angles Generator (Only shown in final generation) */}
                  {activeTab === 'product' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-teal-500/[0.03] border border-teal-500/10 rounded-[2.5rem] p-8 space-y-6 mt-8"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Camera className="w-5 h-5 text-teal-400" />
                          <h3 className="text-xl font-bold font-display text-white">Ângulos Adicionais do Produto</h3>
                        </div>
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 self-start sm:self-auto">
                          <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Quantidade:</span>
                          <select
                            value={numAngles}
                            onChange={(e) => setNumAngles(Number(e.target.value))}
                            className="bg-transparent text-xs text-white focus:outline-none cursor-pointer font-bold font-mono"
                          >
                            {[2,3,4,5,6,7,8].map(n => <option key={n} value={n} className="bg-[#1a1a1c]">{n}</option>)}
                          </select>
                        </div>
                      </div>
                      <p className="text-xs text-white/50 leading-relaxed">
                        Gere variações de prompts em ângulos alternativos (close-ups, perfil, flat lay, etc.) para o seu produto, garantindo consistência total de cor e design.
                      </p>
                      
                      {isGeneratingAngles ? (
                        <div className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-teal-500/5 border border-teal-500/10 text-teal-400/60 font-bold text-sm">
                          <Loader2 className="w-5 h-5 animate-spin" /> Gerando {numAngles} Ângulos...
                        </div>
                      ) : (
                        <button
                          onClick={generateProductAngles}
                          className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-400 hover:text-white transition-all active:scale-[0.98] font-bold text-sm tracking-wide uppercase"
                        >
                          <Layers className="w-4 h-4" /> Gerar {numAngles} Ângulos do Produto
                        </button>
                      )}
                    </motion.div>
                  )}

                  {/* Ângulos do Produto */}
                  {generatedAngles && generatedAngles.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 pt-4">
                        <Layers className="w-5 h-5 text-teal-400" />
                        <h3 className="text-xl font-bold font-display">Ângulos do Produto</h3>
                        <span className="text-xs bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded-full">{generatedAngles.length} variações</span>
                      </div>
                      <p className="text-xs text-white/30">Produto mantido 100% original — apenas o ângulo da câmera varia</p>
                      {generatedAngles.map((angle, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="bg-teal-500/[0.03] rounded-[2rem] p-6 border border-teal-500/10 hover:border-teal-500/20 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-xs font-bold text-teal-400">{i + 1}</span>
                              <span className="font-bold text-white">{angle.angleName}</span>
                            </div>
                            <button
                              onClick={() => copyText(`${angle.imagePrompt}\n\nVEO:\n${angle.veoPrompt}\n\nDIGEN:\n${angle.digenPrompt}\n\nNarração (PT-BR):\n${angle.narration}`)}
                              className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                              title="Copiar tudo deste ângulo"
                            >
                              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2 bg-black/10 p-4 rounded-2xl border border-white/5">
                              <div className="flex items-center justify-between">
                                <h4 className="text-[10px] uppercase font-bold tracking-widest text-amber-400">Imagem (Nano Banana 2)</h4>
                                <button onClick={() => copyText(angle.imagePrompt)} className="text-white/20 hover:text-amber-400 transition-colors">
                                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                              <p className="text-xs text-white/70 leading-relaxed italic">&quot;{angle.imagePrompt}&quot;</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-2 bg-black/10 p-4 rounded-2xl border border-white/5">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-blue-400">VEO</h4>
                                  <button onClick={() => copyText(`${angle.veoPrompt}\n\nNarração (PT-BR):\n${angle.narration}`)} className="text-white/20 hover:text-blue-400 transition-colors flex items-center gap-1">
                                    <span className="text-[9px] font-bold text-blue-400/70">+ Narr.</span>
                                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                                <p className="text-xs text-white/60 leading-relaxed italic">&quot;{angle.veoPrompt}&quot;</p>
                              </div>
                              <div className="space-y-2 bg-black/10 p-4 rounded-2xl border border-white/5">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-purple-400">DIGEN</h4>
                                  <button onClick={() => copyText(`${angle.digenPrompt}\n\nNarração (PT-BR):\n${angle.narration}`)} className="text-white/20 hover:text-purple-400 transition-colors flex items-center gap-1">
                                    <span className="text-[9px] font-bold text-purple-400/70">+ Narr.</span>
                                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                                <p className="text-xs text-white/60 leading-relaxed italic">&quot;{angle.digenPrompt}&quot;</p>
                              </div>
                            </div>
                            <div className="bg-teal-500/5 p-4 rounded-2xl border border-teal-500/10">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[10px] uppercase font-bold tracking-widest text-teal-400">Narração (PT-BR)</h4>
                                <button onClick={() => copyText(angle.narration)} className="text-white/20 hover:text-teal-400 transition-colors">
                                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                              <p className="text-sm font-medium text-white/90">{angle.narration}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}

                  <button 
                    onClick={() => {
                      if(confirm("Deseja iniciar um novo projeto? Todas as configurações e roteiros atuais serão perdidos.")) {
                        setGeneratedScript(null);
                        setGeneratedAngles(null);
                        setImages([]);
                        setModelImage(null);
                        setProductImages([]);
                        setObservations('');
                      }
                    }}
                    className="w-full py-6 text-white/40 hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCcw className="w-4 h-4" /> Iniciar Novo Projeto
                  </button>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-8 py-20 bg-white/[0.02] rounded-[3rem] border border-dashed border-white/5">
                  <div className="relative">
                    <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full" />
                    <div className="relative bg-white/5 w-24 h-24 rounded-full flex items-center justify-center border border-white/10">
                      <FileJson className="w-10 h-10 text-white/40" />
                    </div>
                  </div>
                  <div className="max-w-xs px-6">
                    <h3 className="text-xl font-medium mb-2 font-display">Nenhum Roteiro Gerado</h3>
                    <p className="text-sm text-white/30 font-light leading-relaxed">
                      Envie as fotos dos seus looks e defina um tema para criar prompts cinematográficos e narrações persuasivas.
                    </p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
        )}
      </main>


      {/* Modal Importador TikTok Shop */}
      <AnimatePresence>
        {isTikTokModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (isQueueRunning) handleCancelQueue();
                if (isExtractingTikTok) handleCancelSingleImport();
                if (!isImportingTikTokImages) setIsTikTokModalOpen(false);
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                backgroundColor: themeMode === 'dark' ? '#111113' : '#ffffff',
                borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e4e4e7',
                color: themeMode === 'dark' ? '#fafafa' : '#18181b'
              }}
              className={`relative z-10 w-full transition-all duration-300 rounded-[2rem] shadow-2xl border flex flex-col overflow-hidden ${
                isWebviewExpanded 
                  ? 'max-w-7xl h-[95vh]' 
                  : 'max-w-5xl h-[88vh] max-h-[92vh]'
              }`}
            >
              {/* Header */}
              <div 
                className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0"
                style={{ borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
                    <Link className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-display flex items-center gap-2">
                      Importador de Produtos TikTok Shop
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-500 font-mono font-bold border border-pink-500/20">
                        v{APP_VERSION}
                      </span>
                    </h3>
                    <p className="text-xs opacity-60 font-mono truncate max-w-md">
                      {activeTikTokUrl || 'Aguardando URL...'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isQueueRunning && (
                    <button
                      type="button"
                      onClick={handleCancelQueue}
                      className="px-3 py-1.5 rounded-xl border border-rose-500/50 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm animate-pulse"
                      title="Interromper processamento da fila de links"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancelar Fila ({currentQueueIndex + 1}/{tiktokQueue.length})</span>
                    </button>
                  )}
                  {isExtractingTikTok && !isQueueRunning && (
                    <button
                      type="button"
                      onClick={handleCancelSingleImport}
                      className="px-3 py-1.5 rounded-xl border border-rose-500/50 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm animate-pulse"
                      title="Interromper extração do produto atual"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancelar Extração</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleOpenTikTokLogin}
                    className="px-3 py-1.5 rounded-xl border border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-300 hover:text-pink-700 dark:hover:text-white transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Abrir página oficial de login do TikTok em janela expandida"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Tela de Login</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsWebviewExpanded(prev => !prev)}
                    title={isWebviewExpanded ? "Reduzir visualização da janela" : "Expandir para tela cheia (ideal para login e captchas)"}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      isWebviewExpanded 
                        ? 'border-pink-500/60 bg-pink-500/20 text-pink-500 dark:text-pink-300' 
                        : 'border-white/10 hover:bg-white/10 text-zinc-700 dark:text-white/70 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {isWebviewExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => {
                      const webview = tiktokWebviewRef.current;
                      if (webview) webview.reload();
                    }}
                    title="Recarregar página do TikTok"
                    className="p-2 rounded-xl border border-white/10 hover:bg-white/10 transition-colors text-zinc-700 dark:text-white/70 hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    <RefreshCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (activeTikTokUrl) window.open(activeTikTokUrl, '_blank');
                    }}
                    title="Abrir no navegador externo"
                    className="p-2 rounded-xl border border-white/10 hover:bg-white/10 transition-colors text-zinc-700 dark:text-white/70 hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (isQueueRunning) handleCancelQueue();
                      if (isExtractingTikTok) handleCancelSingleImport();
                      if (!isImportingTikTokImages) setIsTikTokModalOpen(false);
                    }}
                    className="p-2 rounded-xl border border-white/10 hover:bg-white/10 transition-colors text-zinc-700 dark:text-white/70 hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Status / Alert Bar */}
              <div className="px-6 pt-4 pb-2 flex-shrink-0">
                {isTikTokCaptchaDetected ? (
                  <div className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-3.5 flex items-start justify-between gap-3 shadow-md shadow-amber-500/10">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5 animate-bounce" />
                      <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                        <strong className="font-semibold block text-amber-700 dark:text-amber-300 text-sm">Verificação de Segurança (Slide Captcha)</strong>
                        O TikTok solicitou uma confirmação visual humana. Por favor, arraste a peça do quebra-cabeça na janela abaixo. Assim que você resolver, a extração das imagens continuará automaticamente!
                      </div>
                    </div>
                    {tiktokModalTab !== 'browser' && (
                      <button
                        type="button"
                        onClick={() => setTiktokModalTab('browser')}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer flex-shrink-0 flex items-center gap-1.5"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Abrir Navegador</span>
                      </button>
                    )}
                  </div>
                ) : isExtractingTikTok ? (
                  <div className="bg-pink-500/15 border border-pink-500/30 rounded-2xl p-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2.5 text-xs text-pink-700 dark:text-pink-300 font-semibold">
                      <Loader2 className="w-4 h-4 animate-spin text-pink-500 flex-shrink-0" />
                      <span>{tiktokExtractionStatus || 'Carregando página e extraindo mídias em alta resolução...'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const webview = tiktokWebviewRef.current;
                        if (webview) {
                          setTiktokExtractionStatus('Capturando fotos visíveis no navegador...');
                          setIsTikTokCaptchaDetected(false);
                          try {
                            const res = await webview.executeJavaScript(TIKTOK_PDP_SCRAPER_SCRIPT);
                            if (res && res.status === 'success' && res.images && res.images.length > 0) {
                              setExtractedTikTokProduct(res);
                              setSelectedTikTokImageIds(res.images.map((img: any) => img.id));
                              if (res.reviews?.comments && res.reviews.comments.length > 0) {
                                setSelectedTikTokCommentIds(res.reviews.comments.map((c: any) => c.id));
                              }
                              setIsExtractingTikTok(false);
                              setTiktokModalTab('photos');
                              const revCount = res.reviews?.comments?.length || 0;
                              const revTxt = revCount > 0 ? ` e ${revCount} avaliações` : '';
                              setTiktokExtractionStatus(`✅ Extração concluída! ${res.images.length} fotos${revTxt} encontradas.`);
                            } else if (res && res.status === 'captcha') {
                              setIsTikTokCaptchaDetected(true);
                              setTiktokExtractionStatus('Verificação de segurança (captcha) ainda ativa. Por favor, conclua o quebra-cabeça.');
                            } else if (res && res.status === 'auth_page') {
                              setTiktokExtractionStatus('Página de login/autenticação detectada.');
                            } else if (res && res.status === 'error') {
                              setTiktokExtractionStatus(`Aviso: ${res.message || 'Falha de leitura'}. Tentando novamente...`);
                            } else if (res && res.title) {
                              setTiktokExtractionStatus(`Identificando fotos para: ${res.title.slice(0, 45)}...`);
                            } else {
                              setTiktokExtractionStatus('Tentando localizar fotos do produto no DOM...');
                            }
                          } catch (e: any) {
                            setTiktokExtractionStatus(`Erro ao ler página: ${e?.message || 'Falha de comunicação'}`);
                          }
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-500 text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Capturar Fotos Agora
                    </button>
                  </div>
                ) : (extractedTikTokProduct && extractedTikTokProduct.images && extractedTikTokProduct.images.length > 0) ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-2.5 px-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-emerald-300 font-medium">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{tiktokExtractionStatus || `Extração concluída com sucesso! ${extractedTikTokProduct.images.length} fotos prontas.`}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400/80 font-mono">
                      {selectedTikTokImageIds.length} de {extractedTikTokProduct.images.length} fotos selecionadas
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Navigation Tabs when Product is Extracted */}
              {extractedTikTokProduct && (
                <div 
                  className="px-6 pt-2 pb-0 flex items-center justify-between border-b flex-shrink-0"
                  style={{ borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
                >
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => setTiktokModalTab('photos')}
                      className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                        tiktokModalTab === 'photos'
                          ? 'border-pink-500 text-pink-400 font-extrabold'
                          : 'border-transparent opacity-60 hover:opacity-100 text-white'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Fotos do Produto ({selectedTikTokImageIds.length}/{extractedTikTokProduct.images.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTiktokModalTab('reviews')}
                      className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                        tiktokModalTab === 'reviews'
                          ? 'border-purple-500 text-purple-400 font-extrabold'
                          : 'border-transparent opacity-60 hover:opacity-100 text-white'
                      }`}
                    >
                      <MessageSquareQuote className="w-4 h-4" />
                      <span>Avaliações {extractedTikTokProduct.reviews?.comments?.length ? `(${extractedTikTokProduct.reviews.comments.length})` : ''}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTiktokModalTab('details')}
                      className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                        tiktokModalTab === 'details'
                          ? 'border-pink-500 text-pink-400 font-extrabold'
                          : 'border-transparent opacity-60 hover:opacity-100 text-white'
                      }`}
                    >
                      <Package className="w-4 h-4" />
                      <span>Detalhes do Produto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTiktokModalTab('browser')}
                      className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                        tiktokModalTab === 'browser'
                          ? 'border-pink-500 text-pink-400 font-extrabold'
                          : 'border-transparent opacity-60 hover:opacity-100 text-white'
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                      <span>Navegador {isTikTokCaptchaDetected ? '⚠️ Captcha' : ''}</span>
                    </button>
                  </div>

                  {/* Ações rápidas de seleção para a aba de Fotos */}
                  {tiktokModalTab === 'photos' && (
                    <div className="flex items-center gap-2 pb-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTikTokImageIds(extractedTikTokProduct.images.map(img => img.id))}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-pink-500/20 text-pink-300 border border-pink-500/30 hover:bg-pink-500/30 transition-all cursor-pointer"
                      >
                        Marcar Todas ({extractedTikTokProduct.images.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTikTokImageIds([])}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                      >
                        Desmarcar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Body Content */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {/* Embedded Webview - Mantido sempre ativo no DOM, mas oculto visualmente quando fora da aba 'browser' */}
                <div className={
                  (tiktokModalTab === 'browser' || !extractedTikTokProduct)
                    ? 'space-y-2 flex-1 flex flex-col'
                    : 'absolute -left-[99999px] top-0 w-1 h-1 pointer-events-none opacity-0 overflow-hidden'
                }>
                  <div className="flex items-center justify-between text-[11px] opacity-80">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 font-bold uppercase tracking-wider text-pink-400">
                        <Globe className="w-3.5 h-3.5" /> Navegador TikTok Shop (Sessão Isolada Segura)
                      </span>
                      {/* Navigation controls */}
                      <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            try { tiktokWebviewRef.current?.goBack(); } catch (e) {}
                          }}
                          className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors cursor-pointer"
                          title="Página Anterior"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            try { tiktokWebviewRef.current?.goForward(); } catch (e) {}
                          }}
                          className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors cursor-pointer"
                          title="Próxima Página"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            try { tiktokWebviewRef.current?.reload(); } catch (e) {}
                          }}
                          className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors cursor-pointer"
                          title="Recarregar"
                        >
                          <RefreshCcw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsWebviewExpanded(prev => !prev)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-[11px] font-bold transition-all cursor-pointer"
                      >
                        {isWebviewExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5 text-pink-400" />}
                        <span>{isWebviewExpanded ? 'Reduzir Janela' : 'Ampliar Janela para Login / Captcha'}</span>
                      </button>
                      <span className="font-mono text-[10px] opacity-60">
                        {isTikTokCaptchaDetected ? '🔒 Captcha' : '⚡ Auto-Sync ativo'}
                      </span>
                    </div>
                  </div>

                  <div className={`rounded-2xl overflow-hidden border border-white/10 bg-black/60 shadow-inner ${
                    isWebviewExpanded ? 'flex-1 min-h-[580px]' : ''
                  }`}>
                    <webview
                      ref={(el: any) => {
                        tiktokWebviewRef.current = el;
                        if (el && !el.dataset.listenerAttached) {
                          el.dataset.listenerAttached = 'true';
                          el.addEventListener('will-navigate', (e: any) => {
                            // Reset DOM-ready flag when navigation starts
                            webviewDomReadyRef.current = false;
                            if (e.url && !e.url.startsWith('http://') && !e.url.startsWith('https://')) {
                              e.preventDefault();
                            }
                          });
                          el.addEventListener('did-start-loading', () => {
                            webviewDomReadyRef.current = false;
                          });
                          el.addEventListener('new-window', (e: any) => {
                            if (e.url && !e.url.startsWith('http://') && !e.url.startsWith('https://')) {
                              e.preventDefault();
                            }
                          });
                          const triggerInstantExtraction = async () => {
                            webviewDomReadyRef.current = true;
                            // Small delay to let the page fully settle before injecting script
                            await new Promise(r => setTimeout(r, 600));
                            // Bail out if page navigated away after the delay
                            if (!webviewDomReadyRef.current) return;
                            try {
                              // Don't run on captcha/security check pages
                              let currentUrl = '';
                              try { currentUrl = el.getURL ? el.getURL() : ''; } catch (e) {}
                              if (
                                currentUrl.includes('security') || 
                                currentUrl.includes('captcha') ||
                                currentUrl.includes('/login') ||
                                currentUrl.includes('/auth') ||
                                currentUrl.includes('/passport')
                              ) return;
                              const res = await el.executeJavaScript(TIKTOK_PDP_SCRAPER_SCRIPT);
                              if (res && res.status === 'success' && res.images && res.images.length > 0) {
                                setExtractedTikTokProduct(res);
                                setSelectedTikTokImageIds(res.images.map((img: any) => img.id));
                                if (res.reviews?.comments && res.reviews.comments.length > 0) {
                                  setSelectedTikTokCommentIds(res.reviews.comments.map((c: any) => c.id));
                                }
                                setIsExtractingTikTok(false);
                                setTiktokModalTab('photos');
                                const revCount = res.reviews?.comments?.length || 0;
                                const revTxt = revCount > 0 ? ` e ${revCount} avaliações` : '';
                                setTiktokExtractionStatus(`✅ Extração concluída! ${res.images.length} fotos${revTxt} encontradas.`);
                              } else if (res && res.status === 'captcha') {
                                setIsTikTokCaptchaDetected(true);
                                setTiktokModalTab('browser');
                                setTiktokExtractionStatus('Verificação visual do TikTok detectada. Por favor, deslize o quebra-cabeça abaixo para continuar.');
                              }
                            } catch (err) {}
                          };
                          el.addEventListener('dom-ready', triggerInstantExtraction);
                          el.addEventListener('did-finish-load', () => {
                            webviewDomReadyRef.current = true;
                            triggerInstantExtraction();
                          });
                          el.addEventListener('did-fail-load', (e: any) => {
                            webviewDomReadyRef.current = false;
                            if (e.errorCode !== -3) {
                              setIsExtractingTikTok(false);
                              setTiktokExtractionStatus(`⚠️ Falha ao carregar página: ${e.errorDescription || 'Erro de rede ou URL'}`);
                            }
                          });
                        }
                      }}
                      src={activeTikTokUrl}
                      useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
                      partition="persist:tiktok_shop"
                      className={`w-full transition-all duration-300 ${
                        isWebviewExpanded 
                          ? 'h-[72vh] min-h-[580px]' 
                          : (isTikTokCaptchaDetected ? 'h-[540px]' : 'h-[500px]')
                      }`}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* ABA 1: FOTOS DO PRODUTO (Destaque Principal) */}
                {extractedTikTokProduct && tiktokModalTab === 'photos' && (
                  <div className="space-y-4">
                    {/* Header explicativo com contadores e instrução clara */}
                    <div 
                      className="p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm"
                      style={{
                        backgroundColor: themeMode === 'dark' ? 'rgba(236, 72, 153, 0.06)' : 'rgba(236, 72, 153, 0.03)',
                        borderColor: themeMode === 'dark' ? 'rgba(236, 72, 153, 0.25)' : 'rgba(236, 72, 153, 0.25)'
                      }}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-pink-400 flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5" /> Galeria Oficial do Produto
                          </span>
                          <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Alta Resolução Original
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold leading-snug">
                          {extractedTikTokProduct.title || 'Produto TikTok Shop'}
                        </h4>
                        <p className="text-xs opacity-70">
                          Clique nas fotos para marcar ou desmarcar. Somente as fotos selecionadas serão incluídas no arquivo .ZIP e adicionadas ao projeto.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-pink-500/20 text-pink-300 border border-pink-500/30">
                          {selectedTikTokImageIds.length} de {extractedTikTokProduct.images.length} selecionadas
                        </span>
                      </div>
                    </div>

                    {/* Grade de Imagens em Destaque */}
                    {extractedTikTokProduct.images.length === 0 ? (
                      <div className="p-12 text-center border border-dashed rounded-2xl border-white/10 opacity-60 text-xs">
                        Nenhuma foto de produto foi encontrada nesta página. Use a aba "Navegador" para verificar a página do produto.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 max-h-[58vh] overflow-y-auto p-1 pr-2">
                        {extractedTikTokProduct.images.map((imgItem, idx) => {
                          const isSelected = selectedTikTokImageIds.includes(imgItem.id);
                          return (
                            <div
                              key={imgItem.id}
                              onClick={() => {
                                setSelectedTikTokImageIds(prev =>
                                  prev.includes(imgItem.id)
                                    ? prev.filter(id => id !== imgItem.id)
                                    : [...prev, imgItem.id]
                                );
                              }}
                              className={`group relative aspect-square rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-200 select-none ${
                                isSelected 
                                  ? 'border-pink-500 ring-2 ring-pink-500/30 shadow-lg shadow-pink-500/25 scale-[0.98]' 
                                  : 'border-white/10 hover:border-white/30 opacity-60 hover:opacity-100 hover:scale-[1.01]'
                              }`}
                            >
                              <img 
                                src={imgItem.url} 
                                alt={`Foto ${idx + 1}`} 
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  if (!target.dataset.triedFallback) {
                                    target.dataset.triedFallback = '1';
                                    if (imgItem.fallbackUrl && imgItem.fallbackUrl !== target.src) {
                                      target.src = imgItem.fallbackUrl;
                                    }
                                  }
                                }}
                                className="w-full h-full object-cover select-none pointer-events-none"
                                loading="lazy"
                              />

                              {/* Checkbox badge */}
                              <div className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                                isSelected 
                                  ? 'bg-pink-600 text-white shadow-md shadow-pink-600/50 scale-105' 
                                  : 'bg-black/60 text-white/40 border border-white/30 group-hover:border-white/60'
                              }`}>
                                {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
                              </div>

                              {/* Tag com índice */}
                              <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded-md text-[10px] font-mono text-white/90">
                                #{idx + 1}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ABA 2: AVALIAÇÕES E COMENTÁRIOS */}
                {extractedTikTokProduct && tiktokModalTab === 'reviews' && (
                  <div 
                    className="p-5 rounded-2xl border space-y-4"
                    style={{
                      backgroundColor: themeMode === 'dark' ? 'rgba(168, 85, 247, 0.06)' : 'rgba(168, 85, 247, 0.04)',
                      borderColor: themeMode === 'dark' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(168, 85, 247, 0.25)'
                    }}
                  >
                    {/* Cabeçalho da Seção de Avaliações */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs uppercase font-bold tracking-wider text-purple-400 flex items-center gap-1.5">
                          <MessageSquareQuote className="w-4 h-4" /> Avaliações & Depoimentos de Clientes
                        </span>
                        {extractedTikTokProduct.reviews?.rating && (
                          <span className="text-[11px] bg-amber-500/20 text-amber-300 font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-300" /> {extractedTikTokProduct.reviews.rating}
                          </span>
                        )}
                        {extractedTikTokProduct.reviews?.totalReviews && (
                          <span className="text-[11px] bg-white/5 text-white/70 font-mono px-2.5 py-0.5 rounded-full">
                            ({extractedTikTokProduct.reviews.totalReviews} avaliações no TikTok)
                          </span>
                        )}
                      </div>

                      {/* Toggle master: Incluir no roteiro de IA */}
                      <label className="flex items-center gap-2.5 cursor-pointer select-none bg-purple-500/15 border border-purple-500/30 px-3 py-1.5 rounded-xl flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={includeTikTokReviews}
                          onChange={(e) => setIncludeTikTokReviews(e.target.checked)}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-white/5 border-white/20 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-purple-200">
                          Incluir no Roteiro de IA (Social Proof)
                        </span>
                      </label>
                    </div>

                    {/* Barra de Controle de Paginação Automática (Meta de 10 a 30+ avaliações) */}
                    <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/20 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-purple-300">Meta de Coleta:</span>
                          <div className="flex items-center gap-1.5">
                            {[10, 20, 30, 50].map((count) => (
                              <button
                                key={count}
                                type="button"
                                onClick={() => setReviewsTargetCount(count)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  reviewsTargetCount === count
                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                {count}{count === 30 ? ' ★' : ''}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isPaginatingReviews ? (
                            <button
                              type="button"
                              onClick={handleStopPagination}
                              className="px-3.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Square className="w-3.5 h-3.5 fill-current" /> Parar Coleta ({extractedTikTokProduct.reviews?.comments?.length || 0})
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePaginateReviews(reviewsTargetCount)}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-600/20 active:scale-95"
                            >
                              <Zap className="w-3.5 h-3.5 fill-current" /> Coletar {reviewsTargetCount} Avaliações (Paginar)
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Status / Progresso em tempo real */}
                      {(isPaginatingReviews || reviewPaginationStatus) && (
                        <div className="space-y-1.5 pt-1 border-t border-purple-500/15">
                          <div className="flex items-center justify-between text-[11px] text-purple-200">
                            <span className="flex items-center gap-1.5">
                              {isPaginatingReviews && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />}
                              {reviewPaginationStatus}
                            </span>
                            {extractedTikTokProduct.reviews?.comments && (
                              <span className="font-mono text-purple-300 font-bold">
                                {extractedTikTokProduct.reviews.comments.length} / {reviewsTargetCount}
                              </span>
                            )}
                          </div>
                          {isPaginatingReviews && (
                            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(100, Math.max(5, ((extractedTikTokProduct.reviews?.comments?.length || 0) / reviewsTargetCount) * 100))}%`
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Feedback Tags / Elogios mais citados */}
                    {extractedTikTokProduct.reviews?.tags && extractedTikTokProduct.reviews.tags.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300/80">
                          Destaques mais elogiados pelos compradores:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {extractedTikTokProduct.reviews.tags.map((tag, tIdx) => (
                            <span key={tIdx} className="text-xs bg-purple-500/15 border border-purple-500/30 text-purple-300 px-2.5 py-1 rounded-lg">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lista de Comentários de Clientes */}
                    {extractedTikTokProduct.reviews?.comments && extractedTikTokProduct.reviews.comments.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs opacity-80 flex-wrap gap-2">
                          <span className="font-medium text-purple-200">
                            {extractedTikTokProduct.reviews.comments.length} avaliações coletadas ({selectedTikTokCommentIds.length} selecionadas):
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <button
                              type="button"
                              onClick={() => setSelectedTikTokCommentIds(extractedTikTokProduct.reviews!.comments.map(c => c.id))}
                              className="text-purple-300 hover:text-purple-200 hover:underline cursor-pointer font-bold"
                            >
                              Todas
                            </button>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => {
                                const ids = extractedTikTokProduct.reviews!.comments.slice(0, 10).map(c => c.id);
                                setSelectedTikTokCommentIds(ids);
                              }}
                              className="text-purple-300 hover:text-purple-200 hover:underline cursor-pointer font-bold"
                            >
                              Top 10
                            </button>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => {
                                const ids = extractedTikTokProduct.reviews!.comments.slice(0, 20).map(c => c.id);
                                setSelectedTikTokCommentIds(ids);
                              }}
                              className="text-purple-300 hover:text-purple-200 hover:underline cursor-pointer font-bold"
                            >
                              Top 20
                            </button>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => {
                                const ids = extractedTikTokProduct.reviews!.comments.slice(0, 30).map(c => c.id);
                                setSelectedTikTokCommentIds(ids);
                              }}
                              className="text-purple-300 hover:text-purple-200 hover:underline cursor-pointer font-bold"
                            >
                              Top 30
                            </button>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => setSelectedTikTokCommentIds([])}
                              className="text-white/50 hover:underline cursor-pointer"
                            >
                              Desmarcar
                            </button>
                          </div>
                        </div>

                        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                          {extractedTikTokProduct.reviews.comments.map((comm) => {
                            const isSelected = selectedTikTokCommentIds.includes(comm.id);
                            return (
                              <div
                                key={comm.id}
                                onClick={() => {
                                  if (!includeTikTokReviews) return;
                                  setSelectedTikTokCommentIds(prev => 
                                    prev.includes(comm.id) ? prev.filter(id => id !== comm.id) : [...prev, comm.id]
                                  );
                                }}
                                className={`p-3 rounded-xl border text-xs flex items-start gap-3 transition-all cursor-pointer ${
                                  !includeTikTokReviews
                                    ? 'opacity-40 bg-white/5 border-white/5'
                                    : isSelected
                                      ? 'bg-purple-500/15 border-purple-500/35 text-purple-100 shadow-sm'
                                      : 'bg-white/5 border-white/5 opacity-70 hover:opacity-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  disabled={!includeTikTokReviews}
                                  checked={includeTikTokReviews && isSelected}
                                  onChange={() => {}} 
                                  className="mt-0.5 rounded text-purple-600 bg-white/10 border-white/20 cursor-pointer pointer-events-none"
                                />
                                <div className="flex-1 space-y-1.5">
                                  {/* Estrelas */}
                                  <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, sIdx) => (
                                      <Star key={sIdx} className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                                    ))}
                                  </div>

                                  {/* Texto limpo da avaliação */}
                                  <p className="leading-relaxed font-normal text-white/95">
                                    "{comm.text}"
                                  </p>

                                  {/* Badges de Variante, Data e Autor */}
                                  <div className="flex items-center gap-2 flex-wrap pt-0.5 text-[10px]">
                                    {comm.variant && (
                                      <span className="bg-purple-500/20 text-purple-200 border border-purple-500/30 px-2 py-0.5 rounded font-mono">
                                        🏷️ {comm.variant}
                                      </span>
                                    )}
                                    {comm.date && (
                                      <span className="text-white/40 font-mono">
                                        📅 {comm.date}
                                      </span>
                                    )}
                                    {comm.author && (
                                      <span className="text-white/50 font-mono">
                                        — {comm.author}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs opacity-90">
                        <div className="space-y-1 text-center sm:text-left">
                          <p className="font-bold text-purple-200">
                            💡 O TikTok Shop exibe apenas 3 avaliações por tela.
                          </p>
                          <p className="text-white/60 text-[11px]">
                            Clique no botão ao lado para navegar automaticamente pelas páginas e extrair de 10 a 30+ avaliações reais.
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isPaginatingReviews}
                          onClick={() => handlePaginateReviews(reviewsTargetCount)}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0 shadow-lg shadow-purple-600/20"
                        >
                          <Zap className="w-4 h-4 fill-current" /> Iniciar Paginação (Meta: {reviewsTargetCount})
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ABA 3: DETALHES DO PRODUTO */}
                {extractedTikTokProduct && tiktokModalTab === 'details' && (
                  <div 
                    className="p-5 rounded-2xl border space-y-4"
                    style={{
                      backgroundColor: themeMode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-pink-400 flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5" /> Detalhes do Produto
                        </span>
                        <h4 className="text-base font-bold leading-snug">
                          {extractedTikTokProduct.title || 'Produto TikTok Shop'}
                        </h4>
                      </div>
                      {extractedTikTokProduct.price && (
                        <span className="px-3.5 py-1.5 rounded-xl bg-pink-500/20 border border-pink-500/30 text-pink-400 font-mono font-bold text-sm flex-shrink-0">
                          {extractedTikTokProduct.price}
                        </span>
                      )}
                    </div>

                    {extractedTikTokProduct.description ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                            Especificações Técnicas, Medidas & Descrição:
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(extractedTikTokProduct.description);
                              setCopiedProductDescription(true);
                              setTimeout(() => setCopiedProductDescription(false), 2000);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            {copiedProductDescription ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedProductDescription ? 'Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>
                        <div className="text-xs opacity-90 bg-black/40 p-4 rounded-xl border border-white/5 max-h-72 overflow-y-auto leading-relaxed whitespace-pre-line font-mono select-text">
                          {extractedTikTokProduct.description}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs opacity-50 italic">Nenhuma descrição em texto encontrada no produto.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div 
                className="px-6 py-4 border-t flex items-center justify-between flex-shrink-0 bg-black/20"
                style={{ borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (isQueueRunning) handleCancelQueue();
                      if (isExtractingTikTok) handleCancelSingleImport();
                      if (!isImportingTikTokImages && !isDownloadingZip) setIsTikTokModalOpen(false);
                    }}
                    disabled={isImportingTikTokImages || isDownloadingZip}
                    className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/10 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  {isImportingTikTokImages && tiktokImportProgress && (
                    <span className="text-xs text-pink-300 font-mono animate-pulse flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-400" />
                      {tiktokImportProgress}
                    </span>
                  )}
                  {isDownloadingZip && zipDownloadProgress && (
                    <span className="text-xs text-purple-300 font-mono animate-pulse flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                      {zipDownloadProgress}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Botão Baixar ZIP */}
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    disabled={!extractedTikTokProduct || selectedTikTokImageIds.length === 0 || isDownloadingZip || isImportingTikTokImages}
                    className="px-5 py-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-200 hover:text-white disabled:opacity-40 disabled:pointer-events-none font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    title={selectedTikTokImageIds.length === 0 ? "Selecione pelo menos uma foto para baixar no arquivo .ZIP" : `Baixar as ${selectedTikTokImageIds.length} fotos selecionadas em arquivo .ZIP`}
                  >
                    {isDownloadingZip ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-purple-300" />
                        <span>Baixando ZIP...</span>
                      </>
                    ) : (
                      <>
                        <Archive className="w-4 h-4 text-purple-300" />
                        <span>
                          {selectedTikTokImageIds.length > 0 
                            ? `Baixar ZIP (${selectedTikTokImageIds.length} Fotos)` 
                            : 'Baixar ZIP (Selecione Fotos)'}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Botão Importar para o Projeto */}
                  <button
                    onClick={handleApplyTikTokProduct}
                    disabled={!extractedTikTokProduct || selectedTikTokImageIds.length === 0 || isImportingTikTokImages || isDownloadingZip}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs shadow-lg shadow-pink-600/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
                    title={selectedTikTokImageIds.length === 0 ? "Selecione pelo menos uma foto para importar para o projeto" : `Importar as ${selectedTikTokImageIds.length} fotos selecionadas e dados do produto`}
                  >
                    {isImportingTikTokImages ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Baixando Fotos...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>
                          {selectedTikTokImageIds.length > 0 
                            ? `Importar ${selectedTikTokImageIds.length} Fotos & Detalhes` 
                            : 'Importar Fotos & Detalhes'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Crop Modal */}
      <AnimatePresence>
        {imageToCrop && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="crop-modal-overlay fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col"
          >
            <div className="crop-modal-header flex items-center justify-between p-6 border-b border-white/10 bg-[#0f1219]">
              <div>
                <h3 className="text-xl font-bold font-display flex items-center gap-2">
                  <Crop className="w-5 h-5 text-orange-500" />
                  Editor de Corte Interativo
                </h3>
                <p className="text-xs mt-0.5 opacity-85">
                  Arraste as bordas e cantos para ajustar. Pressione <kbd className="px-1.5 py-0.5 rounded font-mono text-[10px]">ENTER</kbd> para confirmar ou <kbd className="px-1.5 py-0.5 rounded font-mono text-[10px]">ESC</kbd> para cancelar.
                </p>
              </div>
              <button 
                onClick={() => { setImageToCrop(null); setCrop(undefined); setCompletedCrop(null); }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 relative bg-black/40 flex items-center justify-center p-6 overflow-auto">
              <div className="relative max-h-[60vh] flex items-center justify-center">
                <ReactCrop
                  crop={crop}
                  onChange={(c, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={cropAspect}
                  className="max-h-[60vh] select-none"
                >
                  <img
                    ref={imgRef}
                    src={imageToCrop.preview}
                    alt="Preview para corte"
                    onLoad={onCropperImageLoad}
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: 'center center',
                      maxHeight: '60vh',
                      objectFit: 'contain',
                      transition: 'transform 0.1s ease-out'
                    }}
                  />
                </ReactCrop>
              </div>
            </div>

            <div className="crop-modal-footer p-6 space-y-5 border-t border-white/10 bg-[#0f1219]">
              <div className="max-w-2xl mx-auto space-y-4">
                {/* Presets de Proporção e Ações Rápidas */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Modo & Proporção</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSelectAll}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all border border-white/10"
                        title="Selecionar imagem inteira"
                      >
                        🔳 Selecionar Tudo
                      </button>
                      <button
                        onClick={handleCenterCrop}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all border border-white/10"
                        title="Centralizar seleção"
                      >
                        🎯 Centralizar
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-6 bg-white/5 p-1 rounded-2xl border border-white/10 gap-1">
                    {[
                      { label: 'Livre', value: undefined },
                      { label: '9:16', value: 9/16 },
                      { label: '16:9', value: 16/9 },
                      { label: '1:1', value: 1 },
                      { label: '4:5', value: 4/5 },
                      { label: '3:4', value: 3/4 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => handleAspectChange(preset.value)}
                        className={`h-9 px-1 rounded-xl text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center text-center min-w-0 ${
                          cropAspect === preset.value
                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                            : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                        }`}
                      >
                        <span className="truncate">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Controle de Zoom */}
                <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-xs font-bold text-white/40 uppercase tracking-widest min-w-[50px]">Zoom</span>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={2.5}
                    step={0.05}
                    aria-label="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-orange-500"
                  />
                  <span className="text-xs font-mono font-bold text-orange-400 w-10 text-right">
                    {zoom.toFixed(2)}x
                  </span>
                </div>
                
                <div className="flex gap-4 pt-1">
                  <button
                    onClick={() => { setImageToCrop(null); setCrop(undefined); setCompletedCrop(null); }}
                    className="flex-1 py-3.5 bg-white/5 border border-white/10 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-all text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveCrop}
                    disabled={isCropping}
                    className="flex-1 py-3.5 bg-orange-500 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-orange-600 transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] disabled:opacity-50 text-white flex items-center justify-center gap-2"
                  >
                    {isCropping ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : 'Salvar Corte (Enter ↵)'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Validation Alert Dialog */}
      <AnimatePresence>
        {validationAlert && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setValidationAlert(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              style={{
                backgroundColor: themeMode === 'dark' ? '#161618' : '#ffffff',
                borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
              }}
              className="relative border rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl text-center space-y-6 overflow-hidden"
            >
              {/* Top Accent Gradient Line */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 to-orange-600" />
              
              {/* Alert Icon */}
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                <AlertTriangle className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <h3 
                  style={{ color: themeMode === 'dark' ? '#ffffff' : '#0f172a' }}
                  className="text-2xl font-bold font-display tracking-tight"
                >
                  {validationAlert.title}
                </h3>
                <p 
                  style={{ color: themeMode === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.7)' }}
                  className="text-sm leading-relaxed"
                >
                  {validationAlert.message}
                </p>
              </div>
              
              <button
                onClick={() => setValidationAlert(null)}
                className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] transition-all text-white font-bold text-sm tracking-wide uppercase shadow-[0_0_20px_rgba(249,115,22,0.25)]"
              >
                {validationAlert.buttonText || "Entendi"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Histórico de Versões */}
      <AnimatePresence>
        {showChangelog && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ backgroundColor: themeMode === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.25)' }}
              className="absolute inset-0 backdrop-blur-sm"
              onClick={() => setShowChangelog(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{ backgroundColor: themeMode === 'dark' ? '#111113' : '#ffffff', borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e4e4e7', color: themeMode === 'dark' ? '#fafafa' : '#18181b' }}
              className="relative z-10 w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f4f4f5' }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl border" style={{ backgroundColor: themeMode === 'dark' ? 'rgba(249,115,22,0.1)' : '#fff7ed', borderColor: themeMode === 'dark' ? 'rgba(249,115,22,0.2)' : '#fdba74' }}>
                    <History className="w-5 h-5" style={{ color: '#f97316' }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: themeMode === 'dark' ? '#ffffff' : '#18181b' }}>Histórico de Versões</h2>
                    <p className="text-xs" style={{ color: themeMode === 'dark' ? 'rgba(255,255,255,0.4)' : '#a1a1aa' }}>Gerador TikTok Shop</p>
                  </div>
                </div>
                <button onClick={() => setShowChangelog(false)} className="p-2 rounded-xl transition-colors text-lg" style={{ color: themeMode === 'dark' ? 'rgba(255,255,255,0.4)' : '#a1a1aa' }}>✕</button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                {VERSION_HISTORY.map((entry, idx) => (
                  <div key={entry.version} className="relative">
                    {idx < VERSION_HISTORY.length - 1 && (<div className="absolute left-[11px] top-[32px] bottom-[-24px] w-px" style={{ backgroundColor: themeMode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e4e4e7' }} />)}
                    <div className="flex items-start gap-4">
                      <div className="mt-1.5 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: idx === 0 ? '#f97316' : (themeMode === 'dark' ? 'rgba(255,255,255,0.2)' : '#d4d4d8'), backgroundColor: idx === 0 ? 'rgba(249,115,22,0.2)' : (themeMode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f4f4f5') }}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: idx === 0 ? '#fb923c' : (themeMode === 'dark' ? 'rgba(255,255,255,0.3)' : '#a1a1aa') }} />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-sm font-bold px-2.5 py-0.5 rounded-full border" style={{ backgroundColor: idx === 0 ? 'rgba(249,115,22,0.1)' : (themeMode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f4f4f5'), borderColor: idx === 0 ? 'rgba(249,115,22,0.3)' : (themeMode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e4e4e7'), color: idx === 0 ? '#f97316' : (themeMode === 'dark' ? 'rgba(255,255,255,0.6)' : '#71717a') }}>v{entry.version}</span>
                          <span className="text-xs" style={{ color: themeMode === 'dark' ? 'rgba(255,255,255,0.3)' : '#a1a1aa' }}>{entry.date}</span>
                          {idx === 0 && (<span className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider" style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', color: '#10b981' }}>Atual</span>)}
                        </div>
                        <h3 className="text-base font-semibold" style={{ color: idx === 0 ? (themeMode === 'dark' ? '#ffffff' : '#18181b') : (themeMode === 'dark' ? 'rgba(255,255,255,0.6)' : '#71717a') }}>{entry.title}</h3>
                        <ul className="space-y-1.5">
                          {entry.changes.map((change, ci) => (
                            <li key={ci} className="flex items-start gap-2 text-sm" style={{ color: themeMode === 'dark' ? 'rgba(255,255,255,0.5)' : '#52525b' }}>
                              <span className="mt-1 shrink-0" style={{ color: change.startsWith('Novo:') ? '#10b981' : change.startsWith('Fix:') ? '#f59e0b' : (themeMode === 'dark' ? 'rgba(255,255,255,0.3)' : '#a1a1aa') }}>{change.startsWith('Novo:') ? '✦' : change.startsWith('Fix:') ? '🔧' : '•'}</span>
                              <span>{change}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-6 py-3 border-t flex items-center justify-between" style={{ borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f4f4f5' }}>
                <span className="text-xs" style={{ color: themeMode === 'dark' ? 'rgba(255,255,255,0.2)' : '#a1a1aa' }}>{VERSION_HISTORY.length} versões</span>
                <button onClick={() => setShowChangelog(false)} className="px-4 py-2 rounded-xl border text-sm font-medium transition-colors" style={{ backgroundColor: themeMode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f4f4f5', borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e4e4e7', color: themeMode === 'dark' ? 'rgba(255,255,255,0.6)' : '#52525b' }}>Fechar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sidebar: Fila de Produção */}
      <AnimatePresence>
        {showQueue && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQueue(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            {/* Sidebar Container */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-80 z-50 bg-zinc-950 border-r border-white/10 p-6 flex flex-col justify-between"
            >
              <div className="space-y-6 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-orange-500" />
                    <h2 className="text-lg font-bold font-display text-white">Fila de Produção</h2>
                  </div>
                  <button 
                    onClick={() => setShowQueue(false)}
                    className="p-1.5 hover:bg-white/5 rounded-xl transition-colors text-white/45 hover:text-white"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={createNewProject}
                  className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-orange-600 transition-all shadow-[0_0_15px_rgba(249,115,22,0.2)] flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Adicionar Produto
                </button>

                <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
                  {projects.length === 0 ? (
                    <div className="text-center py-12 text-white/20 text-xs">
                      Nenhum produto cadastrado na fila.
                    </div>
                  ) : (
                    projects.map((proj) => (
                      <div 
                        key={proj.id}
                        onClick={() => loadProject(proj)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          activeProjectId === proj.id
                            ? 'bg-orange-500/10 border-orange-500/40 text-white'
                            : 'bg-white/[0.02] border-white/5 hover:border-white/10 text-white/60 hover:text-white'
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-bold text-xs truncate">{proj.name}</p>
                          <p className="text-[9px] text-white/30 uppercase font-bold tracking-wider mt-0.5">
                            {proj.type === 'collection' ? 'Coleção' : 'Produto'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            proj.status === 'done'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {proj.status === 'done' ? 'Salvo' : 'Pendente'}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeProject(proj.id); }}
                            className="p-1 hover:bg-white/5 rounded-lg text-white/30 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {projects.length > 0 && (
                <div className="border-t border-white/10 pt-4 mt-4 space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-white/40 uppercase tracking-wider font-bold">
                    <span>Total da fila</span>
                    <span>{projects.length} produtos</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-white/40 uppercase tracking-wider font-bold">
                    <span>Próximo índice</span>
                    <span className="font-mono text-orange-400">produto{projectCounter}</span>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Modal Alerta Chaves Esgotadas */}
      {isKeysExhaustedAlertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div 
            style={{
              backgroundColor: themeMode === 'dark' ? '#18181b' : '#ffffff',
              borderColor: themeMode === 'dark' ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)'
            }}
            className="border rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-5"
          >
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mx-auto flex items-center justify-center text-3xl">
              ⚠️
            </div>
            <div className="space-y-2">
              <h3 
                style={{ color: themeMode === 'dark' ? '#ffffff' : '#0f172a' }}
                className="text-base font-bold font-display"
              >
                Chaves de API Esgotadas!
              </h3>
              <p 
                style={{ color: themeMode === 'dark' ? '#a1a1aa' : '#4b5563' }}
                className="text-xs leading-relaxed"
              >
                Todas as chaves de API cadastradas falharam ou expiraram durante o processamento da fila. 
                Carregue novas chaves do Gemini válidas para prosseguir.
              </p>
            </div>
            <button
              onClick={() => setIsKeysExhaustedAlertOpen(false)}
              className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-red-600/10"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
      {/* Modal de Configurações & Central de Provedores de I.A */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden"
              style={{
                backgroundColor: themeMode === 'light' ? '#ffffff' : '#141416',
                borderColor: themeMode === 'light' ? '#e4e4e7' : '#27272a',
                color: themeMode === 'light' ? '#0f172a' : '#ffffff'
              }}
            >
              {/* Cabeçalho do Modal */}
              <div 
                className="flex items-center justify-between px-6 py-5 border-b"
                style={{ borderColor: themeMode === 'light' ? '#e4e4e7' : '#27272a' }}
              >
                <div className="flex items-center gap-3.5">
                  <div 
                    className="p-3 rounded-2xl border flex items-center justify-center"
                    style={{
                      backgroundColor: themeMode === 'light' ? 'rgba(249,115,22,0.1)' : 'rgba(249,115,22,0.15)',
                      borderColor: themeMode === 'light' ? 'rgba(249,115,22,0.2)' : 'rgba(249,115,22,0.3)',
                      color: '#ea580c'
                    }}
                  >
                    <Cpu className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 
                        className="font-bold text-lg font-display"
                        style={{ color: themeMode === 'light' ? '#0f172a' : '#ffffff' }}
                      >
                        Central de I.As & Provedores
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        Visão Multimodal Free
                      </span>
                    </div>
                    <p 
                      className="text-xs"
                      style={{ color: themeMode === 'light' ? '#71717a' : '#a1a1aa' }}
                    >
                      Configure modelos de visão computacional gratuitos (Gemini, Groq, OpenRouter) e failover automático.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-2 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ color: themeMode === 'light' ? '#71717a' : '#a1a1aa' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Barra de Sub-Abas do Modal */}
              <div 
                className="flex items-center gap-2 px-6 py-3 border-b overflow-x-auto"
                style={{ 
                  backgroundColor: themeMode === 'light' ? '#fafafa' : '#0d0d0f',
                  borderColor: themeMode === 'light' ? '#e4e4e7' : '#27272a' 
                }}
              >
                <button
                  onClick={() => { setProviderTab('gemini'); setTestFeedback(null); }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    providerTab === 'gemini'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Google Gemini
                  {activeAIProvider === 'gemini' && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-extrabold uppercase">Ativo</span>
                  )}
                </button>

                <button
                  onClick={() => { setProviderTab('groq'); setTestFeedback(null); }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    providerTab === 'groq'
                      ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-orange-400" />
                  Groq Cloud (LPU)
                  {activeAIProvider === 'groq' && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 font-extrabold uppercase">Ativo</span>
                  )}
                </button>

                <button
                  onClick={() => { setProviderTab('openrouter'); setTestFeedback(null); }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    providerTab === 'openrouter'
                      ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  OpenRouter Free
                  {activeAIProvider === 'openrouter' && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-extrabold uppercase">Ativo</span>
                  )}
                </button>

                <button
                  onClick={() => { setProviderTab('general'); setTestFeedback(null); }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    providerTab === 'general'
                      ? 'bg-zinc-500/20 text-zinc-200 border border-zinc-500/30 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                  }`}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  Geral & Failover
                </button>
              </div>

              {/* Corpo com Scroll */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
                {/* ABA 1: GEMINI */}
                {providerTab === 'gemini' && (
                  <div className="space-y-5">
                    {/* Status & Ativação */}
                    <div className="p-4 rounded-2xl border flex items-center justify-between"
                      style={{
                        backgroundColor: themeMode === 'light' ? '#f4f4f5' : '#18181b',
                        borderColor: activeAIProvider === 'gemini' ? '#10b981' : (themeMode === 'light' ? '#e4e4e7' : '#27272a')
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm">Google Gemini Flash</h4>
                            {activeAIProvider === 'gemini' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Provedor Ativo
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-400">Provedor Inativo</span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            Motor oficial do Google com alta precisão e visão multimodal de produtos e modelos.
                          </p>
                        </div>
                      </div>
                      {activeAIProvider !== 'gemini' && (
                        <button
                          onClick={() => handleSelectActiveProvider('gemini')}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                        >
                          Tornar Ativo
                        </button>
                      )}
                    </div>

                    {/* Seleção de Modelo Vision Gemini */}
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                        Modelo Gemini Selecionado (Visão Computacional)
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {GEMINI_MODELS.map((m) => {
                          const isSelected = geminiModel === m.id;
                          return (
                            <div
                              key={m.id}
                              onClick={() => handleSaveGeminiModel(m.id)}
                              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                                  : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-bold text-xs text-white flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                                  {m.name}
                                </span>
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">
                                  GRÁTIS
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-400 leading-snug">
                                {m.desc}
                              </p>
                              <div className="mt-2 text-[10px] text-emerald-400/90 font-mono font-semibold">
                                {m.tag}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Chaves Gemini (Entrada Direta e Lote .txt) */}
                    <div className="p-4 rounded-2xl border space-y-4"
                      style={{
                        backgroundColor: themeMode === 'light' ? '#f4f4f5' : '#09090b',
                        borderColor: themeMode === 'light' ? '#e4e4e7' : '#27272a'
                      }}
                    >
                      {/* Entrada Direta de Chave Única */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                            <Key className="w-4 h-4 text-emerald-400" />
                            Chave de API Google Gemini (AIzaSy...)
                          </label>
                          {(geminiApiKeyInput || apiKeys.length > 0) && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              {apiKeys.length > 1 ? `${apiKeys.length} Chaves Ativas (Rotação)` : 'Chave Configurada'}
                            </span>
                          )}
                        </div>

                        <div className="relative">
                          <input
                            type={showGeminiKey ? 'text' : 'password'}
                            placeholder="Cole sua chave AIzaSy..."
                            value={geminiApiKeyInput}
                            onChange={(e) => handleSaveGeminiSingleKey(e.target.value)}
                            className="w-full px-4 py-2.5 pr-20 bg-zinc-900 border border-zinc-700 rounded-xl text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setShowGeminiKey(!showGeminiKey)}
                              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                              title={showGeminiKey ? 'Ocultar' : 'Exibir'}
                            >
                              {showGeminiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            {geminiApiKeyInput && (
                              <button
                                type="button"
                                onClick={() => handleSaveGeminiSingleKey('')}
                                className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-zinc-800 transition-colors"
                                title="Limpar chave"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-0.5">
                          <span className="text-zinc-400">
                            Cota gratuita oficial para Gemini Flash e visão multimodal.
                          </span>
                          <a 
                            href="https://aistudio.google.com/apikey" 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                          >
                            Criar chave gratuita no Google AI Studio <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      {/* Divisor Suave */}
                      <div className="border-t border-zinc-800/80 pt-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                              Rotação Avançada em Lote (.txt)
                            </h4>
                            <p className="text-[11px] text-zinc-400">
                              Opcional: carregue um arquivo .txt com várias chaves para rotação automática anti-limite de cota.
                            </p>
                          </div>
                          {apiKeys.length > 1 && (
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              {apiKeys.length} em rotação
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => keysFileInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-zinc-700 hover:border-zinc-600"
                          >
                            <Upload className="w-4 h-4 text-emerald-400" />
                            {apiKeys.length > 1 ? 'Substituir Lote de Chaves (.txt)' : 'Carregar Lote de Chaves (.txt)'}
                          </button>
                          {apiKeys.length > 0 && (
                            <button
                              onClick={() => {
                                setGeminiApiKeyInput('');
                                setApiKeys([]);
                                aiProvidersManager.setGeminiKeys([]);
                              }}
                              className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl transition-all"
                              title="Remover todas as chaves"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Teste de Conexão Gemini */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleTestConnection('gemini')}
                        disabled={isTestingProvider !== null}
                        className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition-all border border-zinc-700 disabled:opacity-50"
                      >
                        {isTestingProvider === 'gemini' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                            Testando Conexão & Visão...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 text-emerald-400" />
                            Testar Conexão e Análise Visual
                          </>
                        )}
                      </button>
                    </div>

                    {/* Feedback do Teste */}
                    {testFeedback && testFeedback.provider === 'gemini' && (
                      <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2.5 ${
                        testFeedback.success
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-red-500/10 border-red-500/30 text-red-300'
                      }`}>
                        {testFeedback.success ? <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400" /> : <AlertCircle className="w-4 h-4 mt-0.5 text-red-400" />}
                        <div className="flex-1">{testFeedback.message}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* ABA 2: GROQ CLOUD */}
                {providerTab === 'groq' && (
                  <div className="space-y-5">
                    {/* Status & Ativação */}
                    <div className="p-4 rounded-2xl border flex items-center justify-between"
                      style={{
                        backgroundColor: themeMode === 'light' ? '#f4f4f5' : '#18181b',
                        borderColor: activeAIProvider === 'groq' ? '#f97316' : (themeMode === 'light' ? '#e4e4e7' : '#27272a')
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                          <Zap className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm">Groq Cloud (LPU Inference)</h4>
                            {activeAIProvider === 'groq' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Provedor Ativo
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-400">Provedor Inativo</span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            Velocidade ultrarrápida via processadores LPU da Groq com modelos Meta Llama 3.2 Vision.
                          </p>
                        </div>
                      </div>
                      {activeAIProvider !== 'groq' && (
                        <button
                          onClick={() => handleSelectActiveProvider('groq')}
                          className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/20"
                        >
                          Tornar Ativo
                        </button>
                      )}
                    </div>

                    {/* Chaves Groq Cloud (Entrada Direta e Lote .txt) */}
                    <div className="p-4 rounded-2xl border space-y-4"
                      style={{
                        backgroundColor: themeMode === 'light' ? '#f4f4f5' : '#09090b',
                        borderColor: themeMode === 'light' ? '#e4e4e7' : '#27272a'
                      }}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                            <Key className="w-4 h-4 text-orange-400" />
                            Chave de API Groq Cloud (gsk_...)
                          </label>
                          {(groqApiKey || groqApiKeys.length > 0) && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
                              {groqApiKeys.length > 1 ? `${groqApiKeys.length} Chaves Ativas (Rotação)` : 'Chave Configurada'}
                            </span>
                          )}
                        </div>

                        <div className="relative">
                          <input
                            type={showGroqKey ? 'text' : 'password'}
                            placeholder="gsk_..."
                            value={groqApiKey}
                            onChange={(e) => handleSaveGroqKey(e.target.value)}
                            className="w-full px-4 py-2.5 pr-20 bg-zinc-900 border border-zinc-700 rounded-xl text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setShowGroqKey(!showGroqKey)}
                              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                              title={showGroqKey ? 'Ocultar' : 'Exibir'}
                            >
                              {showGroqKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            {groqApiKey && (
                              <button
                                type="button"
                                onClick={() => handleSaveGroqKey('')}
                                className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-zinc-800 transition-colors"
                                title="Limpar chave"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-0.5">
                          <span className="text-zinc-400">
                            Salva com segurança no navegador. Cota 100% gratuita para modelos Vision.
                          </span>
                          <a 
                            href="https://console.groq.com/keys" 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-orange-400 hover:underline flex items-center gap-1 font-semibold"
                          >
                            Criar chave no Groq Console <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      {/* Divisor Suave para Upload em Lote */}
                      <div className="border-t border-zinc-800/80 pt-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                              <RefreshCw className="w-3.5 h-3.5 text-orange-400" />
                              Rotação Avançada em Lote (.txt)
                            </h4>
                            <p className="text-[11px] text-zinc-400">
                              Opcional: carregue um arquivo .txt com várias chaves Groq para rotação automática anti-limite de cota (429).
                            </p>
                          </div>
                          {groqApiKeys.length > 1 && (
                            <span className="text-[10px] font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                              {groqApiKeys.length} em rotação
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => groqFileInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-zinc-700 hover:border-zinc-600"
                          >
                            <Upload className="w-4 h-4 text-orange-400" />
                            {groqApiKeys.length > 1 ? 'Substituir Lote de Chaves Groq (.txt)' : 'Carregar Lote de Chaves Groq (.txt)'}
                          </button>
                          {groqApiKeys.length > 0 && (
                            <button
                              onClick={() => {
                                setGroqApiKey('');
                                setGroqApiKeys([]);
                                aiProvidersManager.setGroqKeys([]);
                              }}
                              className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl transition-all"
                              title="Remover todas as chaves Groq"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Seleção de Modelo Groq */}
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-orange-400" />
                        Modelos de Alta Velocidade Groq LPU (100% Gratuitos)
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {GROQ_MODELS.map((m) => {
                          const isSelected = groqModel === m.id;
                          return (
                            <div
                              key={m.id}
                              onClick={() => handleSaveGroqModel(m.id)}
                              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-orange-500/10 border-orange-500/50 shadow-md ring-1 ring-orange-500/30'
                                  : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-bold text-xs text-white flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-orange-400' : 'bg-zinc-600'}`} />
                                  {m.name}
                                </span>
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-300">
                                  FREE LPU
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-400 leading-snug">
                                {m.desc}
                              </p>
                              <div className="mt-2 text-[10px] text-orange-400/90 font-mono font-semibold">
                                {m.tag}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Teste de Conexão Groq */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleTestConnection('groq')}
                        disabled={isTestingProvider !== null || (!groqApiKey && groqApiKeys.length === 0)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition-all border border-zinc-700 disabled:opacity-50"
                      >
                        {isTestingProvider === 'groq' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                            Testando Conexão & Visão LPU...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 text-orange-400" />
                            Testar Conexão e Análise Visual
                          </>
                        )}
                      </button>
                    </div>

                    {/* Feedback do Teste Groq */}
                    {testFeedback && testFeedback.provider === 'groq' && (
                      <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2.5 ${
                        testFeedback.success
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-red-500/10 border-red-500/30 text-red-300'
                      }`}>
                        {testFeedback.success ? <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400" /> : <AlertCircle className="w-4 h-4 mt-0.5 text-red-400" />}
                        <div className="flex-1">{testFeedback.message}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* ABA 3: OPENROUTER FREE */}
                {providerTab === 'openrouter' && (
                  <div className="space-y-5">
                    {/* Status & Ativação */}
                    <div className="p-4 rounded-2xl border flex items-center justify-between"
                      style={{
                        backgroundColor: themeMode === 'light' ? '#f4f4f5' : '#18181b',
                        borderColor: activeAIProvider === 'openrouter' ? '#a855f7' : (themeMode === 'light' ? '#e4e4e7' : '#27272a')
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          <Globe className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm">OpenRouter (Modelos de Visão Gratuitos)</h4>
                            {activeAIProvider === 'openrouter' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Provedor Ativo
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-400">Provedor Inativo</span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            Acesso a Qwen 2.5 VL 72B, Meta Llama 3.2 Vision e Google Gemma 3 sem custo de créditos.
                          </p>
                        </div>
                      </div>
                      {activeAIProvider !== 'openrouter' && (
                        <button
                          onClick={() => handleSelectActiveProvider('openrouter')}
                          className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-600/20"
                        >
                          Tornar Ativo
                        </button>
                      )}
                    </div>

                    {/* Chaves OpenRouter (Entrada Direta e Lote .txt) */}
                    <div className="p-4 rounded-2xl border space-y-4"
                      style={{
                        backgroundColor: themeMode === 'light' ? '#f4f4f5' : '#09090b',
                        borderColor: themeMode === 'light' ? '#e4e4e7' : '#27272a'
                      }}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                            <Key className="w-4 h-4 text-purple-400" />
                            Chave de API OpenRouter (sk-or-v1-...)
                          </label>
                          {(openrouterApiKey || openrouterApiKeys.length > 0) && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                              {openrouterApiKeys.length > 1 ? `${openrouterApiKeys.length} Chaves Ativas (Rotação)` : 'Chave Configurada'}
                            </span>
                          )}
                        </div>

                        <div className="relative">
                          <input
                            type={showOpenRouterKey ? 'text' : 'password'}
                            placeholder="sk-or-v1-..."
                            value={openrouterApiKey}
                            onChange={(e) => handleSaveOpenRouterKey(e.target.value)}
                            className="w-full px-4 py-2.5 pr-20 bg-zinc-900 border border-zinc-700 rounded-xl text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                              title={showOpenRouterKey ? 'Ocultar' : 'Exibir'}
                            >
                              {showOpenRouterKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            {openrouterApiKey && (
                              <button
                                type="button"
                                onClick={() => handleSaveOpenRouterKey('')}
                                className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-zinc-800 transition-colors"
                                title="Limpar chave"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-0.5">
                          <span className="text-zinc-400">
                            Todos os modelos com terminação <code className="text-purple-300">:free</code> não cobram créditos nem exigem cartão.
                          </span>
                          <a 
                            href="https://openrouter.ai/settings/keys" 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-purple-400 hover:underline flex items-center gap-1 font-semibold"
                          >
                            Gerar chave no OpenRouter <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      {/* Divisor Suave para Upload em Lote */}
                      <div className="border-t border-zinc-800/80 pt-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                              <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                              Rotação Avançada em Lote (.txt)
                            </h4>
                            <p className="text-[11px] text-zinc-400">
                              Opcional: carregue um arquivo .txt com várias chaves OpenRouter para rotação automática anti-limite de cota.
                            </p>
                          </div>
                          {openrouterApiKeys.length > 1 && (
                            <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                              {openrouterApiKeys.length} em rotação
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openrouterFileInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-zinc-700 hover:border-zinc-600"
                          >
                            <Upload className="w-4 h-4 text-purple-400" />
                            {openrouterApiKeys.length > 1 ? 'Substituir Lote de Chaves OpenRouter (.txt)' : 'Carregar Lote de Chaves OpenRouter (.txt)'}
                          </button>
                          {openrouterApiKeys.length > 0 && (
                            <button
                              onClick={() => {
                                setOpenrouterApiKey('');
                                setOpenrouterApiKeys([]);
                                aiProvidersManager.setOpenRouterKeys([]);
                              }}
                              className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl transition-all"
                              title="Remover todas as chaves OpenRouter"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Seleção de Modelos Gratuitos com Visão OpenRouter */}
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-purple-400" />
                        Modelos de Visão Gratuitos no OpenRouter (:free)
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {OPENROUTER_MODELS.map((m) => {
                          const isSelected = openrouterModel === m.id;
                          return (
                            <div
                              key={m.id}
                              onClick={() => handleSaveOpenRouterModel(m.id)}
                              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-purple-500/10 border-purple-500/50 shadow-md ring-1 ring-purple-500/30'
                                  : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-bold text-xs text-white flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-purple-400' : 'bg-zinc-600'}`} />
                                  {m.name}
                                </span>
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300">
                                  FREE
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-400 leading-snug">
                                {m.desc}
                              </p>
                              <div className="mt-2 text-[10px] text-purple-400/90 font-mono font-semibold">
                                {m.tag}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Teste de Conexão OpenRouter */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleTestConnection('openrouter')}
                        disabled={isTestingProvider !== null || (!openrouterApiKey && openrouterApiKeys.length === 0)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition-all border border-zinc-700 disabled:opacity-50"
                      >
                        {isTestingProvider === 'openrouter' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                            Testando Conexão & Visão OpenRouter...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 text-purple-400" />
                            Testar Conexão e Análise Visual
                          </>
                        )}
                      </button>
                    </div>

                    {/* Feedback do Teste OpenRouter */}
                    {testFeedback && testFeedback.provider === 'openrouter' && (
                      <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2.5 ${
                        testFeedback.success
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-red-500/10 border-red-500/30 text-red-300'
                      }`}>
                        {testFeedback.success ? <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400" /> : <AlertCircle className="w-4 h-4 mt-0.5 text-red-400" />}
                        <div className="flex-1">{testFeedback.message}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* ABA 4: GERAL & FAILOVER */}
                {providerTab === 'general' && (
                  <div className="space-y-5">
                    {/* Seletor Rápido de Provedor Ativo */}
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-orange-400" />
                        Provedor Principal para Geração de Prompts
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => handleSelectActiveProvider('gemini')}
                          className={`p-4 rounded-xl border text-left transition-all ${
                            activeAIProvider === 'gemini'
                              ? 'bg-emerald-500/15 border-emerald-500 ring-1 ring-emerald-500/40 text-white'
                              : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Sparkles className="w-5 h-5 text-emerald-400" />
                            {activeAIProvider === 'gemini' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase">Ativo</span>
                            )}
                          </div>
                          <p className="font-bold text-xs text-white">Google Gemini</p>
                          <p className="text-[11px] text-zinc-400 mt-1">2.5 Flash / 2.0 Flash</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelectActiveProvider('groq')}
                          className={`p-4 rounded-xl border text-left transition-all ${
                            activeAIProvider === 'groq'
                              ? 'bg-orange-500/15 border-orange-500 ring-1 ring-orange-500/40 text-white'
                              : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Zap className="w-5 h-5 text-orange-400" />
                            {activeAIProvider === 'groq' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold uppercase">Ativo</span>
                            )}
                          </div>
                          <p className="font-bold text-xs text-white">Groq Cloud (LPU)</p>
                          <p className="text-[11px] text-zinc-400 mt-1">Llama 3.2 Vision</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelectActiveProvider('openrouter')}
                          className={`p-4 rounded-xl border text-left transition-all ${
                            activeAIProvider === 'openrouter'
                              ? 'bg-purple-500/15 border-purple-500 ring-1 ring-purple-500/40 text-white'
                              : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Globe className="w-5 h-5 text-purple-400" />
                            {activeAIProvider === 'openrouter' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold uppercase">Ativo</span>
                            )}
                          </div>
                          <p className="font-bold text-xs text-white">OpenRouter Free</p>
                          <p className="text-[11px] text-zinc-400 mt-1">Qwen 2.5 VL / Gemma 3</p>
                        </button>
                      </div>
                    </div>

                    {/* Failover Automático Triplo */}
                    <div className="p-4 rounded-2xl border flex items-center justify-between gap-4"
                      style={{
                        backgroundColor: themeMode === 'light' ? '#f4f4f5' : '#09090b',
                        borderColor: themeMode === 'light' ? '#e4e4e7' : '#27272a'
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 mt-0.5">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider">
                              Failover Automático Triplo
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-orange-500/15 text-orange-400">
                              RECOMENDADO
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">
                            Se a cota do provedor ativo atingir o limite (429 / Rate Limit), a requisição é transferida instantaneamente para os outros provedores gratuitos configurados (ex: Gemini ⇄ Groq ⇄ OpenRouter).
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleFailover(!enableFailover)}
                        className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                        style={{
                          backgroundColor: enableFailover 
                            ? '#ea580c' 
                            : (themeMode === 'light' ? '#d4d4d8' : '#3f3f46')
                        }}
                      >
                        <span
                          className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                          style={{
                            transform: enableFailover ? 'translateX(20px)' : 'translateX(0)'
                          }}
                        />
                      </button>
                    </div>

                    {/* Painel Fluxo de Automação Ativo (N8N) */}
                    <div className="p-4 rounded-2xl border flex items-center justify-between gap-4"
                      style={{
                        backgroundColor: themeMode === 'light' ? '#f4f4f5' : '#09090b',
                        borderColor: themeMode === 'light' ? '#e4e4e7' : '#27272a'
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 mt-0.5">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider">
                            Fluxo de Automação Visual (N8N)
                          </h4>
                          <p className="text-[11px] text-zinc-400 leading-snug mt-1">
                            Exibir o painel visual flutuante com o progresso do fluxo de automação.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleAutomationFlow(!showAutomationFlow)}
                        className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                        style={{
                          backgroundColor: showAutomationFlow 
                            ? '#a855f7' 
                            : (themeMode === 'light' ? '#d4d4d8' : '#3f3f46')
                        }}
                      >
                        <span
                          className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                          style={{
                            transform: showAutomationFlow ? 'translateX(20px)' : 'translateX(0)'
                          }}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Rodapé do Modal */}
              <div 
                className="px-6 py-4 border-t flex items-center justify-between"
                style={{ 
                  backgroundColor: themeMode === 'light' ? '#fafafa' : '#0d0d0f',
                  borderColor: themeMode === 'light' ? '#e4e4e7' : '#27272a' 
                }}
              >
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Configurações salvas automaticamente.</span>
                </div>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-orange-500/20 text-white-force"
                >
                  Concluído
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fluxograma N8N de execução flutuante no painel principal (apenas se habilitado) */}
      {showAutomationFlow && (
        <N8NFlowchart
          queueLength={projects.length}
          activeNode={isSequencing ? 1 : (projects.length > 0 ? 0 : 0)}
          isGenerating={isSequencing || isGenerating}
          injectionTarget={injectionTarget}
          autoConfigStatus="Pendente"
          injectionProgressText=""
          downloadStatus="Pendente"
          queueDelayRemaining={0}
          downloadDelayRemaining={0}
          themeMode={themeMode}
        />
      )}
    </div>
  );
}

interface InjectorSpyLog {
  id: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'error';
  step: string;
  message: string;
  details?: string;
}

function PromptInjector() {
  const [prompts, setPrompts] = useState<{
    generatedScript: ScriptResponse | null;
    generatedAngles: GeneratedAngle[] | null;
  } | null>(null);
  
  const [url, setUrl] = useState('https://digen.ai/explore');
  const [inputValue, setInputValue] = useState('https://digen.ai/explore');
  const [activeTab, setActiveTab] = useState<'scenes' | 'angles'>('scenes');
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const webviewRef = useRef<any>(null);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

  // Modo do Painel Lateral: Prompts do Roteiro vs Espiar Etapas da Sequência
  const [sidebarMode, setSidebarMode] = useState<'prompts' | 'spy'>('prompts');
  const [spyLogs, setSpyLogs] = useState<InjectorSpyLog[]>([]);
  const [spyFilter, setSpyFilter] = useState<'all' | 'alerts'>('all');

  const addSpyLog = useCallback((type: 'info' | 'success' | 'warning' | 'error', step: string, message: string, details?: string) => {
    const now = new Date();
    const time = now.toTimeString().split(' ')[0];
    const newLog: InjectorSpyLog = {
      id: Math.random().toString(36).substring(2, 9),
      time,
      type,
      step,
      message,
      details
    };
    setSpyLogs(prev => [newLog, ...prev].slice(0, 300));
    console.log(`[INJECTOR SPY ${type.toUpperCase()}] [${step}] ${message}`, details || '');
  }, []);

  useEffect(() => {
    if (window.electronAPI?.onDownloadEvent) {
      const removeListener = window.electronAPI.onDownloadEvent((data: any) => {
        if (data.type === 'download-started') {
          addSpyLog('info', 'Download de Arquivo', `Iniciando download: "${data.filename}"`, `Destino: ${data.savePath}`);
        } else if (data.type === 'download-completed') {
          const sizeMb = data.sizeBytes ? (data.sizeBytes / (1024 * 1024)).toFixed(2) + ' MB' : 'Tamanho salvo';
          addSpyLog('success', 'Download Concluído', `✅ Arquivo salvo com sucesso: "${data.filename}" (${sizeMb})`, `Caminho completo no disco: ${data.savePath}`);
        } else if (data.type === 'download-failed' || data.type === 'download-interrupted') {
          addSpyLog('error', 'Download Falhou', `❌ Falha ao baixar "${data.filename}" (Status: ${data.status || 'interrompido'})`, `Caminho planejado: ${data.savePath}`);
        }
      });
      return () => removeListener();
    }
  }, [addSpyLog]);

  const getUnifiedVideoPrompt = useCallback((item: any, target: 'veo' | 'digen' = 'veo'): string => {
    if (!item) return '';
    const rawPrompt = (target === 'veo' ? item.veoPrompt : item.digenPrompt) || item.imagePrompt || '';
    const narration = item.narration || '';

    const lower = rawPrompt.toLowerCase();
    const hasVoice = lower.includes('narration:') || lower.includes('voiceover:') || lower.includes('dialogue:') || lower.includes('speech:') || lower.includes('fala:');
    const hasMusic = lower.includes('music:') || lower.includes('audio:') || lower.includes('soundtrack:') || lower.includes('música:');

    if (hasVoice && hasMusic) {
      return rawPrompt;
    }

    let result = rawPrompt.trim();

    if (!hasVoice && narration) {
      result += `\n\nVoiceover & Character Speech (PT-BR):\n"${narration}"`;
    }

    if (!hasMusic) {
      result += `\n\nBackground Music & Sound Effects:\nEnergetic commercial soundtrack matching scene mood with ambient sound effects.`;
    }

    return result;
  }, []);

  // Auto-Scan States no Injetor
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isAutoRetryActive, setIsAutoRetryActive] = useState(true);
  const [flowRecoveryStatus, setFlowRecoveryStatus] = useState<string | null>(null);

  // States de configuração repassados do MainApp
  const [injTarget, setInjTarget] = useState<'digen' | 'flow' | 'none'>('none');
  const [injConfigs, setInjConfigs] = useState<Record<string, string>>({});

  // States do N8NFlowchart e Automação no Injetor
  const [activeNode, setActiveNode] = useState(2); // Começa em "Plataforma" (nó 2)
  const [autoConfigStatus, setAutoConfigStatus] = useState('Pendente');
  const [downloadStatus, setDownloadStatus] = useState('Pendente');
  const [queueDelayRemaining, setQueueDelayRemaining] = useState(0);
  const [downloadDelayRemaining, setDownloadDelayRemaining] = useState(0);
  const [isAutomating, setIsAutomating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const abortControllerRef = useRef<boolean>(false);
  const pauseControllerRef = useRef<boolean>(false);

  const togglePauseAutomation = () => {
    const nextPause = !isPaused;
    setIsPaused(nextPause);
    pauseControllerRef.current = nextPause;
  };

  const cancelAutomation = () => {
    abortControllerRef.current = true;
    setIsPaused(false);
    pauseControllerRef.current = false;
  };
  const [injectionProgressText, setInjectionProgressText] = useState('Pendente');

  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setThemeMode(savedTheme);
    }
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'app-theme' && (e.newValue === 'dark' || e.newValue === 'light')) {
        setThemeMode(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggleTheme = () => {
    const nextTheme = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextTheme);
    localStorage.setItem('app-theme', nextTheme);
  };

  useEffect(() => {
    if (window.electronAPI) {
      const unsubscribe = window.electronAPI.onLoadPrompts((data) => {
        setPrompts(data);
        if (data.injectionTarget) {
          setInjTarget(data.injectionTarget);
          
          // Definir URL inicial com base no target selecionado
          const targetUrl = data.injectionTarget === 'flow' 
            ? 'https://labs.google/fx/pt/tools/flow' 
            : 'https://digen.ai/explore';
          
          setUrl(targetUrl);
          setInputValue(targetUrl);

          // Forçar navegação/recarregamento caso a URL já seja a mesma
          if (webviewRef.current) {
            try {
              webviewRef.current.loadURL(targetUrl);
            } catch (err) {
              webviewRef.current.src = targetUrl;
            }
          }
        }
        if (data.targetConfigs) {
          setInjConfigs(data.targetConfigs);
        }
        if (!data.generatedScript?.scenes?.length && data.generatedAngles?.length) {
          setActiveTab('angles');
        }
      });
      window.electronAPI.injectorReady();
      return unsubscribe;
    }
  }, []);

  useEffect(() => {
    if (!isAutoRetryActive || !inputValue.includes('labs.google')) return;

    const interval = setInterval(async () => {
      if (!webviewRef.current) return;
      try {
        const errorScript = `
          (function() {
            const bodyText = document.body.innerText.toLowerCase();
            const hasErrorText = bodyText.includes('error') || 
                                 bodyText.includes('failed') || 
                                 bodyText.includes('falhou') || 
                                 bodyText.includes('tente novamente') || 
                                 bodyText.includes('try again') ||
                                 bodyText.includes('could not generate');

            if (hasErrorText) {
              const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
              const generateBtn = buttons.find(b => {
                const text = (b.textContent || '').trim();
                return text.includes('Criar') || text.includes('Generate') || text.includes('Tente novamente') || text.includes('Try again');
              });
              if (generateBtn && !generateBtn.disabled) {
                generateBtn.click();
                return "error_recovered";
              }
            }
            return "ok";
          })()
        `;
        const result = await webviewRef.current.executeJavaScript(errorScript);
        if (result === 'error_recovered') {
          console.warn("Google Flow Auto-Recovery: Geração falhou. Clicando em 'Criar' novamente!");
          setFlowRecoveryStatus("Recuperando falha de geração... Tentando novamente!");
          setTimeout(() => setFlowRecoveryStatus(null), 5000);
        }
      } catch (err) {
        // Ignora erros de injeção JS na carga inicial
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [inputValue, isAutoRetryActive]);

  const runScan = async () => {
    if (!webviewRef.current) return;
    setIsScanning(true);
    addSpyLog('info', 'Escaneamento DOM', 'Iniciando escaneamento de seletores interativos na página...');
    try {
      const resultStr = await webviewRef.current.executeJavaScript(SPY_SCAN_SCRIPT);
      const result = JSON.parse(resultStr) as ScanResult;
      setScanResult(result);
      addSpyLog('success', 'Escaneamento DOM', `Scan concluído: ${result.prompts.length} prompts, ${result.uploads.length} uploads, ${result.configs.length} configs detectados.`);
      // Auto-highlight fields inside injector for clarity
      await webviewRef.current.executeJavaScript(SPY_HIGHLIGHT_CSS);
    } catch (err: any) {
      console.error('Injector auto-scan error:', err);
      addSpyLog('error', 'Escaneamento DOM', 'Falha ao escanear a página web', err.message);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleStartLoad = () => setIsLoading(true);
    const handleStopLoad = () => {
      setIsLoading(false);
      // Rodar scan de campos 2s depois que carregar a página
      setTimeout(() => runScan(), 2000);
    };
    const handleNavigate = (e: any) => {
      setInputValue(e.url);
      setScanResult(null); // Limpar resultados antigos
      addSpyLog('info', 'Navegação Web', `Navegando para: ${e.url}`);
      // Agendar novo scan após navegação in-page para detectar os novos seletores do editor
      setTimeout(() => runScan(), 2500);
    };

    const handleRenderCrash = (e: any) => {
      console.warn("Webview render process crashed/gone. Reloading...", e);
      addSpyLog('error', 'Renderizador Webview', 'O processo de renderização do Google Flow foi interrompido. Recarregando página automaticamente...');
      setTimeout(() => {
        if (webviewRef.current) webviewRef.current.reload();
      }, 1000);
    };

    webview.addEventListener('did-start-loading', handleStartLoad);
    webview.addEventListener('did-stop-loading', handleStopLoad);
    webview.addEventListener('did-navigate', handleNavigate);
    webview.addEventListener('did-navigate-in-page', handleNavigate);
    webview.addEventListener('render-process-gone', handleRenderCrash);
    webview.addEventListener('plugin-crashed', handleRenderCrash);

    return () => {
      webview.removeEventListener('did-start-loading', handleStartLoad);
      webview.removeEventListener('did-stop-loading', handleStopLoad);
      webview.removeEventListener('did-navigate', handleNavigate);
      webview.removeEventListener('did-navigate-in-page', handleNavigate);
      webview.removeEventListener('render-process-gone', handleRenderCrash);
      webview.removeEventListener('plugin-crashed', handleRenderCrash);
    };
  }, [prompts]);

  const goBack = () => {
    if (webviewRef.current && webviewRef.current.canGoBack()) {
      webviewRef.current.goBack();
    }
  };

  const goForward = () => {
    if (webviewRef.current && webviewRef.current.canGoForward()) {
      webviewRef.current.goForward();
    }
  };

  const reload = () => {
    if (webviewRef.current) {
      webviewRef.current.reload();
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let targetUrl = inputValue.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }
    setUrl(targetUrl);
    setInputValue(targetUrl);
  };

  const selectFlowTab = async (tabName: 'Vídeo' | 'Imagem') => {
    if (injTarget !== 'flow' || !webviewRef.current) return;
    addSpyLog('info', 'Google Flow Tab', `Alternando para a aba "${tabName}" no Google Flow...`);
    const script = `
      (function() {
        const els = Array.from(document.querySelectorAll('button, span, div, [role="option"], option'));
        const targetEl = els.find(el => {
          const text = (el.textContent || '').trim().toLowerCase();
          return text.includes('${tabName.toLowerCase()}');
        });
        if (targetEl) {
          targetEl.click();
          targetEl.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
        return false;
      })()
    `;
    const ok = await webviewRef.current.executeJavaScript(script);
    if (ok) {
      addSpyLog('success', 'Google Flow Tab', `Aba "${tabName}" ativada!`);
    } else {
      addSpyLog('warning', 'Google Flow Tab', `Não foi possível encontrar o botão da aba "${tabName}".`);
    }
    await new Promise(r => setTimeout(r, 800));
  };

  const injectText = (text: string, selector?: string) => {
    if (!webviewRef.current) return;
    addSpyLog('info', 'Injeção de Prompt', `Iniciando injeção ("${text.slice(0, 40)}...")`, `Seletor alvo: ${selector || 'automático'}`);
    
    const escapedText = JSON.stringify(text);
    
    const script = `
      (function() {
        const isVisible = (el) => {
          if (!el) return false;
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) return false;
          const s = window.getComputedStyle(el);
          return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
        };

        const findField = () => {
          if (${JSON.stringify(selector || '')}) {
            const el = document.querySelector(${JSON.stringify(selector || '')});
            if (el && isVisible(el)) return el;
          }

          const isValidPromptField = (el) => {
            if (!isVisible(el)) return false;
            const r = el.getBoundingClientRect();
            // Rejeitar a barra de pesquisa do topo da página (top < 100px)
            if (r.top < 100 && r.height < 55) return false;
            return true;
          };

          // Prioridade 1: container de prompt do Google Flow (div.sc-36b67ffc-1 / popover inferior de Animar ou Criar)
          const flowContainers = Array.from(document.querySelectorAll('div.sc-36b67ffc-1, [class*="36b67ffc"], [role="dialog"], div.sc-5c3af813-10, div.sc-5c3af813-1, div.sc-5c3af813-2, [class*="prompt-box"]'));
          for (const container of flowContainers) {
            if (!isVisible(container)) continue;
            const innerEditable = container.querySelector('[contenteditable="true"], [contenteditable=""], [data-lexical-editor="true"], textarea, p, input[type="text"]');
            if (innerEditable && isValidPromptField(innerEditable)) {
              return innerEditable;
            }
          }

          // Prioridade 2: Qualquer campo editável na metade inferior da página (rodapé/popover com "criar" / "want")
          const allEditables = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [contenteditable=""], [data-lexical-editor="true"], input[type="text"], div.sc-36b67ffc-1 p'));
          const bottomField = allEditables.find(el => {
            if (!isValidPromptField(el)) return false;
            const r = el.getBoundingClientRect();
            const text = (el.textContent || el.getAttribute('placeholder') || el.getAttribute('data-placeholder') || '').toLowerCase();
            const parentText = (el.parentElement ? el.parentElement.textContent || '' : '').toLowerCase();
            return r.top > window.innerHeight * 0.35 && (
              text.includes('criar') || text.includes('create') || text.includes('want') || text.includes('quer') ||
              parentText.includes('criar') || parentText.includes('create') || parentText.includes('want') || parentText.includes('quer')
            );
          });
          if (bottomField) return bottomField;

          // Prioridade 3: Qualquer editável na metade inferior da página
          const anyBottomEditable = allEditables.find(el => {
            if (!isValidPromptField(el)) return false;
            const r = el.getBoundingClientRect();
            return r.top > window.innerHeight * 0.35;
          });
          if (anyBottomEditable) return anyBottomEditable;

          // Prioridade 4: Elemento atualmente focado que não seja o topo
          const active = document.activeElement;
          if (active && isValidPromptField(active) && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT' || active.isContentEditable)) {
            return active;
          }

          // Prioridade 5: Qualquer editável válido na página
          const anyValid = allEditables.find(el => isValidPromptField(el));
          if (anyValid) return anyValid;

          return null;
        };

        const container = findField();
        if (!container) return false;

        // Se o container tiver um filho específico contenteditable/lexical, focar no filho
        const el = container.querySelector('[contenteditable="true"], [data-lexical-editor="true"]') || container;
        
        el.focus();
        
        const valToInject = ${escapedText};

        // Inserção para React Inputs/Textareas e Lexical/Slate Editors
        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
          const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
          const valueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
          if (valueSetter) {
            valueSetter.call(el, valToInject);
          } else {
            el.value = valToInject;
          }
        } else if (el.isContentEditable || el.getAttribute('contenteditable') !== null || el.getAttribute('data-lexical-editor') !== null) {
          const range = document.createRange();
          range.selectNodeContents(el);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);

          let inserted = false;
          try {
            inserted = document.execCommand('insertText', false, valToInject);
          } catch (e) {}

          if (!inserted) {
            el.innerText = valToInject;
          }
        }

        // Simular bateria completa de eventos DOM para ativar o estado interno do Lexical / React / Vue
        try {
          el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: valToInject }));
          el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: valToInject }));
        } catch(e) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }

        el.dispatchEvent(new Event('change', { bubbles: true }));

        // Eventos de teclado (Space / Enter) para acionar mutações no Lexical
        ['keydown', 'keypress', 'keyup'].forEach(eventType => {
          el.dispatchEvent(new KeyboardEvent(eventType, {
            bubbles: true, cancelable: true, key: ' ', code: 'Space', keyCode: 32, charCode: 32
          }));
        });

        // Forçar a ativação do botão de envio no DOM se estiver desabilitado pelo framework
        setTimeout(() => {
          const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
          const sendBtn = btns.find(b => {
            const text = (b.textContent || '').trim();
            const aria = (b.getAttribute('aria-label') || '').toLowerCase();
            return text === '→' || aria.includes('criar') || aria.includes('generate') || aria.includes('send') || aria.includes('submit') || aria.includes('enviar');
          });
          if (sendBtn) {
            sendBtn.removeAttribute('disabled');
            sendBtn.disabled = false;
            if (sendBtn.classList) sendBtn.classList.remove('disabled');
          }
        }, 100);

        return true;
      })()
    `;
    
    webviewRef.current.executeJavaScript(script)
      .then((success: boolean) => {
        if (!success) {
          addSpyLog('warning', 'Injeção de Prompt', 'Nenhum campo editável visível encontrado na página. Copiado para a área de transferência!');
          navigator.clipboard.writeText(text);
          alert("Nenhum campo de texto visível encontrado na página. Copiado para a área de transferência!");
        } else {
          addSpyLog('success', 'Injeção de Prompt', 'Prompt injetado com sucesso no campo visível!');
        }
      })
      .catch((err: any) => {
        addSpyLog('error', 'Injeção de Prompt', 'Erro durante a execução do script de injeção', err.message);
        console.error("Erro na injeção:", err);
        navigator.clipboard.writeText(text);
        alert("Copiado para área de transferência (Injeção falhou).");
      });
  };

  const getSmartSelector = (type: 'veo' | 'digen' | 'image'): string | undefined => {
    if (!scanResult) return undefined;
    
    const currentUrl = webviewRef.current?.getURL() || url;
    // DIGEN active
    if (currentUrl.includes('digen.ai')) {
      if (type === 'digen') {
        return scanResult.prompts[0]?.selector; // Fala vai pro prompt do avatar
      }
    }
    
    // Google Labs Flow active
    if (currentUrl.includes('labs.google')) {
      if (type === 'veo' || type === 'image') {
        return scanResult.prompts[0]?.selector; // Vai para o prompt ativo do VEO ou Imagem
      }
    }
    
    // Heurística fallback: se houver apenas 1 prompt na página, manda pra ele
    if (scanResult.prompts.length === 1) {
      return scanResult.prompts[0].selector;
    }
    
    return undefined;
  };

  const runAutoConfigure = async () => {
    if (!webviewRef.current) {
      alert("Aguarde a página carregar!");
      return;
    }

    if (injTarget === 'flow') {
      const generationType = activeTab === 'scenes' ? 'Vídeo' : 'Imagem';
      const modelToUse = generationType === 'Imagem'
        ? (injConfigs['flow-ModeloImagem'] || 'Nano Banana 2')
        : (injConfigs['flow-ModeloVideo'] || 'Veo 3.1 - Lite [Lower Priority]');

      const flowConfigsToApply = [
        generationType,
        injConfigs['flow-Aspecto'],
        modelToUse,
        injConfigs['flow-Quantidade'] || 'x4',
        injConfigs['flow-Duração'] || prompts?.generatedScript?.scenes?.[0]?.duration || '8s'
      ].filter(Boolean);

      if (flowConfigsToApply.length === 0) {
        alert("Nenhuma configuração selecionada para o Google Flow na fila.");
        return;
      }

      let successCount = 0;
      try {
        for (const val of flowConfigsToApply) {
          const script = `
            (function() {
              const els = Array.from(document.querySelectorAll('button, span, div, [role="option"], option, [role="button"]'));
              const targetEl = els.find(el => {
                const text = (el.textContent || '').trim();
                if ('${val}' === '9:16') return text === '9:16' || text.includes('9:16');
                if ('${val}' === '16:9') return text === '16:9' || text.includes('16:9');
                if ('${val}' === 'Vídeo') return text === 'Vídeo' || text.toLowerCase() === 'vídeo';
                if ('${val}' === 'Imagem') return text === 'Imagem' || text.toLowerCase() === 'imagem';
                if ('${val}'.startsWith('Veo') || '${val}'.includes('Banana') || '${val}' === 'Omni Flash') return text === '${val}' || text.includes('${val}') || text.includes('${val}'.replace('🍌 ',''));
                if ('${val}'.startsWith('x') && ['x1','x2','x3','x4'].includes('${val}')) return text === '${val}';
                return text === '${val}' || text.includes('${val}');
              });
              if (targetEl) {
                let clickable = targetEl;
                while (clickable && clickable.tagName !== 'BUTTON' && clickable.getAttribute('role') !== 'button' && clickable.parentElement) {
                  clickable = clickable.parentElement;
                }
                (clickable || targetEl).click();
                targetEl.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
              }
              return false;
            })()
          `;
          const success = await webviewRef.current.executeJavaScript(script);
          if (success) successCount++;
        }
        alert(`Auto-configuração do Google Flow concluída! ${successCount} de ${flowConfigsToApply.length} parâmetros foram aplicados.`);
      } catch (err: any) {
        console.error('Error applying Flow configurations:', err);
        alert('Houve um problema ao aplicar as configurações automáticas.');
      }
      return;
    }

    if (!scanResult) {
      alert("Aguarde o scan ser concluído!");
      return;
    }

    let successCount = 0;
    try {
      for (const cfg of scanResult.configs) {
        if (!cfg.label) continue;
        const configKey = `${injTarget}-${cfg.label}`;
        const selectedValue = injConfigs[configKey];
        
        if (selectedValue) {
          const optionIndex = cfg.options ? cfg.options.indexOf(selectedValue) : -1;
          const script = `
            (function() {
              const el = document.querySelector(${JSON.stringify(cfg.selector)});
              if (!el) return false;
              el.focus();
              if (el.tagName === 'SELECT') {
                el.value = ${JSON.stringify(selectedValue)};
                el.dispatchEvent(new Event('change', { bubbles: true }));
              } else {
                const options = el.querySelectorAll('[role="option"], option');
                if (options[${optionIndex}] && ${optionIndex} !== -1) {
                  options[${optionIndex}].click();
                } else {
                  el.click();
                }
              }
              return true;
            })()
          `;
          const success = await webviewRef.current.executeJavaScript(script);
          if (success) successCount++;
        }
      }
      
      alert(`Auto-configuração concluída! ${successCount} campos foram ajustados automaticamente de acordo com as escolhas da fila.`);
    } catch (err: any) {
      console.error('Error applying auto configurations:', err);
      alert('Houve um problema ao aplicar as configurações automáticas.');
    }
  };

  const runBatchAutomation = async () => {
    if (!webviewRef.current) {
      alert("Aguarde a página carregar!");
      return;
    }
    if (injTarget === 'none') {
      alert("Selecione um destino (DIGEN ou Flow) nas configurações da fila!");
      return;
    }

    const itemsToInject = activeTab === 'scenes' ? scenes : angles;
    if (itemsToInject.length === 0) {
      alert("Nenhum item disponível para automação.");
      return;
    }

    abortControllerRef.current = false;
    pauseControllerRef.current = false;
    setIsPaused(false);
    setIsAutomating(true);
    setAutoConfigStatus("Aplicando...");
    setActiveNode(3); // Auto-Config
    addSpyLog('info', 'Automação em Lote', `Iniciando automação em lote para ${itemsToInject.length} item(ns)...`);

    try {
      // 0. Se for Google Flow, garantir criação de novo projeto
      if (injTarget === 'flow') {
        const currentUrl = webviewRef.current.getURL() || url;
        if (!currentUrl.includes('/project')) {
          setAutoConfigStatus("Novo Projeto...");
          addSpyLog('info', 'Google Flow Project', 'Página fora do editor (/project). Procurando botão "+ Novo projeto"...');
          const clickNewProjectScript = `
            (function() {
              const isVisible = (el) => {
                if (!el) return false;
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 && 
                       window.getComputedStyle(el).display !== 'none' && 
                       window.getComputedStyle(el).visibility !== 'hidden';
              };
              const elements = Array.from(document.querySelectorAll('button, div, span, p, a, [role="button"], [class*="project"], [class*="novo"]'));
              const btn = elements.find(el => {
                if (!isVisible(el)) return false;
                const text = (el.textContent || '').trim().toLowerCase();
                return text === '+ novo projeto' || 
                       text === '+ new project' || 
                       text === 'novo projeto' || 
                       text === 'new project' ||
                       (text.includes('novo projeto') && (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button')) ||
                       (text.includes('new project') && (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button'));
              });
              if (btn) {
                let clickable = btn;
                let parent = btn.parentElement;
                while (parent && parent !== document.body) {
                  const tag = parent.tagName.toLowerCase();
                  const role = parent.getAttribute('role');
                  const isClickable = tag === 'button' || tag === 'a' || role === 'button' || 
                                      parent.className.includes('card') || parent.className.includes('project') ||
                                      parent.onclick !== null;
                  if (isClickable) {
                    clickable = parent;
                    break;
                  }
                  parent = parent.parentElement;
                }
                
                const mouseEvents = ['mousedown', 'mouseup', 'click'];
                mouseEvents.forEach(eventType => {
                  const ev = new MouseEvent(eventType, {
                    bubbles: true,
                    cancelable: true,
                    view: window
                  });
                  clickable.dispatchEvent(ev);
                });
                
                if (typeof clickable.click === 'function') {
                  clickable.click();
                }
                return true;
              }
              return false;
            })()
          `;
          try {
            const projectCreated = await webviewRef.current.executeJavaScript(clickNewProjectScript);
            if (projectCreated) {
              console.log("Google Flow: Clicado em '+ Novo projeto' no início do lote. Aguardando UI...");
              addSpyLog('success', 'Google Flow Project', 'Botão "+ Novo projeto" clicado! Aguardando o carregamento do editor...');
              setAutoConfigStatus("Carregando UI...");
              
              let loaded = false;
              for (let i = 0; i < 30; i++) {
                await new Promise(r => setTimeout(r, 500));
                const updatedUrl = webviewRef.current.getURL();
                if (updatedUrl.includes('/project')) {
                  loaded = true;
                  break;
                }
              }
              if (!loaded) {
                addSpyLog('error', 'Google Flow Project', 'Timeout: URL do projeto (/project) não foi carregada em 15s.');
                alert("Não foi possível carregar o editor do Google Flow automaticamente. Por favor, crie ou abra um projeto manualmente antes de iniciar.");
                setIsAutomating(false);
                return;
              }
              addSpyLog('success', 'Google Flow Project', 'Editor do projeto (/project) carregado!');
              await new Promise(r => setTimeout(r, 2000));
            } else {
              addSpyLog('error', 'Google Flow Project', 'Botão "+ Novo projeto" não encontrado ou desabilitado.');
              alert("Botão '+ Novo projeto' não encontrado ou não está visível. Por favor, abra um projeto manualmente antes de clicar em Executar Lote.");
              setIsAutomating(false);
              return;
            }
          } catch (err: any) {
            console.error("Erro ao tentar clicar em Novo Projeto no lote:", err);
            addSpyLog('error', 'Google Flow Project', 'Erro de script ao criar projeto', err.message);
            alert("Erro ao criar novo projeto: " + (err.message || err));
            setIsAutomating(false);
            return;
          }
        }
      } else if (injTarget === 'digen') {
        const currentUrl = webviewRef.current.getURL() || url;
        if (currentUrl.includes('/explore') || currentUrl.includes('/home') || !currentUrl.includes('/create')) {
          addSpyLog('warning', 'DIGEN', 'Navegação fora da tela de criação/editor.');
          alert("Por favor, abra a tela de criação/edição de vídeo do DIGEN (Editor) antes de iniciar a automação!");
          setIsAutomating(false);
          return;
        }
      }

      if (injTarget === 'flow') {
        const generationType = activeTab === 'scenes' ? 'Vídeo' : 'Imagem';
        const modelToUse = generationType === 'Imagem'
          ? (injConfigs['flow-ModeloImagem'] || 'Nano Banana 2')
          : (injConfigs['flow-ModeloVideo'] || 'Veo 3.1 - Lite [Lower Priority]');

        const flowConfigsToApply = [
          generationType,
          injConfigs['flow-Aspecto'],
          modelToUse,
          injConfigs['flow-Quantidade'] || 'x4',
          injConfigs['flow-Duração'] || (itemsToInject[0] as any)?.duration || prompts?.generatedScript?.scenes?.[0]?.duration || '8s'
        ].filter(Boolean);

        addSpyLog('info', 'Auto-Configuração', `Aplicando ${flowConfigsToApply.length} opções de configuração no Flow...`);
        let successCount = 0;
        for (const val of flowConfigsToApply) {
          const script = `
            (function() {
              const els = Array.from(document.querySelectorAll('button, span, div, [role="option"], option, [role="button"]'));
              const targetEl = els.find(el => {
                const text = (el.textContent || '').trim();
                if ('${val}' === '9:16') return text === '9:16' || text.includes('9:16');
                if ('${val}' === '16:9') return text === '16:9' || text.includes('16:9');
                if ('${val}' === 'Vídeo') return text === 'Vídeo' || text.toLowerCase() === 'vídeo';
                if ('${val}'.startsWith('Veo') || '${val}'.includes('Banana') || '${val}' === 'Omni Flash') return text === '${val}' || text.includes('${val}') || text.includes('${val}'.replace('🍌 ',''));
                if ('${val}'.startsWith('x') && ['x1','x2','x3','x4'].includes('${val}')) return text === '${val}';
                return text === '${val}' || text.includes('${val}');
              });
              if (targetEl) {
                let clickable = targetEl;
                while (clickable && clickable.tagName !== 'BUTTON' && clickable.getAttribute('role') !== 'button' && clickable.parentElement) {
                  clickable = clickable.parentElement;
                }
                (clickable || targetEl).click();
                targetEl.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
              }
              return false;
            })()
          `;
          const success = await webviewRef.current.executeJavaScript(script);
          if (success) {
            successCount++;
            addSpyLog('success', 'Auto-Configuração', `Opção "${val}" configurada com sucesso.`);
          } else {
            addSpyLog('warning', 'Auto-Configuração', `Opção "${val}" não foi encontrada no DOM.`);
          }
        }
        setAutoConfigStatus(`Sucesso (${successCount}/${flowConfigsToApply.length})`);
      } else if (injTarget === 'digen' && scanResult) {
        addSpyLog('info', 'Auto-Configuração', `Aplicando configurações no DIGEN...`);
        let successCount = 0;
        for (const cfg of scanResult.configs) {
          if (!cfg.label) continue;
          const configKey = `${injTarget}-${cfg.label}`;
          const selectedValue = injConfigs[configKey];
          if (selectedValue) {
            const optionIndex = cfg.options ? cfg.options.indexOf(selectedValue) : -1;
            const script = `
              (function() {
                const el = document.querySelector(${JSON.stringify(cfg.selector)});
                if (!el) return false;
                el.focus();
                if (el.tagName === 'SELECT') {
                  el.value = ${JSON.stringify(selectedValue)};
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                } else {
                  const options = el.querySelectorAll('[role="option"], option');
                  if (options[${optionIndex}] && ${optionIndex} !== -1) {
                    options[${optionIndex}].click();
                  } else {
                    el.click();
                  }
                }
                return true;
              })()
            `;
            const success = await webviewRef.current.executeJavaScript(script);
            if (success) {
              successCount++;
              addSpyLog('success', 'Auto-Configuração', `Campo "${cfg.label}" ajustado para "${selectedValue}".`);
            } else {
              addSpyLog('warning', 'Auto-Configuração', `Campo "${cfg.label}" não pôde ser ajustado.`);
            }
          }
        }
        setAutoConfigStatus(`Sucesso (${successCount} campos)`);
      } else {
        setAutoConfigStatus("Sem configs");
      }

      await new Promise(r => setTimeout(r, 2000));

      // 2. Loop de Geração Sequencial
      const generationsCount = Number(injConfigs['generationsPerPrompt']) || 1;
      const isFlowScenes = (injTarget === 'flow' && activeTab === 'scenes');
      const imagesPerScene = isFlowScenes ? (Number(injConfigs['flow-ImagensPerCena']) || 1) : 1;
      // x4 no Flow gera 4 vídeos de uma vez — videosPerImage representa quantos baixar após cada geração
      const flowQtd = injConfigs['flow-Quantidade'] || 'x4';
      const flowVideosCount = isFlowScenes ? (parseInt(flowQtd.replace('x','')) || 4) : generationsCount;
      const videosPerImage = isFlowScenes ? flowVideosCount : generationsCount;

      for (let idx = 0; idx < itemsToInject.length; idx++) {
        if (abortControllerRef.current) {
          addSpyLog('warning', 'Controle da Fila', 'Automação interrompida a pedido do usuário.');
          throw new Error("Automação cancelada pelo usuário.");
        }
        while (pauseControllerRef.current) {
          if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");
          setDownloadStatus("Pausado...");
          await new Promise(r => setTimeout(r, 500));
        }

        setSelectedItemIndex(idx);
        setActiveNode(4);
        addSpyLog('info', 'Execução da Cena', `Iniciando Cena ${idx + 1}/${itemsToInject.length}...`);

        const item = itemsToInject[idx];
        const generationType = injConfigs['flow-Tipo'] || (activeTab === 'scenes' ? 'Vídeo' : 'Imagem');
        const promptText = injTarget === 'flow'
          ? (generationType === 'Vídeo' ? getUnifiedVideoPrompt(item, 'veo') : (item as any).imagePrompt)
          : getUnifiedVideoPrompt(item, 'digen');

        const smartSelector = getSmartSelector(
          injTarget === 'flow'
            ? (generationType === 'Vídeo' ? 'veo' : 'image')
            : 'digen'
        );

        if (injTarget === 'flow') {
          await selectFlowTab(generationType === 'Vídeo' ? 'Vídeo' : 'Imagem');
        }

        for (let imgIdx = 1; imgIdx <= imagesPerScene; imgIdx++) {

          // ── FLUXO EXCLUSIVO DO GOOGLE FLOW ──────────────────────────────────────────

          if (isFlowScenes) {
            if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");
            while (pauseControllerRef.current) {
              if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");
              setDownloadStatus("Pausado..."); await new Promise(r => setTimeout(r, 500));
            }

            const sceneStr2 = String(idx + 1).padStart(2, '0');
            setInjectionProgressText(`Cena ${idx + 1}/${itemsToInject.length} (Img ${imgIdx}/${imagesPerScene})`);
            setDownloadStatus("Preparando...");

            // PASSO 1: Anexar até 5 imagens de referência do produto no prompt do Nano Banana 2
            addSpyLog('info', 'Anexo de Mídias', `Anexando até 5 imagens de referência do produto para a Cena ${idx + 1}...`);
            setDownloadStatus(`Anexando 5 referências...`);

            for (let refIdx = 1; refIdx <= Math.min(5, imagesPerScene > 1 ? imagesPerScene : 5); refIdx++) {
              if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");
              
              const openModalAndSelectScript = `
                (function(targetImageIndex) {
                  const isVisible = (el) => {
                    if (!el) return false;
                    const r = el.getBoundingClientRect();
                    return r.width > 0 && r.height > 0 &&
                           window.getComputedStyle(el).display !== 'none' &&
                           window.getComputedStyle(el).visibility !== 'hidden';
                  };

                  let modal = document.querySelector('[role="dialog"], [id*="radix"]');
                  if (!modal || !isVisible(modal)) {
                    const plusBtn = Array.from(document.querySelectorAll('button, div.sc-26b30722-2 button, [role="button"]')).find(b => {
                      if (!isVisible(b)) return false;
                      const text = (b.textContent || '').trim();
                      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                      return text.includes('add') || text.includes('+') || aria.includes('criar') || aria.includes('adicionar') || text.includes('Inicial');
                    });
                    if (plusBtn) plusBtn.click();
                  }

                  const listItems = Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] > div, [class*="virtuoso"] img, [class*="b0e5"]'));
                  const existingItem = listItems[targetImageIndex - 1] || listItems[0];
                  if (existingItem && listItems.length >= targetImageIndex) {
                    existingItem.click();
                    return 'found-existing';
                  }

                  const uploadBtn = Array.from(document.querySelectorAll('button, button.sc-559b4cd2-4')).find(b => {
                    if (!isVisible(b)) return false;
                    const text = (b.textContent || '').trim().toLowerCase();
                    return text.includes('enviar mídia') || text.includes('enviar midia') || text.includes('upload');
                  });
                  if (uploadBtn) uploadBtn.click();

                  return 'need-upload';
                })(${refIdx});
              `;

              let selectStatus = 'need-upload';
              try {
                selectStatus = await webviewRef.current.executeJavaScript(openModalAndSelectScript);
              } catch (err: any) {}
              await new Promise(r => setTimeout(r, 400));

              if (selectStatus === 'need-upload') {
                try {
                  const webContentsId = webviewRef.current.getWebContentsId();
                  await window.electronAPI.uploadFileToWebview({
                    webContentsId,
                    projectIndex: prompts?.projectIndex || 1,
                    sceneIndex: idx + 1,
                    imageIndex: refIdx,
                    isFinal: false
                  });
                } catch (err: any) {}
                await new Promise(r => setTimeout(r, 800));
              }

              const includeImageScript = `
                (function(targetImageIndex) {
                  const isVisible = (el) => {
                    if (!el) return false;
                    const r = el.getBoundingClientRect();
                    return r.width > 0 && r.height > 0 &&
                           window.getComputedStyle(el).display !== 'none' &&
                           window.getComputedStyle(el).visibility !== 'hidden';
                  };

                  const listItems = Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] > div, [class*="virtuoso"] img, [class*="b0e5"]'));
                  const itemToClick = listItems[targetImageIndex - 1] || listItems[0];
                  if (itemToClick) itemToClick.click();

                  const includeBtn = Array.from(document.querySelectorAll('button, div.sc-4da33547-5 button')).find(b => {
                    if (!isVisible(b)) return false;
                    const text = (b.textContent || '').trim().toLowerCase();
                    return text.includes('incluir no comando') || text.includes('incluir') || text.includes('add to prompt');
                  });

                  if (includeBtn) {
                    includeBtn.click();
                    return 'image-included';
                  }
                  return 'include-btn-not-found';
                })(${refIdx});
              `;
              try {
                await webviewRef.current.executeJavaScript(includeImageScript);
              } catch (err: any) {}
              await new Promise(r => setTimeout(r, 500));
            }

            addSpyLog('success', 'Anexo de Mídias', `Até 5 imagens de referência anexadas ao prompt da Cena ${idx + 1}.`);

            // PASSO 4: Injetar prompt da cena no Nano Banana 2
            addSpyLog('info', 'Injeção de Prompt', `Injetando prompt de imagem no campo "O que você quer criar?"...`);
            await injectText(promptText, smartSelector);
            await new Promise(r => setTimeout(r, 1500));

            if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");

            // PASSO 4: Clicar no botão → UMA única vez (gera todos os vídeos simultâneos)
            addSpyLog('info', 'Disparo de Geração', `Clicando em → para gerar ${videosPerImage} vídeos simultâneos...`);
            const clickGenerateScript = `
              (function() {
                const isVisible = (el) => {
                  if (!el) return false;
                  const r = el.getBoundingClientRect();
                  return r.width > 0 && r.height > 0 &&
                         window.getComputedStyle(el).display !== 'none' &&
                         window.getComputedStyle(el).visibility !== 'hidden';
                };
                const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
                const bottomBtns = btns.filter(btn => {
                  if (!isVisible(btn)) return false;
                  const r = btn.getBoundingClientRect();
                  return r.bottom > window.innerHeight * 0.60 && r.top < window.innerHeight;
                });
                const sendBtn = bottomBtns.find(btn => {
                  const text = (btn.textContent || '').trim();
                  const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
                  return text === '→' || aria.includes('criar') || aria.includes('generate') || aria.includes('send') || aria.includes('submit') || aria.includes('enviar');
                }) || (bottomBtns.length > 0 ? bottomBtns[bottomBtns.length - 1] : null);

                if (sendBtn) {
                  sendBtn.removeAttribute('disabled');
                  sendBtn.disabled = false;
                  if (sendBtn.classList) sendBtn.classList.remove('disabled');
                  
                  const mouseEvents = ['mousedown', 'mouseup', 'click'];
                  mouseEvents.forEach(eventType => {
                    sendBtn.dispatchEvent(new MouseEvent(eventType, {
                      bubbles: true, cancelable: true, view: window
                    }));
                  });
                  if (typeof sendBtn.click === 'function') {
                    sendBtn.click();
                  }
                  return true;
                }

                // Fallback: se o botão → não puder ser clicado diretamente, disparar ENTER no campo ativo/editor
                const activeEl = document.activeElement || document.querySelector('[contenteditable="true"], [data-lexical-editor="true"], textarea');
                if (activeEl) {
                  ['keydown', 'keypress', 'keyup'].forEach(type => {
                    activeEl.dispatchEvent(new KeyboardEvent(type, {
                      bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13, charCode: 13
                    }));
                  });
                  return true;
                }
                return false;
              })()
            `;
            const generateClicked = await webviewRef.current.executeJavaScript(clickGenerateScript);
            if (generateClicked) {
              addSpyLog('success', 'Disparo de Geração', `Botão → acionado! Aguardando ${videosPerImage} vídeos renderizarem...`);
            } else {
              addSpyLog('warning', 'Disparo de Geração', 'Botão → não encontrado. Verifique se o Flow está pronto.');
            }

            // PASSO 5: Aguardar conclusão do render (verificar ausência de percentuais)
            setDownloadStatus("Renderizando...");
            addSpyLog('info', 'Renderização', 'Monitorando % de progresso dos vídeos...');
            let isDone = false;
            for (let check = 0; check < 80; check++) {
              if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");
              while (pauseControllerRef.current) {
                if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");
                setDownloadStatus("Pausado durante render...");
                await new Promise(r => setTimeout(r, 500));
              }
              await new Promise(r => setTimeout(r, 3000));
              try {
                const checkScript = `
                  (function() {
                    const progressTexts = Array.from(document.querySelectorAll('*'))
                      .filter(el => {
                        const text = (el.textContent || '').trim();
                        return /^\\d{1,3}%$/.test(text) && el.children.length === 0;
                      });
                    if (progressTexts.length > 0) return 'generating';
                    const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
                    const bottomEnabled = btns.filter(btn => {
                      const r = btn.getBoundingClientRect();
                      return r.bottom > window.innerHeight * 0.65 && !btn.disabled;
                    });
                    if (bottomEnabled.length > 0) return 'ready';
                    return 'generating';
                  })()
                `;
                const status = await webviewRef.current.executeJavaScript(checkScript);
                if (status === 'ready') {
                  isDone = true;
                  addSpyLog('success', 'Renderização', `Todos os ${videosPerImage} vídeos prontos em ${(check + 1) * 3}s!`);
                  break;
                }
              } catch (err) {}
            }
            if (!isDone) {
              addSpyLog('warning', 'Renderização', 'Timeout (4 min). Tentando baixar o que estiver disponível...');
            }

            // PASSO 6: Download individual de cada um dos N vídeos gerados
            await new Promise(r => setTimeout(r, 1000));
            for (let vidIdx = 1; vidIdx <= videosPerImage; vidIdx++) {
              if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");
              while (pauseControllerRef.current) {
                if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");
                setDownloadStatus("Pausado..."); await new Promise(r => setTimeout(r, 500));
              }

              const letter = String.fromCharCode(64 + vidIdx);
              const customFileName = `img${imgIdx}-cena${sceneStr2}${letter}`;

              addSpyLog('info', 'Metadados de Download', `Registrando nome: "${customFileName}"`);
              await window.electronAPI.setCurrentDownloadInfo({
                projectIndex: prompts?.projectIndex || 1,
                sceneIndex: idx + 1,
                generationLoop: vidIdx,
                customFileName
              });

              setDownloadStatus(`Baixando vídeo ${vidIdx}/${videosPerImage} — ${customFileName}...`);
              addSpyLog('info', 'Download', `Procurando botão ⬇ para o vídeo ${vidIdx} (${customFileName})...`);

              const clickDownloadScript = `
                (function(videoIndex) {
                  const isVisible = (el) => {
                    if (!el) return false;
                    const r = el.getBoundingClientRect();
                    return r.width > 0 && r.height > 0 &&
                           window.getComputedStyle(el).display !== 'none' &&
                           window.getComputedStyle(el).visibility !== 'hidden';
                  };
                  const allBtns = Array.from(document.querySelectorAll('button, a, [role="button"], [class*="download"]'));
                  const dlBtns = allBtns.filter(el => {
                    if (!isVisible(el)) return false;
                    const text = (el.textContent || '').trim().toLowerCase();
                    const title = (el.getAttribute('title') || '').toLowerCase();
                    const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                    return text.includes('baixar') || text.includes('download') ||
                           title.includes('download') || title.includes('baixar') ||
                           aria.includes('download') || aria.includes('baixar') ||
                           el.className.toString().includes('download');
                  }).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

                  if (dlBtns[videoIndex - 1]) { dlBtns[videoIndex - 1].click(); return true; }
                  if (dlBtns.length > 0) { dlBtns[0].click(); return true; }
                  return false;
                })(${vidIdx})
              `;
              const downloaded = await webviewRef.current.executeJavaScript(clickDownloadScript);
              if (downloaded) {
                addSpyLog('success', 'Download', `⬇ "${customFileName}" — vídeo ${vidIdx}/${videosPerImage} iniciado.`);
              } else {
                addSpyLog('warning', 'Download', `⬇ não encontrado para vídeo ${vidIdx}. Verifique o painel lateral.`);
              }

              setDownloadStatus(`Salvo (Img ${imgIdx} - Víd ${letter})`);
              setActiveNode(5);
              // Intervalo entre downloads para evitar conflito de nomenclatura
              for (let s = 5; s > 0; s--) {
                if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");
                setDownloadDelayRemaining(s);
                await new Promise(r => setTimeout(r, 1000));
              }
              setDownloadDelayRemaining(0);
              setActiveNode(4);
            }

          } else {
            // ── FLUXO DIGEN / OUTROS (sequencial: gerar + baixar por vidIdx) ──────────
            for (let vidIdx = 1; vidIdx <= videosPerImage; vidIdx++) {
              if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");
              while (pauseControllerRef.current) {
                if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");
                setDownloadStatus("Pausado..."); await new Promise(r => setTimeout(r, 500));
              }

              const letter = String.fromCharCode(64 + vidIdx);
              const progressText = `Cena ${idx + 1}/${itemsToInject.length} (Gerando ${vidIdx}/${generationsCount})`;
              setInjectionProgressText(progressText);
              setDownloadStatus("Aguardando Geração...");

              const sceneStr2 = String(idx + 1).padStart(2, '0');
              const customFileName = `cena${sceneStr2}_${vidIdx}`;
              addSpyLog('info', 'Metadados de Download', `Registrado: "${customFileName}"`);
              await window.electronAPI.setCurrentDownloadInfo({
                projectIndex: prompts?.projectIndex || 1,
                sceneIndex: idx + 1,
                generationLoop: vidIdx,
                customFileName
              });

              await injectText(promptText, smartSelector);
              await new Promise(r => setTimeout(r, 1500));

              if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");

              addSpyLog('info', 'Disparo de Geração', 'Procurando botão de geração...');
              const genScript = `
                (function() {
                  const els = Array.from(document.querySelectorAll('button, span, div, [role="button"]'));
                  const btn = els.find(el => {
                    const text = (el.textContent || '').trim();
                    return text === 'Criar' || text === 'Generate' || text === 'Create' || text.includes('Gerar');
                  });
                  if (btn && !btn.disabled) { btn.click(); return true; }
                  return false;
                })()
              `;
              const genClicked = await webviewRef.current.executeJavaScript(genScript);
              addSpyLog(genClicked ? 'success' : 'warning', 'Disparo de Geração',
                genClicked ? 'Geração iniciada!' : 'Botão não encontrado ou desabilitado.');

              setDownloadStatus("Renderizando...");
              let isDone = false;
              for (let check = 0; check < 60; check++) {
                if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");
                await new Promise(r => setTimeout(r, 3000));
                try {
                  const st = await webviewRef.current.executeJavaScript(`
                    (function() {
                      const prog = Array.from(document.querySelectorAll('*')).filter(el => /^\\d{1,3}%$/.test((el.textContent||'').trim()) && el.children.length===0);
                      return prog.length > 0 ? 'generating' : 'ready';
                    })()
                  `);
                  if (st === 'ready') { isDone = true; addSpyLog('success', 'Renderização', `Pronto em ${(check+1)*3}s.`); break; }
                } catch (err) {}
              }
              if (!isDone) addSpyLog('warning', 'Renderização', 'Timeout. Tentando baixar...');

              setDownloadStatus("Baixando...");
              addSpyLog('info', 'Download', `Procurando ⬇ para "${customFileName}"...`);
              const dlScript = `
                (function() {
                  const els = Array.from(document.querySelectorAll('button, a, span, [role="button"], [class*="download"]'));
                  const btn = els.find(el => {
                    const text = (el.textContent||'').trim().toLowerCase();
                    const title = (el.getAttribute('title')||'').toLowerCase();
                    const aria = (el.getAttribute('aria-label')||'').toLowerCase();
                    return text.includes('baixar')||text.includes('download')||title.includes('download')||aria.includes('download');
                  });
                  if (btn) { btn.click(); return true; }
                  return false;
                })()
              `;
              const dl = await webviewRef.current.executeJavaScript(dlScript);
              addSpyLog(dl ? 'success' : 'warning', 'Download', dl ? `⬇ "${customFileName}" iniciado.` : 'Botão ⬇ não encontrado.');

              setDownloadStatus(`Salvo (${vidIdx}/${generationsCount})`);
              setActiveNode(5);
              for (let s = 10; s > 0; s--) {
                if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");
                setDownloadDelayRemaining(s);
                await new Promise(r => setTimeout(r, 1000));
              }
              setDownloadDelayRemaining(0);
              setActiveNode(4);
            }
          }
        }
      }


      setDownloadStatus("Lote Concluído!");
      setActiveNode(5);
      addSpyLog('success', 'Automação em Lote', 'Lote de automação concluído com sucesso!');
      for (let s = 20; s > 0; s--) {
        if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");
        while (pauseControllerRef.current) {
          if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");
          setDownloadStatus("Pausado...");
          await new Promise(r => setTimeout(r, 500));
        }
        setQueueDelayRemaining(s);
        await new Promise(r => setTimeout(r, 1000));
      }
      setQueueDelayRemaining(0);

      alert("Automação em Lote concluída com sucesso! Todos os vídeos foram salvos na pasta.");
      await window.electronAPI.setCurrentDownloadInfo(null);
    } catch (err: any) {
      console.error('Batch automation error:', err);
      addSpyLog('error', 'Automação em Lote', 'Erro durante a automação em lote', err.message);
      alert(`Houve um erro na automação em lote: ${err.message}`);
    } finally {
      setIsAutomating(false);
      setActiveNode(2);
      setInjectionProgressText("");
      setDownloadStatus("Pendente");
    }
  };

  const scenes = prompts?.generatedScript?.scenes || [];
  const angles = prompts?.generatedAngles || [];
  const currentItem = activeTab === 'scenes' ? scenes[selectedItemIndex] : angles[selectedItemIndex];

  return (
    <div className={`h-screen w-screen ${themeMode} prompt-injector-window bg-zinc-950 text-zinc-100 flex overflow-hidden font-sans select-none`}>
      {/* PAINEL ESQUERDO: CONTROLES E PROMPTS */}
      <div className="w-[420px] h-full border-r border-zinc-800 bg-zinc-900/60 backdrop-blur-md flex flex-col flex-shrink-0 overflow-hidden">
        
        {/* Topo do Painel */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-teal-500 flex items-center justify-center shadow-lg shadow-orange-500/10 flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold font-display text-sm bg-gradient-to-r from-orange-400 to-teal-400 bg-clip-text text-transparent">Injetor de Prompts</h1>
              <p className="text-[9px] text-zinc-400 uppercase tracking-widest font-semibold">Digen & Google Labs Flow</p>
            </div>
          </div>
        </div>

        {/* Seletor do Modo do Painel: Prompts x Espião de Etapas */}
        <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-950/40 flex gap-1 flex-shrink-0">
          <button
            onClick={() => setSidebarMode('prompts')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${
              sidebarMode === 'prompts'
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Roteiro & Prompts
          </button>
          <button
            onClick={() => setSidebarMode('spy')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 relative ${
              sidebarMode === 'spy'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Espiar Etapas
            {spyLogs.some(l => l.type === 'error' || l.type === 'warning') && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse absolute top-1 right-1" />
            )}
          </button>
        </div>

        {/* Banner de Auto-configuração */}
        {injTarget !== 'none' && (
          <div className="p-4 bg-zinc-950/40 border-b border-zinc-800 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Auto-Configuração da Fila</p>
              <p className="text-xs text-white font-bold truncate mt-0.5">Destino: {injTarget === 'digen' ? 'DIGEN.ai' : 'Google Flow'}</p>
            </div>
            <div className="flex gap-2">
              {isAutomating ? (
                <>
                  <button
                    onClick={togglePauseAutomation}
                    className="py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-amber-600/10"
                    title={isPaused ? "Retomar a automação em lote" : "Pausar a automação temporariamente"}
                  >
                    {isPaused ? (
                      <>
                        <Play className="w-3.5 h-3.5" /> Retomar
                      </>
                    ) : (
                      <>
                        <Pause className="w-3.5 h-3.5" /> Pausar
                      </>
                    )}
                  </button>
                  <button
                    onClick={cancelAutomation}
                    className="py-1.5 px-3 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-red-600/10"
                    title="Cancelar a automação em lote"
                  >
                    <Square className="w-3.5 h-3.5" /> Parar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={runAutoConfigure}
                    disabled={isAutomating}
                    className="py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                    title="Ajustar automaticamente vozes, aspect ratio, etc. mapeados na página"
                  >
                    <Settings2 className="w-3.5 h-3.5" /> Configurar
                  </button>
                  <button
                    onClick={runBatchAutomation}
                    disabled={isAutomating}
                    className="py-1.5 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-purple-600/10"
                    title="Executar automação completa de injeção, geração e download em sequência"
                  >
                    <Play className="w-3.5 h-3.5" /> Executar Lote
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Banner de Recuperação Automática do Flow */}
        {flowRecoveryStatus && (
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-2 animate-pulse">
            <span>⚠️</span> {flowRecoveryStatus}
          </div>
        )}

        {/* Conteúdo Dinâmico do Painel: Prompts vs Espião de Etapas */}
        {sidebarMode === 'spy' ? (
          <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
            {/* Cabeçalho do Espião */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-cyan-400" /> Espião de Etapas da Sequência
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  Inspeção ao vivo de uploads, injeções, renders e erros.
                </p>
              </div>
            </div>

            {/* Contadores de Métricas */}
            <div className="grid grid-cols-4 gap-1.5 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800 text-center">
              <div className="p-1">
                <span className="text-[9px] text-zinc-400 block font-bold uppercase">Total</span>
                <span className="text-xs font-mono font-bold text-white">{spyLogs.length}</span>
              </div>
              <div className="p-1">
                <span className="text-[9px] text-emerald-400 block font-bold uppercase">Sucessos</span>
                <span className="text-xs font-mono font-bold text-emerald-400">{spyLogs.filter(l => l.type === 'success').length}</span>
              </div>
              <div className="p-1">
                <span className="text-[9px] text-amber-400 block font-bold uppercase">Avisos</span>
                <span className="text-xs font-mono font-bold text-amber-400">{spyLogs.filter(l => l.type === 'warning').length}</span>
              </div>
              <div className="p-1">
                <span className="text-[9px] text-red-400 block font-bold uppercase">Erros</span>
                <span className="text-xs font-mono font-bold text-red-400">{spyLogs.filter(l => l.type === 'error').length}</span>
              </div>
            </div>

            {/* Barra de Ações & Filtros */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                <button
                  onClick={() => setSpyFilter('all')}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                    spyFilter === 'all' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Todos ({spyLogs.length})
                </button>
                <button
                  onClick={() => setSpyFilter('alerts')}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                    spyFilter === 'alerts' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Alertas ({spyLogs.filter(l => l.type === 'warning' || l.type === 'error').length})
                </button>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => {
                    const formatted = spyLogs.map(l => `[${l.time}] [${l.type.toUpperCase()}] [${l.step}] ${l.message} ${l.details ? '(' + l.details + ')' : ''}`).join('\n');
                    navigator.clipboard.writeText(formatted);
                    alert("Diagnóstico completo do Espião copiado para a área de transferência!");
                  }}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] font-bold transition-all flex items-center gap-1"
                  title="Copiar relatório completo de diagnóstico"
                >
                  <Copy className="w-3 h-3" /> Copiar
                </button>
                <button
                  onClick={() => setSpyLogs([])}
                  className="px-2 py-1 bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded text-[10px] font-bold transition-all"
                  title="Limpar histórico do espião"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Lista com Rolagem do Espião */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 select-text">
              {spyLogs.length === 0 ? (
                <div className="text-center py-16 text-zinc-500 text-xs bg-zinc-950/40 rounded-2xl border border-zinc-900 border-dashed">
                  <Eye className="w-8 h-8 mx-auto text-zinc-600 mb-2 opacity-50 animate-pulse" />
                  <p className="font-bold text-zinc-400">Nenhum evento registrado no momento.</p>
                  <p className="text-[10px] text-zinc-600 max-w-[220px] mx-auto mt-1 leading-relaxed">
                    Clique em "Executar Lote" ou navegue na webview para que o Espião rastreie todas as etapas e seletores em tempo real.
                  </p>
                </div>
              ) : (
                spyLogs
                  .filter(l => spyFilter === 'all' || l.type === 'warning' || l.type === 'error')
                  .map((log) => {
                    const isError = log.type === 'error';
                    const isWarning = log.type === 'warning';
                    const isSuccess = log.type === 'success';

                    const badgeStyle = isError
                      ? 'bg-red-500/10 border-red-500/30 text-red-300'
                      : isWarning
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : isSuccess
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300';

                    const icon = isError ? '❌' : isWarning ? '⚠️' : isSuccess ? '✅' : 'ℹ️';

                    return (
                      <div
                        key={log.id}
                        className={`p-2.5 rounded-xl border text-xs transition-all ${badgeStyle}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span>{icon}</span>
                            <span className="text-[11px] font-mono">{log.step}</span>
                          </div>
                          <span className="text-[9px] font-mono opacity-60">{log.time}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-zinc-200">{log.message}</p>
                        {log.details && (
                          <p className="text-[10px] font-mono text-zinc-400 mt-1.5 bg-black/50 p-2 rounded-lg border border-white/5 break-all">
                            {log.details}
                          </p>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Abas */}
            <div className="p-3 border-b border-zinc-800 bg-zinc-900/20 flex gap-2 flex-shrink-0">
              <button
                onClick={() => { setActiveTab('scenes'); setSelectedItemIndex(0); }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'scenes'
                    ? 'bg-zinc-805 bg-zinc-800 text-white shadow-sm border border-zinc-700'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Cenas ({scenes.length})
              </button>
              <button
                onClick={() => { setActiveTab('angles'); setSelectedItemIndex(0); }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'angles'
                    ? 'bg-zinc-805 bg-zinc-800 text-white shadow-sm border border-zinc-700'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Ângulos ({angles.length})
              </button>
            </div>

            {/* Lista de Itens */}
            <div className="flex-shrink-0 overflow-y-auto p-4 space-y-2 border-b border-zinc-800 max-h-[30vh]">
              {activeTab === 'scenes' ? (
                scenes.length === 0 ? (
                  <div className="text-center py-6 text-zinc-500 text-xs">Nenhuma cena gerada.</div>
                ) : (
                  scenes.map((scene, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedItemIndex(i)}
                      className={`w-full text-left p-3 rounded-xl transition-all border ${
                        selectedItemIndex === i
                          ? 'bg-orange-500/10 border-orange-500/30 text-white'
                          : 'bg-zinc-900/40 border-zinc-800 hover:bg-zinc-800/40 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs">Cena {i + 1}</span>
                        <span className="text-[10px] text-zinc-500 font-semibold">{scene.duration}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate">{scene.description || 'Sem descrição'}</p>
                    </button>
                  ))
                )
              ) : (
                angles.length === 0 ? (
                  <div className="text-center py-6 text-zinc-500 text-xs">Nenhum ângulo gerado.</div>
                ) : (
                  angles.map((angle, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedItemIndex(i)}
                      className={`w-full text-left p-3 rounded-xl transition-all border ${
                        selectedItemIndex === i
                          ? 'bg-teal-500/10 border-teal-500/30 text-white'
                          : 'bg-zinc-900/40 border-zinc-800 hover:bg-zinc-800/40 text-zinc-300'
                      }`}
                    >
                      <span className="font-bold text-xs block mb-1">{angle.angleName}</span>
                      <p className="text-[11px] text-zinc-400 truncate">{angle.imagePrompt}</p>
                    </button>
                  ))
                )
              )}
            </div>

            {/* Detalhes do Item Selecionado & Prompts */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentItem ? (
                <>
                  <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                    <h4 className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-1">Foco Selecionado</h4>
                    <p className="font-bold text-sm text-white">
                      {activeTab === 'scenes' ? `Cena ${selectedItemIndex + 1}` : (currentItem as GeneratedAngle).angleName}
                    </p>
                    {activeTab === 'scenes' && (currentItem as GeneratedScene).description && (
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                        {(currentItem as GeneratedScene).description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* 1. Prompt VEO */}
                    {currentItem.veoPrompt && (
                      <div className="bg-zinc-900/80 p-3.5 rounded-2xl border border-zinc-800 hover:border-zinc-700/60 transition-all space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> Prompt VEO (Vídeo + Narração + Música)
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-300 font-mono bg-zinc-950 p-2 rounded-lg border border-zinc-850 max-h-24 overflow-y-auto leading-relaxed select-text whitespace-pre-wrap">
                          {getUnifiedVideoPrompt(currentItem, 'veo')}
                        </div>
                        <button
                          onClick={async () => {
                            await selectFlowTab('Vídeo');
                            injectText(getUnifiedVideoPrompt(currentItem, 'veo'), getSmartSelector('veo'));
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/10 transition-all hover:scale-[1.02]"
                        >
                          Injetar VEO Completo
                        </button>
                      </div>
                    )}

                    {/* 2. Prompt DIGEN */}
                    {currentItem.digenPrompt && (
                      <div className="bg-zinc-900/80 p-3.5 rounded-2xl border border-zinc-800 hover:border-zinc-700/60 transition-all space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" /> Prompt DIGEN (Avatar + Falas + Música)
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-300 font-mono bg-zinc-950 p-2 rounded-lg border border-zinc-850 max-h-24 overflow-y-auto leading-relaxed select-text whitespace-pre-wrap">
                          {getUnifiedVideoPrompt(currentItem, 'digen')}
                        </div>
                        <button
                          onClick={() => injectText(getUnifiedVideoPrompt(currentItem, 'digen'), getSmartSelector('digen'))}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/10 transition-all hover:scale-[1.02]"
                        >
                          Injetar DIGEN Completo
                        </button>
                      </div>
                    )}

                    {/* 3. Prompt de Imagem */}
                    {currentItem.imagePrompt && (
                      <div className="bg-zinc-900/80 p-3.5 rounded-2xl border border-zinc-800 hover:border-zinc-700/60 transition-all space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5" /> Prompt de Imagem
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-300 font-mono bg-zinc-950 p-2 rounded-lg border border-zinc-850 max-h-20 overflow-y-auto leading-relaxed select-text">
                          {currentItem.imagePrompt}
                        </div>
                        <button
                          onClick={async () => {
                            await selectFlowTab('Imagem');
                            injectText(currentItem.imagePrompt, getSmartSelector('image'));
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/10 transition-all hover:scale-[1.02]"
                        >
                          Injetar Imagem
                        </button>
                      </div>
                    )}

                    {/* 4. Narração */}
                    {currentItem.narration && (
                      <div className="bg-zinc-900/80 p-3.5 rounded-2xl border border-zinc-800 hover:border-zinc-700/60 transition-all space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
                            <Volume2 className="w-3.5 h-3.5" /> Narração (Falas)
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-300 font-mono bg-zinc-950 p-2 rounded-lg border border-zinc-850 max-h-20 overflow-y-auto leading-relaxed select-text">
                          {currentItem.narration}
                        </div>
                        <button
                          onClick={() => injectText(currentItem.narration)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl text-xs font-bold shadow-md shadow-yellow-600/10 transition-all hover:scale-[1.02]"
                        >
                          Injetar Narração
                        </button>
                      </div>
                    )}

                    {/* Configurações Dinâmicas Detectadas (DIGEN/Flow) */}
                    {scanResult && (scanResult.configs.length > 0 || scanResult.actions.length > 0) && (
                      <div className="bg-zinc-950/40 p-4.5 rounded-2xl border border-zinc-800/80 space-y-4 mt-4">
                        <h4 className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                          <Settings2 className="w-3.5 h-3.5" /> Painel de Controle Remoto
                        </h4>
                        
                        {/* Selects e Dropdowns mapeados */}
                        {scanResult.configs.map((cfg, idx) => (
                          <div key={idx} className="space-y-1">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase">{cfg.label || 'Opção'}</label>
                            {cfg.options && cfg.options.length > 0 ? (
                              <select
                                onChange={(e) => {
                                  const optionIndex = cfg.options.indexOf(e.target.value);
                                  const script = `
                                    (function() {
                                      const el = document.querySelector(${JSON.stringify(cfg.selector)});
                                      if (!el) return false;
                                      el.focus();
                                      if (el.tagName === 'SELECT') {
                                        el.value = ${JSON.stringify(e.target.value)};
                                        el.dispatchEvent(new Event('change', { bubbles: true }));
                                      } else {
                                        const options = el.querySelectorAll('[role="option"], option');
                                        if (options[${optionIndex}]) {
                                          options[${optionIndex}].click();
                                        } else {
                                          el.click();
                                        }
                                      }
                                      return true;
                                    })()
                                  `;
                                  webviewRef.current?.executeJavaScript(script);
                                }}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-700"
                              >
                                <option value="">Selecione...</option>
                                {cfg.options.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : (
                              <button
                                onClick={() => {
                                  const script = `
                                    (function() {
                                      const el = document.querySelector(${JSON.stringify(cfg.selector)});
                                      if (el) { el.click(); return true; }
                                      return false;
                                    })()
                                  `;
                                  webviewRef.current?.executeJavaScript(script);
                                }}
                                className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-bold transition-all text-left px-3 truncate"
                              >
                                Ajustar: {cfg.label || cfg.type}
                              </button>
                            )}
                          </div>
                        ))}

                        {/* Ações Mapeadas */}
                        {scanResult.actions.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-zinc-800/40">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase block">Disparar Ações</span>
                            <div className="grid grid-cols-2 gap-2">
                              {scanResult.actions.map((act, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    const script = `
                                      (function() {
                                        const el = document.querySelector(${JSON.stringify(act.selector)});
                                        if (el) { el.click(); return true; }
                                        return false;
                                      })()
                                    `;
                                    webviewRef.current?.executeJavaScript(script);
                                  }}
                                  className="py-2 bg-emerald-600/15 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all truncate"
                                  title={`Disparar clique no elemento: ${act.label}`}
                                >
                                  🚀 {act.label || act.type}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-500 text-xs py-10">
                  Nenhuma cena ou ângulo selecionado.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* PAINEL DIREITO: NAVEGADOR WEB */}
      <div className="flex-1 h-full flex flex-col overflow-hidden bg-black">
        
        {/* Barra de Navegação do Navegador */}
        <div className="p-3 bg-zinc-900 border-b border-zinc-800 flex items-center gap-2.5 flex-shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={goBack}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
              title="Voltar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goForward}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
              title="Avançar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={reload}
              className={`p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors ${isLoading ? 'animate-spin text-orange-400' : ''}`}
              title="Recarregar"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleUrlSubmit} className="flex-1">
            <div className="relative flex items-center">
              <Globe className="w-4 h-4 text-zinc-500 absolute left-3" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700/80 rounded-xl py-1.5 pl-9 pr-4 text-xs text-zinc-300 focus:outline-none transition-all placeholder-zinc-700"
                placeholder="Digite o endereço URL do site..."
              />
            </div>
          </form>

          {/* Atalhos Rápidos */}
          <div className="flex gap-2">
            <button
              onClick={toggleTheme}
              className="p-1.5 bg-zinc-950 border border-zinc-800 rounded-xl hover:text-white hover:border-zinc-700 transition-all text-zinc-400 flex items-center justify-center flex-shrink-0"
              title="Alternar Tema Claro/Escuro"
            >
              {themeMode === 'dark' ? <Sun className="w-4 h-4 text-orange-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
            </button>
            <button
              onClick={() => {
                const targetUrl = 'https://digen.ai/explore';
                setUrl(targetUrl);
                setInputValue(targetUrl);
                setInjTarget('digen');
                if (webviewRef.current) {
                  try { webviewRef.current.loadURL(targetUrl); } catch (e) { webviewRef.current.src = targetUrl; }
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                injTarget === 'digen'
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              Digen
            </button>
            <button
              onClick={() => {
                const targetUrl = 'https://labs.google/fx/pt/tools/flow';
                setUrl(targetUrl);
                setInputValue(targetUrl);
                setInjTarget('flow');
                if (webviewRef.current) {
                  try { webviewRef.current.loadURL(targetUrl); } catch (e) { webviewRef.current.src = targetUrl; }
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                injTarget === 'flow'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              Google Flow
            </button>
          </div>
        </div>

        {/* Webview Área */}
        <div className="flex-1 relative bg-black">
          {/* @ts-ignore */}
          <webview
            ref={webviewRef}
            src={url}
            partition="persist:injector-session"
            useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            className="w-full h-full"
            style={{ width: '100%', height: '100%', border: 'none', background: '#000' }}
          />
        </div>
      </div>

      {/* Fluxograma N8N de execução flutuante */}
      <N8NFlowchart
        queueLength={prompts ? 1 : 0}
        activeNode={activeNode}
        isGenerating={isAutomating}
        injectionTarget={injTarget}
        autoConfigStatus={autoConfigStatus}
        injectionProgressText={injectionProgressText}
        downloadStatus={downloadStatus}
        queueDelayRemaining={queueDelayRemaining}
        downloadDelayRemaining={downloadDelayRemaining}
        themeMode={themeMode}
      />
    </div>
  );
}

// ============================================================
// Espião Auto-Detect — Detecta campos automaticamente no DIGEN & Flow
// ============================================================

interface DetectedField {
  selector: string;
  tag: string;
  type: string;
  label: string;
  placeholder: string;
  value: string;
  visible: boolean;
  options?: string[];
  enabled?: boolean;
  category: 'prompt' | 'upload' | 'config' | 'action';
}

interface ScanResult {
  prompts: DetectedField[];
  uploads: DetectedField[];
  configs: DetectedField[];
  actions: DetectedField[];
  timestamp: number;
  url: string;
}



const SPY_SCAN_SCRIPT = `
(function() {
  function getCSSSelector(el) {
    if (el.id) return '#' + el.id;
    if (!el.parentElement) return el.tagName.toLowerCase();
    const siblings = Array.from(el.parentElement.children).filter(c => c.tagName === el.tagName);
    const idx = siblings.indexOf(el);
    const tag = el.tagName.toLowerCase();
    const cls = el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '';
    return tag + cls + (siblings.length > 1 ? ':nth-of-type(' + (idx + 1) + ')' : '');
  }

  function getLabel(el) {
    if (el.ariaLabel) return el.ariaLabel;
    if (el.title) return el.title;
    if (el.placeholder) return el.placeholder;
    if (el.name) return el.name;
    const label = el.closest('label') || document.querySelector('label[for="' + el.id + '"]');
    if (label) return label.textContent.trim().slice(0, 60);
    const prev = el.previousElementSibling;
    if (prev && (prev.tagName === 'LABEL' || prev.tagName === 'SPAN' || prev.tagName === 'P')) {
      return prev.textContent.trim().slice(0, 60);
    }
    const parent = el.parentElement;
    if (parent) {
      const parentLabel = parent.querySelector('label, .label, [class*="label"], [class*="title"]');
      if (parentLabel && parentLabel !== el) return parentLabel.textContent.trim().slice(0, 60);
    }
    return '';
  }

  function isVisible(el) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const s = window.getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
  }

  function classifyButton(text) {
    const t = (text || '').toLowerCase().trim();
    if (!t || t.length > 80) return null;
    if (/gerar|generate|create|criar|submit|enviar|go|run|start|iniciar/.test(t)) return 'generate';
    if (/download|baixar|save|salvar|export/.test(t)) return 'download';
    if (/upload|enviar|importar|carregar|import|selecionar/.test(t)) return 'upload';
    if (/record|gravar|mic/.test(t)) return 'record';
    if (/play|preview|reproduzir|visualizar/.test(t)) return 'preview';
    if (/extend|estender|continuar|continue/.test(t)) return 'extend';
    return null;
  }

  const fields = { prompts: [], uploads: [], configs: [], actions: [] };

  // 1. Prompts (textareas, inputs, contenteditable)
  document.querySelectorAll('textarea, input[type="text"], input[type="search"], [contenteditable="true"], [contenteditable=""]')
    .forEach(function(el) {
      if (el.closest('[hidden]') || el.type === 'hidden') return;
      fields.prompts.push({
        tag: el.tagName, type: 'text', selector: getCSSSelector(el),
        label: getLabel(el), placeholder: el.placeholder || '',
        value: (el.value || el.textContent || '').slice(0, 200),
        visible: isVisible(el), category: 'prompt'
      });
    });

  // 2. Uploads (file inputs, drop zones)
  document.querySelectorAll('input[type="file"]')
    .forEach(function(el) {
      fields.uploads.push({
        tag: 'INPUT', type: 'file', selector: getCSSSelector(el),
        label: getLabel(el) || 'Upload de arquivo',
        placeholder: '', value: '', accept: el.accept || '*',
        visible: isVisible(el), category: 'upload'
      });
    });
  // Drop zones heuristic
  document.querySelectorAll('[class*="drop"], [class*="upload"], [class*="drag"], [data-dropzone], [role="button"]')
    .forEach(function(el) {
      const text = (el.textContent || '').toLowerCase();
      if ((text.includes('drag') || text.includes('drop') || text.includes('upload') || text.includes('arrastr')) && text.length < 200) {
        fields.uploads.push({
          tag: el.tagName, type: 'dropzone', selector: getCSSSelector(el),
          label: el.textContent.trim().slice(0, 80),
          placeholder: '', value: '', visible: isVisible(el), category: 'upload'
        });
      }
    });

  // 3. Configs (selects, dropdowns, sliders, radio groups, tabs)
  document.querySelectorAll('select')
    .forEach(function(el) {
      fields.configs.push({
        tag: 'SELECT', type: 'select', selector: getCSSSelector(el),
        label: getLabel(el), placeholder: '',
        value: el.value, options: Array.from(el.options).map(function(o) { return o.text; }),
        visible: isVisible(el), category: 'config'
      });
    });
  document.querySelectorAll('[role="listbox"], [role="combobox"]')
    .forEach(function(el) {
      const opts = Array.from(el.querySelectorAll('[role="option"]')).map(function(o) { return o.textContent.trim(); });
      fields.configs.push({
        tag: el.tagName, type: 'dropdown', selector: getCSSSelector(el),
        label: getLabel(el), placeholder: '', value: '',
        options: opts, visible: isVisible(el), category: 'config'
      });
    });
  document.querySelectorAll('input[type="range"], [role="slider"]')
    .forEach(function(el) {
      fields.configs.push({
        tag: el.tagName, type: 'slider', selector: getCSSSelector(el),
        label: getLabel(el), placeholder: '',
        value: el.value || '', min: el.min, max: el.max,
        visible: isVisible(el), category: 'config'
      });
    });
  document.querySelectorAll('[role="tablist"]')
    .forEach(function(el) {
      const tabs = Array.from(el.querySelectorAll('[role="tab"]')).map(function(t) { return t.textContent.trim(); });
      fields.configs.push({
        tag: el.tagName, type: 'tabs', selector: getCSSSelector(el),
        label: getLabel(el) || 'Abas', placeholder: '',
        value: '', options: tabs, visible: isVisible(el), category: 'config'
      });
    });
  document.querySelectorAll('[role="radiogroup"]')
    .forEach(function(el) {
      const radios = Array.from(el.querySelectorAll('[role="radio"], input[type="radio"]')).map(function(r) { return r.textContent || r.value || ''; });
      fields.configs.push({
        tag: el.tagName, type: 'radiogroup', selector: getCSSSelector(el),
        label: getLabel(el), placeholder: '', value: '',
        options: radios.filter(Boolean), visible: isVisible(el), category: 'config'
      });
    });

  // 4. Action Buttons
  document.querySelectorAll('button, [role="button"], a[download]')
    .forEach(function(el) {
      var text = (el.textContent || el.ariaLabel || '').trim();
      var cat = classifyButton(text);
      if (cat) {
        fields.actions.push({
          tag: el.tagName, type: cat, selector: getCSSSelector(el),
          label: text.slice(0, 60), placeholder: '', value: '',
          visible: isVisible(el), enabled: !el.disabled, category: 'action'
        });
      }
    });

  // Event Listeners para gravação de ações do usuário
  if (!window.__SPY_LISTENERS_ATTACHED__) {
    window.__SPY_LISTENERS_ATTACHED__ = true;
    
    document.addEventListener('click', function(e) {
      const el = e.target;
      if (!el) return;
      const selector = getCSSSelector(el);
      const label = getLabel(el) || el.textContent?.trim().slice(0, 40) || el.value || '';
      console.log('__SPY_ACTION__:' + JSON.stringify({
        type: 'click',
        tag: el.tagName,
        selector: selector,
        label: label,
        timestamp: Date.now()
      }));
    }, true);

    document.addEventListener('input', function(e) {
      const el = e.target;
      if (!el) return;
      const selector = getCSSSelector(el);
      const value = el.value || el.textContent || '';
      console.log('__SPY_ACTION__:' + JSON.stringify({
        type: 'input',
        tag: el.tagName,
        selector: selector,
        value: value.slice(0, 300),
        label: getLabel(el),
        timestamp: Date.now()
      }));
    }, true);

    document.addEventListener('change', function(e) {
      const el = e.target;
      if (!el) return;
      const selector = getCSSSelector(el);
      if (el.type === 'file' && el.files) {
        const files = Array.from(el.files).map(f => f.name).join(', ');
        console.log('__SPY_ACTION__:' + JSON.stringify({
          type: 'file-upload',
          tag: el.tagName,
          selector: selector,
          value: files,
          label: getLabel(el) || 'Upload de arquivo',
          timestamp: Date.now()
        }));
      } else {
        console.log('__SPY_ACTION__:' + JSON.stringify({
          type: 'change',
          tag: el.tagName,
          selector: selector,
          value: el.value,
          label: getLabel(el),
          timestamp: Date.now()
        }));
      }
    }, true);
  }

  return JSON.stringify({
    prompts: fields.prompts, uploads: fields.uploads,
    configs: fields.configs, actions: fields.actions,
    timestamp: Date.now(), url: window.location.href
  });
})()
`;

const SPY_HIGHLIGHT_CSS = `
(function() {
  if (document.getElementById('spy-highlight-styles')) return;
  var style = document.createElement('style');
  style.id = 'spy-highlight-styles';
  style.textContent = [
    'textarea, input[type="text"], [contenteditable="true"], [contenteditable=""] { outline: 2px dashed rgba(249,115,22,0.6) !important; outline-offset: 2px !important; }',
    'input[type="file"] { outline: 2px dashed rgba(59,130,246,0.6) !important; outline-offset: 2px !important; }',
    'select, [role="listbox"], [role="combobox"], input[type="range"], [role="slider"] { outline: 2px dashed rgba(139,92,246,0.6) !important; outline-offset: 2px !important; }',
  ].join('\\n');
  document.head.appendChild(style);
})()
`;

const SPY_REMOVE_HIGHLIGHT = `
(function() {
  var el = document.getElementById('spy-highlight-styles');
  if (el) el.remove();
})()
`;

interface SpyAction {
  type: 'click' | 'input' | 'change' | 'file-upload';
  tag: string;
  selector: string;
  label: string;
  value?: string;
  timestamp: number;
  interpreted?: string;
  category?: 'prompt' | 'upload' | 'config' | 'action';
}

function SpyWindow() {
  const [url, setUrl] = useState('https://digen.ai/explore');
  const [inputValue, setInputValue] = useState('https://digen.ai/explore');
  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [highlightEnabled, setHighlightEnabled] = useState(true);
  const [numVideos, setNumVideos] = useState(3);
  const [numImages, setNumImages] = useState(5);
  const [contentType, setContentType] = useState<'avatar' | 'product' | 'video'>('avatar');
  const [spyData, setSpyData] = useState<any>(null);
  
  // Abas de Controle do espião
  const [spyTab, setSpyTab] = useState<'fields' | 'actions' | 'macro'>('fields');
  const [recordedActions, setRecordedActions] = useState<SpyAction[]>([]);

  const webviewRef = useRef<any>(null);

  // Receber dados do MainWindow
  useEffect(() => {
    if (window.electronAPI) {
      const unsubscribe = window.electronAPI.onSpyData((data) => {
        setSpyData(data);
      });
      window.electronAPI.spyReady();
      return unsubscribe;
    }
  }, []);

  // Webview events
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleStartLoad = () => setIsLoading(true);
    const handleStopLoad = () => {
      setIsLoading(false);
      // Auto-scan depois que a página terminar de carregar
      setTimeout(() => runScan(), 2000);
    };
    const handleNavigate = (e: any) => {
      setInputValue(e.url);
      setScanResult(null);
      setRecordedActions([]); // Limpar ações ao navegar
    };

    // Escutar mensagens do console da webview para gravar as ações
    const handleConsoleMessage = (e: any) => {
      const text = e.message || '';
      if (text.startsWith('__SPY_ACTION__:')) {
        try {
          const rawAction = JSON.parse(text.substring(15)) as SpyAction;
          interpretAndAddAction(rawAction);
        } catch (err) {
          console.error('Failed to parse spy action:', err);
        }
      }
    };

    webview.addEventListener('did-start-loading', handleStartLoad);
    webview.addEventListener('did-stop-loading', handleStopLoad);
    webview.addEventListener('did-navigate', handleNavigate);
    webview.addEventListener('did-navigate-in-page', handleNavigate);
    webview.addEventListener('console-message', handleConsoleMessage);

    return () => {
      webview.removeEventListener('did-start-loading', handleStartLoad);
      webview.removeEventListener('did-stop-loading', handleStopLoad);
      webview.removeEventListener('did-navigate', handleNavigate);
      webview.removeEventListener('did-navigate-in-page', handleNavigate);
      webview.removeEventListener('console-message', handleConsoleMessage);
    };
  }, [scanResult]);

  // Escutar downloads em tempo real no Espião
  useEffect(() => {
    if (window.electronAPI?.onDownloadEvent) {
      const removeListener = window.electronAPI.onDownloadEvent((data: any) => {
        if (data.type === 'download-completed') {
          const sizeMb = data.sizeBytes ? (data.sizeBytes / (1024 * 1024)).toFixed(2) + ' MB' : '';
          const downloadAction: SpyAction = {
            type: 'click',
            tag: 'DOWNLOAD',
            selector: data.savePath,
            label: `Download: ${data.filename}`,
            value: `${data.savePath} (${sizeMb})`,
            timestamp: data.timestamp || Date.now(),
            interpreted: `📥 Download Salvo: ${data.filename}`,
            category: 'action'
          };
          setRecordedActions(prev => {
            const next = [...prev, downloadAction];
            if (window.electronAPI?.writeSpyScanResults) {
              window.electronAPI.writeSpyScanResults({
                scan: scanResult,
                actions: next,
                macro: consolidateMacro(next)
              });
            }
            return next;
          });
        }
      });
      return () => removeListener();
    }
  }, [scanResult]);

  // Função para interpretar e adicionar a ação em tempo real
  const interpretAndAddAction = (action: SpyAction) => {
    let interpreted = '';
    let category: 'prompt' | 'upload' | 'config' | 'action' | undefined = undefined;

    // Tentar cruzar a ação com os campos escaneados do DOM
    if (scanResult) {
      const findField = (list: DetectedField[]) => list.find(f => f.selector === action.selector);
      
      const promptField = findField(scanResult.prompts);
      const uploadField = findField(scanResult.uploads);
      const configField = findField(scanResult.configs);
      const actionField = findField(scanResult.actions);

      if (promptField) {
        category = 'prompt';
        interpreted = action.type === 'input' 
          ? `Preencheu Prompt ("${action.value?.slice(0, 40)}...")`
          : `Clicou no campo de Prompt`;
      } else if (uploadField) {
        category = 'upload';
        interpreted = action.type === 'file-upload'
          ? `Carregou arquivo: ${action.value}`
          : `Iniciou upload de arquivo`;
      } else if (configField) {
        category = 'config';
        interpreted = action.type === 'change' || action.type === 'input'
          ? `Ajustou configuração [${configField.label || 'Opção'}] para: ${action.value}`
          : `Clicou na configuração [${configField.label || 'Opção'}]`;
      } else if (actionField) {
        category = 'action';
        const actionType = actionField.type === 'generate' ? 'Gerar Conteúdo' : (actionField.type === 'download' ? 'Download' : actionField.type);
        interpreted = `Clicou em Ação [${actionType}]`;
      }
    }

    // Heurísticas genéricas se o scan não mapeou o seletor exato
    if (!interpreted) {
      const lowerLabel = (action.label || '').toLowerCase();
      const lowerTag = action.tag.toLowerCase();

      if (action.type === 'input' || action.type === 'change') {
        if (lowerTag === 'textarea' || lowerLabel.includes('prompt') || lowerLabel.includes('script')) {
          interpreted = `Preencheu Prompt de texto ("${action.value?.slice(0, 40)}...")`;
          category = 'prompt';
        } else {
          interpreted = `Digitou no campo [${action.label || action.selector}]`;
        }
      } else if (action.type === 'file-upload') {
        interpreted = `Carregou arquivo: ${action.value}`;
        category = 'upload';
      } else if (action.type === 'click') {
        if (/generate|gerar|create|criar|submit/.test(lowerLabel)) {
          interpreted = `Clicou em Gerar`;
          category = 'action';
        } else if (/download|baixar|export/.test(lowerLabel)) {
          interpreted = `Clicou em Download`;
          category = 'action';
        } else if (/upload|import|carregar/.test(lowerLabel)) {
          interpreted = `Clicou em Upload`;
          category = 'upload';
        } else {
          interpreted = `Clicou em: ${action.label || action.tag}`;
        }
      }
    }

    const completedAction: SpyAction = {
      ...action,
      interpreted,
      category
    };

    setRecordedActions(prev => {
      const newActions = [...prev, completedAction];
      // Salvar progresso local
      if (window.electronAPI && window.electronAPI.writeSpyScanResults) {
        window.electronAPI.writeSpyScanResults({
          scan: scanResult,
          actions: newActions,
          macro: consolidateMacro(newActions)
        });
      }
      return newActions;
    });
  };

  // Consolida as ações do usuário em passos de macro lógicos
  const consolidateMacro = (actionsList: SpyAction[]) => {
    const steps: { step: number; title: string; selector: string; type: string; value?: string }[] = [];
    let stepCount = 1;

    actionsList.forEach((act) => {
      // Evitar cliques intermediários duplicados antes da digitação
      if (act.type === 'click' && (act.category === 'prompt' || act.category === 'config')) {
        return; 
      }
      
      const title = act.interpreted || `${act.type} em ${act.selector}`;
      steps.push({
        step: stepCount++,
        title,
        selector: act.selector,
        type: act.type,
        value: act.value
      });
    });

    return steps;
  };

  const updateSchemaFromScan = async (currentUrl: string, scan: ScanResult) => {
    if (!window.electronAPI) return;
    
    let siteName = '';
    if (currentUrl.includes('digen.ai')) {
      siteName = 'digen';
    } else if (currentUrl.includes('labs.google') || currentUrl.includes('google')) {
      siteName = 'flow';
    } else {
      return;
    }

    try {
      const currentSchema = await window.electronAPI.loadSiteSchema(siteName);
      const configs = currentSchema?.configs ? [...currentSchema.configs] : [];
      const actions = currentSchema?.actions ? [...currentSchema.actions] : [];

      scan.configs.forEach((scField) => {
        if (!scField.label) return;
        const existingIdx = configs.findIndex(c => c.label.toLowerCase() === scField.label!.toLowerCase());
        if (existingIdx !== -1) {
          configs[existingIdx].selector = scField.selector;
          if (scField.options && scField.options.length > 0) {
            const mergedOptions = Array.from(new Set([...(configs[existingIdx].options || []), ...scField.options]));
            configs[existingIdx].options = mergedOptions.filter(o => o.trim().length > 0);
          }
        } else {
          configs.push({
            label: scField.label,
            selector: scField.selector,
            type: scField.type,
            options: scField.options || []
          });
        }
      });

      scan.actions.forEach((scAct) => {
        const existingIdx = actions.findIndex(a => a.label.toLowerCase() === scAct.label.toLowerCase());
        if (existingIdx !== -1) {
          actions[existingIdx].selector = scAct.selector;
        } else {
          actions.push({
            label: scAct.label,
            selector: scAct.selector,
            type: scAct.type
          });
        }
      });

      await window.electronAPI.saveSiteSchema({
        siteName,
        configs,
        actions
      });
      
      console.log(`Schema de ${siteName} atualizado e persistido com sucesso!`);
    } catch (err) {
      console.error('Error updating site schema:', err);
    }
  };

  const runScan = async () => {
    if (!webviewRef.current) return;
    setIsScanning(true);
    try {
      const resultStr = await webviewRef.current.executeJavaScript(SPY_SCAN_SCRIPT);
      const result = JSON.parse(resultStr) as ScanResult;
      setScanResult(result);

      // Auto-update site schema persistido
      updateSchemaFromScan(url, result);

      if (window.electronAPI && window.electronAPI.writeSpyScanResults) {
        window.electronAPI.writeSpyScanResults({
          scan: result,
          actions: recordedActions,
          macro: consolidateMacro(recordedActions)
        });
      }

      if (highlightEnabled) {
        await webviewRef.current.executeJavaScript(SPY_HIGHLIGHT_CSS);
      }
    } catch (err) {
      console.error('Spy scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const toggleHighlight = async () => {
    const next = !highlightEnabled;
    setHighlightEnabled(next);
    if (webviewRef.current) {
      try {
        if (next) {
          await webviewRef.current.executeJavaScript(SPY_HIGHLIGHT_CSS);
        } else {
          await webviewRef.current.executeJavaScript(SPY_REMOVE_HIGHLIGHT);
        }
      } catch {}
    }
  };

  const goBack = () => { if (webviewRef.current?.canGoBack()) webviewRef.current.goBack(); };
  const goForward = () => { if (webviewRef.current?.canGoForward()) webviewRef.current.goForward(); };
  const reload = () => { if (webviewRef.current) webviewRef.current.reload(); };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let target = inputValue.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) target = 'https://' + target;
    setUrl(target);
    setInputValue(target);
  };

  const totalDetected = scanResult
    ? scanResult.prompts.length + scanResult.uploads.length + scanResult.configs.length + scanResult.actions.length
    : 0;

  const scenesCount = spyData?.generatedScript?.scenes?.length || 0;
  const anglesCount = spyData?.generatedAngles?.length || 0;

  const categoryIcon = (cat: string) => {
    switch (cat) {
      case 'prompt': return '📝';
      case 'upload': return '📤';
      case 'config': return '⚙️';
      case 'action': return '🎬';
      default: return '•';
    }
  };

  const FieldCard = ({ field, color }: { field: DetectedField; color: string; key?: React.Key }) => (
    <div className={`p-2.5 rounded-xl border transition-all hover:bg-white/5 ${field.visible ? `border-${color}-500/20 bg-${color}-500/[0.03]` : 'border-zinc-800 bg-zinc-900/30 opacity-50'}`}>
      <div className="flex items-start gap-2">
        <span className={`text-xs mt-0.5 ${field.visible ? `text-${color}-400` : 'text-zinc-600'}`}>
          {field.visible ? '✅' : '👁️‍🗨️'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-white/80 truncate">{field.label || field.type || field.tag}</span>
            <span className="text-[9px] text-zinc-500 font-mono shrink-0">{field.tag.toLowerCase()}</span>
          </div>
          {field.placeholder && (
            <p className="text-[10px] text-zinc-500 truncate mt-0.5 italic">"{field.placeholder}"</p>
          )}
          {field.options && field.options.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {field.options.slice(0, 6).map((opt, j) => (
                <span key={j} className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-md">{opt}</span>
              ))}
              {field.options.length > 6 && <span className="text-[9px] text-zinc-500">+{field.options.length - 6}</span>}
            </div>
          )}
          {field.value && (
            <p className="text-[10px] text-zinc-400 truncate mt-0.5">Valor: {field.value.slice(0, 60)}</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen dark bg-zinc-950 text-zinc-100 flex overflow-hidden font-sans select-none">
      {/* PAINEL ESQUERDO: CONTROLE E DETECÇÃO */}
      <div className="w-[380px] h-full border-r border-zinc-800 bg-zinc-900/60 backdrop-blur-md flex flex-col flex-shrink-0 overflow-hidden">

        {/* Topo */}
        <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/10 flex-shrink-0 text-lg">
            🔍
          </div>
          <div>
            <h1 className="font-bold text-sm bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Mapeador de Integrações</h1>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">Configuração Avançada de Sites</p>
          </div>
        </div>

        {/* Configuração do Usuário */}
        <div className="p-4 border-b border-zinc-800 space-y-3">
          <h3 className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
            <Settings2 className="w-3 h-3" /> Configuração
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 font-semibold">Qtd. Vídeos</label>
              <input
                type="number" min={1} max={20} value={numVideos}
                onChange={(e) => setNumVideos(Number(e.target.value) || 1)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 font-semibold">Qtd. Imagens</label>
              <input
                type="number" min={1} max={50} value={numImages}
                onChange={(e) => setNumImages(Number(e.target.value) || 1)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 font-semibold">Tipo de Conteúdo</label>
            <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 gap-0.5">
              {([
                { key: 'avatar' as const, label: 'Avatar Falante' },
                { key: 'product' as const, label: 'Produto' },
                { key: 'video' as const, label: 'Vídeo' },
              ]).map(t => (
                <button
                  key={t.key}
                  onClick={() => setContentType(t.key)}
                  className={`flex-1 py-1.5 text-[10px] rounded-md font-bold uppercase tracking-wider transition-all ${
                    contentType === t.key
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Abas de Controle */}
        <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-950/20 flex gap-1">
          {([
            { key: 'fields' as const, label: '📊 Campos' },
            { key: 'actions' as const, label: '📜 Timeline' },
            { key: 'macro' as const, label: '📦 Macro' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setSpyTab(tab.key)}
              className={`flex-1 py-1.5 text-[10px] rounded-lg font-bold uppercase tracking-wider transition-all border ${
                spyTab === tab.key
                  ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                  : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo da Aba */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            
            {spyTab === 'fields' && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                    Campos Mapeados
                  </h3>
                  {scanResult && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {totalDetected} encontrados
                    </span>
                  )}
                </div>

                {!scanResult && !isScanning && (
                  <div className="text-center py-8 text-zinc-600 text-xs">
                    <p className="mb-2">Aguardando scan...</p>
                    <p className="text-[10px]">Navegue para um site e o scan será automático</p>
                  </div>
                )}

                {isScanning && (
                  <div className="flex items-center justify-center gap-2 py-6 text-cyan-400/60 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" /> Escaneando DOM...
                  </div>
                )}

                {scanResult && (
                  <>
                    {/* Prompts */}
                    {scanResult.prompts.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-orange-400 uppercase tracking-widest flex items-center gap-1.5">
                          📝 Prompts ({scanResult.prompts.length})
                        </h4>
                        {scanResult.prompts.map((f, i) => <FieldCard key={`p${i}`} field={f} color="orange" />)}
                      </div>
                    )}

                    {/* Uploads */}
                    {scanResult.uploads.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                          📤 Uploads ({scanResult.uploads.length})
                        </h4>
                        {scanResult.uploads.map((f, i) => <FieldCard key={`u${i}`} field={f} color="blue" />)}
                      </div>
                    )}

                    {/* Configs */}
                    {scanResult.configs.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                          ⚙️ Configurações ({scanResult.configs.length})
                        </h4>
                        {scanResult.configs.map((f, i) => <FieldCard key={`c${i}`} field={f} color="purple" />)}
                      </div>
                    )}

                    {/* Actions */}
                    {scanResult.actions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                          🎬 Ações ({scanResult.actions.length})
                        </h4>
                        {scanResult.actions.map((f, i) => <FieldCard key={`a${i}`} field={f} color="emerald" />)}
                      </div>
                    )}

                    {totalDetected === 0 && (
                      <div className="text-center py-6 text-zinc-600 text-xs">
                        <p>Nenhum campo interativo detectado.</p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {spyTab === 'actions' && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                    Linha do Tempo de Ações
                  </h3>
                  <button
                    onClick={() => {
                      setRecordedActions([]);
                      if (window.electronAPI && window.electronAPI.writeSpyScanResults) {
                        window.electronAPI.writeSpyScanResults({ scan: scanResult, actions: [], macro: [] });
                      }
                    }}
                    className="text-[9px] font-bold text-red-400/80 hover:text-red-400 transition-colors uppercase"
                  >
                    Limpar
                  </button>
                </div>

                {recordedActions.length === 0 ? (
                  <div className="text-center py-12 text-zinc-600 text-xs bg-zinc-950/20 rounded-2xl border border-zinc-900 border-dashed">
                    <p className="font-semibold text-zinc-500 mb-1">Nenhuma ação gravada ainda.</p>
                    <p className="text-[10px] max-w-[200px] mx-auto text-zinc-600">Interaja com a página no painel direito (digite, clique, faça upload) para analisar as ações e seletores em tempo real.</p>
                  </div>
                ) : (
                  <div className="relative pl-4 space-y-4">
                    <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-zinc-800" />
                    {recordedActions.map((act, i) => {
                      const color = act.category === 'prompt' ? 'orange' : (act.category === 'upload' ? 'blue' : (act.category === 'config' ? 'purple' : (act.category === 'action' ? 'emerald' : 'zinc')));
                      return (
                        <div key={i} className="relative flex gap-3">
                          <div className={`absolute -left-[14px] w-2.5 h-2.5 rounded-full border-2 bg-zinc-900 border-${color}-500/80 mt-1`} />
                          <div className={`flex-1 p-2 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-1`}>
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-bold uppercase tracking-wider text-${color}-400`}>
                                {categoryIcon(act.category || '')} {act.interpreted}
                              </span>
                              <span className="text-[8px] text-zinc-600 font-mono">
                                {new Date(act.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-[9px] text-zinc-400 font-mono break-all font-semibold select-all bg-black/30 px-1.5 py-0.5 rounded border border-white/5">{act.selector}</p>
                            {act.value && (
                              <p className="text-[9px] text-zinc-300 italic">Valor: "{act.value.slice(0, 100)}"</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {spyTab === 'macro' && (
              <>
                <h3 className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                  Modelo de Macro Consolidado
                </h3>

                {recordedActions.length === 0 ? (
                  <div className="text-center py-12 text-zinc-600 text-xs bg-zinc-950/20 rounded-2xl border border-zinc-900 border-dashed">
                    <p className="font-semibold text-zinc-500">Nenhuma macro construída.</p>
                    <p className="text-[10px] mt-1">Grave ações na timeline para analisar.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">Macro Estruturada</span>
                        <button
                          onClick={() => {
                            const code = JSON.stringify(consolidateMacro(recordedActions), null, 2);
                            navigator.clipboard.writeText(code);
                            alert('Macro copiada para o clipboard!');
                          }}
                          className="text-[9px] bg-zinc-800 hover:bg-zinc-700 text-white px-2 py-1 rounded font-bold uppercase"
                        >
                          Copiar JSON
                        </button>
                      </div>
                      <pre className="text-[9px] font-mono text-zinc-400 bg-black/40 p-2.5 rounded-lg max-h-56 overflow-auto border border-white/5 select-all">
                        {JSON.stringify(consolidateMacro(recordedActions), null, 2)}
                      </pre>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase">Etapas Mapeadas</span>
                      {consolidateMacro(recordedActions).map((step, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 bg-zinc-950/30 border border-zinc-900 rounded-xl text-xs">
                          <span className="w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[10px] font-bold text-cyan-400">
                            {step.step}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[11px] text-white/80 truncate">{step.title}</p>
                            <p className="text-[8px] text-zinc-500 font-mono truncate">{step.selector}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </div>

        {/* Botões de Ação */}
        <div className="p-3 border-t border-zinc-800 flex gap-2">
          <button
            onClick={runScan}
            disabled={isScanning}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 text-xs font-bold hover:bg-cyan-500/20 transition-all disabled:opacity-50"
          >
            {isScanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />}
            Re-escanear
          </button>
          <button
            onClick={toggleHighlight}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
              highlightEnabled
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}
          >
            🎨 {highlightEnabled ? 'On' : 'Off'}
          </button>
        </div>

        {/* Dados Disponíveis do Gerador */}
        {spyData && (scenesCount > 0 || anglesCount > 0) && (
          <div className="p-3 border-t border-zinc-800 bg-zinc-950/50">
            <h4 className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5">
              <FileJson className="w-3 h-3" /> Dados do Gerador
            </h4>
            <div className="flex gap-2">
              {scenesCount > 0 && (
                <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold">
                  {scenesCount} cenas
                </span>
              )}
              {anglesCount > 0 && (
                <span className="text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded-full font-bold">
                  {anglesCount} ângulos
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* PAINEL DIREITO: WEBVIEW */}
      <div className="flex-1 h-full flex flex-col overflow-hidden bg-black">
        {/* Barra de Navegação */}
        <div className="p-3 bg-zinc-900 border-b border-zinc-800 flex items-center gap-2.5 flex-shrink-0">
          <div className="flex items-center gap-1">
            <button onClick={goBack} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors" title="Voltar">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={goForward} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors" title="Avançar">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={reload} className={`p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors ${isLoading ? 'animate-spin text-cyan-400' : ''}`} title="Recarregar">
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleUrlSubmit} className="flex-1">
            <div className="relative flex items-center">
              <Globe className="w-4 h-4 text-zinc-500 absolute left-3" />
              <input
                type="text" value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500/40 rounded-xl py-1.5 pl-9 pr-4 text-xs text-zinc-300 focus:outline-none transition-all placeholder-zinc-700"
                placeholder="Digite o endereço URL..."
              />
            </div>
          </form>

          {/* Quick Links */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                const targetUrl = 'https://digen.ai/explore';
                if (url !== targetUrl) {
                  setUrl(targetUrl);
                  setInputValue(targetUrl);
                } else if (webviewRef.current) {
                  try { webviewRef.current.loadURL(targetUrl); } catch (e) { webviewRef.current.src = targetUrl; }
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                inputValue.includes('digen.ai')
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              Digen
            </button>
            <button
              onClick={() => {
                const targetUrl = 'https://labs.google/fx/pt/tools/flow';
                if (url !== targetUrl) {
                  setUrl(targetUrl);
                  setInputValue(targetUrl);
                } else if (webviewRef.current) {
                  try { webviewRef.current.loadURL(targetUrl); } catch (e) { webviewRef.current.src = targetUrl; }
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                inputValue.includes('labs.google')
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              Google Flow
            </button>
          </div>
        </div>

        {/* Webview */}
        <div className="flex-1 relative bg-black">
          {/* @ts-ignore */}
          <webview
            ref={webviewRef}
            src={url}
            partition="persist:spy-session"
            useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            className="w-full h-full"
            style={{ width: '100%', height: '100%', border: 'none', background: '#000' }}
          />
        </div>
      </div>
    </div>
  );
}
