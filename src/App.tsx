/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect, ChangeEvent, DragEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Cropper, { Point, Area } from 'react-easy-crop';
import { 
  Upload, 
  Trash2, 
  Play, 
  Settings2, 
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
  FileText,
  Download,
  Layers,
  Camera,
  Globe,
  Sun,
  Moon,
  AlertTriangle,
  History
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { jsPDF } from 'jspdf';

// ============================================================
// Versão e Histórico
// ============================================================
const APP_VERSION = '1.2.0';

interface VersionEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

const VERSION_HISTORY: VersionEntry[] = [
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
    };
  }
}

type TabMode = 'collection' | 'product';

// --- Types ---

interface SceneImage {
  id: string;
  file: File;
  preview: string;
  name: string;
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

interface ScriptResponse {
  campaignTitle: string;
  scenes: GeneratedScene[];
}

interface GeneratedAngle {
  angleName: string;
  imagePrompt: string;
  veoPrompt: string;
  digenPrompt: string;
  narration: string;
}

// --- Constants ---

const DURATIONS = ['5s', '6s', '8s', '10s'];
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
  const [videoStyle, setVideoStyle] = useState<'standard' | 'pov'>('standard');
  const [voiceGender, setVoiceGender] = useState<'female' | 'male' | 'none'>('female');
  const modelInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);

  // Shared
  const [observations, setObservations] = useState('');
  const [duration, setDuration] = useState(DURATIONS[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [generatedScript, setGeneratedScript] = useState<ScriptResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // API Keys
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [currentKeyIndex, setCurrentKeyIndex] = useState(0);
  const keysFileInputRef = useRef<HTMLInputElement>(null);

  // Cropping State
  const [imageToCrop, setImageToCrop] = useState<{ id: string, type: 'collection' | 'model' | 'product', preview: string } | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropAspect, setCropAspect] = useState<number | undefined>(undefined); // undefined = livre

  // Ângulos do Produto
  const [generatedAngles, setGeneratedAngles] = useState<GeneratedAngle[] | null>(null);
  const [isGeneratingAngles, setIsGeneratingAngles] = useState(false);
  const [numAngles, setNumAngles] = useState(4);
  const [validationAlert, setValidationAlert] = useState<{ title: string; message: string } | null>(null);

  // --- Handlers ---

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

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

  const saveCrop = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    setIsCropping(true);

    try {
      const croppedBlob = await getCroppedImg(imageToCrop.preview, croppedAreaPixels);
      if (!croppedBlob) throw new Error("Failed to crop image");

      const croppedFile = new File([croppedBlob], `cropped_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const croppedPreview = URL.createObjectURL(croppedFile);

      // Trigger automatic download of the cropped image
      const link = document.createElement('a');
      link.href = croppedPreview;
      link.download = `cropped_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (imageToCrop.type === 'collection') {
        setImages(prev => prev.map(img => img.id === imageToCrop.id ? { ...img, file: croppedFile, preview: croppedPreview } : img));
      } else if (imageToCrop.type === 'model') {
        setModelImage(prev => prev ? { ...prev, file: croppedFile, preview: croppedPreview } : null);
      } else if (imageToCrop.type === 'product') {
        setProductImages(prev => prev.map(img => img.id === imageToCrop.id ? { ...img, file: croppedFile, preview: croppedPreview } : img));
      }

      setImageToCrop(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setIsCropping(false);
    }
  };

  const handleApiKeysUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const keys = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      setApiKeys(keys);
      setCurrentKeyIndex(0);
      if(keys.length > 0) {
        setValidationAlert({
          title: "Chaves Carregadas",
          message: `${keys.length} chaves de API carregadas com sucesso!`
        });
      }
    };
    reader.readAsText(file);
    if (keysFileInputRef.current) keysFileInputRef.current.value = '';
  };

  const getGeminiKey = () => {
    if (apiKeys.length > 0) {
      const key = apiKeys[currentKeyIndex % apiKeys.length];
      setCurrentKeyIndex(prev => prev + 1);
      return key;
    }
    return process.env.GEMINI_API_KEY;
  };

  // Modelo primário + fallbacks (na ordem de prioridade)
  const GEMINI_MODEL_CHAIN = [
    "gemini-2.5-flash",   // Modelo primário (mais recente e estável)
    "gemini-1.5-flash",   // Primeiro fallback
    "gemini-1.5-pro",     // Segundo fallback
  ];

  const executeGeminiCall = async <T,>(apiCall: (ai: GoogleGenAI, model: string) => Promise<T>): Promise<T> => {
    // Captura as chaves no momento da chamada (evita problema de React state assíncrono)
    const keysToTry = apiKeys.length > 0 ? [...apiKeys] : (process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY] : []);
    
    if (keysToTry.length === 0) {
      throw new Error("Nenhuma chave de API do Gemini configurada. Carregue um arquivo .txt com suas chaves.");
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
          
          // Erros de chave: pular para a próxima chave imediatamente
          const isKeyError = errorStr.includes("api key expired") || 
                             errorStr.includes("api key not valid") || 
                             errorStr.includes("api_key_invalid") ||
                             errorStr.includes("key expired") ||
                             errorStr.includes("invalid api key") ||
                             (errorStr.includes("invalid_argument") && errorStr.includes("key"));
          
          if (isKeyError) {
            console.warn(`Chave ${keyIdx + 1} expirada ou inválida. Tentando próxima chave...`);
            break; // Sai do loop de modelos, vai para a próxima chave
          }
          
          // Erros de modelo (indisponível, sobrecarregado): tenta o próximo modelo
          const isModelError = errorStr.includes("model not found") ||
                               errorStr.includes("not found") ||
                               errorStr.includes("model_not_found") ||
                               errorStr.includes("unsupported") ||
                               errorStr.includes("overloaded") ||
                               errorStr.includes("503") ||
                               errorStr.includes("unavailable") ||
                               errorStr.includes("resource_exhausted") ||
                               errorStr.includes("quota");
          
          if (isModelError) {
            console.warn(`Modelo ${model} indisponível. Tentando próximo modelo...`);
            continue; // Tenta o próximo modelo na cadeia
          }
          
          // Outros erros: lança imediatamente (erro de lógica, timeout, etc.)
          throw error;
        }
      }
    }
    
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

      const response = await executeGeminiCall(async (ai, model) => {
        return await ai.models.generateContent({
          model: model,
          contents: `Analise estas imagens para uma campanha de moda com o tema "${finalTheme}". 
Nomes das imagens: ${JSON.stringify(imageListData)}.
Retorne um array JSON indicando a sequência ideal baseada no nome/descrição das imagens para um fluxo narrativo fluido.
Exemplo: [2, 0, 1].
Retorne APENAS o array JSON.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER }
            }
          }
        });
      });

      const newOrder = JSON.parse(response.text || '[]') as number[];
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
    const keysToTry = apiKeys.length > 0 ? [...apiKeys] : (process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY] : []);
    if (keysToTry.length === 0) {
      setValidationAlert({
        title: "Chave de API Faltando",
        message: "Nenhuma chave de API do Gemini configurada. Por favor, carregue um arquivo .txt com suas chaves do Gemini para prosseguir."
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
        const modelBase64 = await fileToBase64(modelImage.file);
        parts.push({ inlineData: { mimeType: modelImage.file.type, data: modelBase64.split(',')[1] } });
      }
      
      const productParts = await Promise.all(productImages.map(async (img) => {
        const base64 = await fileToBase64(img.file);
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

      const voiceInstruction = voiceGender === 'none'
        ? `GÊNERO DA VOZ / NARRADOR: SEM NARRAÇÃO (SEM FALA).
- O vídeo NÃO terá nenhuma narração falada, voz humana ou diálogo (no-voiceover / no-speech).
- O foco é 100% visual: mostrar o produto de vários ângulos, destacando detalhes, qualidade e texturas com uma música de fundo instrumental.
- No campo 'narration' (em PT-BR), em vez de fala falada, você DEVE escrever descrições detalhadas da trilha sonora (SFX / Música de fundo) e legendas de texto para aparecer na tela (ex: '[Música instrumental animada de fundo] [Legenda de tela: Conheça a qualidade do...]').
- No campo 'digenPrompt' (DIGEN), especifique explicitamente que NÃO há voz ou narração, focando apenas na trilha sonora instrumental e efeitos de áudio (ex: 'No speech. Professional energetic instrumental background music and sound effects, highlighting product details').`
        : `GÊNERO DA VOZ / NARRADOR:
A voz da narração deve ser obrigatoriamente ${voiceGender === 'female' ? 'FEMININA' : 'MASCULINA'}.
- Toda a narração em PT-BR ('narration') deve ser escrita adaptando a concordância verbal, adjetivos e o tom estilístico para uma voz ${voiceGender === 'female' ? 'FEMININA' : 'MASCULINA'} (por exemplo: referências no feminino/masculino dependendo do contexto).
- No campo 'digenPrompt' (DIGEN), especifique explicitamente que o estilo de voz é uma voz ${voiceGender === 'female' ? 'feminina' : 'masculina'} clara e persuasiva (ex: 'clear and natural ${voiceGender === 'female' ? 'female' : 'male'} voice narrative style').`;

      parts.push({
        text: `Gere um roteiro narrativo e prompts de animação focados na apresentação de um produto.
Imagens fornecidas: 
1. Modelo/Apresentador(a): ${modelImage ? modelImage.name : "Nenhuma (Vídeo em POV)"}
2. Fotos do Produto: ${productImages.map(p => p.name).join(', ')}

Duração de cada cena: ${duration}
Número de cenas a gerar: ${numScenes}
Observações específicas: ${observations || "INSTRUÇÃO: Se este campo estiver vazio, por favor analise as imagens enviadas e extraia qualquer texto, marca, benefício ou característica visível do produto para usar no roteiro e narração."}

${styleInstruction}

${voiceInstruction}

REGRAS OBRIGATÓRIAS:
1. Crie exatamente ${numScenes} cenas detalhando a apresentação do produto. Varie as fotos do produto nas cenas se houver mais de uma.
2. O campo 'imageName' deve indicar qual das fotos fornecidas (modelo ou produto) serve de referência visual principal para aquela cena (apenas referência interna, NÃO inclua esse nome nos prompts).
3. Os campos 'veoPrompt' e 'digenPrompt' devem ser prompts PUROS e AUTO-CONTIDOS em inglês — descritivos, cinematográficos e completos. NUNCA inclua nomes de arquivos, colchetes com nomes ou referências a imagens originais nesses campos. As imagens originais servem apenas como referência visual para a IA entender o contexto, mas os vídeos serão gerados a partir de novas imagens criadas pela IA.
4. O VEO é excelente para as animações de câmera e ambiente. O DIGEN é para falas e vozes.
5. As roupas, cenário da modelo (se houver) e o produto original devem ser mantidos intactos.
6. ⚠️ CRÍTICO — IDIOMA DA NARRAÇÃO: O campo 'narration' DEVE ser OBRIGATORIAMENTE escrito em PORTUGUÊS BRASILEIRO (PT-BR). NUNCA escreva a narração em inglês. ${voiceGender === 'none' ? 'No modo Sem Narração, descreva a trilha sonora/SFX e legendas de tela em PT-BR.' : 'A narração é o texto falado em voz alta para o público brasileiro do TikTok.'} Se escrever em inglês, será considerado um erro grave.
7. CRÍTICO: A narração deve respeitar a duração de ${duration}. Para ${duration}, use no máximo ${parseInt(duration) * 2.5} palavras para garantir uma fala natural e fluida.
8. Os campos 'veoPrompt' e 'digenPrompt' devem estar em INGLÊS (para as ferramentas de IA). Apenas 'narration' é em PT-BR.
9. CRÍTICO (Prompt de Imagem Estática da Cena - Nano Banana 2): Para cada cena, crie um prompt detalhado em inglês no campo 'imagePrompt'. O prompt deve ser riquíssimo em detalhes visuais, estilo fotográfico realista, iluminação profissional. Não inclua texto explicativo, apenas a descrição visual em inglês.

Retorne em estrutura JSON:
{
  "campaignTitle": "Nome da Campanha",
  "scenes": [
    { 
      "imageName": "Nome exato do arquivo de referência (uso interno)", 
      "duration": "${duration}", 
      "imagePrompt": "Detailed English still image generation prompt for Nano Banana 2/Imagen...",
      "veoPrompt": "Cinematic slow-motion camera pan across... (pure English prompt, NO filenames)", 
      "digenPrompt": "Natural talking head presenting the product with... (pure English prompt, NO filenames)", 
      "narration": "Narração em PT-BR...", 
      "description": "Explicação da cena" 
    }
  ]
}`
      });

      const response = await executeGeminiCall(async (ai, model) => {
        return await ai.models.generateContent({
          model: model,
          contents: {
            role: "user",
            parts: parts
          },
          config: {
            responseMimeType: "application/json",
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
          }
        });
      });

      if (abortControllerRef.current?.signal.aborted) return;

      const parsed = JSON.parse(response.text || '{}') as ScriptResponse;
      setGeneratedScript(parsed);
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
    const keysToTry = apiKeys.length > 0 ? [...apiKeys] : (process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY] : []);
    if (keysToTry.length === 0) {
      setValidationAlert({
        title: "Chave de API Faltando",
        message: "Nenhuma chave de API do Gemini configurada. Por favor, carregue um arquivo .txt com suas chaves do Gemini para prosseguir."
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

      const voiceInstruction = voiceGender === 'none'
        ? `GÊNERO DA VOZ / NARRADOR: SEM NARRAÇÃO (SEM FALA).
- O vídeo NÃO terá nenhuma narração falada, voz humana ou diálogo (no-voiceover / no-speech).
- O foco é 100% visual: mostrar a coleção sob vários ângulos, destacando detalhes e tecidos com música de fundo instrumental.
- No campo 'narration' (em PT-BR), em vez de fala falada, você DEVE escrever descrições detalhadas da trilha sonora (SFX / Música de fundo) e legendas de texto para aparecer na tela (ex: '[Música instrumental animada de fundo] [Legenda de tela: Coleção de verão exclusiva...]').
- No campo 'digenPrompt' (DIGEN), especifique explicitamente que NÃO há voz ou narração, focando apenas na trilha sonora instrumental e efeitos de áudio (ex: 'No speech. Professional energetic instrumental background music and sound effects, highlighting clothing details').`
        : `GÊNERO DA VOZ / NARRADOR:
A voz da narração deve ser obrigatoriamente ${voiceGender === 'female' ? 'FEMININA' : 'MASCULINA'}.
- Toda a narração em PT-BR ('narration') deve ser escrita adaptando a concordância verbal, adjetivos e o tom estilístico para uma voz ${voiceGender === 'female' ? 'FEMININA' : 'MASCULINA'} (por exemplo: referências no feminino/masculino dependendo do contexto).
- No campo 'digenPrompt' (DIGEN), especifique explicitamente que o estilo de voz é uma voz ${voiceGender === 'female' ? 'feminina' : 'masculina'} clara e persuasiva (ex: 'clear and natural ${voiceGender === 'female' ? 'female' : 'male'} voice narrative style').`;

      const imageParts = await Promise.all(images.map(async (img) => {
        const base64 = await fileToBase64(img.file);
        return {
          inlineData: {
            mimeType: img.file.type,
            data: base64.split(',')[1]
          }
        };
      }));

      const response = await executeGeminiCall(async (ai, model) => {
        return await ai.models.generateContent({
          model: model,
          contents: {
            role: "user",
            parts: [
              ...imageParts,
              {
                text: `Gere um roteiro de campanha profissional para loja de roupas baseado nestas imagens. 
Tema: ${finalTheme}
Duração de cada cena: ${duration}
Observações específicas: ${observations || "Seguir estilo padrão de alta costura."}

${voiceInstruction}

REGRAS OBRIGATÓRIAS:
1. Os campos 'veoPrompt' e 'digenPrompt' devem ser prompts PUROS e AUTO-CONTIDOS em inglês — descritivos, cinematográficos e completos. NUNCA inclua nomes de arquivos, colchetes com nomes ou referências a imagens originais nesses campos. As imagens originais servem apenas como referência visual, mas os vídeos serão gerados a partir de novas imagens criadas pela IA.
2. As roupas e o CENÁRIO devem ser mantidos idênticos. Não mude cores, tecidos ou o ambiente.
3. Foque em animações cinematográficas para VEO: movimento de câmera (pan, tilt, zoom), partículas de luz, vento sutil no cabelo e expressões faciais.
4. Para DIGEN, foque na naturalidade do modelo digital falando ou reagindo.
5. ⚠️ CRÍTICO — IDIOMA DA NARRAÇÃO: O campo 'narration' DEVE ser OBRIGATORIAMENTE escrito em PORTUGUÊS BRASILEIRO (PT-BR). NUNCA escreva a narração em inglês. ${voiceGender === 'none' ? 'No modo Sem Narração, descreva a trilha sonora/SFX e legendas de tela em PT-BR.' : 'A narração é o texto falado em voz alta para o público brasileiro do TikTok.'}
6. Os campos 'veoPrompt' e 'digenPrompt' devem estar em INGLÊS (para as ferramentas de IA). Apenas 'narration' é em PT-BR.
7. CRÍTICO (Prompt de Imagem Estática da Cena - Nano Banana 2): Para cada cena, crie um prompt detalhado em inglês no campo 'imagePrompt'. O prompt deve ser riquíssimo em detalhes visuais, estilo fotográfico realista, iluminação profissional, mantendo consistência total com a imagem original. Não inclua texto explicativo, apenas a descrição visual em inglês.

Retorne em estrutura JSON:
{
  "campaignTitle": "Nome da Campanha",
  "scenes": [
    { 
      "imageName": "Nome exato do arquivo (referência interna)", 
      "duration": "${duration}", 
      "imagePrompt": "Detailed English still image generation prompt for Nano Banana 2/Imagen...",
      "veoPrompt": "Cinematic slow-motion camera pan across... (pure English prompt, NO filenames)", 
      "digenPrompt": "Natural talking head presenting... (pure English prompt, NO filenames)", 
      "narration": "Narração em PT-BR...", 
      "description": "Explicação da cena" 
    }
  ]
}`
              }
            ]
          },
          config: {
            responseMimeType: "application/json",
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
          }
        });
      });

      if (abortControllerRef.current?.signal.aborted) return;

      const parsed = JSON.parse(response.text || '{}') as ScriptResponse;
      setGeneratedScript(parsed);
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
    const keysToTry = apiKeys.length > 0 ? [...apiKeys] : (process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY] : []);
    if (keysToTry.length === 0) {
      setValidationAlert({
        title: "Chave de API Faltando",
        message: "Nenhuma chave de API do Gemini configurada. Por favor, carregue um arquivo .txt com suas chaves do Gemini para prosseguir."
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
        const base64 = await fileToBase64(img.file);
        return { inlineData: { mimeType: img.file.type, data: base64.split(',')[1] } };
      }));

      const textPart = {
        text: `Você é um especialista em fotografia de produto e marketing digital para TikTok Shop.

Com base nas imagens do produto fornecidas, gere exatamente ${numAngles} variações de prompts para mostrar o produto em ângulos e perspectivas diferentes.

PRODUTO(S): ${productImages.map(p => p.name).join(', ')}
DURAÇÃO: ${duration}
GÊNERO DA VOZ: ${voiceGender === 'none' ? 'SEM NARRAÇÃO (SEM FALA)' : (voiceGender === 'female' ? 'FEMININO' : 'MASCULINO')}

REGRAS ABSOLUTAS — NUNCA VIOLE:
1. O PRODUTO DEVE SER MANTIDO 100% IDÊNTICO — mesmas cores, formato, textura, tamanho, marca, logotipo e TODAS as características visuais originais. NUNCA altere o produto.
2. Apenas o ÂNGULO DA CÂMERA e a COMPOSIÇÃO DA CENA mudam.
3. Nos campos imagePrompt, veoPrompt e digenPrompt, SEMPRE mencione "exact same product, identical colors, textures and design unchanged" para garantir fidelidade absoluta.
4. Os campos imagePrompt, veoPrompt e digenPrompt DEVEM estar em INGLÊS.
5. ⚠️ O campo narration DEVE ser em PORTUGUÊS BRASILEIRO (PT-BR) — NUNCA em inglês. ${voiceGender === 'none' ? 'No modo Sem Narração, descreva apenas trilha sonora/SFX e legendas de tela em PT-BR (ex: "[Música instrumental de fundo] [Legenda: Veja a costura...]").' : 'Descreva a fala falada em PT-BR.'}
6. Os campos veoPrompt e digenPrompt devem ser prompts PUROS e AUTO-CONTIDOS — NUNCA inclua nomes de arquivo, colchetes com nomes ou referências a imagens originais. As imagens servem apenas como referência visual para a IA.
7. ${voiceGender === 'none' ? 'Como está Sem Narração (no-speech), o campo digenPrompt deve especificar apenas música instrumental e SFX, sem fala humana (ex: "No speech. Energetic background music and sound effects, highlighting details.").' : 'Especifique no digenPrompt o estilo de voz de acordo com o GÊNERO DA VOZ.'}

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

      const response = await executeGeminiCall(async (ai, model) => {
        return await ai.models.generateContent({
          model: model,
          contents: { role: 'user', parts: [...productParts, textPart] },
          config: {
            responseMimeType: 'application/json',
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
          }
        });
      });

      const parsed = JSON.parse(response.text || '{}') as { angles: GeneratedAngle[] };
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

    const filename = generatedScript.campaignTitle.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`${filename}.pdf`);
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
                <Sparkles className="w-5 h-5" />
                <span className="text-xs font-bold tracking-[0.2em] uppercase text-orange-500">Produção com IA</span>
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
                <button 
                  onClick={() => keysFileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-wider"
                >
                  <Key className="w-4 h-4" />
                  {apiKeys.length > 0 ? `${apiKeys.length} Chaves` : 'Chaves (.txt)'}
                </button>
              </div>
              <input 
                type="file" 
                ref={keysFileInputRef}
                onChange={handleApiKeysUpload}
                accept=".txt"
                className="hidden" 
              />
            </div>
          </div>
        </header>

        {/* Module Switcher */}
        <div className="flex justify-center mb-12">
          <div className="bg-white/5 p-1 rounded-2xl flex border border-white/10 overflow-hidden">
            <button 
              onClick={() => setActiveTab('collection')}
              className={`px-8 py-3 rounded-xl transition-all font-bold tracking-widest text-xs uppercase ${activeTab === 'collection' ? 'bg-orange-500 text-white shadow-lg' : 'text-white/40 hover:text-white/80'}`}
            >
              Fotos Diversas / Coleção
            </button>
            <button 
              onClick={() => setActiveTab('product')}
              className={`px-8 py-3 rounded-xl transition-all font-bold tracking-widest text-xs uppercase ${activeTab === 'product' ? 'bg-orange-500 text-white shadow-lg' : 'text-white/40 hover:text-white/80'}`}
            >
              Apresentador & Produto
            </button>
          </div>
        </div>

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
                    </div>
                  </div>
                  
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
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setImageToCrop({ id: img.id, type: 'collection', preview: img.preview }); }}
                                className="p-2 bg-blue-500/80 rounded-full hover:bg-blue-50 transition-colors text-white hover:text-blue-500"
                                title="Cortar Imagem"
                              >
                                <Crop className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                                className="p-2 bg-red-500/80 rounded-full hover:bg-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-mono">
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

                    <div className="space-y-3">
                      <label className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                        <Settings2 className="w-3 h-3" />
                        Duração da Cena
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
                  </div>

                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <label className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                      <Volume2 className="w-3 h-3 text-purple-400" />
                      Gênero da Voz / Narrador
                    </label>
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 gap-1">
                      <button
                        type="button"
                        onClick={() => setVoiceGender('female')}
                        className={`flex-1 py-3 text-xs rounded-xl font-bold uppercase tracking-wider transition-all ${voiceGender === 'female' ? 'bg-purple-600 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                      >
                        Feminino
                      </button>
                      <button
                        type="button"
                        onClick={() => setVoiceGender('male')}
                        className={`flex-1 py-3 text-xs rounded-xl font-bold uppercase tracking-wider transition-all ${voiceGender === 'male' ? 'bg-purple-600 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                      >
                        Masculino
                      </button>
                      <button
                        type="button"
                        onClick={() => setVoiceGender('none')}
                        className={`flex-1 py-3 text-xs rounded-xl font-bold uppercase tracking-wider transition-all ${voiceGender === 'none' ? 'bg-purple-600 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                      >
                        Sem Narração
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
                            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setImageToCrop({ id: modelImage.id, type: 'model', preview: modelImage.preview }); }}
                                className="p-2 bg-blue-500/80 rounded-full hover:bg-blue-100 transition-colors text-white hover:text-blue-500"
                                title="Cortar Imagem"
                              >
                                <Crop className="w-4 h-4" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); removeSingleImage('model'); }} className="p-2 bg-red-500/80 rounded-full hover:bg-red-500">
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
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="grid grid-cols-3 gap-2 mt-2"
                          >
                            {productImages.map((img) => (
                              <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border border-white/5 group">
                                <img src={img.preview} alt="Product" className={`w-full h-full ${imageFit === 'contain' ? 'object-contain' : 'object-cover'} bg-black/40 p-1`} />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setImageToCrop({ id: img.id, type: 'product', preview: img.preview }); }}
                                    className="p-1.5 bg-blue-500/80 rounded-full hover:bg-blue-100 transition-colors text-white hover:text-blue-500"
                                    title="Cortar Imagem"
                                  >
                                    <Crop className="w-3 h-3" />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); removeSingleImage('product', img.id); }} className="p-1.5 bg-red-500/80 rounded-full hover:bg-red-500 transition-colors">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </motion.div>
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                        <FileJson className="w-3 h-3" />
                        Número de Cenas
                      </label>
                      <div className="flex bg-white/5 rounded-2xl border border-white/10 items-center px-4 h-12">
                        <input 
                          type="number"
                          min="1"
                          max="15"
                          value={numScenes}
                          onChange={(e) => setNumScenes(Number(e.target.value) || 1)}
                          className="w-full bg-transparent text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                        <Settings2 className="w-3 h-3" />
                        Duração da Cena
                      </label>
                      <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                        {DURATIONS.map(d => (
                          <button
                            key={d}
                            onClick={() => setDuration(d)}
                            className={`flex-1 py-2 text-sm rounded-xl transition-all ${duration === d ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 pt-6 border-t border-white/5">
                    <div className="space-y-3">
                      <label className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                        <User className="w-3 h-3 text-orange-400" />
                        Estilo do Vídeo
                      </label>
                      <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                        <button
                          type="button"
                          onClick={() => setVideoStyle('standard')}
                          className={`flex-1 py-3 text-xs rounded-xl font-bold uppercase tracking-wider transition-all ${videoStyle === 'standard' ? 'bg-orange-500 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                        >
                          Apresentador
                        </button>
                        <button
                          type="button"
                          onClick={() => setVideoStyle('pov')}
                          className={`flex-1 py-3 text-xs rounded-xl font-bold uppercase tracking-wider transition-all ${videoStyle === 'pov' ? 'bg-orange-500 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                        >
                          POV (Mãos)
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                        <Volume2 className="w-3 h-3 text-purple-400" />
                        Gênero da Voz / Narrador
                      </label>
                      <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 gap-1">
                        <button
                          type="button"
                          onClick={() => setVoiceGender('female')}
                          className={`flex-1 py-3 text-xs rounded-xl font-bold uppercase tracking-wider transition-all ${voiceGender === 'female' ? 'bg-purple-600 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                        >
                          Feminino
                        </button>
                        <button
                          type="button"
                          onClick={() => setVoiceGender('male')}
                          className={`flex-1 py-3 text-xs rounded-xl font-bold uppercase tracking-wider transition-all ${voiceGender === 'male' ? 'bg-purple-600 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                        >
                          Masculino
                        </button>
                        <button
                          type="button"
                          onClick={() => setVoiceGender('none')}
                          className={`flex-1 py-3 text-xs rounded-xl font-bold uppercase tracking-wider transition-all ${voiceGender === 'none' ? 'bg-purple-600 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                        >
                          Sem Narração
                        </button>
                      </div>
                    </div>


                  </div>
                </section>
              </>
            )}

            {/* Step 3: Observations & Action (Shared) */}
            <section className="space-y-6">
              <div className="space-y-3 pb-8">
                <label className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                  <GripVertical className="w-3 h-3" />
                  Observações Importantes
                </label>
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
                      <button 
                        onClick={() => {
                          if (window.electronAPI) {
                            window.electronAPI.openInjectorWindow({ generatedScript, generatedAngles });
                          } else {
                            setValidationAlert({
                              title: "Recurso Exclusivo",
                              message: "Esta funcionalidade de injeção automática está disponível apenas rodando no aplicativo Electron."
                            });
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-orange-500/20 to-teal-500/20 border border-orange-500/30 rounded-xl hover:from-orange-500/30 hover:to-teal-500/30 transition-all text-xs font-bold text-orange-400 hover:text-white"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Injetar Prompts (Digen/Flow)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {generatedScript.scenes.map((scene, i) => (
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
      </main>

      <footer className="mt-20 border-t border-white/5 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 opacity-20 hover:opacity-100 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-black" />
            </div>
            <span className="font-bold tracking-tighter font-display uppercase tracking-widest text-xs">Fashion Creator Studio</span>
          </div>
          <p className="text-[10px] text-white/20 uppercase tracking-[0.2em]">Desenvolvido para Marketing de Varejo Moderno</p>
          <div className="flex gap-4">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-white/40 font-mono italic">GEMINI-2.5-FLASH-ACTIVE</span>
          </div>
        </div>
      </footer>

      {/* Crop Modal */}
      <AnimatePresence>
        {imageToCrop && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-xl font-bold font-display text-white">Cortar Imagem</h3>
              <button 
                onClick={() => setImageToCrop(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 relative bg-black/20">
              <Cropper
                image={imageToCrop.preview}
                crop={crop}
                zoom={zoom}
                aspect={cropAspect}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            <div className="p-8 space-y-6 border-t border-white/10 bg-[#0a0a0b]">
              <div className="max-w-lg mx-auto space-y-4">
                {/* Presets de Proporção */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Proporção</span>
                  <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 gap-1">
                    {[
                      { label: 'Livre', value: undefined },
                      { label: '9:16', value: 9/16 },
                      { label: '16:9', value: 16/9 },
                      { label: '1:1', value: 1 },
                      { label: '4:5', value: 4/5 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => setCropAspect(preset.value)}
                        className={`flex-1 py-2 text-xs rounded-xl font-bold uppercase tracking-wider transition-all ${
                          cropAspect === preset.value
                            ? 'bg-orange-500 text-white shadow-lg'
                            : 'text-white/40 hover:text-white/60'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Zoom */}
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Zoom</span>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-label="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-orange-500"
                  />
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={() => setImageToCrop(null)}
                    className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-all text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveCrop}
                    disabled={isCropping}
                    className="flex-1 py-4 bg-orange-500 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-orange-600 transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] disabled:opacity-50 text-white"
                  >
                    {isCropping ? <Loader2 className="w-4 h-4 animate-spin mx-auto text-white" /> : 'Salvar Corte'}
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
              className="relative bg-[#161618] border border-white/10 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl text-center space-y-6 overflow-hidden"
            >
              {/* Top Accent Gradient Line */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 to-orange-600" />
              
              {/* Alert Icon */}
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                <AlertTriangle className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold font-display text-white tracking-tight">
                  {validationAlert.title}
                </h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  {validationAlert.message}
                </p>
              </div>
              
              <button
                onClick={() => setValidationAlert(null)}
                className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] transition-all text-white font-bold text-sm tracking-wide uppercase shadow-[0_0_20px_rgba(249,115,22,0.25)]"
              >
                Entendi, vou corrigir
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
    </div>
  );
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
        if (!data.generatedScript?.scenes?.length && data.generatedAngles?.length) {
          setActiveTab('angles');
        }
      });
      window.electronAPI.injectorReady();
      return unsubscribe;
    }
  }, []);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleStartLoad = () => setIsLoading(true);
    const handleStopLoad = () => setIsLoading(false);
    const handleNavigate = (e: any) => {
      setUrl(e.url);
      setInputValue(e.url);
    };

    webview.addEventListener('did-start-loading', handleStartLoad);
    webview.addEventListener('did-stop-loading', handleStopLoad);
    webview.addEventListener('did-navigate', handleNavigate);
    webview.addEventListener('did-navigate-in-page', handleNavigate);

    return () => {
      webview.removeEventListener('did-start-loading', handleStartLoad);
      webview.removeEventListener('did-stop-loading', handleStopLoad);
      webview.removeEventListener('did-navigate', handleNavigate);
      webview.removeEventListener('did-navigate-in-page', handleNavigate);
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

  const injectText = (text: string) => {
    if (!webviewRef.current) return;
    
    const escapedText = JSON.stringify(text);
    
    const script = `
      (function() {
        const el = document.activeElement;
        if (!el) return false;
        
        let target = el;
        if (target.tagName === 'IFRAME') {
          try {
            target = target.contentDocument.activeElement || target.contentDocument.body;
          } catch (e) {}
        }
        
        if (target.isContentEditable) {
          target.focus();
          target.innerText = ${escapedText};
          target.dispatchEvent(new Event('input', { bubbles: true }));
          target.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        } else if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          target.focus();
          const start = target.selectionStart || 0;
          const end = target.selectionEnd || 0;
          const val = target.value || '';
          
          target.value = val.slice(0, start) + ${escapedText} + val.slice(end);
          
          const newPos = start + ${escapedText}.length;
          target.setSelectionRange(newPos, newPos);
          
          target.dispatchEvent(new Event('input', { bubbles: true }));
          target.dispatchEvent(new Event('change', { bubbles: true }));
          
          const tracker = target._valueTracker;
          if (tracker) {
            tracker.setValue(val);
          }
          return true;
        }
        return false;
      })()
    `;
    
    webviewRef.current.executeJavaScript(script)
      .then((success: boolean) => {
        if (!success) {
          navigator.clipboard.writeText(text);
          alert("Nenhum campo de texto focado encontrado na página. Copiado para a área de transferência!");
        }
      })
      .catch((err: any) => {
        console.error("Erro na injeção:", err);
        navigator.clipboard.writeText(text);
        alert("Copiado para área de transferência (Injeção falhou).");
      });
  };

  const scenes = prompts?.generatedScript?.scenes || [];
  const angles = prompts?.generatedAngles || [];
  const currentItem = activeTab === 'scenes' ? scenes[selectedItemIndex] : angles[selectedItemIndex];

  return (
    <div className={`h-screen w-screen ${themeMode} bg-zinc-950 text-zinc-100 flex overflow-hidden font-sans select-none`}>
      {/* PAINEL ESQUERDO: CONTROLES E PROMPTS */}
      <div className="w-[420px] h-full border-r border-zinc-800 bg-zinc-900/60 backdrop-blur-md flex flex-col flex-shrink-0 overflow-hidden">
        
        {/* Topo do Painel */}
        <div className="p-5 border-b border-zinc-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-teal-500 flex items-center justify-center shadow-lg shadow-orange-500/10 flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold font-display text-base bg-gradient-to-r from-orange-400 to-teal-400 bg-clip-text text-transparent">Injetor de Prompts</h1>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">Digen & Google Labs Flow</p>
          </div>
        </div>

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
                        <Sparkles className="w-3.5 h-3.5" /> Prompt VEO (Vídeo)
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-300 font-mono bg-zinc-950 p-2 rounded-lg border border-zinc-850 max-h-20 overflow-y-auto leading-relaxed select-text">
                      {currentItem.veoPrompt}
                    </div>
                    <button
                      onClick={() => injectText(currentItem.veoPrompt)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/10 transition-all hover:scale-[1.02]"
                    >
                      Injetar VEO
                    </button>
                  </div>
                )}

                {/* 2. Prompt DIGEN */}
                {currentItem.digenPrompt && (
                  <div className="bg-zinc-900/80 p-3.5 rounded-2xl border border-zinc-800 hover:border-zinc-700/60 transition-all space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> Prompt DIGEN (Avatar)
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-300 font-mono bg-zinc-950 p-2 rounded-lg border border-zinc-850 max-h-20 overflow-y-auto leading-relaxed select-text">
                      {currentItem.digenPrompt}
                    </div>
                    <button
                      onClick={() => injectText(currentItem.digenPrompt)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/10 transition-all hover:scale-[1.02]"
                    >
                      Injetar DIGEN
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
                      onClick={() => injectText(currentItem.imagePrompt)}
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
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-500 text-xs py-10">
              Nenhuma cena ou ângulo selecionado.
            </div>
          )}
        </div>

        {/* Dica / Rodapé */}
        <div className="p-4 bg-zinc-950/80 border-t border-zinc-800 text-[10px] text-zinc-400 leading-relaxed flex-shrink-0">
          💡 <strong>Dica:</strong> Primeiro, clique no campo de entrada de texto no site à direita. Depois, clique em um botão de injeção acima para colar o prompt diretamente lá.
        </div>
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
              onClick={() => { setUrl('https://digen.ai/explore'); setInputValue('https://digen.ai/explore'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                url.includes('digen.ai')
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              Digen
            </button>
            <button
              onClick={() => { setUrl('https://labs.google/fx/pt/tools/flow'); setInputValue('https://labs.google/fx/pt/tools/flow'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                url.includes('labs.google')
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
            className="w-full h-full"
            style={{ width: '100%', height: '100%', border: 'none', background: '#000' }}
          />
        </div>
      </div>
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
  const webviewRef = useRef<any>(null);
  const scanTimerRef = useRef<any>(null);

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
      setUrl(e.url);
      setInputValue(e.url);
      setScanResult(null);
    };

    webview.addEventListener('did-start-loading', handleStartLoad);
    webview.addEventListener('did-stop-loading', handleStopLoad);
    webview.addEventListener('did-navigate', handleNavigate);
    webview.addEventListener('did-navigate-in-page', handleNavigate);

    return () => {
      webview.removeEventListener('did-start-loading', handleStartLoad);
      webview.removeEventListener('did-stop-loading', handleStopLoad);
      webview.removeEventListener('did-navigate', handleNavigate);
      webview.removeEventListener('did-navigate-in-page', handleNavigate);
    };
  }, []);

  const runScan = async () => {
    if (!webviewRef.current) return;
    setIsScanning(true);
    try {
      const resultStr = await webviewRef.current.executeJavaScript(SPY_SCAN_SCRIPT);
      const result = JSON.parse(resultStr) as ScanResult;
      setScanResult(result);

      // Apply highlight if enabled
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
            <h1 className="font-bold text-sm bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Espião Auto-Detect</h1>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">Detecção Automática de Campos</p>
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

        {/* Campos Detectados */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Status Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                Campos Detectados
              </h3>
              <div className="flex items-center gap-2">
                {scanResult && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    totalDetected > 0
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {totalDetected} encontrados
                  </span>
                )}
              </div>
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
                    <p className="text-[10px] mt-1">A página pode estar carregando ou usar elementos não-padrão.</p>
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
              onClick={() => { setUrl('https://digen.ai/explore'); setInputValue('https://digen.ai/explore'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                url.includes('digen.ai')
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              Digen
            </button>
            <button
              onClick={() => { setUrl('https://labs.google/fx/pt/tools/flow'); setInputValue('https://labs.google/fx/pt/tools/flow'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                url.includes('labs.google')
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
            className="w-full h-full"
            style={{ width: '100%', height: '100%', border: 'none', background: '#000' }}
          />
        </div>
      </div>
    </div>
  );
}
