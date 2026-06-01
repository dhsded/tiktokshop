/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useCallback, ChangeEvent, DragEvent } from 'react';
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
  Camera
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { jsPDF } from 'jspdf';

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
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
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

  // Ângulos do Produto
  const [generatedAngles, setGeneratedAngles] = useState<GeneratedAngle[] | null>(null);
  const [isGeneratingAngles, setIsGeneratingAngles] = useState(false);
  const [numAngles, setNumAngles] = useState(4);

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
      if(keys.length > 0) alert(`${keys.length} chaves carregadas com sucesso!`);
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
    if (videoStyle === 'standard' && !modelImage) {
      alert("Por favor, envie uma imagem de modelo/apresentador para o estilo Apresentador Padrão.");
      return;
    }
    if (productImages.length === 0) {
      alert("Por favor, envie pelo menos uma foto de produto.");
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

      const voiceInstruction = `GÊNERO DA VOZ / NARRADOR:
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
2. O campo 'imageName' deve indicar qual das fotos fornecidas (modelo ou produto) serve de referência visual principal para aquela cena.
3. O NOME DO ARQUIVO REFERENCIADO DEVE ser incluído no INÍCIO dos prompts 'veoPrompt' e 'digenPrompt' entre colchetes. Exemplo: "[foto_produto.jpg] ..."
4. O VEO é excelente para as animações de câmera e ambiente. O DIGEN é para falas e vozes.
5. As roupas, cenário da modelo (se houver) e o produto original devem ser mantidos intactos.
6. ⚠️ CRÍTICO — IDIOMA DA NARRAÇÃO: O campo 'narration' DEVE ser OBRIGATORIAMENTE escrito em PORTUGUÊS BRASILEIRO (PT-BR). NUNCA escreva a narração em inglês. A narração é o texto falado em voz alta para o público brasileiro do TikTok. Se escrever em inglês, será considerado um erro grave.
7. CRÍTICO: A narração deve respeitar a duração de ${duration}. Para ${duration}, use no máximo ${parseInt(duration) * 2.5} palavras para garantir uma fala natural e fluida.
8. Os campos 'veoPrompt' e 'digenPrompt' devem estar em INGLÊS (para as ferramentas de IA). Apenas 'narration' é em PT-BR.
9. CRÍTICO (Prompt de Imagem Estática da Cena - Nano Banana 2): Para cada cena, crie um prompt detalhado em inglês no campo 'imagePrompt'. O prompt deve ser riquíssimo em detalhes visuais, estilo fotográfico realista, iluminação profissional. Não inclua texto explicativo, apenas a descrição visual em inglês.

Retorne em estrutura JSON:
{
  "campaignTitle": "Nome da Campanha",
  "scenes": [
    { 
      "imageName": "Nome exato do arquivo de referência", 
      "duration": "${duration}", 
      "imagePrompt": "Detailed English still image generation prompt for Nano Banana 2/Imagen...",
      "veoPrompt": "[NOME_DO_ARQUIVO] Prompt em inglês...", 
      "digenPrompt": "[NOME_DO_ARQUIVO] Prompt em inglês...", 
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
        alert("Erro ao gerar o roteiro:\n\n" + msg);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const generateScript = async () => {
    if (images.length === 0) return;
    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    try {
      const finalTheme = customTheme || theme;

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

REGRAS OBRIGATÓRIAS:
1. O NOME ORIGINAL DO ARQUIVO de cada imagem DEVE ser incluído no INÍCIO dos prompts 'veoPrompt' e 'digenPrompt' entre colchetes. Exemplo: "[foto_look_01.jpg] Cinematic camera movement..."
2. As roupas e o CENÁRIO devem ser mantidos idênticos. Não mude cores, tecidos ou o ambiente.
3. Foque em animações cinematográficas para VEO: movimento de câmera (pan, tilt, zoom), partículas de luz, vento sutil no cabelo e expressões faciais.
4. Para DIGEN, foque na naturalidade do modelo digital falando ou reagindo.
5. ⚠️ CRÍTICO — IDIOMA DA NARRAÇÃO: O campo 'narration' DEVE ser OBRIGATORIAMENTE escrito em PORTUGUÊS BRASILEIRO (PT-BR). NUNCA escreva a narração em inglês. A narração é o texto falado em voz alta para o público brasileiro do TikTok.
6. Os campos 'veoPrompt' e 'digenPrompt' devem estar em INGLÊS (para as ferramentas de IA). Apenas 'narration' é em PT-BR.
7. CRÍTICO (Prompt de Imagem Estática da Cena - Nano Banana 2): Para cada cena, crie um prompt detalhado em inglês no campo 'imagePrompt'. O prompt deve ser riquíssimo em detalhes visuais, estilo fotográfico realista, iluminação profissional, mantendo consistência total com a imagem original. Não inclua texto explicativo, apenas a descrição visual em inglês.

Retorne em estrutura JSON:
{
  "campaignTitle": "Nome da Campanha",
  "scenes": [
    { 
      "imageName": "Nome exato do arquivo", 
      "duration": "${duration}", 
      "imagePrompt": "Detailed English still image generation prompt for Nano Banana 2/Imagen...",
      "veoPrompt": "[NOME_DO_ARQUIVO] Prompt em inglês...", 
      "digenPrompt": "[NOME_DO_ARQUIVO] Prompt em inglês...", 
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
        alert("Erro ao gerar o roteiro:\n\n" + msg);
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

  // --- Gerar Ângulos do Produto ---

  const generateProductAngles = async () => {
    if (productImages.length === 0) {
      alert('Por favor, envie pelo menos uma foto de produto.');
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
GÊNERO DA VOZ: ${voiceGender === 'female' ? 'FEMININO' : 'MASCULINO'}

REGRAS ABSOLUTAS — NUNCA VIOLE:
1. O PRODUTO DEVE SER MANTIDO 100% IDÊNTICO — mesmas cores, formato, textura, tamanho, marca, logotipo e TODAS as características visuais originais. NUNCA altere o produto.
2. Apenas o ÂNGULO DA CÂMERA e a COMPOSIÇÃO DA CENA mudam.
3. Nos campos imagePrompt, veoPrompt e digenPrompt, SEMPRE mencione "exact same product, identical colors, textures and design unchanged" para garantir fidelidade absoluta.
4. Os campos imagePrompt, veoPrompt e digenPrompt DEVEM estar em INGLÊS.
5. ⚠️ O campo narration DEVE ser em PORTUGUÊS BRASILEIRO (PT-BR) — NUNCA em inglês.
6. No início dos campos veoPrompt e digenPrompt, inclua o nome do arquivo entre colchetes.

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
      alert('Erro ao gerar ângulos:\n\n' + (error?.message || String(error)));
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
    <div className="min-h-screen bg-[#0a0a0b] text-white font-sans selection:bg-orange-500/30">
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

            <div className="flex flex-col items-start md:items-end gap-2">
              <button 
                onClick={() => keysFileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-xs font-medium"
              >
                <Key className="w-4 h-4" />
                {apiKeys.length > 0 ? `${apiKeys.length} Chaves Carregadas` : 'Carregar Chaves (.txt)'}
              </button>
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
                      <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
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
                      </div>
                    </div>

                    {/* Ângulos do Produto */}
                    <div className="space-y-3 pt-4 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                          <Camera className="w-3 h-3 text-teal-400" />
                          Ângulos do Produto
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/30">Quantidade:</span>
                          <select
                            value={numAngles}
                            onChange={(e) => setNumAngles(Number(e.target.value))}
                            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                          >
                            {[2,3,4,5,6,7,8].map(n => <option key={n} value={n} className="bg-[#1a1a1c]">{n}</option>)}
                          </select>
                        </div>
                      </div>
                      <button
                        disabled={productImages.length === 0 || isGeneratingAngles}
                        onClick={generateProductAngles}
                        className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl border font-bold text-sm transition-all ${
                          productImages.length > 0 && !isGeneratingAngles
                            ? 'bg-teal-500/10 border-teal-500/30 text-teal-400 hover:bg-teal-500/20 active:scale-[0.98]'
                            : 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed'
                        }`}
                      >
                        {isGeneratingAngles ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                        {isGeneratingAngles ? 'Gerando Ângulos...' : `Gerar ${numAngles} Ângulos do Produto`}
                      </button>
                      <p className="text-[10px] text-white/25 text-center">Gera prompts de imagem, VEO e DIGEN para cada ângulo, mantendo o produto 100% original</p>
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
                  disabled={activeTab === 'collection' ? (images.length === 0 || isGenerating) : (((videoStyle === 'standard' ? !modelImage : false) || productImages.length === 0) || isGenerating)}
                  onClick={activeTab === 'collection' ? generateScript : generateProductScript}
                  className={`group relative w-full overflow-hidden rounded-3xl py-6 transition-all font-bold tracking-tight text-lg ${
                    (activeTab === 'collection' ? images.length > 0 : ((videoStyle === 'standard' ? modelImage : true) && productImages.length > 0))
                    ? 'bg-white text-black active:scale-[0.98]' : 'bg-white/5 text-white/20 cursor-not-allowed'
                  }`}
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
    </div>
  );
}
