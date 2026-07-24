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
  Filter
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
      writeSpyScanResults: (data: any) => void;
      saveProjectAssets: (payload: any) => Promise<{ success: boolean; path?: string; error?: string }>;
      loadSiteSchema: (siteName: string) => Promise<any>;
      saveSiteSchema: (payload: any) => Promise<{ success: boolean; error?: string }>;
      setCurrentDownloadInfo: (info: any) => Promise<boolean>;
      uploadFileToWebview: (payload: { webContentsId: number, projectIndex: number, imageName?: string, sceneIndex?: number, imageIndex?: number, isFinal?: boolean }) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

type TabMode = 'collection' | 'product';

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
  const [isKeysExhaustedAlertOpen, setIsKeysExhaustedAlertOpen] = useState(false);

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
    observations: string;
    duration: string;
    generatedScript: ScriptResponse | null;
    generatedAngles: GeneratedAngle[] | null;
    status: 'pending' | 'done';
    projectIndex: number;
    injectionTarget: 'digen' | 'flow' | 'none';
    targetConfigs: Record<string, string>;
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
          observations,
          duration,
          generatedScript,
          generatedAngles,
          injectionTarget,
          targetConfigs
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
    observations,
    duration,
    generatedScript,
    generatedAngles,
    injectionTarget,
    targetConfigs
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
    setObservations(proj.observations);
    setDuration(proj.duration);
    setGeneratedScript(proj.generatedScript);
    setGeneratedAngles(proj.generatedAngles);
    setInjectionTarget(proj.injectionTarget || 'none');
    setTargetConfigs(proj.targetConfigs || {});
    
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
      observations: '',
      duration: DURATIONS[0],
      generatedScript: null,
      generatedAngles: null,
      status: 'pending',
      projectIndex: nextIndex,
      injectionTarget: 'none',
      targetConfigs: {}
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

      parts.push({
        text: `Gere um roteiro narrativo e prompts de animação focados na apresentação de um produto.
Imagens fornecidas: 
1. Modelo/Apresentador(a): ${modelImage ? modelImage.name : "Nenhuma (Vídeo em POV)"}
2. Fotos do Produto: ${productImages.map(p => p.name).join(', ')}

Duração de cada vídeo: ${duration}
Número de cenas a gerar: ${numScenes}
Observações específicas: ${observations || "INSTRUÇÃO: Se este campo estiver vazio, por favor analise as imagens enviadas e extraia qualquer texto, marca, benefício ou característica visível do produto para usar no roteiro e narração."}

${platformInstruction}

${styleInstruction}

${voiceInstruction}

REGRAS OBRIGATÓRIAS:
1. Crie exatamente ${numScenes} cenas detalhando a apresentação do produto. Varie as fotos do produto nas cenas se houver mais de uma.
2. O campo 'imageName' deve indicar qual das fotos fornecidas (modelo ou produto) serve de referência visual principal para aquela cena (apenas referência interna, NÃO inclua esse nome nos prompts).
3. ⚠️ UNIFICAÇÃO CRÍTICA DO PROMPT DE VÍDEO ('veoPrompt' e 'digenPrompt'): O prompt de animação de vídeo DEVE vir COMPLETO e UNIFICADO, contendo obrigatoriamente dentro da própria string do prompt em inglês:
   - (1) Descrição visual da cena e movimento de câmera (Camera Movement & Visual Action);
   - (2) Narração e falas dos personagens (Narration / Voiceover / Character Speech em PT-BR);
   - (3) Música de fundo e efeitos sonoros (Background Music & SFX).
   Exemplo no veoPrompt: 'Cinematic slow-motion camera pan across product. Voiceover/Dialogue: "[Texto da narração/fala em PT-BR]". Background Music: Upbeat commercial soundtrack with crisp product handling SFX.'
4. O VEO é excelente para as animações de câmera e ambiente. O DIGEN é para falas e vozes.
5. As roupas, cenário da modelo (se houver) e o produto original devem ser mantidos intactos.
6. ⚠️ CRÍTICO — IDIOMA DA NARRAÇÃO: O campo 'narration' DEVE ser OBRIGATORIAMENTE escrito em PORTUGUÊS BRASILEIRO (PT-BR). NUNCA escreva a narração em inglês. ${voiceGender === 'none' ? 'No modo Sem Narração, descreva a trilha sonora/SFX e legendas de tela em PT-BR.' : 'A narração é o texto falado em voz alta para o público brasileiro do TikTok.'} Se escrever em inglês, será considerado um erro grave.
7. CRÍTICO: A narração (campo 'narration') DEVE SE ADEQUAR EXATAMENTE à duração do vídeo de ${duration}. Um vídeo de ${duration} só comporta poucas palavras faladas. Para ${duration}, a narração DEVE ter no máximo ${parseInt(duration) * 2} palavras (aproximadamente 2 palavras por segundo) para que o narrador consiga pronunciar tudo de forma natural e sem pressa. Ajuste rigorosamente o tamanho do texto ao tempo de ${duration}.
8. Os campos 'veoPrompt' e 'digenPrompt' devem estar em INGLÊS (para as ferramentas de IA) com as partes faladas em PT-BR indicadas claramente entre aspas.
9. CRÍTICO (Prompt de Imagem Estática da Cena - Nano Banana 2): Para cada cena, crie um prompt detalhado em inglês no campo 'imagePrompt'. O prompt deve ser riquíssimo em detalhes visuais, estilo fotográfico realista, iluminação profissional. Não inclua texto explicativo, apenas a descrição visual em inglês.

Retorne em estrutura JSON:
{
  "campaignTitle": "Nome da Campanha",
  "scenes": [
    { 
      "imageName": "Nome exato do arquivo de referência (uso interno)", 
      "duration": "${duration}", 
      "imagePrompt": "Detailed English still image generation prompt for Nano Banana 2/Imagen...",
      "veoPrompt": "Cinematic camera pan across product. Voiceover/Dialogue: '[Narração em PT-BR]'. Background Music: Upbeat commercial soundtrack with ambient SFX.", 
      "digenPrompt": "Natural talking head model presenting product. Dialogue: '[Narração em PT-BR]'. Background Music: Upbeat commercial music.", 
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

      const imageParts = await Promise.all(images.map(async (img) => {
        const base64 = await getImagePayload(img);
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
Duração de cada vídeo: ${duration}
Observações específicas: ${observations || "Seguir estilo padrão de alta costura."}

${platformInstruction}

${voiceInstruction}

REGRAS OBRIGATÓRIAS:
1. ⚠️ UNIFICAÇÃO CRÍTICA DO PROMPT DE VÍDEO ('veoPrompt' e 'digenPrompt'): O prompt de animação de vídeo DEVE vir COMPLETO e UNIFICADO, contendo obrigatoriamente dentro da própria string em inglês: (1) Animação/movimento de câmera; (2) Narração/falas dos personagens ('Voiceover/Dialogue: [Texto da narração em PT-BR]'); (3) Música de fundo e SFX ('Background Music: [Música de fundo]').
2. As roupas e o CENÁRIO devem ser mantidos idênticos. Não mude cores, tecidos ou o ambiente.
3. Foque em animações cinematográficas para VEO: movimento de câmera (pan, tilt, zoom), partículas de luz, vento sutil no cabelo e expressões faciais, sempre incluindo a narração/falas e a trilha sonora.
4. Para DIGEN, foque na naturalidade do modelo digital falando ou reagindo.
5. ⚠️ CRÍTICO — IDIOMA DA NARRAÇÃO: O campo 'narration' DEVE ser OBRIGATORIAMENTE escrito em PORTUGUÊS BRASILEIRO (PT-BR). NUNCA escreva a narração em inglês. ${voiceGender === 'none' ? 'No modo Sem Narração, descreva a trilha sonora/SFX e legendas de tela em PT-BR.' : 'A narração é o texto falado em voz alta para o público brasileiro do TikTok.'}
6. Os campos 'veoPrompt' e 'digenPrompt' devem estar em INGLÊS para as partes técnicas de câmera e áudio, mantendo as falas em PT-BR dentro de aspas.
7. CRÍTICO (Prompt de Imagem Estática da Cena - Nano Banana 2): Para cada cena, crie um prompt detalhado em inglês no campo 'imagePrompt'. O prompt deve ser riquíssimo em detalhes visuais, estilo fotográfico realista, iluminação profissional, mantendo consistência total com a imagem original. Não inclua texto explicativo, apenas a descrição visual em inglês.
8. CRÍTICO: A narração (campo 'narration') DEVE SE ADEQUAR EXATAMENTE à duração do vídeo de ${duration}. Um vídeo de ${duration} só comporta poucas palavras faladas. Para ${duration}, a narração DEVE ter no máximo ${parseInt(duration) * 2} palavras (aproximadamente 2 palavras por segundo) para que o narrador consiga pronunciar tudo de forma natural e sem pressa. Ajuste rigorosamente o tamanho do texto ao tempo de ${duration}.

Retorne em estrutura JSON:
{
  "campaignTitle": "Nome da Campanha",
  "scenes": [
    { 
      "imageName": "Nome exato do arquivo (referência interna)", 
      "duration": "${duration}", 
      "imagePrompt": "Detailed English still image generation prompt for Nano Banana 2/Imagen...",
      "veoPrompt": "Cinematic camera pan across model. Voiceover/Dialogue: '[Narração em PT-BR]'. Background Music: Soft acoustic fashion soundtrack with ambient room reverb.", 
      "digenPrompt": "Natural talking head model presenting clothing. Dialogue: '[Narração em PT-BR]'. Background Music: Modern fashion beat.", 
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

      const textPart = {
        text: `Você é um especialista em fotografia de produto e marketing digital para TikTok Shop.

Com base nas imagens do produto fornecidas, gere exatamente ${numAngles} variações de prompts para mostrar o produto em ângulos e perspectivas diferentes.

PRODUTO(S): ${productImages.map(p => p.name).join(', ')}
DURAÇÃO: ${duration}
GÊNERO DA VOZ: ${voiceGender === 'none' ? 'SEM NARRAÇÃO (SEM FALA)' : (voiceGender === 'female' ? 'FEMININO' : 'MASCULINO')}

${platformInstruction}

REGRAS ABSOLUTAS — NUNCA VIOLE:
1. O PRODUTO DEVE SER MANTIDO 100% IDÊNTICO — mesmas cores, formato, textura, tamanho, marca, logotipo e TODAS as características visuais originais. NUNCA altere o produto.
2. Apenas o ÂNGULO DA CÂMERA e a COMPOSIÇÃO DA CENA mudam.
3. Nos campos imagePrompt, veoPrompt e digenPrompt, SEMPRE mencione "exact same product, identical colors, textures and design unchanged" para garantir fidelidade absoluta.
4. Os campos veoPrompt e digenPrompt DEVEM vir COMPLETOS e UNIFICADOS, incluindo em um único prompt: (1) Animação visual e movimento de câmera; (2) Narração e falas dos personagens em PT-BR ("Voiceover/Dialogue: [Texto da narração]"); (3) Música de fundo e SFX ("Background Music: [Trilha comercial]").
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
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="grid grid-cols-3 gap-2 mt-2"
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

                          {/* Modelo VEO */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] text-white/60 font-medium block">Modelo de Geração (VEO)</label>
                            <select
                              value={targetConfigs['flow-Modelo'] || 'Veo 3.1 - Lite [Lower Priority]'}
                              onChange={(e) => setTargetConfigs(prev => ({ ...prev, 'flow-Modelo': e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                            >
                              <option value="Omni Flash">Omni Flash</option>
                              <option value="Veo 3.1 - Lite">Veo 3.1 - Lite</option>
                              <option value="Veo 3.1 - Fast">Veo 3.1 - Fast</option>
                              <option value="Veo 3.1 - Quality">Veo 3.1 - Quality</option>
                              <option value="Veo 3.1 - Lite [Lower Priority]">Veo 3.1 - Lite [Lower Priority]</option>
                            </select>
                          </div>

                          {/* Quantidade de Vídeos por Geração */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] text-white/60 font-medium block">Quantidade por Geração</label>
                            <select
                              value={targetConfigs['flow-Quantidade'] || 'x4'}
                              onChange={(e) => setTargetConfigs(prev => ({ ...prev, 'flow-Quantidade': e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                            >
                              <option value="x1">x1 (1 vídeo)</option>
                              <option value="x2">x2 (2 vídeos)</option>
                              <option value="x3">x3 (3 vídeos)</option>
                              <option value="x4">x4 (4 vídeos simultâneos)</option>
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
                            onClick={() => {
                              const proj = activeProjectId ? projects.find(p => p.id === activeProjectId) : null;
                              const pIndex = proj ? proj.projectIndex : projectCounter;
                              window.electronAPI.openInjectorWindow({ 
                                generatedScript, 
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
                            onClick={() => {
                              const proj = activeProjectId ? projects.find(p => p.id === activeProjectId) : null;
                              const pIndex = proj ? proj.projectIndex : projectCounter;
                              window.electronAPI.openInjectorWindow({ 
                                generatedScript, 
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
      {/* Modal de Configurações (Engrenagem) */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-2xl border shadow-2xl p-6 overflow-hidden"
              style={{
                backgroundColor: themeMode === 'light' ? '#ffffff' : '#18181b',
                borderColor: themeMode === 'light' ? '#e4e4e7' : '#27272a',
                color: themeMode === 'light' ? '#0f172a' : '#ffffff'
              }}
            >
              {/* Cabeçalho do Modal */}
              <div 
                className="flex items-center justify-between pb-4 mb-5 border-b"
                style={{ borderColor: themeMode === 'light' ? '#e4e4e7' : '#27272a' }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2.5 rounded-xl border flex items-center justify-center"
                    style={{
                      backgroundColor: themeMode === 'light' ? 'rgba(249,115,22,0.1)' : 'rgba(249,115,22,0.15)',
                      borderColor: themeMode === 'light' ? 'rgba(249,115,22,0.2)' : 'rgba(249,115,22,0.3)',
                      color: '#ea580c'
                    }}
                  >
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 
                      className="font-bold text-base font-display"
                      style={{ color: themeMode === 'light' ? '#0f172a' : '#ffffff' }}
                    >
                      Configurações do Sistema
                    </h3>
                    <p 
                      className="text-xs"
                      style={{ color: themeMode === 'light' ? '#71717a' : '#a1a1aa' }}
                    >
                      Gerencie chaves API e opções do fluxo
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-2 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ color: themeMode === 'light' ? '#71717a' : '#a1a1aa' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Opção 1: Chaves API */}
                <div 
                  className="p-4 rounded-xl border space-y-3"
                  style={{
                    backgroundColor: themeMode === 'light' ? '#f4f4f5' : '#09090b',
                    borderColor: themeMode === 'light' ? '#e4e4e7' : '#27272a'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Key className="w-4 h-4" style={{ color: '#ea580c' }} />
                      <div>
                        <h4 
                          className="text-xs font-bold uppercase tracking-wider"
                          style={{ color: themeMode === 'light' ? '#0f172a' : '#ffffff' }}
                        >
                          Chaves de API Gemini
                        </h4>
                        <p 
                          className="text-[11px]"
                          style={{ color: themeMode === 'light' ? '#71717a' : '#a1a1aa' }}
                        >
                          Carregar arquivo .txt com chaves
                        </p>
                      </div>
                    </div>
                    {apiKeys.length > 0 && (
                      <span 
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                        style={{
                          backgroundColor: themeMode === 'light' ? 'rgba(22,163,74,0.1)' : 'rgba(74,222,128,0.1)',
                          borderColor: themeMode === 'light' ? 'rgba(22,163,74,0.2)' : 'rgba(74,222,128,0.3)',
                          color: themeMode === 'light' ? '#16a34a' : '#4ade80'
                        }}
                      >
                        {apiKeys.length} {apiKeys.length === 1 ? 'Chave' : 'Chaves'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => keysFileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/10"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {apiKeys.length > 0 ? 'Substituir Chaves (.txt)' : 'Carregar Chaves (.txt)'}
                    </button>
                    {apiKeys.length > 0 && (
                      <button
                        onClick={() => setApiKeys([])}
                        className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl transition-all"
                        title="Remover Chaves"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {apiKeys.length > 0 && (
                    <p 
                      className="text-[10px] font-mono flex items-center gap-1"
                      style={{ color: themeMode === 'light' ? '#16a34a' : '#4ade80' }}
                    >
                      <Check className="w-3.5 h-3.5" /> Chaves ativas prontas para rotação automática.
                    </p>
                  )}
                </div>

                {/* Opção 2: Fluxo de Automação Ativo */}
                <div 
                  className="p-4 rounded-xl border flex items-center justify-between gap-4"
                  style={{
                    backgroundColor: themeMode === 'light' ? '#f4f4f5' : '#09090b',
                    borderColor: themeMode === 'light' ? '#e4e4e7' : '#27272a'
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <Activity className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#a855f7' }} />
                    <div>
                      <h4 
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: themeMode === 'light' ? '#0f172a' : '#ffffff' }}
                      >
                        Fluxo de Automação Ativo
                      </h4>
                      <p 
                        className="text-[11px] leading-snug"
                        style={{ color: themeMode === 'light' ? '#71717a' : '#a1a1aa' }}
                      >
                        Exibir o painel visual flutuante com o progresso do fluxo.
                      </p>
                    </div>
                  </div>

                  {/* Toggle switch */}
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

              {/* Rodapé do Modal */}
              <div 
                className="mt-6 pt-4 border-t flex justify-end"
                style={{ borderColor: themeMode === 'light' ? '#e4e4e7' : '#27272a' }}
              >
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-orange-500/20 text-white-force"
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

          // Prioridade 1: campo "O que você quer criar?" da barra inferior do Google Flow
          const allInputs = Array.from(document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"], [contenteditable=""]'));
          const flowPromptField = allInputs.find(el => {
            if (!isVisible(el)) return false;
            const placeholder = (el.getAttribute('placeholder') || el.getAttribute('data-placeholder') || '').toLowerCase();
            return placeholder.includes('criar') || placeholder.includes('create') || placeholder.includes('want') || placeholder.includes('quer');
          });
          if (flowPromptField) return flowPromptField;

          // Prioridade 2: elemento atualmente focado (campo aberto por interação)
          const active = document.activeElement;
          if (active && isVisible(active) && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT' || active.isContentEditable)) {
            return active;
          }

          // Prioridade 3: campo dentro de container ativo
          const activeContainer = document.querySelector('[class*="active"], [class*="selected"], [class*="prompt"], [class*="editor"], [class*="input"]');
          if (activeContainer) {
            const innerField = activeContainer.querySelector('textarea, [contenteditable="true"], input[type="text"]');
            if (innerField && isVisible(innerField)) return innerField;
          }

          // Prioridade 4: primeira textarea visível
          const textareas = Array.from(document.querySelectorAll('textarea'));
          const visibleTextarea = textareas.find(t => isVisible(t));
          if (visibleTextarea) return visibleTextarea;

          const editables = Array.from(document.querySelectorAll('[contenteditable="true"], [contenteditable=""]'));
          const visibleEditable = editables.find(e => isVisible(e));
          if (visibleEditable) return visibleEditable;

          const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
          const visibleInput = inputs.find(i => isVisible(i));
          if (visibleInput) return visibleInput;

          return null;
        };

        const el = findField();
        if (!el) return false;
        
        el.focus();
        
        if (el.isContentEditable) {
          const range = document.createRange();
          range.selectNodeContents(el);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        } else if (typeof el.select === 'function') {
          el.select();
        }
        
        let success = false;
        try {
          success = document.execCommand('insertText', false, ${escapedText});
        } catch (e) {}
        
        if (!success) {
          if (el.isContentEditable) {
            el.innerText = ${escapedText};
          } else {
            el.value = ${escapedText};
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
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
      const generationType = injConfigs['flow-Tipo'] || (activeTab === 'scenes' ? 'Vídeo' : 'Imagem');
      const flowConfigsToApply = [
        generationType,
        injConfigs['flow-Aspecto'],
        injConfigs['flow-Modelo'] || 'Veo 3.1 - Lite [Lower Priority]',
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
                if ('${val}'.startsWith('Veo') || '${val}' === 'Omni Flash') return text === '${val}' || text.includes('${val}');
                if ('${val}'.startsWith('x') && ['x1','x2','x3','x4'].includes('${val}')) return text === '${val}';
                return text === '${val}';
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
        const generationType = injConfigs['flow-Tipo'] || (activeTab === 'scenes' ? 'Vídeo' : 'Imagem');
        const flowConfigsToApply = [
          generationType,
          injConfigs['flow-Aspecto'],
          injConfigs['flow-Modelo'] || 'Veo 3.1 - Lite [Lower Priority]',
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
                if ('${val}' === 'Imagem') return text === 'Imagem' || text.toLowerCase() === 'imagem';
                if ('${val}' === 'Frames') return text === 'Frames' || text.toLowerCase() === 'frames' || text.includes('Frames');
                return text === '${val}';
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
        setActiveNode(4); // Injeção
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
          for (let vidIdx = 1; vidIdx <= videosPerImage; vidIdx++) {
            if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");
            while (pauseControllerRef.current) {
              if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");
              setDownloadStatus("Pausado...");
              await new Promise(r => setTimeout(r, 500));
            }

            const letter = String.fromCharCode(64 + vidIdx);
            const progressText = isFlowScenes
              ? `Cena ${idx + 1}/${itemsToInject.length} (Img ${imgIdx}/${imagesPerScene} - Víd ${letter})`
              : `Cena ${idx + 1}/${itemsToInject.length} (Gerando ${vidIdx}/${generationsCount})`;

            setInjectionProgressText(progressText);
            setDownloadStatus("Aguardando Geração...");

            const sceneStr2 = String(idx + 1).padStart(2, '0');
            const customFileName = isFlowScenes
              ? `img${imgIdx} cena${sceneStr2}${letter}`
              : `cena${idx + 1}_${vidIdx}`;

            addSpyLog('info', 'Metadados de Download', `Registrado nome de arquivo alvo: "${customFileName}"`);

            await window.electronAPI.setCurrentDownloadInfo({
              projectIndex: prompts?.projectIndex || 1,
              sceneIndex: idx + 1,
              generationLoop: vidIdx,
              customFileName
            });

            // FLOW SCENES: upload imagem e selecionar como Inicial na barra inferior
            if (isFlowScenes && vidIdx === 1) {
              setDownloadStatus(`Fazendo upload da imagem ${imgIdx}...`);
              addSpyLog('info', 'Upload de Imagem', `Enviando imagem ${imgIdx} para a Cena ${idx + 1}...`);
              try {
                const webContentsId = webviewRef.current.getWebContentsId();
                const uploadResult = await window.electronAPI.uploadFileToWebview({
                  webContentsId,
                  projectIndex: prompts?.projectIndex || 1,
                  sceneIndex: idx + 1,
                  imageIndex: imgIdx,
                  isFinal: false
                });
                if (uploadResult.success) {
                  addSpyLog('success', 'Upload de Imagem', `Upload da imagem ${imgIdx} concluído.`);
                } else {
                  addSpyLog('warning', 'Upload de Imagem', `Falha no upload da imagem ${imgIdx}: ${uploadResult.error}`);
                }
              } catch (err: any) {
                addSpyLog('error', 'Upload de Imagem', `Erro durante o upload da imagem ${imgIdx}`, err.message);
              }
              await new Promise(r => setTimeout(r, 1500));

              // Clicar no slot "Inicial" da barra inferior para selecionar imagem
              addSpyLog('info', 'Slot Inicial', `Clicando no campo "Inicial" na barra inferior para selecionar imagem ${imgIdx}...`);
              const clickInicialScript = `
                (function() {
                  const isVisible = (el) => {
                    if (!el) return false;
                    const r = el.getBoundingClientRect();
                    return r.width > 0 && r.height > 0 &&
                           window.getComputedStyle(el).display !== 'none' &&
                           window.getComputedStyle(el).visibility !== 'hidden';
                  };
                  // Procurar o slot/botão "Inicial" na barra inferior
                  const allEls = Array.from(document.querySelectorAll('button, div, span, [role="button"]'));
                  const inicialBtn = allEls.find(el => {
                    if (!isVisible(el)) return false;
                    const rect = el.getBoundingClientRect();
                    if (rect.bottom < window.innerHeight * 0.6) return false; // apenas área inferior
                    const text = (el.textContent || '').trim().toLowerCase();
                    return text === 'inicial' || text === 'initial' || text === 'start';
                  });
                  if (inicialBtn) {
                    inicialBtn.click();
                    return 'inicial-clicked';
                  }
                  return 'not-found';
                })();
              `;
              try {
                const inicialResult = await webviewRef.current.executeJavaScript(clickInicialScript);
                if (inicialResult === 'inicial-clicked') {
                  addSpyLog('success', 'Slot Inicial', 'Slot "Inicial" clicado — imagem selecionada como referência.');
                } else {
                  addSpyLog('warning', 'Slot Inicial', 'Slot "Inicial" não encontrado diretamente; prosseguindo para injeção de prompt.');
                }
              } catch (err: any) {
                addSpyLog('error', 'Slot Inicial', 'Erro ao clicar no slot Inicial', err.message);
              }
              await new Promise(r => setTimeout(r, 800));
            }

            // Injeta prompt
            await injectText(promptText, smartSelector);
            await new Promise(r => setTimeout(r, 1500));

            if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");
            while (pauseControllerRef.current) {
              if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");
              setDownloadStatus("Pausado...");
              await new Promise(r => setTimeout(r, 500));
            }

            // Clica no botão → (seta) da barra inferior do Google Flow
            addSpyLog('info', 'Disparo de Geração', 'Procurando botão → (seta) na barra inferior do Flow...');
            const clickGenerateScript = `
              (function() {
                const isVisible = (el) => {
                  if (!el) return false;
                  const r = el.getBoundingClientRect();
                  return r.width > 0 && r.height > 0 &&
                         window.getComputedStyle(el).display !== 'none' &&
                         window.getComputedStyle(el).visibility !== 'hidden' &&
                         !el.disabled;
                };
                // Botão → fica no canto direito da barra inferior
                const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
                // Prioridade 1: botões na região inferior da tela
                const bottomBtns = btns.filter(btn => {
                  if (!isVisible(btn)) return false;
                  const r = btn.getBoundingClientRect();
                  return r.bottom > window.innerHeight * 0.65 && r.top < window.innerHeight;
                });
                // Prioridade 2: botão de envio/seta (último botão enabled na barra inferior)
                const sendBtn = bottomBtns.find(btn => {
                  const text = (btn.textContent || '').trim();
                  const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
                  return text === '→' || aria.includes('criar') || aria.includes('generate') || aria.includes('send') || aria.includes('submit');
                }) || (bottomBtns.length > 0 ? bottomBtns[bottomBtns.length - 1] : null);
                if (sendBtn) {
                  sendBtn.click();
                  return true;
                }
                // Fallback: buscar por texto Criar / Generate
                const fallback = btns.find(b => {
                  const text = (b.textContent || '').trim();
                  return (text === 'Criar' || text === 'Generate' || text === 'Create') && isVisible(b);
                });
                if (fallback) { fallback.click(); return true; }
                return false;
              })()
            `;
            const generateClicked = await webviewRef.current.executeJavaScript(clickGenerateScript);
            if (generateClicked) {
              addSpyLog('success', 'Disparo de Geração', 'Botão → acionado! Geração iniciada.');
            } else {
              addSpyLog('warning', 'Disparo de Geração', 'Botão → não encontrado. Verifique se o Flow está pronto.');
            }

            // Espera conclusão do render
            setDownloadStatus("Renderizando...");
            addSpyLog('info', 'Renderização', 'Monitorando conclusão da renderização...');
            let isDone = false;
            for (let check = 0; check < 60; check++) {
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
                    // Verifica se ainda há cards com percentual de progresso (ex: "3%", "25%")
                    const progressTexts = Array.from(document.querySelectorAll('*'))
                      .filter(el => {
                        const text = (el.textContent || '').trim();
                        return /^\d{1,3}%$/.test(text) && el.children.length === 0;
                      });
                    if (progressTexts.length > 0) return 'generating';
                    // Verificar se o botão → está habilitado (indica que geração terminou)
                    const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
                    const bottomBtns = btns.filter(btn => {
                      const r = btn.getBoundingClientRect();
                      return r.bottom > window.innerHeight * 0.65 && !btn.disabled;
                    });
                    if (bottomBtns.length > 0) return 'ready';
                    return 'generating';
                  })()
                `;
                const status = await webviewRef.current.executeJavaScript(checkScript);
                if (status === 'ready') {
                  isDone = true;
                  addSpyLog('success', 'Renderização', `Todos os vídeos renderizados em ${(check + 1) * 3}s.`);
                  break;
                }
              } catch (err) {}
            }

            if (!isDone) {
              addSpyLog('warning', 'Renderização', 'Timeout de renderização (3 minutos). Prosseguindo para tentativa de download...');
            }

            if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");
            while (pauseControllerRef.current) {
              if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");
              setDownloadStatus("Pausado...");
              await new Promise(r => setTimeout(r, 500));
            }

            // Download: para Flow com x4, baixar o N-ésimo vídeo da grade (esquerda→direita)
            setDownloadStatus(`Baixando ${isFlowScenes ? `vídeo ${vidIdx}/${videosPerImage}` : customFileName}...`);
            addSpyLog('info', 'Download', `Procurando botão ⬇ para salvar "${customFileName}"...`);
            const clickDownloadScript = `
              (function(videoIndex) {
                const isVisible = (el) => {
                  if (!el) return false;
                  const r = el.getBoundingClientRect();
                  return r.width > 0 && r.height > 0 &&
                         window.getComputedStyle(el).display !== 'none' &&
                         window.getComputedStyle(el).visibility !== 'hidden';
                };

                // Opção 1: botões de download ⬇ no painel lateral direito (top→bottom = ordem de geração)
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

                if (dlBtns[videoIndex - 1]) {
                  dlBtns[videoIndex - 1].click();
                  return true;
                }
                // Fallback: qualquer botão de download visível
                if (dlBtns.length > 0) { dlBtns[0].click(); return true; }
                return false;
              })(${vidIdx})
            `;
            const downloaded = await webviewRef.current.executeJavaScript(clickDownloadScript);
            if (downloaded) {
              addSpyLog('success', 'Download', `⬇ Ativado para "${customFileName}" (vídeo ${vidIdx})`);
            } else {
              addSpyLog('warning', 'Download', `Botão ⬇ não encontrado para o vídeo ${vidIdx}. Verifique o painel lateral.`);
            }

            const statusMsg = isFlowScenes
              ? `Salvo (Img ${imgIdx} - Víd ${letter})`
              : `Salvo (${vidIdx}/${generationsCount})`;
            setDownloadStatus(statusMsg);
            setActiveNode(5);
            for (let s = 10; s > 0; s--) {
              if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");
              while (pauseControllerRef.current) {
                if (abortControllerRef.current) throw new Error("Automação cancelada pelo usuário.");
                setDownloadStatus("Pausado...");
                await new Promise(r => setTimeout(r, 500));
              }
              setDownloadDelayRemaining(s);
              await new Promise(r => setTimeout(r, 1000));
            }
            setDownloadDelayRemaining(0);
            setActiveNode(4);
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
