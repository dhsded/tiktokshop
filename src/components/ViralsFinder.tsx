import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Search, 
  Play, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  TrendingUp, 
  Eye, 
  Heart, 
  Loader2, 
  X, 
  AlertCircle,
  Package, 
  RefreshCw, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ArrowUpDown,
  Share2,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Tag
} from 'lucide-react';

export interface ViralVideoItem {
  id: string;
  url: string;
  title: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  coverUrl: string;
  viewsCount: number;
  viewsFormatted: string;
  likesCount?: number;
  likesFormatted?: string;
  ranking: number;
  hasShopAnchor: boolean;
  relevanceScore: number;
  isExactMatch?: boolean;
  matchScore?: number;
  matchLabel?: string;
  duration?: string;
}

export interface ProductViralData {
  productId: string;
  originalUrl: string;
  title: string;
  mainImage: string;
  price: string;
  shopName: string;
  description?: string;
  detectedSearchTerm?: string;
  suggestedTerms?: string[];
  totalViews: number;
  totalViewsFormatted: string;
  topViralViews: number;
  topViralViewsFormatted: string;
  averageViews: number;
  averageViewsFormatted: string;
  exactMatchCount?: number;
  videos: ViralVideoItem[];
}

interface ViralsFinderProps {
  themeMode: 'dark' | 'light';
  onUseForScript?: (productData: { title: string; image: string; description: string; price: string }) => void;
}

// Utilitários de formatação e parsing de métricas
export function parseViewsNumber(str: any): number {
  if (typeof str === 'number') return Math.round(str);
  if (!str) return 0;
  const clean = String(str)
    .replace(/views?/i, '')
    .replace(/visualizações/i, '')
    .replace(/\s+/g, '')
    .trim();
  const lastChar = clean.slice(-1).toUpperCase();
  const num = parseFloat(clean.replace(',', '.'));
  if (isNaN(num)) return 0;
  if (lastChar === 'B') return Math.round(num * 1000000000);
  if (lastChar === 'M') return Math.round(num * 1000000);
  if (lastChar === 'K') return Math.round(num * 1000);
  return Math.round(num);
}

export function formatViewsNumber(num: number): string {
  if (!num || isNaN(num)) return '0';
  if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace('.0', '') + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'K';
  return num.toLocaleString('pt-BR');
}

export function extractProductId(url: string): string | null {
  if (!url) return null;
  // 1. https://shop.tiktok.com/{locale}/pdp/{id}
  const pdpMatch = url.match(/\/pdp\/([0-9]{15,25})/i);
  if (pdpMatch) return pdpMatch[1];

  // 2. https://www.tiktok.com/view/product/{id}
  const viewMatch = url.match(/\/product\/([0-9]{15,25})/i);
  if (viewMatch) return viewMatch[1];

  // 3. Query param ?product_id=...
  const queryMatch = url.match(/[?&]product_id=([0-9]{15,25})/i);
  if (queryMatch) return queryMatch[1];

  // 4. Sequência longa de dígitos isolada
  const genericMatch = url.match(/([0-9]{18,22})/);
  if (genericMatch) return genericMatch[1];

  return null;
}

// Script de extração da PDP do produto (Título, Preço, Loja, Imagem e Descrição Completa/Medidas)
const PDP_EXTRACTOR_SCRIPT = `
(() => {
  try {
    let title = '';
    const titleEl = document.querySelector('h1') || 
                    document.querySelector('[data-testid*="title"]') || 
                    document.querySelector('[class*="product-title"]') || 
                    document.querySelector('[class*="product_name"]') ||
                    document.querySelector('[class*="title"]');
    if (titleEl) {
      title = (titleEl.textContent || titleEl.innerText || '').trim();
    } else {
      title = (document.title || '').replace(/\\s*\\|\\s*TikTok\\s*Shop.*/i, '').replace(/\\s*\\|\\s*TikTok.*/i, '').trim();
    }

    let price = '';
    const priceEl = document.querySelector('[class*="price-val"],[class*="price_val"],[class*="sale-price"],[class*="product-price"],[data-testid*="price"]');
    if (priceEl) price = (priceEl.textContent || priceEl.innerText || '').trim();

    let shopName = '';
    const shopEl = document.querySelector('[class*="seller-name"],[class*="shop-name"],[class*="seller_name"],[data-testid*="shop"]');
    if (shopEl) shopName = (shopEl.textContent || shopEl.innerText || '').trim();

    let mainImage = '';
    const imgEl = document.querySelector('[class*="main-image"] img,[class*="gallery"] img,[class*="product-image"] img,img[src*="tiktokcdn"]');
    if (imgEl && imgEl.src) mainImage = imgEl.src;

    // 1. Tentar auto-expandir accordions / botões de descrição
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

    return {
      success: true,
      title,
      price,
      shopName,
      mainImage,
      description: finalDescription
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
})()
`;

// Funções de análise de termos e validação rigorosa de similaridade do produto
export interface ProductTermsAnalysis {
  coreNoun: string;
  coreMaterial: string;
  coreStyle: string;
  primaryQuery: string;
  fallbackQuery: string;
  suggestedTerms: string[];
  competingCategories: string[];
}

export function extractProductSearchTerms(productTitle: string, description?: string): ProductTermsAnalysis {
  const cleanTitle = (productTitle || '')
    .replace(/[^\w\s\u00C0-\u00FF]/gi, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();

  // 1. Identificar substantivo principal (categoria do item)
  const NOUN_MAP: Record<string, string[]> = {
    short: ['short', 'shorts', 'bermuda', 'bermudas'],
    vestido: ['vestido', 'vestidos'],
    calça: ['calça', 'calca', 'calças', 'calcas', 'pantalona', 'pantacourt', 'legging', 'jeans'],
    conjunto: ['conjunto', 'conjuntinho'],
    saia: ['saia', 'saias'],
    macacão: ['macacão', 'macacao', 'macaquinho'],
    cropped: ['cropped', 'top'],
    camisa: ['camisa', 'camiseta', 't-shirt', 'tshirt', 'blusa'],
    casaco: ['casaco', 'jaqueta', 'cardigan', 'blazer', 'moletom'],
    tênis: ['tênis', 'tenis', 'sapato', 'sandália', 'sandalia', 'chinelo', 'bota'],
    bolsa: ['bolsa', 'bolsas', 'mochila', 'bag']
  };

  let coreNoun = '';
  for (const [key, variants] of Object.entries(NOUN_MAP)) {
    if (variants.some(v => new RegExp(`\\b${v}\\b`, 'i').test(cleanTitle))) {
      coreNoun = key;
      break;
    }
  }

  const stopWords = new Set(['de', 'para', 'com', 'em', 'da', 'do', 'dos', 'das', 'um', 'uma', 'e', 'o', 'a', 'kit', 'frete', 'gratis', 'promocao', 'novo', 'original', 'no', 'na', 'nos', 'nas', 'por', 'sobre']);
  const titleWords = cleanTitle.split(' ').filter(w => w.length > 2 && !stopWords.has(w));
  if (!coreNoun && titleWords.length > 0) {
    coreNoun = titleWords[0];
  }

  // 2. Identificar tecido / material
  const FABRICS = [
    'duna', 'linho', 'viscose', 'crepe', 'algodão', 'algodao', 'canelado', 'tule', 'tricot',
    'alfaiataria', 'seda', 'jeans', 'sarja', 'poliamida', 'suplex', 'viscolycra', 'cetim',
    'veludo', 'moletom', 'couro', 'tactel', 'microfibra'
  ];
  let coreMaterial = '';
  for (const f of FABRICS) {
    if (new RegExp(`\\b${f}\\b`, 'i').test(cleanTitle) || (description && new RegExp(`\\b${f}\\b`, 'i').test(description.toLowerCase()))) {
      coreMaterial = f;
      break;
    }
  }

  // 3. Identificar estilo / estampa
  const STYLES = ['listrado', 'listrada', 'listras', 'estampado', 'floral', 'liso', 'amplo', 'casual', 'plussize', 'plus size', 'elegante'];
  let coreStyle = '';
  for (const s of STYLES) {
    if (new RegExp(`\\b${s}\\b`, 'i').test(cleanTitle)) {
      coreStyle = s.replace('listras', 'listrado').replace('listrada', 'listrado');
      break;
    }
  }

  let primaryParts = [coreNoun];
  if (coreMaterial) primaryParts.push(coreMaterial);
  if (coreStyle && primaryParts.length < 3) primaryParts.push(coreStyle);
  const primaryQuery = primaryParts.filter(Boolean).join(' ') || titleWords.slice(0, 3).join(' ');

  let fallbackParts = [coreNoun];
  if (coreMaterial) fallbackParts.push(coreMaterial);
  else if (titleWords.length > 1) fallbackParts.push(titleWords[1]);
  const fallbackQuery = fallbackParts.filter(Boolean).join(' ');

  const suggestedTerms = [
    primaryQuery,
    fallbackQuery,
    [coreNoun, coreStyle].filter(Boolean).join(' '),
    titleWords.slice(0, 3).join(' ')
  ].filter((v, idx, arr) => v && arr.indexOf(v) === idx);

  const COMPETING_MAP: Record<string, string[]> = {
    short: ['vestido', 'calça', 'calca', 'macacão', 'macacao', 'saia', 'cropped', 'blusa', 'blazer', 'jaqueta'],
    vestido: ['short', 'calça', 'calca', 'saia', 'cropped', 'blusa', 'bermuda'],
    calça: ['vestido', 'short', 'saia', 'cropped', 'bermuda'],
    saia: ['calça', 'calca', 'vestido', 'short', 'macacão', 'macacao'],
    cropped: ['vestido', 'calça', 'calca', 'saia', 'macacão'],
    tênis: ['chinelo', 'sandália', 'sandalia', 'bota', 'salto']
  };
  const competingCategories = COMPETING_MAP[coreNoun.toLowerCase()] || [];

  return {
    coreNoun,
    coreMaterial,
    coreStyle,
    primaryQuery,
    fallbackQuery,
    suggestedTerms,
    competingCategories
  };
}

export function validateAndScoreVideo(
  video: ViralVideoItem, 
  analysis: ProductTermsAnalysis, 
  productId: string, 
  shopName?: string
): { isExactMatch: boolean; matchScore: number; matchLabel: string } {
  const text = (video.title + ' ' + video.authorName + ' ' + video.authorHandle).toLowerCase();
  
  // 1. Exclusão Negativa (Falso Positivo)
  if (analysis.coreNoun) {
    const hasCompeting = analysis.competingCategories.some(cat => text.includes(cat));
    const hasCoreNoun = text.includes(analysis.coreNoun);
    if (hasCompeting && !hasCoreNoun) {
      return {
        isExactMatch: false,
        matchScore: 0,
        matchLabel: '❌ Outro Produto'
      };
    }
  }

  let score = 0;
  let matches = 0;

  if (analysis.coreNoun && text.includes(analysis.coreNoun)) {
    score += 40;
    matches++;
  }

  if (analysis.coreMaterial && text.includes(analysis.coreMaterial)) {
    score += 35;
    matches++;
  }

  if (analysis.coreStyle && (text.includes(analysis.coreStyle) || text.includes('listra'))) {
    score += 20;
    matches++;
  }

  if (video.hasShopAnchor) {
    score += 25;
  }

  if (shopName && text.includes(shopName.toLowerCase())) {
    score += 30;
  }

  if (productId && text.includes(productId)) {
    score += 50;
  }

  const hasCoreAndMaterial = analysis.coreNoun && analysis.coreMaterial 
    ? (text.includes(analysis.coreNoun) && text.includes(analysis.coreMaterial))
    : (matches >= 2);

  const isExactMatch = hasCoreAndMaterial || score >= 70;
  
  let matchLabel = '🟡 Variação Direta';
  if (isExactMatch) {
    matchLabel = '🟢 Match Exato (Mesmo Produto)';
  } else if (score < 30) {
    matchLabel = '⚪ Relevância Ampla';
  }

  return {
    isExactMatch,
    matchScore: score,
    matchLabel
  };
}

// Script de extração profunda de vídeos — Método 1: JSON da página / Método 2: DOM atualizado
const SEARCH_VIDEOS_SCRAPER_SCRIPT = `
(() => {
  try {
    const parseViews = (str) => {
      if (!str) return 0;
      const clean = String(str).replace(/views?/i, '').replace(/visualizações/i, '').replace(/\s+/g, '').trim();
      const mult = clean.slice(-1).toUpperCase();
      const num = parseFloat(clean.replace(',', '.'));
      if (isNaN(num)) return 0;
      if (mult === 'B') return Math.round(num * 1000000000);
      if (mult === 'M') return Math.round(num * 1000000);
      if (mult === 'K') return Math.round(num * 1000);
      return Math.round(num);
    };

    const formatViews = (num) => {
      if (!num) return '0';
      if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace('.0', '') + 'B';
      if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'K';
      return String(num);
    };

    const videos = [];
    const seenIds = new Set();

    const addVideo = (v) => {
      if (!v || !v.id || seenIds.has(String(v.id))) return;
      seenIds.add(String(v.id));
      videos.push({
        id: String(v.id),
        url: v.url || '',
        title: String(v.title || '').substring(0, 500),
        authorName: v.authorName || v.authorHandle || 'criador',
        authorHandle: v.authorHandle || '@criador',
        authorAvatar: v.authorAvatar || '',
        coverUrl: v.coverUrl || '',
        viewsCount: Number(v.viewsCount) || 0,
        viewsFormatted: v.viewsFormatted || formatViews(Number(v.viewsCount) || 0),
        likesCount: Number(v.likesCount) || 0,
        likesFormatted: v.likesFormatted || formatViews(Number(v.likesCount) || 0),
        hasShopAnchor: Boolean(v.hasShopAnchor),
        duration: ''
      });
    };

    // =========================================================
    // MÉTODO 1: Extrair do JSON embutido na página (mais robusto)
    // =========================================================
    try {
      const extractFromItemList = (itemList) => {
        if (!Array.isArray(itemList) || itemList.length === 0) return;
        for (const item of itemList) {
          try {
            const videoId = String(item?.id || item?.aweme_id || item?.video?.id || '');
            if (!videoId || videoId.length < 5) continue;
            const author = item?.author || item?.authorInfo || {};
            const handle = String(author?.uniqueId || author?.unique_id || author?.handle || '');
            const stats = item?.stats || item?.statistics || item?.video?.stats || {};
            const playCount = Number(stats?.playCount || stats?.play_count || stats?.viewCount || stats?.view_count || 0);
            const diggCount = Number(stats?.diggCount || stats?.digg_count || stats?.likeCount || stats?.like_count || 0);
            const vid = item?.video || {};
            const cover = vid?.cover || vid?.dynamicCover || vid?.originCover || vid?.coverUrl || vid?.thumbnail || item?.thumbnail || '';
            const hasShop = Boolean(
              (item?.anchors && item.anchors.length > 0) ||
              item?.video?.commerceInfo?.useCase ||
              item?.adAuthorization ||
              (String(item?.desc || '')).toLowerCase().includes('#tiktokshop') ||
              (String(item?.desc || '')).toLowerCase().includes('#shop')
            );
            addVideo({
              id: videoId,
              url: handle ? 'https://www.tiktok.com/@' + handle + '/video/' + videoId : 'https://www.tiktok.com/video/' + videoId,
              title: item?.desc || item?.title || item?.caption || '',
              authorName: author?.nickname || author?.name || handle,
              authorHandle: handle ? (handle.startsWith('@') ? handle : '@' + handle) : '@criador',
              authorAvatar: author?.avatarThumb || (Array.isArray(author?.avatar_thumb?.url_list) ? author.avatar_thumb.url_list[0] : '') || author?.avatar || '',
              coverUrl: cover,
              viewsCount: playCount,
              viewsFormatted: formatViews(playCount),
              likesCount: diggCount,
              likesFormatted: formatViews(diggCount),
              hasShopAnchor: hasShop,
            });
          } catch(e) {}
        }
      };

      // Tenta __UNIVERSAL_DATA_FOR_REHYDRATION__ (estrutura mais comum no TikTok Web 2024+)
      const udr = window.__UNIVERSAL_DATA_FOR_REHYDRATION__;
      if (udr) {
        const scope = udr['__DEFAULT_SCOPE__'] || udr;
        for (const key of Object.keys(scope)) {
          const kl = key.toLowerCase();
          if (kl.includes('search') || kl.includes('feed') || kl.includes('list')) {
            const val = scope[key];
            const list = val?.itemList || val?.searchItemList || val?.videoList || 
                        val?.data?.itemList || val?.data?.videoList || val?.data || [];
            extractFromItemList(Array.isArray(list) ? list : []);
          }
        }
      }

      // Tenta SIGI_STATE (estrutura antiga/alternativa)
      if (window.SIGI_STATE && videos.length < 5) {
        const s = window.SIGI_STATE;
        const itemModule = s?.ItemModule || s?.videoData || {};
        // Tenta extrair IDs da lista de busca
        const itemIds = s?.SearchPage?.videoIds || s?.search?.videoIds || s?.search?.itemIds || [];
        if (Array.isArray(itemIds) && itemIds.length > 0) {
          extractFromItemList(itemIds.map(id => itemModule[id]).filter(Boolean));
        } else {
          // Fallback: todos os itens do módulo
          extractFromItemList(Object.values(itemModule));
        }
      }

      // Tenta __NEXT_DATA__ (Next.js SSR)
      if (window.__NEXT_DATA__ && videos.length < 5) {
        const nd = window.__NEXT_DATA__?.props?.pageProps;
        const list = nd?.itemList || nd?.videoList || nd?.data?.itemList || nd?.searchResults || [];
        extractFromItemList(Array.isArray(list) ? list : []);
      }

      // Varredura genérica em scripts da página
      if (videos.length < 3) {
        const scripts = Array.from(document.querySelectorAll('script[type="application/json"], script:not([src])'));
        for (const script of scripts) {
          try {
            const text = script.textContent || '';
            if (!text.includes('playCount') && !text.includes('play_count') && !text.includes('aweme_list')) continue;
            if (text.length > 2000000) continue; // skip muito grandes
            const parsed = JSON.parse(text);
            // Busca recursiva por listas de vídeos no JSON
            const findVideoLists = (obj, depth) => {
              if (!obj || depth > 6 || typeof obj !== 'object') return;
              for (const k of Object.keys(obj)) {
                const val = obj[k];
                if (Array.isArray(val) && val.length > 0 && val[0]?.id && (val[0]?.stats || val[0]?.statistics)) {
                  extractFromItemList(val);
                } else if (typeof val === 'object') {
                  findVideoLists(val, depth + 1);
                }
              }
            };
            findVideoLists(parsed, 0);
          } catch(e) {}
        }
      }
    } catch(e) {}

    // =========================================================
    // MÉTODO 2: Extração via DOM — seletores atualizados 2025/2026
    // =========================================================
    if (videos.length < 3) {
      const links = Array.from(document.querySelectorAll('a[href*="/video/"]'));
      for (const a of links) {
        try {
          const href = a.href;
          const m = href.match(/\/video\/([0-9]+)/);
          if (!m) continue;
          const id = m[1];
          if (seenIds.has(id)) continue;

          // Estratégia de card: múltiplas tentativas de container
          const card =
            a.closest('[class*="DivItemContainerV2"]') ||
            a.closest('[class*="video-feed-item"]') ||
            a.closest('[class*="tiktok-x6y88p"]') ||
            a.closest('[class*="css-x6y88p"]') ||
            a.closest('article') ||
            a.closest('li[class]') ||
            a.closest('[data-e2e*="search"]')?.closest('div[class]') ||
            (a.parentElement?.parentElement?.parentElement) ||
            a.parentElement;

          let viewsRaw = '';
          if (card) {
            const viewsEl = card.querySelector(
              'strong[data-e2e="video-views"], [class*="video-count"], [class*="VideoCount"], ' +
              '[class*="view-count"], [class*="StrongVideoCount"], strong, [data-e2e*="view"]'
            );
            if (viewsEl) viewsRaw = (viewsEl.innerText || viewsEl.textContent || '').trim();
          }
          if (!viewsRaw && a.innerText) {
            const lines = a.innerText.split('\n').map(x => x.trim()).filter(Boolean);
            if (lines.length > 0 && /^[0-9]/.test(lines[0])) viewsRaw = lines[0];
          }

          let title = '';
          if (card) {
            const captionEl = card.querySelector(
              '[data-e2e="search-card-video-caption"], [data-e2e="search-card-desc"], ' +
              '[class*="DivDescriptionContainer"], [class*="DivMetaCaptionLine"], ' +
              '[class*="video-caption"], [class*="CardCaption"], [class*="caption"], ' +
              '[class*="desc-wrapper"], h3, h2'
            );
            if (captionEl) title = (captionEl.innerText || captionEl.textContent || '').trim();
          }
          if (!title && card) {
            const spans = Array.from(card.querySelectorAll('span, p')).map(s => (s.innerText || '').trim()).filter(s => s.length > 10);
            if (spans.length > 0) title = spans[0];
          }

          let authorHandle = '';
          if (card) {
            const authorEl = card.querySelector(
              '[data-e2e="search-card-user-unique-id"], [class*="PUniqueId"], ' +
              '[data-e2e="search-card-user-link"], [class*="author-uniqueId"], ' +
              '[class*="AuthorTitle"], [class*="user-handle"], [class*="uniqueId"]'
            );
            if (authorEl) authorHandle = (authorEl.innerText || authorEl.textContent || '').trim();
          }
          if (!authorHandle) {
            const uMatch = href.match(/@([^\/]+)/);
            if (uMatch) authorHandle = uMatch[1];
          }
          if (!authorHandle) authorHandle = 'criador';

          let authorAvatar = '';
          if (card) {
            const avImg = card.querySelector('[data-e2e="search-card-user-avatar"] img, [class*="Avatar"] img, img[class*="avatar"]');
            if (avImg?.src) authorAvatar = avImg.src;
          }

          let coverUrl = '';
          if (card) {
            const img = card.querySelector('img[src*="tiktokcdn"], img[src*="byteoversea"], img[src*="p16-sign"], img[src*="p77-sign"], img[src*="muscdn"], img');
            if (img?.src && !img.src.includes('data:')) coverUrl = img.src;
          }

          const cardText = card ? (card.innerText || '').toLowerCase() : '';
          const hasShopAnchor = Boolean(
            (card && card.querySelector('[data-e2e="search-card-anchor"], [class*="ShopAnchor"], [class*="shop-anchor"]')) ||
            cardText.includes('shop') || cardText.includes('compre') || cardText.includes('carrinho') ||
            title.toLowerCase().includes('#tiktokshop') || title.toLowerCase().includes('#shop')
          );

          const viewsCount = parseViews(viewsRaw);
          seenIds.add(id);
          videos.push({
            id,
            url: href,
            title,
            authorName: authorHandle,
            authorHandle: authorHandle.startsWith('@') ? authorHandle : '@' + authorHandle,
            authorAvatar,
            coverUrl,
            viewsCount,
            viewsFormatted: viewsRaw || formatViews(viewsCount),
            likesCount: 0,
            likesFormatted: '0',
            hasShopAnchor,
            duration: ''
          });
        } catch(err) {}
      }
    }

    return { success: true, totalFound: videos.length, videos };
  } catch(e) {
    return { success: false, error: String(e), videos: [] };
  }
})()
`;

export const ViralsFinder: React.FC<ViralsFinderProps> = ({ themeMode, onUseForScript }) => {
  const [productUrl, setProductUrl] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchStep, setSearchStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBrowserVisible, setIsBrowserVisible] = useState(false);
  const [results, setResults] = useState<ProductViralData | null>(null);
  
  // Filtros internos da grade dos 30
  const [queryFilter, setQueryFilter] = useState('');
  const [sortBy, setSortBy] = useState<'views' | 'recent' | 'likes'>('views');
  const [onlyExactMatch, setOnlyExactMatch] = useState(false);
  const [customSearchQuery, setCustomSearchQuery] = useState('');
  const [manualProductName, setManualProductName] = useState('');
  const [rawVideoCount, setRawVideoCount] = useState<number>(0);

  // Modal do Player de Vídeo
  const [selectedVideo, setSelectedVideo] = useState<ViralVideoItem | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [showProductDesc, setShowProductDesc] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);

  const webviewRef = useRef<any>(null);
  const webviewReadyRef = useRef(false);

  // Exemplo rápido
  const handleLoadExample = () => {
    setProductUrl('https://shop.tiktok.com/br/pdp/1734467095653156701');
    setCustomSearchQuery('');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  // Executa a busca automatizada dos 30 virais
  const handleStartSearch = async (overrideTerm?: string | React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent) => {
    // Garante que overrideTerm seja apenas uma string válida (ignora eventos React passados como onClick handler)
    const safeTerm = typeof overrideTerm === 'string' ? overrideTerm : undefined;
    const rawUrl = productUrl.trim();
    if (!rawUrl) {
      setErrorMessage('Por favor, insira o link do produto no TikTok Shop.');
      return;
    }

    const productId = extractProductId(rawUrl);
    if (!productId) {
      setErrorMessage('Não foi possível identificar o ID do produto no link fornecido. Verifique o link (ex: https://shop.tiktok.com/br/pdp/1734467095653156701).');
      return;
    }

    setErrorMessage(null);
    setIsSearching(true);
    setResults(null);
    setOnlyExactMatch(false);   // Resetar filtro entre buscas
    setRawVideoCount(0);

    const webview = webviewRef.current;
    if (!webview) {
      setErrorMessage('O componente de busca interna não foi inicializado. Tente novamente.');
      setIsSearching(false);
      return;
    }

    try {
      // ----------------------------------------------------
      // ETAPA 0: Limpar qualquer rastro de login / sessão (100% Anônimo)
      // ----------------------------------------------------
      try {
        if (window.electronAPI && typeof (window.electronAPI as any).clearViralsSession === 'function') {
          await (window.electronAPI as any).clearViralsSession();
        }
      } catch (e) {}

      // ----------------------------------------------------
      // ETAPA 1: Carregar a página do produto (PDP)
      // ----------------------------------------------------
      setSearchStep(`1/4: Conectando anonimamente à página do produto (ID: ${productId})...`);
      
      const targetPdpUrl = rawUrl.includes('tiktok.com') 
        ? rawUrl 
        : `https://www.tiktok.com/view/product/${productId}`;

      await new Promise<void>((resolve) => {
        let timeout: any;
        const onDomReady = () => {
          clearTimeout(timeout);
          webview.removeEventListener('dom-ready', onDomReady);
          resolve();
        };
        webview.addEventListener('dom-ready', onDomReady);
        webview.loadURL(targetPdpUrl);
        timeout = setTimeout(() => {
          webview.removeEventListener('dom-ready', onDomReady);
          resolve();
        }, 12000);
      });

      // Aguarda estabilização do DOM
      await new Promise(r => setTimeout(r, 2000));

      // Extrai dados oficiais do produto
      setSearchStep('2/4: Extraindo características e atributos reais do produto...');
      const pdpData = await webview.executeJavaScript(PDP_EXTRACTOR_SCRIPT);
      
      let productTitle = pdpData?.title || '';
      let mainImage = pdpData?.mainImage || '';
      let price = pdpData?.price || '';
      let shopName = pdpData?.shopName || '';
      let productDesc = pdpData?.description || '';

      // Verifica se o título extraído é genérico/inválido
      const GENERIC_TITLES = ['produto tiktok shop', 'produto tiktok', 'tiktok shop', ''];
      const titleIsGeneric = !productTitle || GENERIC_TITLES.includes(productTitle.toLowerCase().trim()) || productTitle.trim().length < 5;

      // Se o título for genérico, tentar URL alternativa (tiktok.com/view/product)
      if (titleIsGeneric) {
        try {
          setSearchStep('2/4: Tentando URL alternativa do produto (tiktok.com/view/product)...');
          const altUrl = `https://www.tiktok.com/view/product/${productId}`;
          await new Promise<void>((resolve) => {
            let t: any;
            const cb = () => { clearTimeout(t); webview.removeEventListener('dom-ready', cb); resolve(); };
            webview.addEventListener('dom-ready', cb);
            webview.loadURL(altUrl);
            t = setTimeout(() => { webview.removeEventListener('dom-ready', cb); resolve(); }, 10000);
          });
          await new Promise(r => setTimeout(r, 2500));
          const altData = await webview.executeJavaScript(PDP_EXTRACTOR_SCRIPT);
          if (altData?.title && !GENERIC_TITLES.includes((altData.title || '').toLowerCase().trim()) && altData.title.trim().length >= 5) {
            productTitle = altData.title;
            if (!mainImage && altData.mainImage) mainImage = altData.mainImage;
            if (!price && altData.price) price = altData.price;
            if (!shopName && altData.shopName) shopName = altData.shopName;
            if (!productDesc && altData.description) productDesc = altData.description;
          }
        } catch (altErr) {
          // Ignora erros na tentativa alternativa e continua com o que temos
          console.warn('[BuscadorVirais] URL alternativa falhou, continuando sem título:', altErr);
        }
      }

      // Fallback final: usar nome manual ou ID do produto
      const finalTitleIsGeneric = !productTitle || GENERIC_TITLES.includes(productTitle.toLowerCase().trim()) || productTitle.trim().length < 5;
      if (finalTitleIsGeneric) {
        if (manualProductName.trim().length > 2) {
          productTitle = manualProductName.trim();
        } else {
          productTitle = 'Produto TikTok Shop';
        }
      }

      // Análise Semântica: Extração dos 2-3 atributos mais fortes (Substantivo + Tecido + Estilo)
      const termsAnalysis = extractProductSearchTerms(productTitle, productDesc);
      // safeTerm > manualProductName > customSearchQuery > termos automáticos
      const queryToSearch = (
        safeTerm ||
        manualProductName.trim() ||
        customSearchQuery ||
        termsAnalysis.primaryQuery ||
        productTitle.split(' ').slice(0, 3).join(' ') ||
        ''
      ).trim();
      setCustomSearchQuery(queryToSearch);

      // ----------------------------------------------------
      // ETAPA 2: Navegar na Busca do TikTok com a palavra-chave precisa
      // ----------------------------------------------------
      setSearchStep(`3/4: Buscando vídeos virais para "${queryToSearch}"...`);

      const searchUrl = `https://www.tiktok.com/search?q=${encodeURIComponent(queryToSearch)}`;
      
      await new Promise<void>((resolve) => {
        let timeout: any;
        const onDomReady = () => {
          clearTimeout(timeout);
          webview.removeEventListener('dom-ready', onDomReady);
          resolve();
        };
        webview.addEventListener('dom-ready', onDomReady);
        webview.loadURL(searchUrl);
        timeout = setTimeout(() => {
          webview.removeEventListener('dom-ready', onDomReady);
          resolve();
        }, 12000);
      });

      // Aguarda carregamento inicial
      await new Promise(r => setTimeout(r, 2500));

      // Fechar modal de login do TikTok se presente e liberar rolagem
      await webview.executeJavaScript(`
        (() => {
          try {
            const closeBtns = document.querySelectorAll('[data-e2e="modal-close-inner-button"], button[aria-label="Fechar"], button[aria-label="Close"], [class*="ModalClose"]');
            closeBtns.forEach(b => b.click());
            document.body.style.overflow = 'auto';
            document.documentElement.style.overflow = 'auto';
          } catch (e) {}
        })()
      `);

      // ----------------------------------------------------
      // ETAPA 3: Multi-scroll no container nativo (#grid-main) para carregar 60+ vídeos
      // ----------------------------------------------------
      setSearchStep('3/4: Rolando resultados para capturar os vídeos mais vistos...');
      
      for (let scroll = 1; scroll <= 6; scroll++) {
        await webview.executeJavaScript(`
          (() => {
            try {
              const m = document.getElementById('grid-main') || document.querySelector('main');
              if (m) m.scrollTop = m.scrollHeight;
              window.scrollTo(0, document.body.scrollHeight);
            } catch (e) {}
          })()
        `);
        await new Promise(r => setTimeout(r, 1200));
      }

      // Extrair vídeos capturados na primeira busca
      let rawScraped = await webview.executeJavaScript(SEARCH_VIDEOS_SCRAPER_SCRIPT);
      let rawVideos: ViralVideoItem[] = rawScraped?.videos || [];

      // Fallback inteligente: se a primeira busca retornou menos de 10 vídeos, busca pelo fallback
      if (rawVideos.length < 10 && termsAnalysis.fallbackQuery && termsAnalysis.fallbackQuery !== queryToSearch) {
        setSearchStep(`3/4: Ampliando busca para "${termsAnalysis.fallbackQuery}" para encontrar mais vídeos...`);
        const fallbackUrl = `https://www.tiktok.com/search?q=${encodeURIComponent(termsAnalysis.fallbackQuery)}`;
        
        await new Promise<void>((resolve) => {
          let timeout: any;
          const onDomReady = () => {
            clearTimeout(timeout);
            webview.removeEventListener('dom-ready', onDomReady);
            resolve();
          };
          webview.addEventListener('dom-ready', onDomReady);
          webview.loadURL(fallbackUrl);
          timeout = setTimeout(() => {
            webview.removeEventListener('dom-ready', onDomReady);
            resolve();
          }, 10000);
        });

        await new Promise(r => setTimeout(r, 2000));
        for (let scroll = 1; scroll <= 5; scroll++) {
          await webview.executeJavaScript(`
            (() => {
              try {
                const m = document.getElementById('grid-main') || document.querySelector('main');
                if (m) m.scrollTop = m.scrollHeight;
                window.scrollTo(0, document.body.scrollHeight);
              } catch (e) {}
            })()
          `);
          await new Promise(r => setTimeout(r, 1200));
        }

        const secondScraped = await webview.executeJavaScript(SEARCH_VIDEOS_SCRAPER_SCRIPT);
        const secondVideos: ViralVideoItem[] = secondScraped?.videos || [];
        const seenIds = new Set(rawVideos.map(v => v.id));
        for (const sv of secondVideos) {
          if (!seenIds.has(sv.id)) {
            seenIds.add(sv.id);
            rawVideos.push(sv);
          }
        }
      }

      // ----------------------------------------------------
      // ETAPA 4: Validação Rigorosa do Mesmo Produto & Ranking
      // ----------------------------------------------------
      setSearchStep('4/4: Validando identidade do produto, eliminando falsos positivos e ranqueando...');
      
      // Verifica se o título é ainda genérico (extração falhou em ambos os métodos)
      const productTitleIsGeneric = productTitle === 'Produto TikTok Shop' || !termsAnalysis.coreNoun;

      setRawVideoCount(rawVideos.length);

      const validatedVideos: ViralVideoItem[] = rawVideos.map(v => {
        const val = validateAndScoreVideo(v, termsAnalysis, productId, shopName);
        // Se não temos termos válidos para validar, dar score base para não filtrar tudo
        const effectiveScore = productTitleIsGeneric ? Math.max(val.matchScore, 10) : val.matchScore;
        return {
          ...v,
          relevanceScore: effectiveScore,
          isExactMatch: val.isExactMatch,
          matchScore: effectiveScore,
          matchLabel: productTitleIsGeneric ? '⚪ Produto Relacionado' : val.matchLabel
        };
      });

      // Filtrar apenas vídeos com pontuação positiva (elimina falsos positivos categóricos)
      // Quando o título é genérico, mostrar todos os vídeos encontrados
      let candidateVideos = productTitleIsGeneric
        ? validatedVideos
        : validatedVideos.filter(v => v.relevanceScore > 0);
      if (!productTitleIsGeneric && candidateVideos.length < 5) {
        candidateVideos = validatedVideos;
      }

      // Ordenar por visualizações decrescentes
      candidateVideos.sort((a, b) => b.viewsCount - a.viewsCount);

      // Pega até 30 vídeos
      const top30Videos = candidateVideos.slice(0, 30).map((v, idx) => ({
        ...v,
        ranking: idx + 1
      }));

      // Estatísticas consolidadas
      const totalViews = top30Videos.reduce((acc, v) => acc + (v.viewsCount || 0), 0);
      const topViralViews = top30Videos.length > 0 ? top30Videos[0].viewsCount : 0;
      const averageViews = top30Videos.length > 0 ? Math.round(totalViews / top30Videos.length) : 0;
      const exactMatchCount = top30Videos.filter(v => v.isExactMatch).length;

      const finalResult: ProductViralData = {
        productId,
        originalUrl: rawUrl,
        title: productTitle,
        mainImage,
        price,
        shopName,
        description: productDesc,
        detectedSearchTerm: queryToSearch,
        suggestedTerms: termsAnalysis.suggestedTerms,
        totalViews,
        totalViewsFormatted: formatViewsNumber(totalViews),
        topViralViews,
        topViralViewsFormatted: formatViewsNumber(topViralViews),
        averageViews,
        averageViewsFormatted: formatViewsNumber(averageViews),
        exactMatchCount,
        videos: top30Videos
      };

      setResults(finalResult);
      setSearchStep('');
    } catch (err: any) {
      console.error('[BuscadorVirais] Erro na busca:', err);
      setErrorMessage(`Ocorreu um erro durante a busca: ${err?.message || String(err)}`);
    } finally {
      setIsSearching(false);
    }
  };

  // Filtragem e ordenação local da grade
  const filteredVideos = useMemo(() => {
    if (!results) return [];
    let list = [...results.videos];

    if (onlyExactMatch) {
      list = list.filter(v => v.isExactMatch);
    }

    if (queryFilter.trim()) {
      const q = queryFilter.toLowerCase();
      list = list.filter(v => 
        (v.title || '').toLowerCase().includes(q) || 
        (v.authorName || '').toLowerCase().includes(q) || 
        (v.authorHandle || '').toLowerCase().includes(q)
      );
    }

    if (sortBy === 'recent') {
      // Mantém a ordem alternativa se disponível
      list.reverse();
    } else if (sortBy === 'likes') {
      list.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    } else {
      list.sort((a, b) => b.viewsCount - a.viewsCount);
    }

    return list;
  }, [results, queryFilter, sortBy, onlyExactMatch]);

  return (
    <div className="space-y-10 pb-16">
      {/* Cabeçalho da Aba */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-widest flex-wrap justify-center">
          <Flame className="w-4 h-4 text-orange-500 animate-bounce" />
          <span>Inteligência de Mercado TikTok Shop</span>
          <span className="text-white/30">•</span>
          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold normal-case">
            🔒 Navegação Anônima Deslogada
          </span>
        </div>
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight font-display bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
          Buscador de <span className="text-orange-500">Virais</span>
        </h2>
        <p className="text-sm md:text-base text-white/50 leading-relaxed">
          Cole o link de qualquer produto do TikTok Shop. O sistema identifica o ID oficial, pesquisa sem usar sua conta logada e lista os <strong className="text-white font-semibold">vídeos mais vistos</strong> com validação rigorosa de correspondência ao mesmo produto.
        </p>
      </div>

      {/* Caixa de Entrada de Link */}
      <div className="max-w-4xl mx-auto">
        <div className="relative p-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl space-y-3">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/30">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isSearching && handleStartSearch()}
                placeholder="Cole o link do TikTok Shop (ex: https://shop.tiktok.com/br/pdp/1734467095653156701)"
                disabled={isSearching}
                className="w-full pl-12 pr-10 py-4 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-orange-500 transition-all font-mono"
              />
              {productUrl && (
                <button
                  onClick={() => setProductUrl('')}
                  className="absolute inset-y-0 right-3 flex items-center text-white/30 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={handleStartSearch}
              disabled={isSearching || !productUrl.trim()}
              className="w-full md:w-auto px-8 py-4 rounded-xl font-bold text-sm tracking-wide text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 shrink-0 cursor-pointer"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Buscando...</span>
                </>
              ) : (
                <>
                  <Flame className="w-5 h-5" />
                  <span>Buscar 30 Virais</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between px-2 pt-1 text-xs text-white/40 flex-wrap gap-2">
            <button
              type="button"
              onClick={handleLoadExample}
              className="hover:text-orange-400 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>💡 Link de exemplo:</span>
              <code className="text-[11px] bg-white/5 px-2 py-0.5 rounded border border-white/10 text-orange-300">
                .../pdp/1734467095653156701
              </code>
            </button>

            <div className="flex items-center gap-3">
              {rawVideoCount > 0 && (
                <span className="text-[11px] text-emerald-400/70">
                  📡 {rawVideoCount} vídeos capturados
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsBrowserVisible(!isBrowserVisible)}
                className="hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
              >
                <span>Navegador interno de busca</span>
                {isBrowserVisible ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Campo de nome manual do produto — aparece quando a extração automática falha */}
          <div className="px-2 pb-1">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15">
              <Package className="w-4 h-4 text-amber-400 shrink-0" />
              <input
                type="text"
                value={manualProductName}
                onChange={(e) => setManualProductName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isSearching && handleStartSearch()}
                placeholder="(Opcional) Nome ou tipo do produto — ex: vestido floral, short duna, tênis branco..."
                disabled={isSearching}
                className="flex-1 bg-transparent text-xs text-white placeholder-amber-400/40 focus:outline-none"
              />
              {manualProductName && (
                <button onClick={() => setManualProductName('')} className="text-white/30 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Sugestões de Termos de Busca Extraídos */}
          {results && results.suggestedTerms && results.suggestedTerms.length > 0 && (
            <div className="pt-3 border-t border-white/10 flex items-center gap-2 flex-wrap text-xs px-2">
              <span className="text-white/40 flex items-center gap-1 font-semibold">
                <Tag className="w-3.5 h-3.5 text-orange-400" />
                Refinar Termo de Busca:
              </span>
              {results.suggestedTerms.map((term, idx) => {
                const isActive = results.detectedSearchTerm?.toLowerCase() === term.toLowerCase();
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleStartSearch(term)}
                    disabled={isSearching}
                    className={`px-3 py-1 rounded-lg border text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-orange-500/25 border-orange-500/60 text-orange-200 font-bold shadow-sm'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                    title={`Buscar vídeos com "${term}"`}
                  >
                    <span>{term}</span>
                    {isActive && <span className="text-[9px] bg-orange-500 text-white px-1.5 rounded-full">Ativo</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Status de Busca e Progresso */}
        {isSearching && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl border border-orange-500/20 bg-orange-500/10 flex items-center gap-3 text-orange-300 text-sm"
          >
            <Loader2 className="w-5 h-5 animate-spin text-orange-400 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-white">{searchStep}</p>
              <p className="text-xs text-orange-300/70">O robô do Electron está operando em partição anônima isolada, livre de cookies de vendedor e sem necessidade de login.</p>
            </div>
          </motion.div>
        )}

        {/* Mensagem de Erro */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-3 text-red-300 text-sm"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-white">Falha na busca</p>
              <p className="text-xs mt-0.5">{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Navegador Interno / Webview (Sessão 100% Anônima e Deslogada) */}
        <div className={`mt-4 rounded-xl overflow-hidden border border-white/10 bg-black/80 transition-all ${
          isBrowserVisible ? 'h-[420px]' : 'h-0 border-none pointer-events-none opacity-0'
        }`}>
          <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between text-xs text-white/50">
            <span className="flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
              Sessão Anônima TikTok (Sem Login / Sem Conta de Vendedor)
            </span>
            <button onClick={() => setIsBrowserVisible(false)} className="hover:text-white">✕ Fechar</button>
          </div>
          <webview
            ref={(el: any) => {
              webviewRef.current = el;
              if (el && !el.dataset.listenerReady) {
                el.dataset.listenerReady = 'true';
                el.addEventListener('dom-ready', () => {
                  webviewReadyRef.current = true;
                });
              }
            }}
            src="about:blank"
            partition="virals_search_anonymous"
            className="w-full h-[375px]"
          />
        </div>
      </div>

      {/* RESULTADOS DA BUSCA */}
      {results && (
        <div className="space-y-8 max-w-6xl mx-auto">
          {/* Card Resumo do Produto */}
          <div className="p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                {results.mainImage ? (
                  <img
                    src={results.mainImage}
                    alt={results.title}
                    className="w-20 h-20 rounded-xl object-cover border border-white/20 shadow-md shrink-0 bg-black/40"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                    <Package className="w-8 h-8 text-orange-400" />
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-mono font-bold text-xs flex items-center gap-1.5">
                      <span>ID: {results.productId}</span>
                      <button
                        onClick={() => handleCopy(results.productId)}
                        className="hover:text-white transition-colors"
                        title="Copiar ID do produto"
                      >
                        {copiedUrl === results.productId ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </span>
                    {results.price && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-xs">
                        {results.price}
                      </span>
                    )}
                    {results.shopName && (
                      <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs">
                        {results.shopName}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-white leading-snug line-clamp-2">
                    {results.title}
                  </h3>
                  <p className="text-xs text-white/40">
                    {results.videos.length} vídeos com maior relevância catalogados
                    {rawVideoCount > 0 && rawVideoCount !== results.videos.length && (
                      <span className="text-white/25"> ({rawVideoCount} capturados no total)</span>
                    )}.
                  </p>
                </div>
              </div>

              {onUseForScript && (
                <button
                  onClick={() => onUseForScript({
                    title: results.title,
                    image: results.mainImage,
                    description: (results.description ? `📌 ESPECIFICAÇÕES E DESCRIÇÃO DO PRODUTO (TIKTOK SHOP):\n${results.description}\n\n` : '') + `Inspirado no vídeo mais visto com ${results.topViralViewsFormatted} views.`,
                    price: results.price
                  })}
                  className="px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 shadow-lg shadow-orange-500/20 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Criar Roteiro com I.A.</span>
                </button>
              )}
            </div>

            {/* 4 Métricas Consolidadas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
              <div className="p-4 rounded-xl bg-black/30 border border-white/5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-white/40 font-medium">Views Combinadas</p>
                  <p className="text-2xl font-black text-white">{results.totalViewsFormatted}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-black/30 border border-white/5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-white/40 font-medium">Top #1 Viral (Mais Visto)</p>
                  <p className="text-2xl font-black text-amber-400">{results.topViralViewsFormatted}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-black/30 border border-white/5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-white/40 font-medium">Média de Views</p>
                  <p className="text-2xl font-black text-blue-300">{results.averageViewsFormatted}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-black/30 border border-white/5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-white/40 font-medium">Match Exato (Mesmo Produto)</p>
                  <p className="text-2xl font-black text-emerald-400">
                    {results.exactMatchCount || 0} <span className="text-xs font-normal text-white/40">/ {results.videos.length}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Descrição e Medidas do Produto Extraídas */}
            {results.description && (
              <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowProductDesc(prev => !prev)}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400 hover:text-orange-300 transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Descrição Oficial & Medidas do Produto</span>
                    {showProductDesc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(results.description || '');
                        setCopiedDesc(true);
                        setTimeout(() => setCopiedDesc(false), 2000);
                      }}
                      className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Copiar texto completo da descrição e medidas"
                    >
                      {copiedDesc ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedDesc ? 'Copiado!' : 'Copiar Descrição'}</span>
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {showProductDesc && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-2xl bg-black/40 border border-white/10 p-4 space-y-3 overflow-hidden text-xs text-white/80 leading-relaxed font-mono whitespace-pre-line max-h-80 overflow-y-auto"
                    >
                      {results.description}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Barra de Filtros e Busca Rápida na Grade */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={queryFilter}
                onChange={(e) => setQueryFilter(e.target.value)}
                placeholder="Filtrar por criador ou legenda..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-orange-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap">
              {/* Filtro Apenas Match Exato */}
              <button
                type="button"
                onClick={() => setOnlyExactMatch(prev => !prev)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  onlyExactMatch
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-500/20'
                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                }`}
                title="Filtrar apenas vídeos validados como o mesmo produto exato"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Apenas Match Exato ({results.exactMatchCount || 0})</span>
              </button>

              <span className="text-xs text-white/40 flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5" />
                Ordenar por:
              </span>
              <div className="flex rounded-xl bg-white/5 p-1 border border-white/10 text-xs">
                <button
                  onClick={() => setSortBy('views')}
                  className={`px-3 py-1.5 rounded-lg transition-all font-semibold ${
                    sortBy === 'views' ? 'bg-orange-500 text-white shadow' : 'text-white/50 hover:text-white'
                  }`}
                >
                  🔥 Mais Vistos
                </button>
                <button
                  onClick={() => setSortBy('likes')}
                  className={`px-3 py-1.5 rounded-lg transition-all font-semibold ${
                    sortBy === 'likes' ? 'bg-orange-500 text-white shadow' : 'text-white/50 hover:text-white'
                  }`}
                >
                  ❤️ Mais Curtidos
                </button>
                <button
                  onClick={() => setSortBy('recent')}
                  className={`px-3 py-1.5 rounded-lg transition-all font-semibold ${
                    sortBy === 'recent' ? 'bg-orange-500 text-white shadow' : 'text-white/50 hover:text-white'
                  }`}
                >
                  ⏱️ Recentes
                </button>
              </div>
            </div>
          </div>

          {/* Grade dos 30 Vídeos Mais Vistos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {filteredVideos.map((video) => {
              const isTop3 = video.ranking <= 3;
              const rankColor = 
                video.ranking === 1 ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-amber-500/50' :
                video.ranking === 2 ? 'bg-gradient-to-r from-slate-200 to-slate-400 text-black shadow-slate-400/40' :
                video.ranking === 3 ? 'bg-gradient-to-r from-amber-700 to-orange-800 text-white shadow-orange-700/40' :
                'bg-black/80 text-white/90 border border-white/20';

              return (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 hover:border-orange-500/50 transition-all duration-300 shadow-xl flex flex-col"
                >
                  {/* Container da Thumbnail (9:16) */}
                  <div className="relative aspect-[9/16] w-full overflow-hidden bg-zinc-900">
                    {video.coverUrl ? (
                      <img
                        src={video.coverUrl}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                        <Play className="w-12 h-12" />
                      </div>
                    )}

                    {/* Gradiente de leitura superior e inferior */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/60 pointer-events-none" />

                    {/* Badge de Ranking (Canto Superior Esquerdo) */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black tracking-wider uppercase shadow-md flex items-center gap-1 ${rankColor}`}>
                        {video.ranking === 1 && '👑 '}
                        #{video.ranking}
                      </span>
                    </div>

                    {/* Badge de Views (Canto Superior Direito) */}
                    <div className="absolute top-3 right-3 z-10">
                      <span className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-orange-500/30 text-orange-400 font-extrabold text-xs shadow-lg flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-orange-500" />
                        {video.viewsFormatted}
                      </span>
                    </div>

                    {/* Botão de Play centralizado ao passar o mouse */}
                    <button
                      onClick={() => setSelectedVideo(video)}
                      className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-orange-500/90 hover:bg-orange-500 active:scale-95 text-white flex items-center justify-center shadow-2xl transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Assistir vídeo"
                    >
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    </button>

                    {/* Informações do Criador e Legenda no rodapé da thumb */}
                    <div className="absolute bottom-0 inset-x-0 p-3.5 space-y-2 z-10">
                      <div className="flex items-center gap-2">
                        {video.authorAvatar ? (
                          <img
                            src={video.authorAvatar}
                            alt={video.authorName}
                            className="w-6 h-6 rounded-full object-cover border border-white/30 shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-[10px] text-orange-300">
                            {video.authorName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs font-semibold text-white/90 truncate">
                          {video.authorHandle}
                        </span>
                      </div>

                      <p className="text-xs text-white/70 line-clamp-2 leading-relaxed" title={video.title}>
                        {video.title || 'Sem descrição'}
                      </p>

                      {/* Badges de Validação de Produto & TikTok Shop */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          video.isExactMatch 
                            ? 'bg-emerald-500/25 border border-emerald-500/40 text-emerald-300'
                            : 'bg-yellow-500/25 border border-yellow-500/30 text-yellow-300'
                        }`}>
                          {video.matchLabel || (video.isExactMatch ? '🟢 Match Exato' : '🟡 Variação')}
                        </span>

                        {video.hasShopAnchor && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/30 text-[10px] font-bold text-yellow-300">
                            <span>🛍️ Shop</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações do Card */}
                  <div className="p-2.5 bg-black/60 border-t border-white/5 grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => setSelectedVideo(video)}
                      className="py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[11px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title="Assistir no player embutido"
                    >
                      <Play className="w-3.5 h-3.5 text-orange-400" />
                      <span>Ver</span>
                    </button>

                    <button
                      onClick={() => handleCopy(video.url)}
                      className="py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[11px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title="Copiar link do TikTok"
                    >
                      {copiedUrl === video.url ? (
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-white/70" />
                      )}
                      <span>Link</span>
                    </button>

                    <button
                      onClick={() => window.open(video.url, '_blank')}
                      className="py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[11px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title="Abrir no TikTok Web"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                      <span>TikTok</span>
                    </button>
                  </div>

                  {/* Botão de Converter em Roteiro com IA */}
                  {onUseForScript && (
                    <div className="px-2.5 pb-2.5 bg-black/60">
                      <button
                        onClick={() => onUseForScript({
                          title: results.title,
                          image: results.mainImage,
                          description: (results.description ? `📌 ESPECIFICAÇÕES E DESCRIÇÃO DO PRODUTO (TIKTOK SHOP):\n${results.description}\n\n` : '') + `Baseado no vídeo viral #${video.ranking} (${video.viewsFormatted} views) de ${video.authorHandle}:\n"${video.title}"`,
                          price: results.price
                        })}
                        className="w-full py-2 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-300 hover:text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-orange-400" />
                        <span>Gerar Roteiro Deste</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: Player de Vídeo Embutido */}
      <AnimatePresence>
        {selectedVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl border border-white/10 bg-[#0f0f11] shadow-2xl overflow-hidden flex flex-col md:flex-row"
            >
              {/* Lado Esquerdo: Player de Vídeo Iframe Embed */}
              <div className="w-full md:w-[420px] aspect-[9/16] max-h-[70vh] md:max-h-none bg-black flex items-center justify-center relative shrink-0">
                <iframe
                  src={`https://www.tiktok.com/embed/v2/${selectedVideo.id}?lang=pt-BR`}
                  title={selectedVideo.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Lado Direito: Informações e Ações */}
              <div className="flex-1 p-6 flex flex-col justify-between space-y-6 overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-extrabold text-xs">
                      Ranking #{selectedVideo.ranking} Mais Visto
                    </span>
                    <button
                      onClick={() => setSelectedVideo(null)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      {selectedVideo.authorAvatar && (
                        <img
                          src={selectedVideo.authorAvatar}
                          alt={selectedVideo.authorName}
                          className="w-10 h-10 rounded-full border border-white/20"
                        />
                      )}
                      <div>
                        <h4 className="font-bold text-white text-base leading-tight">
                          {selectedVideo.authorName}
                        </h4>
                        <p className="text-xs text-white/50">{selectedVideo.authorHandle}</p>
                      </div>
                    </div>
                  </div>

                  {/* Métricas do Vídeo */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-[11px] text-white/40">Visualizações</p>
                      <p className="text-lg font-black text-orange-400 flex items-center gap-1 mt-0.5">
                        <Flame className="w-4 h-4" />
                        {selectedVideo.viewsFormatted}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-[11px] text-white/40">Engajamento</p>
                      <p className="text-lg font-black text-white flex items-center gap-1 mt-0.5">
                        <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                        {selectedVideo.likesFormatted || 'Viral'}
                      </p>
                    </div>
                  </div>

                  {/* Legenda Completa */}
                  <div className="space-y-1.5 pt-2">
                    <p className="text-xs font-bold text-white/50 uppercase tracking-wider">Legenda / Gancho</p>
                    <p className="text-sm text-white/80 leading-relaxed bg-black/40 p-3 rounded-xl border border-white/5">
                      {selectedVideo.title || 'Nenhuma legenda encontrada.'}
                    </p>
                  </div>
                </div>

                {/* Botões de Ação do Modal */}
                <div className="space-y-2.5 pt-4 border-t border-white/10">
                  {onUseForScript && results && (
                    <button
                      onClick={() => {
                        onUseForScript({
                          title: results.title,
                          image: results.mainImage,
                          description: (results.description ? `📌 ESPECIFICAÇÕES E DESCRIÇÃO DO PRODUTO (TIKTOK SHOP):\n${results.description}\n\n` : '') + `Baseado no roteiro viral de ${selectedVideo.authorHandle} (${selectedVideo.viewsFormatted} views):\n"${selectedVideo.title}"`,
                          price: results.price
                        });
                        setSelectedVideo(null);
                      }}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Gerar Roteiro Baseado Neste Vídeo</span>
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleCopy(selectedVideo.url)}
                      className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                    >
                      {copiedUrl === selectedVideo.url ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      <span>Copiar Link</span>
                    </button>

                    <button
                      onClick={() => window.open(selectedVideo.url, '_blank')}
                      className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-4 h-4 text-blue-400" />
                      <span>Abrir no TikTok</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
