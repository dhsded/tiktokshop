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
  AlertTriangle
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { jsPDF } from 'jspdf';

declare global {
  interface Window {
    electronAPI: {
      platform: string;
      openInjectorWindow: (data: any) => void;
      injectorReady: () => void;
      onLoadPrompts: (callback: (data: any) => void) => () => void;
      // EspiÃ£o de AÃ§Ãµes â€” Dev Mode
      openSpyWindow: () => void;
      saveMacro: (data: any) => Promise<{ success: boolean; path?: string; error?: string }>;
      listMacros: () => Promise<any[]>;
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
  'ColeÃ§Ã£o de VerÃ£o',
  'Noite Elegante',
  'Estilo Streetwear',
  'Moda Fitness / Esportiva',
  'Profissional / Social',
  'Boho Chic',
  'Essenciais Minimalistas'
];

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const windowType = params.get('window');

  if (windowType === 'injector' || window.location.hash === '#injector') {
    return <PromptInjector />;
  }

  if (windowType === 'spy') {
    return <SpyMonitor />;
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

  // Ã‚ngulos do Produto
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

  // Modelo primÃ¡rio + fallbacks (na ordem de prioridade)
  const GEMINI_MODEL_CHAIN = [
    "gemini-2.5-flash",   // Modelo primÃ¡rio (mais recente e estÃ¡vel)
    "gemini-1.5-flash",   // Primeiro fallback
    "gemini-1.5-pro",     // Segundo fallback
  ];

  const executeGeminiCall = async <T,>(apiCall: (ai: GoogleGenAI, model: string) => Promise<T>): Promise<T> => {
    // Captura as chaves no momento da chamada (evita problema de React state assÃ­ncrono)
    const keysToTry = apiKeys.length > 0 ? [...apiKeys] : (process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY] : []);
    
    if (keysToTry.length === 0) {
      throw new Error("Nenhuma chave de API do Gemini configurada. Carregue um arquivo .txt com suas chaves.");
    }

    let lastError: any = null;

    // Loop externo: percorre cada chave disponÃ­vel
    for (let keyIdx = 0; keyIdx < keysToTry.length; keyIdx++) {
      const key = keysToTry[keyIdx];
      
      // Loop interno: percorre a cadeia de modelos (primÃ¡rio â†’ fallbacks)
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
          
          // Erros de chave: pular para a prÃ³xima chave imediatamente
          const isKeyError = errorStr.includes("api key expired") || 
                             errorStr.includes("api key not valid") || 
                             errorStr.includes("api_key_invalid") ||
                             errorStr.includes("key expired") ||
                             errorStr.includes("invalid api key") ||
                             (errorStr.includes("invalid_argument") && errorStr.includes("key"));
          
          if (isKeyError) {
            console.warn(`Chave ${keyIdx + 1} expirada ou invÃ¡lida. Tentando prÃ³xima chave...`);
            break; // Sai do loop de modelos, vai para a prÃ³xima chave
          }
          
          // Erros de modelo (indisponÃ­vel, sobrecarregado): tenta o prÃ³ximo modelo
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
            console.warn(`Modelo ${model} indisponÃ­vel. Tentando prÃ³ximo modelo...`);
            continue; // Tenta o prÃ³ximo modelo na cadeia
          }
          
          // Outros erros: lanÃ§a imediatamente (erro de lÃ³gica, timeout, etc.)
          throw error;
        }
      }
    }
    
    // Monta mensagem de erro amigÃ¡vel
    const lastMsg = (lastError?.message || String(lastError) || "").toLowerCase();
    if (lastMsg.includes("key expired") || lastMsg.includes("api key") || lastMsg.includes("invalid_argument")) {
      throw new Error(`Todas as ${keysToTry.length} chave(s) de API estÃ£o expiradas ou invÃ¡lidas.\nRenove suas chaves em: https://aistudio.google.com/apikey`);
    }
    throw lastError || new Error("Todos os modelos e chaves falharam. Verifique sua conexÃ£o e chaves de API.");
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
Retorne um array JSON indicando a sequÃªncia ideal baseada no nome/descriÃ§Ã£o das imagens para um fluxo narrativo fluido.
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
      console.error("Erro na sequÃªncia:", error);
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
        message: "Por favor, adicione pelo menos uma foto do produto na seÃ§Ã£o 'Produto (VÃ¡rias Fotos)' para que possamos gerar o roteiro do seu produto."
      });
      return;
    }
    if (videoStyle === 'standard' && !modelImage) {
      setValidationAlert({
        title: "Modelo/Apresentador Faltando",
        message: "VocÃª selecionou o estilo de vÃ­deo 'Apresentador', que exige uma imagem de referÃªncia do apresentador. Por favor, envie uma foto na seÃ§Ã£o 'Modelo / Apresentador(a)' ou altere o estilo do vÃ­deo para 'POV (MÃ£os)'."
      });
      return;
    }
    if (!numScenes || numScenes <= 0) {
      setValidationAlert({
        title: "NÃºmero de Cenas InvÃ¡lido",
        message: "Por favor, insira um nÃºmero vÃ¡lido de cenas (mÃ­nimo 1) para o roteiro do seu produto."
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
        ? `ESTILO DO VÃDEO: POV (APENAS MÃƒOS / PRIMEIRA PESSOA)
- O apresentador/modelo NÃƒO deve aparecer de corpo inteiro ou mostrar o rosto. Apenas suas mÃ£os (de acordo com o gÃªnero e produto) devem aparecer manipulando, segurando, demonstrando, tocando ou usando o produto.
- No campo 'imagePrompt' (Nano Banana 2 / Imagen 3), NUNCA inclua descriÃ§Ãµes do rosto ou corpo do modelo. Descreva um close-up extremo ou macro focado apenas nas mÃ£os (femininas ou masculinas conforme o produto) segurando e demonstrando o produto com extremo realismo e qualidade.
- No campo 'veoPrompt' (AnimaÃ§Ã£o VEO), descreva movimentos de cÃ¢mera focados nas aÃ§Ãµes das mÃ£os: girando o produto, aplicando, mostrando texturas, detalhes e close-ups das mÃ£os em aÃ§Ã£o.
- No campo 'digenPrompt' (DIGEN), descreva uma narraÃ§Ã£o em off (voiceover) apropriada para acompanhar a demonstraÃ§Ã£o do produto, sem movimentos labiais do avatar (pois Ã© POV).`
        : `ESTILO DO VÃDEO: APRESENTADOR PADRÃƒO (VISÃVEL NO VÃDEO)
- O apresentador/modelo aparece na cena interagindo e apresentando o produto.
- O campo 'imageName' deve indicar qual referÃªncia usar principalmente na cena (use "${modelImage?.name || ''}" se o foco principal for a modelo ou o nome de um dos arquivos de foto do produto se for um detalhe).
- No campo 'imagePrompt' (Nano Banana 2 / Imagen 3), descreva a modelo apresentando e interagindo com o produto de forma fotorrealista e natural.`;

      const voiceInstruction = voiceGender === 'none'
        ? `GÃŠNERO DA VOZ / NARRADOR: SEM NARRAÃ‡ÃƒO (SEM FALA).
- O vÃ­deo NÃƒO terÃ¡ nenhuma narraÃ§Ã£o falada, voz humana ou diÃ¡logo (no-voiceover / no-speech).
- O foco Ã© 100% visual: mostrar o produto de vÃ¡rios Ã¢ngulos, destacando detalhes, qualidade e texturas com uma mÃºsica de fundo instrumental.
- No campo 'narration' (em PT-BR), em vez de fala falada, vocÃª DEVE escrever descriÃ§Ãµes detalhadas da trilha sonora (SFX / MÃºsica de fundo) e legendas de texto para aparecer na tela (ex: '[MÃºsica instrumental animada de fundo] [Legenda de tela: ConheÃ§a a qualidade do...]').
- No campo 'digenPrompt' (DIGEN), especifique explicitamente que NÃƒO hÃ¡ voz ou narraÃ§Ã£o, focando apenas na trilha sonora instrumental e efeitos de Ã¡udio (ex: 'No speech. Professional energetic instrumental background music and sound effects, highlighting product details').`
        : `GÃŠNERO DA VOZ / NARRADOR:
A voz da narraÃ§Ã£o deve ser obrigatoriamente ${voiceGender === 'female' ? 'FEMININA' : 'MASCULINA'}.
- Toda a narraÃ§Ã£o em PT-BR ('narration') deve ser escrita adaptando a concordÃ¢ncia verbal, adjetivos e o tom estilÃ­stico para uma voz ${voiceGender === 'female' ? 'FEMININA' : 'MASCULINA'} (por exemplo: referÃªncias no feminino/masculino dependendo do contexto).
- No campo 'digenPrompt' (DIGEN), especifique explicitamente que o estilo de voz Ã© uma voz ${voiceGender === 'female' ? 'feminina' : 'masculina'} clara e persuasiva (ex: 'clear and natural ${voiceGender === 'female' ? 'female' : 'male'} voice narrative style').`;

      parts.push({
        text: `Gere um roteiro narrativo e prompts de animaÃ§Ã£o focados na apresentaÃ§Ã£o de um produto.
Imagens fornecidas: 
1. Modelo/Apresentador(a): ${modelImage ? modelImage.name : "Nenhuma (VÃ­deo em POV)"}
2. Fotos do Produto: ${productImages.map(p => p.name).join(', ')}

DuraÃ§Ã£o de cada cena: ${duration}
NÃºmero de cenas a gerar: ${numScenes}
ObservaÃ§Ãµes especÃ­ficas: ${observations || "INSTRUÃ‡ÃƒO: Se este campo estiver vazio, por favor analise as imagens enviadas e extraia qualquer texto, marca, benefÃ­cio ou caracterÃ­stica visÃ­vel do produto para usar no roteiro e narraÃ§Ã£o."}

${styleInstruction}

${voiceInstruction}

REGRAS OBRIGATÃ“RIAS:
1. Crie exatamente ${numScenes} cenas detalhando a apresentaÃ§Ã£o do produto. Varie as fotos do produto nas cenas se houver mais de uma.
2. O campo 'imageName' deve indicar qual das fotos fornecidas (modelo ou produto) serve de referÃªncia visual principal para aquela cena.
3. O NOME DO ARQUIVO REFERENCIADO DEVE ser incluÃ­do no INÃCIO dos prompts 'veoPrompt' e 'digenPrompt' entre colchetes. Exemplo: "[foto_produto.jpg] ..."
4. O VEO Ã© excelente para as animaÃ§Ãµes de cÃ¢mera e ambiente. O DIGEN Ã© para falas e vozes.
5. As roupas, cenÃ¡rio da modelo (se houver) e o produto original devem ser mantidos intactos.
6. âš ï¸ CRÃTICO â€” IDIOMA DA NARRAÃ‡ÃƒO: O campo 'narration' DEVE ser OBRIGATORIAMENTE escrito em PORTUGUÃŠS BRASILEIRO (PT-BR). NUNCA escreva a narraÃ§Ã£o em inglÃªs. ${voiceGender === 'none' ? 'No modo Sem NarraÃ§Ã£o, descreva a trilha sonora/SFX e legendas de tela em PT-BR.' : 'A narraÃ§Ã£o Ã© o texto falado em voz alta para o pÃºblico brasileiro do TikTok.'} Se escrever em inglÃªs, serÃ¡ considerado um erro grave.
7. CRÃTICO: A narraÃ§Ã£o deve respeitar a duraÃ§Ã£o de ${duration}. Para ${duration}, use no mÃ¡ximo ${parseInt(duration) * 2.5} palavras para garantir uma fala natural e fluida.
8. Os campos 'veoPrompt' e 'digenPrompt' devem estar em INGLÃŠS (para as ferramentas de IA). Apenas 'narration' Ã© em PT-BR.
9. CRÃTICO (Prompt de Imagem EstÃ¡tica da Cena - Nano Banana 2): Para cada cena, crie um prompt detalhado em inglÃªs no campo 'imagePrompt'. O prompt deve ser riquÃ­ssimo em detalhes visuais, estilo fotogrÃ¡fico realista, iluminaÃ§Ã£o profissional. NÃ£o inclua texto explicativo, apenas a descriÃ§Ã£o visual em inglÃªs.

Retorne em estrutura JSON:
{
  "campaignTitle": "Nome da Campanha",
  "scenes": [
    { 
      "imageName": "Nome exato do arquivo de referÃªncia", 
      "duration": "${duration}", 
      "imagePrompt": "Detailed English still image generation prompt for Nano Banana 2/Imagen...",
      "veoPrompt": "[NOME_DO_ARQUIVO] Prompt em inglÃªs...", 
      "digenPrompt": "[NOME_DO_ARQUIVO] Prompt em inglÃªs...", 
      "narration": "NarraÃ§Ã£o em PT-BR...", 
      "description": "ExplicaÃ§Ã£o da cena" 
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
        console.log('GeraÃ§Ã£o cancelada pelo usuÃ¡rio');
      } else {
        console.error("Erro ao gerar roteiro de produto:", error);
        const msg = error?.message || String(error);
        setValidationAlert({
          title: "Erro na GeraÃ§Ã£o",
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
        message: "Por favor, envie pelo menos uma foto de look na seÃ§Ã£o 'Imagens da ColeÃ§Ã£o' para que possamos gerar o roteiro da coleÃ§Ã£o."
      });
      return;
    }
    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    try {
      const finalTheme = customTheme || theme;

      const voiceInstruction = voiceGender === 'none'
        ? `GÃŠNERO DA VOZ / NARRADOR: SEM NARRAÃ‡ÃƒO (SEM FALA).
- O vÃ­deo NÃƒO terÃ¡ nenhuma narraÃ§Ã£o falada, voz humana ou diÃ¡logo (no-voiceover / no-speech).
- O foco Ã© 100% visual: mostrar a coleÃ§Ã£o sob vÃ¡rios Ã¢ngulos, destacando detalhes e tecidos com mÃºsica de fundo instrumental.
- No campo 'narration' (em PT-BR), em vez de fala falada, vocÃª DEVE escrever descriÃ§Ãµes detalhadas da trilha sonora (SFX / MÃºsica de fundo) e legendas de texto para aparecer na tela (ex: '[MÃºsica instrumental animada de fundo] [Legenda de tela: ColeÃ§Ã£o de verÃ£o exclusiva...]').
- No campo 'digenPrompt' (DIGEN), especifique explicitamente que NÃƒO hÃ¡ voz ou narraÃ§Ã£o, focando apenas na trilha sonora instrumental e efeitos de Ã¡udio (ex: 'No speech. Professional energetic instrumental background music and sound effects, highlighting clothing details').`
        : `GÃŠNERO DA VOZ / NARRADOR:
A voz da narraÃ§Ã£o deve ser obrigatoriamente ${voiceGender === 'female' ? 'FEMININA' : 'MASCULINA'}.
- Toda a narraÃ§Ã£o em PT-BR ('narration') deve ser escrita adaptando a concordÃ¢ncia verbal, adjetivos e o tom estilÃ­stico para uma voz ${voiceGender === 'female' ? 'FEMININA' : 'MASCULINA'} (por exemplo: referÃªncias no feminino/masculino dependendo do contexto).
- No campo 'digenPrompt' (DIGEN), especifique explicitamente que o estilo de voz Ã© uma voz ${voiceGender === 'female' ? 'feminina' : 'masculina'} clara e persuasiva (ex: 'clear and natural ${voiceGender === 'female' ? 'female' : 'male'} voice narrative style').`;

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
DuraÃ§Ã£o de cada cena: ${duration}
ObservaÃ§Ãµes especÃ­ficas: ${observations || "Seguir estilo padrÃ£o de alta costura."}

${voiceInstruction}

REGRAS OBRIGATÃ“RIAS:
1. O NOME ORIGINAL DO ARQUIVO de cada imagem DEVE ser incluÃ­do no INÃCIO dos prompts 'veoPrompt' e 'digenPrompt' entre colchetes. Exemplo: "[foto_look_01.jpg] Cinematic camera movement..."
2. As roupas e o CENÃRIO devem ser mantidos idÃªnticos. NÃ£o mude cores, tecidos ou o ambiente.
3. Foque em animaÃ§Ãµes cinematogrÃ¡ficas para VEO: movimento de cÃ¢mera (pan, tilt, zoom), partÃ­culas de luz, vento sutil no cabelo e expressÃµes faciais.
4. Para DIGEN, foque na naturalidade do modelo digital falando ou reagindo.
5. âš ï¸ CRÃTICO â€” IDIOMA DA NARRAÃ‡ÃƒO: O campo 'narration' DEVE ser OBRIGATORIAMENTE escrito em PORTUGUÃŠS BRASILEIRO (PT-BR). NUNCA escreva a narraÃ§Ã£o em inglÃªs. ${voiceGender === 'none' ? 'No modo Sem NarraÃ§Ã£o, descreva a trilha sonora/SFX e legendas de tela em PT-BR.' : 'A narraÃ§Ã£o Ã© o texto falado em voz alta para o pÃºblico brasileiro do TikTok.'}
6. Os campos 'veoPrompt' e 'digenPrompt' devem estar em INGLÃŠS (para as ferramentas de IA). Apenas 'narration' Ã© em PT-BR.
7. CRÃTICO (Prompt de Imagem EstÃ¡tica da Cena - Nano Banana 2): Para cada cena, crie um prompt detalhado em inglÃªs no campo 'imagePrompt'. O prompt deve ser riquÃ­ssimo em detalhes visuais, estilo fotogrÃ¡fico realista, iluminaÃ§Ã£o profissional, mantendo consistÃªncia total com a imagem original. NÃ£o inclua texto explicativo, apenas a descriÃ§Ã£o visual em inglÃªs.

Retorne em estrutura JSON:
{
  "campaignTitle": "Nome da Campanha",
  "scenes": [
    { 
      "imageName": "Nome exato do arquivo", 
      "duration": "${duration}", 
      "imagePrompt": "Detailed English still image generation prompt for Nano Banana 2/Imagen...",
      "veoPrompt": "[NOME_DO_ARQUIVO] Prompt em inglÃªs...", 
      "digenPrompt": "[NOME_DO_ARQUIVO] Prompt em inglÃªs...", 
      "narration": "NarraÃ§Ã£o em PT-BR...", 
      "description": "ExplicaÃ§Ã£o da cena" 
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
        console.log('GeraÃ§Ã£o cancelada pelo usuÃ¡rio');
      } else {
        console.error("Erro ao gerar roteiro:", error);
        const msg = error?.message || String(error);
        setValidationAlert({
          title: "Erro na GeraÃ§Ã£o",
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
        message: "Por favor, adicione pelo menos uma foto do produto na seÃ§Ã£o 'Produto (VÃ¡rias Fotos)' para gerar as variaÃ§Ãµes de Ã¢ngulos."
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
        text: `VocÃª Ã© um especialista em fotografia de produto e marketing digital para TikTok Shop.

Com base nas imagens do produto fornecidas, gere exatamente ${numAngles} variaÃ§Ãµes de prompts para mostrar o produto em Ã¢ngulos e perspectivas diferentes.

PRODUTO(S): ${productImages.map(p => p.name).join(', ')}
DURAÃ‡ÃƒO: ${duration}
GÃŠNERO DA VOZ: ${voiceGender === 'none' ? 'SEM NARRAÃ‡ÃƒO (SEM FALA)' : (voiceGender === 'female' ? 'FEMININO' : 'MASCULINO')}

REGRAS ABSOLUTAS â€” NUNCA VIOLE:
1. O PRODUTO DEVE SER MANTIDO 100% IDÃŠNTICO â€” mesmas cores, formato, textura, tamanho, marca, logotipo e TODAS as caracterÃ­sticas visuais originais. NUNCA altere o produto.
2. Apenas o Ã‚NGULO DA CÃ‚MERA e a COMPOSIÃ‡ÃƒO DA CENA mudam.
3. Nos campos imagePrompt, veoPrompt e digenPrompt, SEMPRE mencione "exact same product, identical colors, textures and design unchanged" para garantir fidelidade absoluta.
4. Os campos imagePrompt, veoPrompt e digenPrompt DEVEM estar em INGLÃŠS.
5. âš ï¸ O campo narration DEVE ser em PORTUGUÃŠS BRASILEIRO (PT-BR) â€” NUNCA em inglÃªs. ${voiceGender === 'none' ? 'No modo Sem NarraÃ§Ã£o, descreva apenas trilha sonora/SFX e legendas de tela em PT-BR (ex: "[MÃºsica instrumental de fundo] [Legenda: Veja a costura...]").' : 'Descreva a fala falada em PT-BR.'}
6. No inÃ­cio dos campos veoPrompt e digenPrompt, inclua o nome do arquivo entre colchetes.
7. ${voiceGender === 'none' ? 'Como estÃ¡ Sem NarraÃ§Ã£o (no-speech), o campo digenPrompt deve especificar apenas mÃºsica instrumental e SFX, sem fala humana (ex: "No speech. Energetic background music and sound effects, highlighting details.").' : 'Especifique no digenPrompt o estilo de voz de acordo com o GÃŠNERO DA VOZ.'}

Angulos a variar (escolha os mais relevantes para o produto):
- Vista frontal (Front view straight on)
- Vista traseira (Back view)
- Vista lateral direita/esquerda (Side profile)
- Vista em 45Â° diagonal (Three-quarter view)
- Close-up de detalhes (Detail macro close-up)
- Vista superior (Top-down flat lay)
- Perspectiva dinÃ¢mica (Low angle dynamic view)
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
      console.error('Erro ao gerar Ã¢ngulos:', error);
      setValidationAlert({
        title: "Erro na GeraÃ§Ã£o de Ã‚ngulos",
        message: "Ocorreu um erro ao gerar as variaÃ§Ãµes de Ã¢ngulos:\n" + (error?.message || String(error))
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
        lines.push(`\nCENA ${i + 1} â€¢ ${scene.duration} â€¢ ${scene.imageName}`);
        lines.push('-'.repeat(40));
        lines.push(`\n[IMAGEM â€” Nano Banana 2]\n${scene.imagePrompt}`);
        lines.push(`\n[VEO â€” AnimaÃ§Ã£o]\n${scene.veoPrompt}`);
        lines.push(`\n[DIGEN â€” Fala]\n${scene.digenPrompt}`);
        lines.push(`\n[NARRAÃ‡ÃƒO PT-BR]\n${scene.narration}`);
        lines.push(`\n[CONTEXTO]\n${scene.description}`);
        lines.push('\n' + '='.repeat(60));
      });
    }
    if (generatedAngles && generatedAngles.length > 0) {
      lines.push(`\n\nÃ‚NGULOS DO PRODUTO`);
      lines.push('='.repeat(60));
      generatedAngles.forEach((angle, i) => {
        lines.push(`\nÃ‚NGULO ${i + 1}: ${angle.angleName}`);
        lines.push('-'.repeat(40));
        lines.push(`\n[IMAGEM â€” Nano Banana 2]\n${angle.imagePrompt}`);
        lines.push(`\n[VEO â€” AnimaÃ§Ã£o]\n${angle.veoPrompt}`);
        lines.push(`\n[DIGEN â€” Fala]\n${angle.digenPrompt}`);
        lines.push(`\n[NARRAÃ‡ÃƒO PT-BR]\n${angle.narration}`);
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
      ${buildSectionHtml('VEO â€” AnimaÃ§Ã£o', '#2563eb', scene.veoPrompt)}
      ${buildSectionHtml('DIGEN â€” Fala', '#7c3aed', scene.digenPrompt)}
      <p style="font-weight:bold;font-size:9pt;color:#ea580c;text-transform:uppercase;margin:8px 0 2px">NarraÃ§Ã£o (PT-BR)</p>
      <div style="background:#fff7ed;padding:8px 10px;border-left:3px solid #ea580c;margin-bottom:10px;font-style:italic;font-size:11pt">${scene.narration}</div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
    `).join('');

    const anglesHtml = (generatedAngles && generatedAngles.length > 0) ? `
      <h1 style="font-size:18pt;color:#E65C00;margin-top:24px">Ã‚ngulos do Produto</h1>
      ${generatedAngles.map((angle, i) => `
        <h2 style="font-size:13pt;color:#333;border-bottom:2px solid #E65C00;padding-bottom:4px">Ã‚ngulo ${i + 1}: ${angle.angleName}</h2>
        ${buildSectionHtml('Imagem (Nano Banana 2)', '#b45309', angle.imagePrompt)}
        ${buildSectionHtml('VEO â€” AnimaÃ§Ã£o', '#2563eb', angle.veoPrompt)}
        ${buildSectionHtml('DIGEN â€” Fala', '#7c3aed', angle.digenPrompt)}
        <p style="font-weight:bold;font-size:9pt;color:#ea580c;text-transform:uppercase;margin:8px 0 2px">NarraÃ§Ã£o (PT-BR)</p>
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
      doc.text(`Cena ${i + 1}  â€¢  ${scene.duration}  â€¢  ${scene.imageName}`, margin, y); y += 7;
      addLabel('Imagem (Nano Banana 2)', 180, 83, 9); addBody(scene.imagePrompt);
      addLabel('VEO â€” AnimaÃ§Ã£o', 37, 99, 235); addBody(scene.veoPrompt);
      addLabel('DIGEN â€” Fala', 124, 58, 237); addBody(scene.digenPrompt);
      addLabel('NarraÃ§Ã£o PT-BR', 234, 88, 12);
      doc.setFontSize(10); doc.setFont('helvetica', 'italic'); doc.setTextColor(30, 30, 30);
      const nlines = doc.splitTextToSize(scene.narration, maxW);
      checkPage(nlines.length * 5); doc.text(nlines, margin, y); y += nlines.length * 5 + 4;
      addDivider();
    });

    if (generatedAngles && generatedAngles.length > 0) {
      checkPage(20);
      doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(230, 92, 0);
      doc.text('Ã‚NGULOS DO PRODUTO', margin, y); y += 10;
      generatedAngles.forEach((angle, i) => {
        checkPage(20);
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 50, 50);
        doc.text(`Ã‚ngulo ${i + 1}: ${angle.angleName}`, margin, y); y += 7;
        addLabel('Imagem (Nano Banana 2)', 180, 83, 9); addBody(angle.imagePrompt);
        addLabel('VEO â€” AnimaÃ§Ã£o', 37, 99, 235); addBody(angle.veoPrompt);
        addLabel('DIGEN â€” Fala', 124, 58, 237); addBody(angle.digenPrompt);
        addLabel('NarraÃ§Ã£o PT-BR', 234, 88, 12);
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
                <span className="text-xs font-bold tracking-[0.2em] uppercase text-orange-500">ProduÃ§Ã£o com IA</span>
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
                Crie roteiros narrativos e prompts de animaÃ§Ã£o para suas coleÃ§Ãµes de produtos em segundos.
              </motion.p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-2">
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
              Fotos Diversas / ColeÃ§Ã£o
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
                          SequÃªncia IA
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
                    <p className="text-[10px] text-white/30 text-center italic">Arraste as imagens para reordenar a sequÃªncia manual</p>
                  )}
                </section>

                {/* Step 2: Configuration (Collection) */}
                <section className="space-y-6">
                  <h2 className="text-xl font-medium flex items-center gap-2">
                    <span className="bg-white/5 w-8 h-8 rounded-full flex items-center justify-center text-sm border border-white/10">2</span>
                    ConfiguraÃ§Ã£o
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
                          placeholder="Ex: ColeÃ§Ã£o Inverno Nordestino"
                          value={customTheme}
                          onChange={(e) => setCustomTheme(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-white/20"
                        />
                      )}
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                        <Settings2 className="w-3 h-3" />
                        DuraÃ§Ã£o da Cena
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
                      GÃªnero da Voz / Narrador
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
                        Sem NarraÃ§Ã£o
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
                    Imagens de ReferÃªncia
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
                        Produto (VÃ¡rias Fotos)
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
                    ConfiguraÃ§Ã£o
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                        <FileJson className="w-3 h-3" />
                        NÃºmero de Cenas
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
                        DuraÃ§Ã£o da Cena
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
                        Estilo do VÃ­deo
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
                          POV (MÃ£os)
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                        <Volume2 className="w-3 h-3 text-purple-400" />
                        GÃªnero da Voz / Narrador
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
                          Sem NarraÃ§Ã£o
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
                  ObservaÃ§Ãµes Importantes
                </label>
                <textarea 
                  placeholder="Ex: Foco no pÃºblico jovem, tom de voz entusiasmado, use gÃ­rias atuais, destaque a leveza do tecido..."
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
                    Cancelar GeraÃ§Ã£o
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
                              message: "Esta funcionalidade de injeÃ§Ã£o automÃ¡tica estÃ¡ disponÃ­vel apenas rodando no aplicativo Electron."
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
                                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-blue-400 font-display">2. AnimaÃ§Ã£o (VEO)</h4>
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
                                      title="Baixar Imagem de ReferÃªncia"
                                    >
                                      <Upload className="w-3 h-3 rotate-180" />
                                    </button>
                                    <button 
                                      onClick={() => copyText(`${scene.veoPrompt}\n\nNarraÃ§Ã£o (PT-BR):\n${scene.narration}`)} 
                                      className="text-white/20 hover:text-blue-400 transition-colors flex items-center gap-1.5"
                                      title="Copiar Prompt VEO + NarraÃ§Ã£o"
                                    >
                                      <span className="text-[9px] font-bold text-blue-400/80 tracking-wider font-mono">+ NarraÃ§Ã£o</span>
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
                                    onClick={() => copyText(`${scene.digenPrompt}\n\nNarraÃ§Ã£o (PT-BR):\n${scene.narration}`)} 
                                    className="text-white/20 hover:text-purple-400 transition-colors flex items-center gap-1.5"
                                    title="Copiar Prompt DIGEN + NarraÃ§Ã£o"
                                  >
                                    <span className="text-[9px] font-bold text-purple-400/80 tracking-wider font-mono">+ NarraÃ§Ã£o</span>
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
                                <h4 className="text-[10px] uppercase font-bold tracking-widest text-orange-500 font-display">NarraÃ§Ã£o / DiÃ¡logo (PT-BR)</h4>
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
                          <h3 className="text-xl font-bold font-display text-white">Ã‚ngulos Adicionais do Produto</h3>
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
                        Gere variaÃ§Ãµes de prompts em Ã¢ngulos alternativos (close-ups, perfil, flat lay, etc.) para o seu produto, garantindo consistÃªncia total de cor e design.
                      </p>
                      
                      {isGeneratingAngles ? (
                        <div className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-teal-500/5 border border-teal-500/10 text-teal-400/60 font-bold text-sm">
                          <Loader2 className="w-5 h-5 animate-spin" /> Gerando {numAngles} Ã‚ngulos...
                        </div>
                      ) : (
                        <button
                          onClick={generateProductAngles}
                          className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-400 hover:text-white transition-all active:scale-[0.98] font-bold text-sm tracking-wide uppercase"
                        >
                          <Layers className="w-4 h-4" /> Gerar {numAngles} Ã‚ngulos do Produto
                        </button>
                      )}
                    </motion.div>
                  )}

                  {/* Ã‚ngulos do Produto */}
                  {generatedAngles && generatedAngles.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 pt-4">
                        <Layers className="w-5 h-5 text-teal-400" />
                        <h3 className="text-xl font-bold font-display">Ã‚ngulos do Produto</h3>
                        <span className="text-xs bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded-full">{generatedAngles.length} variaÃ§Ãµes</span>
                      </div>
                      <p className="text-xs text-white/30">Produto mantido 100% original â€” apenas o Ã¢ngulo da cÃ¢mera varia</p>
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
                              onClick={() => copyText(`${angle.imagePrompt}\n\nVEO:\n${angle.veoPrompt}\n\nDIGEN:\n${angle.digenPrompt}\n\nNarraÃ§Ã£o (PT-BR):\n${angle.narration}`)}
                              className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                              title="Copiar tudo deste Ã¢ngulo"
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
                                  <button onClick={() => copyText(`${angle.veoPrompt}\n\nNarraÃ§Ã£o (PT-BR):\n${angle.narration}`)} className="text-white/20 hover:text-blue-400 transition-colors flex items-center gap-1">
                                    <span className="text-[9px] font-bold text-blue-400/70">+ Narr.</span>
                                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                                <p className="text-xs text-white/60 leading-relaxed italic">&quot;{angle.veoPrompt}&quot;</p>
                              </div>
                              <div className="space-y-2 bg-black/10 p-4 rounded-2xl border border-white/5">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-purple-400">DIGEN</h4>
                                  <button onClick={() => copyText(`${angle.digenPrompt}\n\nNarraÃ§Ã£o (PT-BR):\n${angle.narration}`)} className="text-white/20 hover:text-purple-400 transition-colors flex items-center gap-1">
                                    <span className="text-[9px] font-bold text-purple-400/70">+ Narr.</span>
                                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                                <p className="text-xs text-white/60 leading-relaxed italic">&quot;{angle.digenPrompt}&quot;</p>
                              </div>
                            </div>
                            <div className="bg-teal-500/5 p-4 rounded-2xl border border-teal-500/10">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[10px] uppercase font-bold tracking-widest text-teal-400">NarraÃ§Ã£o (PT-BR)</h4>
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
                      if(confirm("Deseja iniciar um novo projeto? Todas as configuraÃ§Ãµes e roteiros atuais serÃ£o perdidos.")) {
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
                      Envie as fotos dos seus looks e defina um tema para criar prompts cinematogrÃ¡ficos e narraÃ§Ãµes persuasivas.
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
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            <div className="p-8 space-y-6 border-t border-white/10 bg-[#0a0a0b]">
              <div className="max-w-md mx-auto space-y-4">
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
          alert("Nenhum campo de texto focado encontrado na pÃ¡gina. Copiado para a Ã¡rea de transferÃªncia!");
        }
      })
      .catch((err: any) => {
        console.error("Erro na injeÃ§Ã£o:", err);
        navigator.clipboard.writeText(text);
        alert("Copiado para Ã¡rea de transferÃªncia (InjeÃ§Ã£o falhou).");
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
            Ã‚ngulos ({angles.length})
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
                  <p className="text-[11px] text-zinc-400 truncate">{scene.description || 'Sem descriÃ§Ã£o'}</p>
                </button>
              ))
            )
          ) : (
            angles.length === 0 ? (
              <div className="text-center py-6 text-zinc-500 text-xs">Nenhum Ã¢ngulo gerado.</div>
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
                        <Sparkles className="w-3.5 h-3.5" /> Prompt VEO (VÃ­deo)
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

                {/* 4. NarraÃ§Ã£o */}
                {currentItem.narration && (
                  <div className="bg-zinc-900/80 p-3.5 rounded-2xl border border-zinc-800 hover:border-zinc-700/60 transition-all space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5" /> NarraÃ§Ã£o (Falas)
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-300 font-mono bg-zinc-950 p-2 rounded-lg border border-zinc-850 max-h-20 overflow-y-auto leading-relaxed select-text">
                      {currentItem.narration}
                    </div>
                    <button
                      onClick={() => injectText(currentItem.narration)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl text-xs font-bold shadow-md shadow-yellow-600/10 transition-all hover:scale-[1.02]"
                    >
                      Injetar NarraÃ§Ã£o
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-500 text-xs py-10">
              Nenhuma cena ou Ã¢ngulo selecionado.
            </div>
          )}
        </div>

        {/* Dica / RodapÃ© */}
        <div className="p-4 bg-zinc-950/80 border-t border-zinc-800 text-[10px] text-zinc-400 leading-relaxed flex-shrink-0">
          ðŸ’¡ <strong>Dica:</strong> Primeiro, clique no campo de entrada de texto no site Ã  direita. Depois, clique em um botÃ£o de injeÃ§Ã£o acima para colar o prompt diretamente lÃ¡.
        </div>
      </div>

      {/* PAINEL DIREITO: NAVEGADOR WEB */}
      <div className="flex-1 h-full flex flex-col overflow-hidden bg-black">
        
        {/* Barra de NavegaÃ§Ã£o do Navegador */}
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
              title="AvanÃ§ar"
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
                placeholder="Digite o endereÃ§o URL do site..."
              />
            </div>
          </form>

          {/* Atalhos RÃ¡pidos */}
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

        {/* Webview Ãrea */}
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
// EspiÃ£o de AÃ§Ãµes â€” Ferramenta de Desenvolvimento
// ============================================================

interface SpySelector {
  css: string;
  xpath: string;
  aria: string | null;
  id: string | null;
}

interface SpyElementInfo {
  tag: string;
  id: string;
  classes: string[];
  role: string | null;
  ariaLabel: string | null;
  text: string;
  type: string | null;
  contentEditable: boolean;
  inShadowDom: boolean;
  shadowPath: string[];
}

interface SpyAction {
  index: number;
  type: 'click' | 'input' | 'change' | 'focus' | 'keydown' | 'scroll' | 'submit'
       | 'file-upload' | 'navigate' | 'dom-mutation';
  timestamp_ms: number;
  selector: SpySelector;
  element: SpyElementInfo;
  value: string | null;
  coordinates: { x: number; y: number } | null;
  classification: 'PROMPT_FIELD' | 'UPLOAD_BUTTON' | 'GENERATE_BUTTON'
                 | 'DOWNLOAD_BUTTON' | 'NAVIGATION' | 'OTHER' | null;
}

// Script de monitoramento injetado no webview
const SPY_MONITOR_SCRIPT = `
(function() {
  if (window.__spyMonitorActive) return;
  window.__spyMonitorActive = true;
  const startTime = Date.now();

  function getDeepActiveElement() {
    let el = document.activeElement;
    const path = [];
    while (el && el.shadowRoot && el.shadowRoot.activeElement) {
      path.push(el.tagName.toLowerCase());
      el = el.shadowRoot.activeElement;
    }
    return { element: el, shadowPath: path };
  }

  function generateCssSelector(el) {
    if (!el || el === document.body || el === document.documentElement) return el ? el.tagName.toLowerCase() : 'unknown';
    if (el.id) return '#' + el.id;
    if (el.getAttribute && el.getAttribute('role')) return '[role="' + el.getAttribute('role') + '"]';
    if (el.getAttribute && el.getAttribute('aria-label')) return '[aria-label="' + el.getAttribute('aria-label') + '"]';
    if (el.getAttribute && el.getAttribute('data-testid')) return '[data-testid="' + el.getAttribute('data-testid') + '"]';
    if (el.getAttribute && el.getAttribute('name')) return '[name="' + el.getAttribute('name') + '"]';
    var parent = el.parentElement;
    if (!parent) return el.tagName ? el.tagName.toLowerCase() : 'unknown';
    var siblings = Array.from(parent.children).filter(function(c) { return c.tagName === el.tagName; });
    var idx = siblings.indexOf(el) + 1;
    if (siblings.length === 1) return generateCssSelector(parent) + ' > ' + el.tagName.toLowerCase();
    return generateCssSelector(parent) + ' > ' + el.tagName.toLowerCase() + ':nth-of-type(' + idx + ')';
  }

  function generateXPath(el) {
    if (!el || !el.tagName) return '/';
    if (el.id) return '//*[@id="' + el.id + '"]';
    var parts = [];
    var current = el;
    while (current && current.nodeType === 1 && current !== document.body) {
      var idx = 1;
      var sibling = current.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === current.tagName) idx++;
        sibling = sibling.previousElementSibling;
      }
      parts.unshift(current.tagName.toLowerCase() + '[' + idx + ']');
      current = current.parentElement;
    }
    return '//' + parts.join('/');
  }

  function captureElement(el) {
    if (!el || !el.tagName) return { tag: 'unknown', id: '', classes: [], role: null, ariaLabel: null, text: '', type: null, contentEditable: false, inShadowDom: false, shadowPath: [] };
    var deep = getDeepActiveElement();
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      classes: el.classList ? Array.from(el.classList).slice(0, 10) : [],
      role: el.getAttribute ? el.getAttribute('role') : null,
      ariaLabel: el.getAttribute ? el.getAttribute('aria-label') : null,
      text: (el.textContent || '').substring(0, 100).trim(),
      type: el.getAttribute ? el.getAttribute('type') : null,
      contentEditable: el.isContentEditable || false,
      inShadowDom: deep.shadowPath.length > 0,
      shadowPath: deep.shadowPath,
    };
  }

  function generateSelectors(el) {
    return {
      css: generateCssSelector(el),
      xpath: generateXPath(el),
      aria: (el && el.getAttribute) ? (el.getAttribute('aria-label') ? '[aria-label="' + el.getAttribute('aria-label') + '"]' : null) : null,
      id: (el && el.id) ? '#' + el.id : null,
    };
  }

  function sendAction(action) {
    action.timestamp_ms = Date.now() - startTime;
    console.log('__SPY_ACTION__:' + JSON.stringify(action));
  }

  document.addEventListener('click', function(e) {
    sendAction({ type: 'click', selector: generateSelectors(e.target), element: captureElement(e.target), value: null, coordinates: { x: e.clientX, y: e.clientY } });
  }, true);

  document.addEventListener('input', function(e) {
    sendAction({ type: 'input', selector: generateSelectors(e.target), element: captureElement(e.target), value: ((e.target.value || e.target.textContent || '') + '').substring(0, 200), coordinates: null });
  }, true);

  document.addEventListener('change', function(e) {
    if (e.target.type === 'file' && e.target.files) {
      sendAction({ type: 'file-upload', selector: generateSelectors(e.target), element: captureElement(e.target), value: Array.from(e.target.files).map(function(f) { return f.name; }).join(', '), coordinates: null });
    } else {
      sendAction({ type: 'change', selector: generateSelectors(e.target), element: captureElement(e.target), value: e.target.value ? e.target.value.substring(0, 200) : null, coordinates: null });
    }
  }, true);

  document.addEventListener('keydown', function(e) {
    if (['Enter', 'Tab', 'Escape', 'Backspace', 'Delete'].indexOf(e.key) !== -1) {
      sendAction({ type: 'keydown', selector: generateSelectors(e.target), element: captureElement(e.target), value: e.key, coordinates: null });
    }
  }, true);

  document.addEventListener('focus', function(e) {
    sendAction({ type: 'focus', selector: generateSelectors(e.target), element: captureElement(e.target), value: null, coordinates: null });
  }, true);

  document.addEventListener('submit', function(e) {
    sendAction({ type: 'submit', selector: generateSelectors(e.target), element: captureElement(e.target), value: null, coordinates: null });
  }, true);

  sendAction({
    type: 'navigate',
    selector: { css: 'document', xpath: '/', aria: null, id: null },
    element: { tag: 'document', id: '', classes: [], role: null, ariaLabel: null, text: document.title, type: null, contentEditable: false, inShadowDom: false, shadowPath: [] },
    value: window.location.href,
    coordinates: null,
  });

  console.log('__SPY_STATUS__:MONITOR_ACTIVE');
})();
`;

const SPY_INSPECTOR_SCRIPT = `
(function() {
  if (window.__spyInspectorActive) return;
  window.__spyInspectorActive = true;

  var overlay = document.createElement('div');
  overlay.id = '__spy-overlay';
  overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:999999;border:2px solid #00d4ff;border-radius:4px;background:rgba(0,212,255,0.08);transition:all 0.15s ease;display:none;';
  document.body.appendChild(overlay);

  var label = document.createElement('div');
  label.id = '__spy-label';
  label.style.cssText = 'position:fixed;z-index:999999;pointer-events:none;background:#0a0a0bee;color:#00d4ff;font:11px/1.4 monospace;padding:4px 8px;border-radius:4px;border:1px solid #00d4ff44;display:none;max-width:400px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  document.body.appendChild(label);

  function getElementLabel(el) {
    var s = '<' + el.tagName.toLowerCase() + '>';
    if (el.id) s += ' #' + el.id;
    if (el.className && typeof el.className === 'string') s += ' .' + el.className.split(' ').slice(0, 3).join('.');
    if (el.getAttribute('role')) s += ' [role=' + el.getAttribute('role') + ']';
    if (el.getAttribute('aria-label')) s += ' [aria-label="' + el.getAttribute('aria-label').substring(0, 30) + '"]';
    return s;
  }

  document.addEventListener('mousemove', function(e) {
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === overlay || el === label) return;
    var rect = el.getBoundingClientRect();
    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    overlay.style.display = 'block';
    label.textContent = getElementLabel(el);
    label.style.top = Math.max(0, rect.top - 28) + 'px';
    label.style.left = rect.left + 'px';
    label.style.display = 'block';
  }, true);

  document.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    var el = e.target;
    var selectors = {
      css: (function gen(e) {
        if (!e || e === document.body) return e ? 'body' : '';
        if (e.id) return '#' + e.id;
        if (e.getAttribute && e.getAttribute('role')) return '[role="' + e.getAttribute('role') + '"]';
        if (e.getAttribute && e.getAttribute('aria-label')) return '[aria-label="' + e.getAttribute('aria-label') + '"]';
        var p = e.parentElement;
        if (!p) return e.tagName.toLowerCase();
        var sibs = Array.from(p.children).filter(function(c){return c.tagName===e.tagName;});
        var i = sibs.indexOf(e)+1;
        return gen(p) + ' > ' + e.tagName.toLowerCase() + (sibs.length>1 ? ':nth-of-type('+i+')' : '');
      })(el),
      xpath: (function genX(e) {
        if (!e || !e.tagName) return '/';
        if (e.id) return '//*[@id="'+e.id+'"]';
        var parts=[];var c=e;
        while(c&&c.nodeType===1&&c!==document.body){var idx=1;var s=c.previousElementSibling;while(s){if(s.tagName===c.tagName)idx++;s=s.previousElementSibling;}parts.unshift(c.tagName.toLowerCase()+'['+idx+']');c=c.parentElement;}
        return '//'+parts.join('/');
      })(el),
      aria: el.getAttribute ? (el.getAttribute('aria-label') ? '[aria-label="'+el.getAttribute('aria-label')+'"]' : null) : null,
      id: el.id ? '#'+el.id : null,
    };
    console.log('__SPY_INSPECT__:' + JSON.stringify({
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      classes: el.classList ? Array.from(el.classList) : [],
      role: el.getAttribute ? el.getAttribute('role') : null,
      ariaLabel: el.getAttribute ? el.getAttribute('aria-label') : null,
      text: (el.textContent || '').substring(0, 200).trim(),
      type: el.getAttribute ? el.getAttribute('type') : null,
      contentEditable: el.isContentEditable || false,
      inShadowDom: false,
      shadowPath: [],
      attributes: el.attributes ? Array.from(el.attributes).map(function(a){ return {name:a.name, value:a.value.substring(0,100)}; }).slice(0, 20) : [],
      rect: (function(){ var r=el.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}; })(),
      selectors: selectors,
      computedStyle: { display: getComputedStyle(el).display, visibility: getComputedStyle(el).visibility, position: getComputedStyle(el).position, cursor: getComputedStyle(el).cursor },
      innerHTML: el.innerHTML ? el.innerHTML.substring(0, 300) : '',
    }));
    return false;
  }, true);

  console.log('__SPY_STATUS__:INSPECTOR_ACTIVE');
})();
`;

const SPY_INSPECTOR_DISABLE_SCRIPT = `
(function() {
  window.__spyInspectorActive = false;
  var overlay = document.getElementById('__spy-overlay');
  var label = document.getElementById('__spy-label');
  if (overlay) overlay.remove();
  if (label) label.remove();
  console.log('__SPY_STATUS__:INSPECTOR_DISABLED');
})();
`;

function SpyMonitor() {
  const webviewRef = useRef<any>(null);
  const [url, setUrl] = useState('https://labs.google/fx/pt/tools/flow');
  const [currentUrl, setCurrentUrl] = useState(url);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [actions, setActions] = useState<SpyAction[]>([]);
  const [selectedAction, setSelectedAction] = useState<SpyAction | null>(null);
  const [inspectedElement, setInspectedElement] = useState<any>(null);
  const [consoleMessages, setConsoleMessages] = useState<{level: string; text: string; timestamp: number}[]>([]);
  const [macroName, setMacroName] = useState('');
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'actions' | 'inspector' | 'console'>('actions');
  const actionsEndRef = useRef<HTMLDivElement>(null);
  const actionCountRef = useRef(0);

  useEffect(() => {
    if (actionsEndRef.current && actions.length > 0) {
      actionsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [actions]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const onStartLoading = () => setIsLoading(true);
    const onStopLoading = () => setIsLoading(false);
    const onNavigate = (e: any) => { setCurrentUrl(e.url); setUrl(e.url); };
    const onNavigateInPage = (e: any) => { setCurrentUrl(e.url); setUrl(e.url); };

    const onConsoleMessage = (e: any) => {
      const msg = e.message;
      if (msg.startsWith('__SPY_ACTION__:')) {
        try {
          const action: SpyAction = JSON.parse(msg.slice('__SPY_ACTION__:'.length));
          action.index = actionCountRef.current++;
          action.classification = null;
          setActions(prev => [...prev, action]);
        } catch { /* ignore */ }
        return;
      }
      if (msg.startsWith('__SPY_INSPECT__:')) {
        try {
          const data = JSON.parse(msg.slice('__SPY_INSPECT__:'.length));
          setInspectedElement(data);
          setActiveTab('inspector');
        } catch { /* ignore */ }
        return;
      }
      if (msg.startsWith('__SPY_STATUS__:')) return;
      setConsoleMessages(prev => [...prev.slice(-200), {
        level: e.level === 0 ? 'log' : e.level === 1 ? 'warn' : 'error',
        text: msg.substring(0, 500),
        timestamp: Date.now(),
      }]);
    };

    const onDomReady = () => {
      if (isRecording) webview.executeJavaScript(SPY_MONITOR_SCRIPT).catch(() => {});
      if (isInspecting) webview.executeJavaScript(SPY_INSPECTOR_SCRIPT).catch(() => {});
    };

    webview.addEventListener('did-start-loading', onStartLoading);
    webview.addEventListener('did-stop-loading', onStopLoading);
    webview.addEventListener('did-navigate', onNavigate);
    webview.addEventListener('did-navigate-in-page', onNavigateInPage);
    webview.addEventListener('console-message', onConsoleMessage);
    webview.addEventListener('dom-ready', onDomReady);

    return () => {
      webview.removeEventListener('did-start-loading', onStartLoading);
      webview.removeEventListener('did-stop-loading', onStopLoading);
      webview.removeEventListener('did-navigate', onNavigate);
      webview.removeEventListener('did-navigate-in-page', onNavigateInPage);
      webview.removeEventListener('console-message', onConsoleMessage);
      webview.removeEventListener('dom-ready', onDomReady);
    };
  }, [isRecording, isInspecting]);

  const navigateTo = useCallback((targetUrl: string) => {
    const webview = webviewRef.current;
    if (!webview) return;
    let finalUrl = targetUrl.trim();
    if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) finalUrl = 'https://' + finalUrl;
    setUrl(finalUrl);
    webview.loadURL(finalUrl);
  }, []);

  const goBack = useCallback(() => { webviewRef.current?.goBack(); }, []);
  const goForward = useCallback(() => { webviewRef.current?.goForward(); }, []);
  const reload = useCallback(() => { webviewRef.current?.reload(); }, []);

  const startRecording = useCallback(() => {
    const webview = webviewRef.current;
    if (!webview) return;
    actionCountRef.current = 0;
    setActions([]);
    setIsRecording(true);
    webview.executeJavaScript(SPY_MONITOR_SCRIPT).catch(() => {});
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    webviewRef.current?.executeJavaScript('window.__spyMonitorActive = false;').catch(() => {});
  }, []);

  const toggleInspection = useCallback(() => {
    const webview = webviewRef.current;
    if (!webview) return;
    if (isInspecting) {
      webview.executeJavaScript(SPY_INSPECTOR_DISABLE_SCRIPT).catch(() => {});
      setIsInspecting(false);
    } else {
      webview.executeJavaScript(SPY_INSPECTOR_SCRIPT).catch(() => {});
      setIsInspecting(true);
    }
  }, [isInspecting]);

  const classifyAction = useCallback((idx: number, classification: SpyAction['classification']) => {
    setActions(prev => prev.map(a => a.index === idx ? { ...a, classification } : a));
  }, []);

  const exportMacro = useCallback(async () => {
    const macro = {
      macro_id: macroName.replace(/\s+/g, '_').toLowerCase() || 'macro_' + Date.now(),
      macro_name: macroName || 'Macro sem nome',
      site: currentUrl.includes('digen.ai') ? 'digen' : currentUrl.includes('labs.google') ? 'google_flow' : 'unknown',
      site_url: currentUrl,
      recorded_at: new Date().toISOString(),
      workflow_steps: actions.map((a, i) => ({ index: i, action: a.type, target: a.classification || 'OTHER', selector: a.selector, value: a.value, timestamp_ms: a.timestamp_ms })),
      classified_elements: actions.filter(a => a.classification && a.classification !== 'OTHER').reduce((acc, a) => {
        const key = a.classification!.toLowerCase();
        if (!acc[key]) acc[key] = { role: a.classification!, selectors: a.selector, element_info: a.element };
        return acc;
      }, {} as any),
    };
    try {
      const result = await window.electronAPI.saveMacro(macro);
      setSaveStatus(result.success ? 'âœ… Macro salvo: ' + result.path : 'âŒ Erro: ' + result.error);
      setTimeout(() => setSaveStatus(null), 5000);
    } catch (err: any) {
      setSaveStatus('âŒ Erro: ' + err.message);
      setTimeout(() => setSaveStatus(null), 5000);
    }
  }, [actions, macroName, currentUrl]);

  const actionIcon = (type: string) => {
    const icons: Record<string, string> = { click: 'ðŸ–±ï¸', input: 'âŒ¨ï¸', change: 'ðŸ”„', focus: 'ðŸŽ¯', keydown: 'âŒ¨ï¸', scroll: 'ðŸ“œ', submit: 'ðŸ“¤', 'file-upload': 'ðŸ“Ž', navigate: 'ðŸ”—', 'dom-mutation': 'ðŸ”€' };
    return icons[type] || 'â“';
  };

  const classificationColor = (c: string | null) => {
    const colors: Record<string, string> = {
      PROMPT_FIELD: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      UPLOAD_BUTTON: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      GENERATE_BUTTON: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
      DOWNLOAD_BUTTON: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      NAVIGATION: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    };
    return (c && colors[c]) || 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30';
  };

  const formatTimestamp = (ms: number) => ms < 1000 ? ms + 'ms' : (ms / 1000).toFixed(1) + 's';

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0a0b] text-white overflow-hidden select-none"
         style={{ fontFamily: "'Inter', 'Space Grotesk', system-ui, sans-serif" }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#111113] border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-lg">ðŸ”</span>
          <span className="font-semibold text-sm tracking-wide text-zinc-200">ESPIÃƒO DE AÃ‡Ã•ES</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-emerald-400">DEV MODE</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#111113] border-b border-white/5">
        <div className="flex items-center gap-1">
          <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors" title="Voltar">
            <ChevronLeft size={16} />
          </button>
          <button onClick={goForward} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors" title="AvanÃ§ar">
            <ChevronRight size={16} />
          </button>
          <button onClick={reload} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors" title="Recarregar">
            <RefreshCcw size={14} />
          </button>
        </div>

        <form className="flex-1 flex" onSubmit={(e) => { e.preventDefault(); navigateTo(url); }}>
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 focus-within:border-blue-500/50 transition-colors">
            {isLoading && <Loader2 size={14} className="text-blue-400 animate-spin shrink-0" />}
            <Globe size={14} className="text-zinc-500 shrink-0" />
            <input type="text" value={url} onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-transparent text-sm text-zinc-300 outline-none placeholder:text-zinc-600" placeholder="URL..." />
          </div>
        </form>

        <div className="flex items-center gap-1">
          <button onClick={() => navigateTo('https://digen.ai/explore')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors">
            ðŸ…³ Digen
          </button>
          <button onClick={() => navigateTo('https://labs.google/fx/pt/tools/flow')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors">
            ðŸ…¶ Flow
          </button>
        </div>

        <div className="w-px h-6 bg-white/10" />

        <div className="flex items-center gap-1">
          {!isRecording ? (
            <button onClick={startRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors">
              <div className="w-2 h-2 rounded-full bg-red-500" /> Gravar
            </button>
          ) : (
            <button onClick={stopRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition-colors animate-pulse">
              <div className="w-2 h-2 rounded-sm bg-red-400" /> Parar
            </button>
          )}
          <button onClick={toggleInspection}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isInspecting ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300' : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20'}`}>
            ðŸ” Inspecionar
          </button>
          <button onClick={() => { setActions([]); actionCountRef.current = 0; setInspectedElement(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 hover:bg-zinc-500/20 transition-colors">
            ðŸ—‘ Limpar
          </button>
          <button onClick={() => setShowExportPanel(!showExportPanel)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors">
            ðŸ’¾ Exportar ({actions.length})
          </button>
        </div>
      </div>

      {saveStatus && (
        <div className="px-4 py-1.5 bg-emerald-500/10 border-b border-emerald-500/20 text-xs text-emerald-400">{saveStatus}</div>
      )}

      {showExportPanel && (
        <div className="px-4 py-3 bg-[#111113] border-b border-white/5 flex items-center gap-3">
          <input type="text" value={macroName} onChange={(e) => setMacroName(e.target.value)} placeholder="Nome do macro (ex: flow_gerar_imagem)"
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-300 outline-none focus:border-amber-500/50" />
          <button onClick={exportMacro} disabled={actions.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            Salvar Macro JSON
          </button>
          <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(actions, null, 2)); setSaveStatus('ðŸ“‹ AÃ§Ãµes copiadas para clipboard'); setTimeout(() => setSaveStatus(null), 3000); }}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition-colors">
            Copiar JSON
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative bg-black">
          {isRecording && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/90 text-white text-xs font-semibold shadow-lg shadow-red-500/30">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" /> GRAVANDO â€” {actions.length} aÃ§Ãµes
            </div>
          )}
          {isInspecting && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/90 text-white text-xs font-semibold shadow-lg shadow-cyan-500/30">
              ðŸ” MODO INSPEÃ‡ÃƒO â€” Clique num elemento
            </div>
          )}
          {/* @ts-ignore */}
          <webview ref={webviewRef} src={url} partition="persist:spy-session" className="w-full h-full"
            style={{ width: '100%', height: '100%', border: 'none', background: '#000' }} />
        </div>

        {/* Sidebar */}
        <div className="w-[420px] flex flex-col bg-[#111113] border-l border-white/5">
          <div className="flex border-b border-white/5">
            {(['actions', 'inspector', 'console'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors ${
                  activeTab === tab ? `text-white border-b-2 bg-white/5 ${tab === 'actions' ? 'border-orange-500' : tab === 'inspector' ? 'border-cyan-500' : 'border-emerald-500'}` : 'text-zinc-500 hover:text-zinc-300'
                }`}>
                {tab === 'actions' ? `ðŸ“‹ AÃ§Ãµes${actions.length > 0 ? ` (${actions.length})` : ''}` :
                 tab === 'inspector' ? 'ðŸ” Inspector' :
                 `ðŸ–¥ï¸ Console${consoleMessages.length > 0 ? ` (${consoleMessages.length})` : ''}`}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'actions' && (
              <div className="p-2 space-y-1">
                {actions.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
                    <span className="text-3xl mb-3">ðŸ“‹</span>
                    <p className="text-sm">Nenhuma aÃ§Ã£o gravada</p>
                    <p className="text-xs mt-1">Clique em "Gravar" e interaja com o site</p>
                  </div>
                )}
                {actions.map((action) => (
                  <div key={action.index}
                    onClick={() => { setSelectedAction(action); setActiveTab('inspector'); setInspectedElement({ ...action.element, selectors: action.selector }); }}
                    className={`p-2.5 rounded-lg cursor-pointer transition-all border ${
                      selectedAction?.index === action.index ? 'bg-white/10 border-white/20'
                        : action.classification ? classificationColor(action.classification) + ' hover:brightness-125'
                        : 'bg-white/[0.02] border-transparent hover:bg-white/5 hover:border-white/10'
                    }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{actionIcon(action.type)}</span>
                      <span className="text-xs font-semibold text-zinc-300">{action.type}</span>
                      <span className="text-[10px] text-zinc-600 ml-auto">+{formatTimestamp(action.timestamp_ms)}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-500 font-mono truncate">
                      {action.selector.id || action.selector.aria || action.selector.css}
                    </div>
                    {action.value && <div className="mt-1 text-[11px] text-zinc-400 truncate">"{action.value}"</div>}
                    {action.classification && (
                      <div className="mt-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${classificationColor(action.classification)}`}>
                          {action.classification}
                        </span>
                      </div>
                    )}
                    {!action.classification && selectedAction?.index === action.index && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(['PROMPT_FIELD', 'UPLOAD_BUTTON', 'GENERATE_BUTTON', 'DOWNLOAD_BUTTON', 'NAVIGATION', 'OTHER'] as const).map(cls => (
                          <button key={cls} onClick={(e) => { e.stopPropagation(); classifyAction(action.index, cls); }}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                            {cls === 'PROMPT_FIELD' ? 'ðŸ“' : cls === 'UPLOAD_BUTTON' ? 'ðŸ“Ž' : cls === 'GENERATE_BUTTON' ? 'â–¶ï¸' : cls === 'DOWNLOAD_BUTTON' ? 'â¬‡ï¸' : cls === 'NAVIGATION' ? 'ðŸ”„' : 'â“'} {cls.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={actionsEndRef} />
              </div>
            )}

            {activeTab === 'inspector' && (
              <div className="p-3 space-y-3">
                {!inspectedElement && !selectedAction ? (
                  <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
                    <span className="text-3xl mb-3">ðŸ”</span>
                    <p className="text-sm">Nenhum elemento selecionado</p>
                    <p className="text-xs mt-1">Use o modo InspeÃ§Ã£o ou clique numa aÃ§Ã£o</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 space-y-2">
                      <div className="text-xs font-semibold text-zinc-300 mb-2">ðŸ“Œ Elemento</div>
                      <div className="grid grid-cols-[80px_1fr] gap-y-1.5 text-[11px]">
                        <span className="text-zinc-600">Tag:</span>
                        <span className="text-cyan-400 font-mono">{'<'}{inspectedElement?.tag || 'n/a'}{'>'}</span>
                        <span className="text-zinc-600">ID:</span>
                        <span className="text-amber-400 font-mono">{inspectedElement?.id || 'â€”'}</span>
                        <span className="text-zinc-600">Classes:</span>
                        <span className="text-purple-400 font-mono truncate">{(inspectedElement?.classes || []).join(' ') || 'â€”'}</span>
                        <span className="text-zinc-600">Role:</span>
                        <span className="text-emerald-400 font-mono">{inspectedElement?.role || 'â€”'}</span>
                        <span className="text-zinc-600">ARIA Label:</span>
                        <span className="text-blue-400 font-mono truncate">{inspectedElement?.ariaLabel || 'â€”'}</span>
                        <span className="text-zinc-600">Type:</span>
                        <span className="text-zinc-300 font-mono">{inspectedElement?.type || 'â€”'}</span>
                        <span className="text-zinc-600">Editable:</span>
                        <span className="text-zinc-300 font-mono">{inspectedElement?.contentEditable ? 'âœ… Sim' : 'âŒ NÃ£o'}</span>
                        <span className="text-zinc-600">Shadow DOM:</span>
                        <span className="text-zinc-300 font-mono">{inspectedElement?.inShadowDom ? 'âš ï¸ Sim' : 'âŒ NÃ£o'}</span>
                      </div>
                      {inspectedElement?.text && (
                        <div className="mt-2">
                          <span className="text-zinc-600 text-[11px]">Texto:</span>
                          <p className="text-[11px] text-zinc-400 mt-0.5 break-words">"{inspectedElement.text}"</p>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 space-y-2">
                      <div className="text-xs font-semibold text-zinc-300 mb-2">ðŸŽ¯ Seletores</div>
                      {[
                        ['CSS', inspectedElement?.selectors?.css || 'â€”'],
                        ['XPath', inspectedElement?.selectors?.xpath || 'â€”'],
                        ['ARIA', inspectedElement?.selectors?.aria || 'â€”'],
                        ['ID', inspectedElement?.selectors?.id || (inspectedElement?.id ? '#' + inspectedElement.id : 'â€”')],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-start gap-2 text-[11px]">
                          <span className="text-zinc-600 w-12 shrink-0">{label}:</span>
                          <code className="text-emerald-400 font-mono break-all cursor-pointer hover:text-emerald-300"
                            onClick={() => navigator.clipboard.writeText(String(value))} title="Clique para copiar">
                            {String(value)}
                          </code>
                        </div>
                      ))}
                    </div>

                    {inspectedElement?.attributes && (
                      <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 space-y-1">
                        <div className="text-xs font-semibold text-zinc-300 mb-2">ðŸ“‹ Atributos</div>
                        {inspectedElement.attributes.map((attr: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-[11px]">
                            <span className="text-cyan-500 font-mono shrink-0">{attr.name}:</span>
                            <span className="text-zinc-400 font-mono break-all">{attr.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {inspectedElement?.computedStyle && (
                      <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 space-y-1">
                        <div className="text-xs font-semibold text-zinc-300 mb-2">ðŸŽ¨ Computed Style</div>
                        {Object.entries(inspectedElement.computedStyle).map(([k, v]) => (
                          <div key={k} className="flex items-center gap-2 text-[11px]">
                            <span className="text-zinc-600 font-mono w-20">{k}:</span>
                            <span className="text-zinc-400 font-mono">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {inspectedElement?.rect && (
                      <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
                        <div className="text-xs font-semibold text-zinc-300 mb-2">ðŸ“ DimensÃµes</div>
                        <div className="text-[11px] text-zinc-400 font-mono">
                          {inspectedElement.rect.w}Ã—{inspectedElement.rect.h} @ ({inspectedElement.rect.x}, {inspectedElement.rect.y})
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
                      <div className="text-xs font-semibold text-zinc-300 mb-2">ðŸ·ï¸ Classificar como</div>
                      <div className="flex flex-wrap gap-1.5">
                        {([
                          ['PROMPT_FIELD', 'ðŸ“ Prompt', 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'],
                          ['UPLOAD_BUTTON', 'ðŸ“Ž Upload', 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'],
                          ['GENERATE_BUTTON', 'â–¶ï¸ Gerar', 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20'],
                          ['DOWNLOAD_BUTTON', 'â¬‡ï¸ Download', 'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20'],
                          ['NAVIGATION', 'ðŸ”„ NavegaÃ§Ã£o', 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'],
                        ] as const).map(([cls, label, colors]) => (
                          <button key={cls}
                            onClick={() => { if (selectedAction) classifyAction(selectedAction.index, cls as SpyAction['classification']); }}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${colors}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'console' && (
              <div className="p-2 space-y-0.5 font-mono text-[11px]">
                {consoleMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
                    <span className="text-3xl mb-3">ðŸ–¥ï¸</span>
                    <p className="text-sm font-sans">Console vazio</p>
                    <p className="text-xs mt-1 font-sans">Logs do site aparecerÃ£o aqui</p>
                  </div>
                )}
                {consoleMessages.map((msg, i) => (
                  <div key={i} className={`px-2 py-1 rounded text-[11px] break-words ${
                    msg.level === 'error' ? 'text-red-400 bg-red-500/5' : msg.level === 'warn' ? 'text-amber-400 bg-amber-500/5' : 'text-zinc-400'
                  }`}>
                    <span className="text-zinc-600">[{msg.level}]</span> {msg.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
