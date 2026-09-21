import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Film,
  Video,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Folder,
  FolderOpen,
  RefreshCw,
  Upload,
  Play,
  Pause,
  Maximize2,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Star,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Download,
  Flame,
  ShieldCheck,
  Zap,
  Sliders,
  Scissors,
  ArrowRight,
  Eye,
  X,
  FileText,
  SlidersHorizontal,
  Info,
  Clock,
  Mic,
  Tag,
  Search,
  Trash2,
  Plus
} from 'lucide-react';
import { analyzeAudioFromUrl, AudioAnalysisResult, compareVoiceprints, VoiceMatchResult } from '../services/audio-analyzer';
import { analyzeVideoQuality, VideoQualityResult } from '../services/video-quality-analyzer';
import { requestAICreativeAudit, AICuratorFeedback } from '../services/video-curator-ai';

export interface VideoTakeItem {
  id: string;
  name: string;
  fullPath: string;
  url: string;
  thumbnailUrl?: string; // Thumbnail nativo em alta definição
  sizeBytes: number;
  modifiedAt: number;
  assignedSceneIndex: number; // 1, 2, 3... ou 0 para não atribuído
  isWinner: boolean;
  quality?: VideoQualityResult;
  audio?: AudioAnalysisResult;
  voiceMatch?: VoiceMatchResult;
  aiFeedback?: AICuratorFeedback;
  analyzing?: boolean;
}

interface VideoCuratorProps {
  themeMode: 'dark' | 'light';
  generatedScript?: any;
  projectImages?: any[];
  voiceGender?: string;
  voiceTone?: string;
  onNavigateToTab?: (tab: string) => void;
}

export const VideoCurator: React.FC<VideoCuratorProps> = ({
  themeMode,
  generatedScript,
  voiceGender,
  voiceTone,
  onNavigateToTab
}) => {
  const isDark = themeMode === 'dark';

  // Paleta de cores explícita para imunidade total a resets de CSS
  const theme = {
    cardBg: isDark ? '#18181b' : '#ffffff',
    cardBorder: isDark ? '#27272a' : '#e2e8f0',
    cardInnerBg: isDark ? '#111113' : '#f8fafc',
    textTitle: isDark ? '#ffffff' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    textBody: isDark ? '#e4e4e7' : '#1e293b',
    pillBg: isDark ? '#27272a' : '#f1f5f9',
    pillBorder: isDark ? '#3f3f46' : '#cbd5e1',
    pillText: isDark ? '#e4e4e7' : '#334155',
    tabInactiveBg: isDark ? '#18181b' : '#ffffff',
    tabInactiveBorder: isDark ? '#27272a' : '#cbd5e1',
    tabInactiveText: isDark ? '#a1a1aa' : '#475569',
    dockedBg: isDark ? 'rgba(24, 24, 27, 0.96)' : 'rgba(255, 255, 255, 0.98)',
    dockedBorder: isDark ? '#3f3f46' : '#cbd5e1',
  };

  // Estados principais
  const [folderPath, setFolderPath] = useState<string>('');
  const [takes, setTakes] = useState<VideoTakeItem[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState<boolean>(false);
  const [selectedSceneTab, setSelectedSceneTab] = useState<number>(0); // 0 = Todas as cenas
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [showScenePrompts, setShowScenePrompts] = useState<boolean>(true);

  // Modais
  const [activePreviewTake, setActivePreviewTake] = useState<VideoTakeItem | null>(null);
  const [isPlayingFullCut, setIsPlayingFullCut] = useState<boolean>(false);
  const [fullCutCurrentIndex, setFullCutCurrentIndex] = useState<number>(0);

  // Exportação
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccessNotice, setExportSuccessNotice] = useState<{ count: number; folder: string } | null>(null);

  // Lista de Cenas baseada no roteiro ativo
  const scriptScenes = useMemo(() => {
    if (generatedScript && Array.isArray(generatedScript.scenes) && generatedScript.scenes.length > 0) {
      return generatedScript.scenes;
    }
    // Fallback: 3 cenas padrão estruturadas para anúncios de alta conversão
    return [
      {
        id: 'scene_1',
        description: 'Gancho Visual & Curiosidade (Hook)',
        duration: '4s',
        narration: 'Você ainda está cometendo esse erro todos os dias?',
        veoPrompt: 'Cinematic dynamic 9:16 vertical hook shot showing product in action, high contrast, clean lighting',
        digenPrompt: 'Presenter energetic expression looking directly into camera with product in hand'
      },
      {
        id: 'scene_2',
        description: 'Problema & Demonstração Real',
        duration: '6s',
        narration: 'A maioria dos produtos normais simplesmente não aguenta o ritmo...',
        veoPrompt: 'Close up macro detailed shot demonstrating product features with smooth fluid motion',
        digenPrompt: 'Presenter showing product details up close with confident friendly explanation'
      },
      {
        id: 'scene_3',
        description: 'Solução, Oferta & Chamada de Ação (CTA)',
        duration: '4s',
        narration: 'Aproveite o frete grátis e clique na sacolinha laranja aqui embaixo!',
        veoPrompt: 'Product hero packaging 9:16 vertical with TikTok Shop orange badge animation glow',
        digenPrompt: 'Presenter pointing down enthusiastically smiling holding the product'
      }
    ];
  }, [generatedScript]);

  // Escanear automaticamente pasta ao montar o componente
  useEffect(() => {
    scanFolder();
  }, []);

  // Escanear pasta via Electron IPC
  const scanFolder = async (customPath?: string) => {
    setIsLoadingVideos(true);
    try {
      if (window.electronAPI && typeof (window.electronAPI as any).curatorScanFolder === 'function') {
        const res = await (window.electronAPI as any).curatorScanFolder(customPath);
        if (res.success && Array.isArray(res.files)) {
          setFolderPath(res.folderPath || '');
          mapAndImportFiles(res.files, res.folderPath);
        } else {
          setFolderPath(res.folderPath || '');
        }
      }
    } catch (err) {
      console.error('[VideoCurator] Erro ao escanear pasta:', err);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  // Detecção semântica inteligente de cena baseada no nome do arquivo (VEO, DIGEN, etc.)
  const detectSceneIndexFromName = (filename: string): number => {
    const lower = filename.toLowerCase();

    // Cena 1: Hook, Gancho, Abertura, Segurando (Holding), Intro, Start, First, Cena 1
    if (
      /(?:cena|scene|take|c|s|t)[\s_\-]*0?1\b/i.test(lower) ||
      /\b(?:hook|gancho|holding|segurando|intro|abertura|start|inicio|first|comeco)\b/i.test(lower) ||
      /holding/i.test(lower)
    ) {
      return 1;
    }

    // Cena 2: Problema, Demonstração, Showcasing, Mostrando, Detalhes, Features, Unboxing, Cena 2
    if (
      /(?:cena|scene|take|c|s|t)[\s_\-]*0?2\b/i.test(lower) ||
      /\b(?:showcasing|showcase|demonstrating|demonstracao|demo|mostrando|problema|problem|feature|detalhes|unboxing|middle|second)\b/i.test(lower) ||
      /showcas/i.test(lower)
    ) {
      return 2;
    }

    // Cena 3: Solução, Review, Avaliação, Wearing, Vestindo, Oferta, CTA, Fechamento, Cena 3
    if (
      /(?:cena|scene|take|c|s|t)[\s_\-]*0?3\b/i.test(lower) ||
      /\b(?:reviewing|review|wearing|vestindo|solucao|solution|oferta|offer|cta|action|sacolinha|desconto|final|calltoaction|third)\b/i.test(lower) ||
      /review/i.test(lower)
    ) {
      return 3;
    }

    // Cena 4: Benefícios, Comparativo
    if (
      /(?:cena|scene|take|c|s|t)[\s_\-]*0?4\b/i.test(lower) ||
      /\b(?:beneficio|benefit|comparativo|comparison|fourth)\b/i.test(lower)
    ) {
      return 4;
    }

    // Cena 5: CTA Extra, Selo de Garantia
    if (
      /(?:cena|scene|take|c|s|t)[\s_\-]*0?5\b/i.test(lower) ||
      /\b(?:cta|garantia|sacola|fifth)\b/i.test(lower)
    ) {
      return 5;
    }

    return 0;
  };

  // Distribuição sequencial automática para takes não associados
  const autoDistributeUnassignedTakes = (items: VideoTakeItem[], maxScenes: number): VideoTakeItem[] => {
    const unassigned = items.filter(t => t.assignedSceneIndex === 0);
    if (unassigned.length === 0) return items;

    const result = [...items];
    const scenesWithoutTakes: number[] = [];
    for (let s = 1; s <= maxScenes; s++) {
      if (!result.some(t => t.assignedSceneIndex === s)) {
        scenesWithoutTakes.push(s);
      }
    }

    let unassignedIdx = 0;
    // 1. Preencher cenas vazias primeiro
    if (scenesWithoutTakes.length > 0) {
      for (const emptyScene of scenesWithoutTakes) {
        if (unassignedIdx < unassigned.length) {
          const target = unassigned[unassignedIdx];
          const itemInResult = result.find(r => r.id === target.id);
          if (itemInResult) {
            itemInResult.assignedSceneIndex = emptyScene;
          }
          unassignedIdx++;
        }
      }
    }

    // 2. Se a pasta tiver poucos vídeos restantes (até 3 por cena), distribuir ciclicamente
    while (unassignedIdx < unassigned.length && unassigned.length <= maxScenes * 3) {
      const target = unassigned[unassignedIdx];
      const cyclicScene = (unassignedIdx % maxScenes) + 1;
      const itemInResult = result.find(r => r.id === target.id);
      if (itemInResult) {
        itemInResult.assignedSceneIndex = cyclicScene;
      }
      unassignedIdx++;
    }

    return result;
  };

  // Mapeamento inteligente de arquivos com suporte a HTTP 206 Streaming e Auto-Organização
  const mapAndImportFiles = (files: Array<{ name: string; fullPath: string; url?: string; sizeBytes: number; modifiedAt: number }>, baseDir: string) => {
    let newTakes: VideoTakeItem[] = files.map((f, idx) => {
      const assignedScene = detectSceneIndexFromName(f.name);

      // Obter URL otimizada de streaming HTTP 206 local
      let videoUrl = f.url;
      if (!videoUrl && window.electronAPI && typeof (window.electronAPI as any).curatorGetMediaUrl === 'function') {
        videoUrl = (window.electronAPI as any).curatorGetMediaUrl(f.fullPath);
      }
      if (!videoUrl) {
        const cleanPath = f.fullPath.replace(/\\/g, '/');
        videoUrl = `local-video://${cleanPath}`;
      }

      return {
        id: `take_${idx}_${f.name}`,
        name: f.name,
        fullPath: f.fullPath,
        url: videoUrl,
        thumbnailUrl: (f as any).thumbnailUrl || '',
        sizeBytes: f.sizeBytes,
        modifiedAt: f.modifiedAt,
        assignedSceneIndex: assignedScene,
        isWinner: false,
        analyzing: true
      };
    });

    // Auto-organização inteligente para vídeos sem identificador explícito
    newTakes = autoDistributeUnassignedTakes(newTakes, scriptScenes.length);

    // Pré-selecionar provisoriamente o primeiro take de cada cena como vencedor
    for (let s = 1; s <= scriptScenes.length; s++) {
      const sceneTakes = newTakes.filter(t => t.assignedSceneIndex === s);
      if (sceneTakes.length > 0 && !sceneTakes.some(t => t.isWinner)) {
        sceneTakes[0].isWinner = true;
      }
    }

    setTakes(newTakes);

    // Iniciar análise inteligente local em segundo plano (Nitidez, Formato, Voz)
    processBatchAnalysis(newTakes);
  };

  // Ação manual: Auto-Organizar todos os takes da tela
  const handleAutoOrganize = () => {
    setTakes(prev => {
      let remapped = prev.map(t => ({
        ...t,
        assignedSceneIndex: detectSceneIndexFromName(t.name) || t.assignedSceneIndex
      }));
      remapped = autoDistributeUnassignedTakes(remapped, scriptScenes.length);

      // Reavaliar vencedores por pontuação de qualidade
      for (let s = 1; s <= scriptScenes.length; s++) {
        const sceneTakes = remapped.filter(t => t.assignedSceneIndex === s);
        if (sceneTakes.length > 0) {
          sceneTakes.sort((a, b) => (b.quality?.overallScore || 0) - (a.quality?.overallScore || 0));
          sceneTakes.forEach((t, i) => {
            t.isWinner = (i === 0);
          });
        }
      }
      return [...remapped];
    });
  };

  // Análise em lote nativa (100% no cliente sem gastar IA)
  const processBatchAnalysis = async (takesToProcess: VideoTakeItem[]) => {
    const updated = [...takesToProcess];

    for (let i = 0; i < updated.length; i++) {
      const take = updated[i];
      try {
        // Análise de qualidade do vídeo (Canvas / Variância Laplaciana / 9:16)
        const qualityRes = await analyzeVideoQuality(take.url, take.thumbnailUrl);
        take.quality = qualityRes;

        // Análise de áudio e voz (Web Audio API / FFT / Pitch F0)
        try {
          const audioRes = await analyzeAudioFromUrl(take.url);
          take.audio = audioRes;
        } catch (audioErr) {
          console.warn('[VideoCurator] Áudio não pôde ser analisado:', audioErr);
        }

        take.analyzing = false;
        setTakes([...updated]);
      } catch (err) {
        console.warn('[VideoCurator] Erro na análise do take:', take.name, err);
        take.analyzing = false;
      }
    }

    // Definir Take de referência vocal (primeiro take válido da Cena 1 ou vencedor)
    const refTake = updated.find(t => t.assignedSceneIndex === 1 && t.audio?.hasAudio) || updated.find(t => t.audio?.hasAudio);
    const refAudio = refTake?.audio || null;

    // Comparar consistência vocal de todos os takes com a referência
    for (const take of updated) {
      if (take.audio) {
        take.voiceMatch = compareVoiceprints(refAudio, take.audio);
      }
    }

    // Marcar automaticamente o melhor take por cena se ainda não houver vencedor
    for (let s = 1; s <= scriptScenes.length; s++) {
      const sceneTakes = updated.filter(t => t.assignedSceneIndex === s);
      const hasWinner = sceneTakes.some(t => t.isWinner);
      if (!hasWinner && sceneTakes.length > 0) {
        sceneTakes.sort((a, b) => (b.quality?.overallScore || 0) - (a.quality?.overallScore || 0));
        sceneTakes[0].isWinner = true;
      }
    }

    setTakes([...updated]);
  };

  // Selecionar Pasta via Diálogo Nativo do Windows
  const handleSelectFolder = async () => {
    if (window.electronAPI && typeof (window.electronAPI as any).curatorSelectFolder === 'function') {
      const res = await (window.electronAPI as any).curatorSelectFolder();
      if (!res.canceled && res.folderPath) {
        scanFolder(res.folderPath);
      }
    }
  };

  // Upload Manual via Input de Arquivo
  const handleManualVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const imported: VideoTakeItem[] = Array.from(files).map((file: File, idx: number) => {
      const objectUrl = URL.createObjectURL(file);
      const assigned = detectSceneIndexFromName(file.name);

      return {
        id: `manual_${Date.now()}_${idx}`,
        name: file.name,
        fullPath: (file as any).path || file.name,
        url: objectUrl,
        sizeBytes: file.size,
        modifiedAt: file.lastModified,
        assignedSceneIndex: assigned,
        isWinner: false,
        analyzing: true
      };
    });

    let combined = [...takes, ...imported];
    combined = autoDistributeUnassignedTakes(combined, scriptScenes.length);
    setTakes(combined);
    processBatchAnalysis(combined);
  };

  // Alternar Take Vencedor para uma cena
  const toggleWinningTake = (takeId: string, sceneIndex: number) => {
    setTakes(prev => prev.map(t => {
      if (t.assignedSceneIndex === sceneIndex) {
        return {
          ...t,
          isWinner: t.id === takeId ? !t.isWinner : false
        };
      }
      return t;
    }));
  };

  // Reatribuir take para outra cena
  const reassignScene = (takeId: string, newSceneIndex: number) => {
    setTakes(prev => prev.map(t => {
      if (t.id === takeId) {
        return { ...t, assignedSceneIndex: newSceneIndex, isWinner: false };
      }
      return t;
    }));
  };

  // Limpar lista de vídeos da tela
  const handleClearList = () => {
    if (window.confirm('Deseja limpar a lista de vídeos da tela atual?')) {
      setTakes([]);
    }
  };

  // Consultar Parecer Criativo Opcional com I.A (Gemini 2.0 Flash)
  const handleRequestAIReview = async (take: VideoTakeItem) => {
    if (!take.quality) return;

    setTakes(prev => prev.map(t => t.id === take.id ? { ...t, analyzing: true } : t));
    const scene = scriptScenes[take.assignedSceneIndex - 1] || scriptScenes[0];

    try {
      const feedback = await requestAICreativeAudit({
        sceneTitle: `Cena ${take.assignedSceneIndex}: ${scene?.description || 'Take de Vídeo'}`,
        narration: scene?.narration,
        prompt: scene?.veoPrompt || scene?.digenPrompt,
        videoQuality: take.quality,
        audioAnalysis: take.audio
      });

      setTakes(prev => prev.map(t => {
        if (t.id === take.id) {
          return {
            ...t,
            aiFeedback: feedback,
            analyzing: false
          };
        }
        return t;
      }));
    } catch (err) {
      console.error('[VideoCurator] Erro ao solicitar parecer criativo da IA:', err);
      setTakes(prev => prev.map(t => t.id === take.id ? { ...t, analyzing: false } : t));
    }
  };

  // Copiar prompt para a área de transferência
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPromptId(id);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };

  // Takes vencedores selecionados em ordem
  const winningTakes = useMemo(() => {
    const list: Array<{ sceneIndex: number; scene: any; take: VideoTakeItem }> = [];
    for (let i = 1; i <= scriptScenes.length; i++) {
      const winner = takes.find(t => t.assignedSceneIndex === i && t.isWinner);
      if (winner) {
        list.push({
          sceneIndex: i,
          scene: scriptScenes[i - 1],
          take: winner
        });
      }
    }
    return list;
  }, [takes, scriptScenes]);

  // Tempo total calculado do corte final
  const totalCutSeconds = useMemo(() => {
    return winningTakes.reduce((acc, curr) => acc + (curr.take.quality?.durationSeconds || 4), 0);
  }, [winningTakes]);

  // Coerência vocal consolidada do corte final
  const cutVoiceHealth = useMemo(() => {
    if (winningTakes.length <= 1) return { score: 100, label: 'Consistente', color: 'emerald' };
    const mismatch = winningTakes.some(w => w.take.voiceMatch && !w.take.voiceMatch.isMatch);
    if (mismatch) {
      return { score: 65, label: 'Atenção: Variação de Voz Detectada', color: 'amber' };
    }
    return { score: 98, label: '100% de Coerência Vocal em Todas as Cenas', color: 'emerald' };
  }, [winningTakes]);

  // Exportar Corte Final Organizado
  const handleExportFinalCut = async () => {
    if (winningTakes.length === 0) {
      alert('Selecione ao menos um take vencedor para exportar o corte final!');
      return;
    }

    setIsExporting(true);
    try {
      if (window.electronAPI && typeof (window.electronAPI as any).curatorExportFinalCut === 'function') {
        const payload = {
          targetFolder: folderPath,
          projectName: generatedScript?.campaignTitle || 'TikTok Shop Campanha',
          selectedTakes: winningTakes.map(w => ({
            sceneIndex: w.sceneIndex,
            sceneTitle: w.scene?.description || `Cena_${w.sceneIndex}`,
            sourcePath: w.take.fullPath,
            duration: `${Math.round(w.take.quality?.durationSeconds || 4)}s`,
            narration: w.scene?.narration,
            score: w.take.quality?.overallScore,
            voiceMatch: w.take.voiceMatch?.badgeLabel
          }))
        };

        const res = await (window.electronAPI as any).curatorExportFinalCut(payload);
        if (res.success) {
          setExportSuccessNotice({
            count: res.exportedFilesCount,
            folder: res.destFolder
          });
          setTimeout(() => setExportSuccessNotice(null), 8000);
        } else {
          alert(`Erro ao exportar: ${res.error}`);
        }
      } else {
        alert('Exportação disponível no aplicativo desktop.');
      }
    } catch (err: any) {
      console.error('[VideoCurator] Erro ao exportar corte final:', err);
      alert(`Falha ao exportar: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Filtragem de takes pela aba de cena ativa e termo de busca
  const filteredTakes = useMemo(() => {
    let list = takes;
    if (selectedSceneTab > 0) {
      list = list.filter(t => t.assignedSceneIndex === selectedSceneTab);
    } else if (selectedSceneTab === -1) {
      list = list.filter(t => t.assignedSceneIndex === 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(t => t.name.toLowerCase().includes(q));
    }

    return list;
  }, [takes, selectedSceneTab, searchQuery]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 transition-colors duration-200">
      
      {/* 1. Header do Estúdio de Curadoria com Contraste Perfeito */}
      <div 
        className="p-6 sm:p-8 rounded-3xl border shadow-lg relative overflow-hidden"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
          color: theme.textBody
        }}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 shrink-0">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <h1 
                  className="text-2xl sm:text-3xl font-black tracking-tight"
                  style={{ color: theme.textTitle }}
                >
                  Curador & Melhores Vídeos
                </h1>
                <p 
                  className="text-xs sm:text-sm mt-0.5"
                  style={{ color: theme.textMuted }}
                >
                  Auditoria inteligente de qualidade, consistência de voz (Web Audio API) e montagem final para TikTok Shop.
                </p>
              </div>
            </div>

            {/* Pílulas de informações do projeto e voz */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span 
                className="px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 border"
                style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder, color: theme.pillText }}
              >
                <Tag className="w-3.5 h-3.5 text-orange-500" />
                Projeto: <strong className="text-orange-500">{generatedScript?.campaignTitle || 'TikTok Shop Campanha'}</strong>
              </span>

              <span 
                className="px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 border"
                style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder, color: theme.pillText }}
              >
                <Mic className="w-3.5 h-3.5 text-emerald-500" />
                Padrão de Voz: <strong className="text-emerald-500">{voiceGender || 'Feminino'} ({voiceTone || 'Entusiasta'})</strong>
              </span>

              <span 
                className="px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 border"
                style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder, color: theme.pillText }}
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Inteligência: <strong>100% Nativa (Instantânea & Gratuita)</strong>
              </span>
            </div>
          </div>

          {/* Botões de Ação da Pasta */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={handleSelectFolder}
              className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border shadow-sm"
              style={{
                backgroundColor: isDark ? '#27272a' : '#f8fafc',
                borderColor: theme.cardBorder,
                color: theme.textTitle
              }}
            >
              <FolderOpen className="w-4 h-4 text-orange-500" />
              <span>Alterar Pasta</span>
            </button>

            <button
              onClick={() => scanFolder(folderPath)}
              disabled={isLoadingVideos}
              className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border shadow-sm"
              style={{
                backgroundColor: isDark ? '#27272a' : '#f8fafc',
                borderColor: theme.cardBorder,
                color: theme.textTitle
              }}
            >
              <RefreshCw className={`w-4 h-4 text-amber-500 ${isLoadingVideos ? 'animate-spin' : ''}`} />
              <span>Reescanear</span>
            </button>

            <button
              onClick={handleAutoOrganize}
              className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border shadow-sm"
              style={{
                backgroundColor: isDark ? 'rgba(249, 115, 22, 0.15)' : '#fff7ed',
                borderColor: 'rgba(249, 115, 22, 0.4)',
                color: '#ea580c'
              }}
              title="Organizar automaticamente os vídeos nas cenas do roteiro e definir vencedores"
            >
              <Zap className="w-4 h-4 text-orange-500 fill-orange-500/20" />
              <span>Auto-Organizar</span>
            </button>

            <label className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20">
              <Upload className="w-4 h-4" />
              <span>Adicionar Vídeos</span>
              <input
                type="file"
                multiple
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleManualVideoUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Linha indicadora do caminho da pasta */}
        {folderPath && (
          <div 
            className="mt-5 pt-4 border-t flex flex-wrap items-center justify-between gap-3 text-xs"
            style={{ borderColor: theme.cardBorder }}
          >
            <div className="flex items-center gap-2 truncate max-w-xl">
              <Folder className="w-4 h-4 shrink-0 text-orange-500" />
              <span className="shrink-0 font-medium" style={{ color: theme.textMuted }}>Pasta Selecionada:</span>
              <span className="truncate font-mono text-[11px] font-bold" style={{ color: theme.textTitle }}>
                {folderPath}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-bold text-orange-500">
                {takes.length} {takes.length === 1 ? 'vídeo nesta pasta' : 'vídeos nesta pasta'}
              </span>
              {takes.length > 0 && (
                <button
                  onClick={handleClearList}
                  className="text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                  title="Limpar vídeos da tela"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Alerta de Sucesso na Exportação */}
      <AnimatePresence>
        {exportSuccessNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-emerald-500">
                  Corte Final Exportado com Sucesso! ({exportSuccessNotice.count} Cenas)
                </h4>
                <p className="text-xs opacity-90 truncate max-w-2xl" style={{ color: theme.textTitle }}>
                  Arquivos organizados e renomeados em: {exportSuccessNotice.folder}
                </p>
              </div>
            </div>
            <button
              onClick={() => setExportSuccessNotice(null)}
              className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-600"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Barra de Navegação por Cenas (Tabs) & Busca */}
      <div 
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-4 gap-4"
        style={{ borderColor: theme.cardBorder }}
      >
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedSceneTab(0)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border shadow-sm"
            style={{
              backgroundColor: selectedSceneTab === 0 ? '#f97316' : theme.tabInactiveBg,
              borderColor: selectedSceneTab === 0 ? '#ea580c' : theme.tabInactiveBorder,
              color: selectedSceneTab === 0 ? '#ffffff' : theme.tabInactiveText
            }}
          >
            <span>Todas as Cenas</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 font-mono text-white">
              {takes.length}
            </span>
          </button>

          {scriptScenes.map((scene: any, idx: number) => {
            const sceneIndex = idx + 1;
            const count = takes.filter(t => t.assignedSceneIndex === sceneIndex).length;
            const hasWinner = takes.some(t => t.assignedSceneIndex === sceneIndex && t.isWinner);

            return (
              <button
                key={scene.id || idx}
                onClick={() => setSelectedSceneTab(sceneIndex)}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border shadow-sm shrink-0"
                style={{
                  backgroundColor: selectedSceneTab === sceneIndex ? '#f97316' : theme.tabInactiveBg,
                  borderColor: selectedSceneTab === sceneIndex ? '#ea580c' : theme.tabInactiveBorder,
                  color: selectedSceneTab === sceneIndex ? '#ffffff' : theme.tabInactiveText
                }}
              >
                {hasWinner ? (
                  <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                )}
                <span>Cena {sceneIndex}</span>
                <span 
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-mono"
                  style={{
                    backgroundColor: selectedSceneTab === sceneIndex ? 'rgba(0,0,0,0.2)' : theme.pillBg,
                    color: selectedSceneTab === sceneIndex ? '#ffffff' : theme.textTitle
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setSelectedSceneTab(-1)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border shadow-sm shrink-0"
            style={{
              backgroundColor: selectedSceneTab === -1 ? '#f97316' : theme.tabInactiveBg,
              borderColor: selectedSceneTab === -1 ? '#ea580c' : theme.tabInactiveBorder,
              color: selectedSceneTab === -1 ? '#ffffff' : theme.tabInactiveText
            }}
          >
            <span>Não Classificados</span>
            <span 
              className="px-1.5 py-0.5 rounded-full text-[10px] font-mono"
              style={{
                backgroundColor: selectedSceneTab === -1 ? 'rgba(0,0,0,0.2)' : theme.pillBg,
                color: selectedSceneTab === -1 ? '#ffffff' : theme.textTitle
              }}
            >
              {takes.filter(t => t.assignedSceneIndex === 0).length}
            </span>
          </button>
        </div>

        {/* Campo de Busca Rápida por Nome do Vídeo */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar vídeos pelo nome..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            style={{
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
              color: theme.textTitle
            }}
          />
        </div>
      </div>

      {/* 3. Card de Contexto da Cena Atual (Prompts e Narração) */}
      {selectedSceneTab > 0 && selectedSceneTab <= scriptScenes.length && (
        <div 
          className="p-5 rounded-2xl border transition-all shadow-sm"
          style={{
            backgroundColor: theme.cardInnerBg,
            borderColor: theme.cardBorder,
            color: theme.textBody
          }}
        >
          <div 
            className="flex items-center justify-between gap-4 cursor-pointer" 
            onClick={() => setShowScenePrompts(!showScenePrompts)}
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-500 font-black text-sm flex items-center justify-center border border-orange-500/30 shrink-0">
                {selectedSceneTab}
              </span>
              <div>
                <h3 className="font-bold text-base flex items-center gap-2" style={{ color: theme.textTitle }}>
                  <span>Cena {selectedSceneTab}: {scriptScenes[selectedSceneTab - 1]?.description}</span>
                  <span 
                    className="text-xs px-2 py-0.5 rounded font-normal border"
                    style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder, color: theme.pillText }}
                  >
                    Duração: {scriptScenes[selectedSceneTab - 1]?.duration || '4s'}
                  </span>
                </h3>
                <p className="text-xs mt-0.5 italic" style={{ color: theme.textMuted }}>
                  "{scriptScenes[selectedSceneTab - 1]?.narration}"
                </p>
              </div>
            </div>

            <button className="text-xs font-bold flex items-center gap-1 text-orange-500 hover:underline shrink-0">
              <span>{showScenePrompts ? 'Ocultar Prompts' : 'Ver Prompts'}</span>
              {showScenePrompts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Prompts originais expansíveis com cores nítidas */}
          {showScenePrompts && (
            <div 
              className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t"
              style={{ borderColor: theme.cardBorder }}
            >
              {/* Google VEO Prompt */}
              <div 
                className="p-4 rounded-xl border text-xs space-y-2 shadow-sm"
                style={{
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                  color: theme.textBody
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-orange-500 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" /> Google VEO Prompt
                  </span>
                  <button
                    onClick={() => copyToClipboard(scriptScenes[selectedSceneTab - 1]?.veoPrompt || '', `veo_${selectedSceneTab}`)}
                    className="p-1 rounded hover:bg-orange-500/10 text-slate-400 hover:text-orange-500 transition-colors"
                    title="Copiar prompt VEO"
                  >
                    {copiedPromptId === `veo_${selectedSceneTab}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p 
                  className="font-mono text-[11px] leading-relaxed line-clamp-3"
                  style={{ color: theme.textBody }}
                >
                  {scriptScenes[selectedSceneTab - 1]?.veoPrompt || 'Prompt VEO não informado'}
                </p>
              </div>

              {/* DIGEN.ai Prompt */}
              <div 
                className="p-4 rounded-xl border text-xs space-y-2 shadow-sm"
                style={{
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                  color: theme.textBody
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-500 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> DIGEN.ai (Apresentador)
                  </span>
                  <button
                    onClick={() => copyToClipboard(scriptScenes[selectedSceneTab - 1]?.digenPrompt || '', `digen_${selectedSceneTab}`)}
                    className="p-1 rounded hover:bg-amber-500/10 text-slate-400 hover:text-amber-500 transition-colors"
                    title="Copiar prompt DIGEN"
                  >
                    {copiedPromptId === `digen_${selectedSceneTab}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p 
                  className="font-mono text-[11px] leading-relaxed line-clamp-3"
                  style={{ color: theme.textBody }}
                >
                  {scriptScenes[selectedSceneTab - 1]?.digenPrompt || 'Prompt DIGEN não informado'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Grid de Takes de Vídeo */}
      {filteredTakes.length === 0 ? (
        <div 
          className="p-12 text-center rounded-3xl border border-dashed shadow-sm"
          style={{
            backgroundColor: theme.cardInnerBg,
            borderColor: theme.cardBorder,
            color: theme.textMuted
          }}
        >
          <Video className="w-12 h-12 mx-auto mb-3 opacity-40 text-orange-500" />
          <h3 className="text-lg font-bold" style={{ color: theme.textTitle }}>
            Nenhum vídeo encontrado para este filtro
          </h3>
          <p className="text-xs max-w-md mx-auto mt-1 mb-5" style={{ color: theme.textMuted }}>
            {searchQuery ? 'Nenhum vídeo coincide com o termo pesquisado.' : 'Clique em "Alterar Pasta" ou arraste vídeos gerados para esta tela.'}
          </p>
          <button
            onClick={handleSelectFolder}
            className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 inline-flex items-center gap-2 cursor-pointer"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Selecionar Pasta de Vídeos</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTakes.map(take => (
            <VideoTakeCard
              key={take.id}
              take={take}
              themeMode={themeMode}
              theme={theme}
              scriptScenes={scriptScenes}
              onToggleWinner={() => toggleWinningTake(take.id, take.assignedSceneIndex)}
              onReassignScene={(newIdx) => reassignScene(take.id, newIdx)}
              onRequestAIReview={() => handleRequestAIReview(take)}
              onOpenPreview={() => setActivePreviewTake(take)}
            />
          ))}
        </div>
      )}

      {/* 5. Barra Fixa / Docked: Timeline do Corte Final */}
      <div 
        className="sticky bottom-4 z-40 p-4 sm:p-5 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all"
        style={{
          backgroundColor: theme.dockedBg,
          borderColor: theme.dockedBorder,
          color: theme.textBody
        }}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-orange-500" />
              <h3 className="font-black text-sm uppercase tracking-wider" style={{ color: theme.textTitle }}>
                Montagem do Corte Final ({winningTakes.length}/{scriptScenes.length} Cenas Definidas)
              </h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                cutVoiceHealth.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'
              }`}>
                {cutVoiceHealth.label}
              </span>
            </div>

            {/* Prévia horizontal da sequência de cenas */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {scriptScenes.map((scene: any, idx: number) => {
                const sceneNum = idx + 1;
                const winner = winningTakes.find(w => w.sceneIndex === sceneNum);

                return (
                  <div
                    key={sceneNum}
                    onClick={() => setSelectedSceneTab(sceneNum)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer border transition-all"
                    style={{
                      backgroundColor: winner ? (isDark ? 'rgba(249, 115, 22, 0.15)' : '#fff7ed') : theme.pillBg,
                      borderColor: winner ? 'rgba(249, 115, 22, 0.4)' : theme.pillBorder,
                      color: winner ? '#ea580c' : theme.textMuted
                    }}
                  >
                    {winner ? (
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    )}
                    <span>Cena {sceneNum}:</span>
                    <strong className="truncate max-w-[120px] font-mono text-[11px]">
                      {winner ? winner.take.name : 'Pendente'}
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Duração e Botões de Ação */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] uppercase font-bold opacity-70" style={{ color: theme.textMuted }}>Duração Total</div>
              <div className="font-mono font-black text-sm text-orange-500">
                ~{Math.round(totalCutSeconds)}s <span className="text-xs font-normal opacity-70">(TikTok Shop)</span>
              </div>
            </div>

            <button
              onClick={() => {
                if (winningTakes.length === 0) {
                  alert('Selecione takes vencedores para visualizar a montagem contínua!');
                  return;
                }
                setFullCutCurrentIndex(0);
                setIsPlayingFullCut(true);
              }}
              className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer border transition-all shadow-sm"
              style={{
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                color: theme.textTitle
              }}
            >
              <Play className="w-3.5 h-3.5 text-orange-500 fill-current" />
              <span>Prévia Contínua</span>
            </button>

            <button
              onClick={handleExportFinalCut}
              disabled={isExporting || winningTakes.length === 0}
              className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-lg ${
                winningTakes.length > 0
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/25'
                  : 'opacity-40 cursor-not-allowed bg-slate-300 text-slate-500'
              }`}
            >
              <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? 'Exportando...' : 'Exportar Corte Final'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Visualização Ampliada de Take Individual */}
      <AnimatePresence>
        {activePreviewTake && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-3xl w-full rounded-3xl border overflow-hidden shadow-2xl relative"
              style={{
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                color: theme.textBody
              }}
            >
              <div 
                className="p-4 flex items-center justify-between border-b"
                style={{ borderColor: theme.cardBorder }}
              >
                <div className="flex items-center gap-2">
                  <Film className="w-5 h-5 text-orange-500" />
                  <span className="font-bold text-sm truncate max-w-md" style={{ color: theme.textTitle }}>
                    {activePreviewTake.name}
                  </span>
                </div>
                <button
                  onClick={() => setActivePreviewTake(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-black flex items-center justify-center max-h-[65vh]">
                <video
                  src={activePreviewTake.url}
                  poster={activePreviewTake.thumbnailUrl || activePreviewTake.quality?.keyframes?.[0] || ''}
                  crossOrigin="anonymous"
                  preload="metadata"
                  controls
                  autoPlay
                  loop
                  className="max-h-[65vh] w-auto mx-auto"
                />
              </div>

              <div className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-orange-500">
                    Score Técnico: {activePreviewTake.quality?.overallScore || 80}/100
                  </span>
                  <span>•</span>
                  <span>{activePreviewTake.audio?.timbreLabel || 'Áudio comercial'}</span>
                </div>

                <button
                  onClick={() => {
                    toggleWinningTake(activePreviewTake.id, activePreviewTake.assignedSceneIndex);
                    setActivePreviewTake(null);
                  }}
                  className={`px-4 py-2 rounded-xl font-bold uppercase tracking-wider flex items-center gap-2 ${
                    activePreviewTake.isWinner
                      ? 'bg-amber-500 text-white'
                      : 'bg-orange-500 text-white'
                  }`}
                >
                  <Star className="w-4 h-4 fill-current" />
                  <span>{activePreviewTake.isWinner ? 'Take Vencedor Escolhido' : 'Definir como Vencedor'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Prévia Contínua (Sequência do Vídeo Montado) */}
      <AnimatePresence>
        {isPlayingFullCut && winningTakes.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full rounded-3xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl relative text-white"
            >
              <div className="p-4 flex items-center justify-between border-b border-zinc-800">
                <div>
                  <h4 className="font-bold text-sm text-orange-400">
                    Prévia Contínua: Cena {winningTakes[fullCutCurrentIndex]?.sceneIndex} de {winningTakes.length}
                  </h4>
                  <p className="text-[11px] opacity-70 truncate text-zinc-300">
                    {winningTakes[fullCutCurrentIndex]?.scene?.description}
                  </p>
                </div>
                <button
                  onClick={() => setIsPlayingFullCut(false)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Player com troca automática de take ao terminar */}
              <div className="bg-black relative flex items-center justify-center h-[520px]">
                <video
                  key={winningTakes[fullCutCurrentIndex]?.take.id}
                  src={winningTakes[fullCutCurrentIndex]?.take.url}
                  poster={winningTakes[fullCutCurrentIndex]?.take.thumbnailUrl || winningTakes[fullCutCurrentIndex]?.take.quality?.keyframes?.[0] || ''}
                  crossOrigin="anonymous"
                  preload="metadata"
                  autoPlay
                  controls
                  onEnded={() => {
                    if (fullCutCurrentIndex < winningTakes.length - 1) {
                      setFullCutCurrentIndex(prev => prev + 1);
                    } else {
                      setFullCutCurrentIndex(0);
                    }
                  }}
                  className="h-full w-auto object-contain mx-auto"
                />

                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-xs font-bold text-orange-400 border border-orange-500/30">
                  Cena {winningTakes[fullCutCurrentIndex]?.sceneIndex} • Take {winningTakes[fullCutCurrentIndex]?.take.name}
                </div>
              </div>

              {/* Controles de próxima e anterior cena */}
              <div className="p-3 bg-zinc-900 flex items-center justify-between gap-2 text-xs">
                <button
                  disabled={fullCutCurrentIndex === 0}
                  onClick={() => setFullCutCurrentIndex(prev => Math.max(0, prev - 1))}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30"
                >
                  Anterior
                </button>

                <div className="flex items-center gap-1.5">
                  {winningTakes.map((_, i) => (
                    <span
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i === fullCutCurrentIndex ? 'bg-orange-500 w-5' : 'bg-zinc-600'
                      } transition-all`}
                    />
                  ))}
                </div>

                <button
                  disabled={fullCutCurrentIndex === winningTakes.length - 1}
                  onClick={() => setFullCutCurrentIndex(prev => Math.min(winningTakes.length - 1, prev + 1))}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30"
                >
                  Próxima
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

// ============================================================================
// Subcomponente: Card de Take de Vídeo com Preview Instantâneo e Visual Calibrado
// ============================================================================
interface VideoTakeCardProps {
  take: VideoTakeItem;
  themeMode: 'dark' | 'light';
  theme: any;
  scriptScenes: any[];
  onToggleWinner: () => void;
  onReassignScene: (newSceneIndex: number) => void;
  onRequestAIReview: () => void;
  onOpenPreview: () => void;
}

const VideoTakeCard: React.FC<VideoTakeCardProps> = ({
  take,
  themeMode,
  theme,
  scriptScenes,
  onToggleWinner,
  onReassignScene,
  onRequestAIReview,
  onOpenPreview
}) => {
  const isDark = themeMode === 'dark';
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [showMetrics, setShowMetrics] = useState<boolean>(false);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn('Play error:', err);
        setIsPlaying(false);
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const score = take.quality?.overallScore || 80;
  const isWinner = take.isWinner;
  const thumb = take.thumbnailUrl || take.quality?.keyframes?.[0] || '';

  return (
    <div 
      className="rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col relative shadow-sm"
      style={{
        backgroundColor: theme.cardBg,
        borderColor: isWinner ? '#f59e0b' : theme.cardBorder,
        boxShadow: isWinner ? '0 10px 25px -5px rgba(245, 158, 11, 0.25)' : undefined
      }}
    >
      
      {/* Ribbon de Take Vencedor */}
      {isWinner && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-black uppercase tracking-wider py-1 px-3 text-center flex items-center justify-center gap-1.5 shadow-sm">
          <Star className="w-3.5 h-3.5 fill-current" />
          <span>Take Campeão da Cena {take.assignedSceneIndex || 1}</span>
        </div>
      )}

      {/* Header do Card */}
      <div 
        className="p-4 flex items-center justify-between gap-2 border-b"
        style={{ borderColor: theme.cardBorder }}
      >
        <div className="truncate">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs truncate max-w-[170px]" style={{ color: theme.textTitle }} title={take.name}>
              {take.name}
            </span>
            <span 
              className="px-1.5 py-0.5 rounded text-[10px] font-mono border"
              style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder, color: theme.pillText }}
            >
              {(take.sizeBytes / (1024 * 1024)).toFixed(1)}MB
            </span>
          </div>
        </div>

        {/* Seletor de Cena Rápido */}
        <select
          value={take.assignedSceneIndex}
          onChange={(e) => onReassignScene(Number(e.target.value))}
          className="text-[11px] font-bold rounded-lg px-2 py-1 cursor-pointer border"
          style={{
            backgroundColor: theme.pillBg,
            borderColor: theme.pillBorder,
            color: theme.textTitle
          }}
        >
          <option value={0}>Não Classificado</option>
          {scriptScenes.map((_, idx) => (
            <option key={idx + 1} value={idx + 1}>
              Cena {idx + 1}
            </option>
          ))}
        </select>
      </div>

      {/* Player de Vídeo com Preview Instantâneo do Frame */}
      <div className="relative aspect-[9/14] bg-black group overflow-hidden">
        {/* Preview do Frame capturado em alta definição (visível por padrão até dar play) */}
        {thumb && !isPlaying && (
          <img
            src={thumb}
            alt={take.name}
            className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
          />
        )}

        {/* Elemento de vídeo nativo HTML5 via Range HTTP 206 */}
        <video
          ref={videoRef}
          src={take.url}
          poster={thumb}
          crossOrigin="anonymous"
          preload="metadata"
          loop
          muted={isMuted}
          playsInline
          className="w-full h-full object-cover cursor-pointer relative z-0"
          onClick={togglePlay}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />

        {/* Indicador de processamento enquanto analisa */}
        {take.analyzing && !thumb && (
          <div className="absolute inset-0 z-15 bg-zinc-900/90 flex flex-col items-center justify-center gap-2 text-white">
            <RefreshCw className="w-6 h-6 text-orange-500 animate-spin" />
            <span className="text-[11px] font-bold tracking-wide">Gerando preview...</span>
          </div>
        )}

        {/* Overlay com Botão de Play central se pausado */}
        {!isPlaying && (
          <div 
            onClick={togglePlay}
            className="absolute inset-0 z-20 bg-black/25 hover:bg-black/40 flex items-center justify-center cursor-pointer transition-all"
          >
            <div className="w-14 h-14 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
              <Play className="w-7 h-7 ml-0.5 fill-current" />
            </div>
          </div>
        )}

        {/* Badges Flutuantes Superiores */}
        <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between gap-2 pointer-events-none">
          {/* Badge de Score Geral */}
          <div className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white text-xs font-black flex items-center gap-1.5 shadow-md">
            <span className={`w-2 h-2 rounded-full ${
              score >= 85 ? 'bg-emerald-400' : score >= 70 ? 'bg-amber-400' : 'bg-rose-400'
            }`} />
            <span>Score: {score}/100</span>
          </div>

          {/* Botão de Ampliar Modal */}
          <button
            onClick={onOpenPreview}
            className="p-1.5 rounded-full bg-black/75 backdrop-blur-md text-white/90 hover:text-white border border-white/20 pointer-events-auto transition-colors cursor-pointer"
            title="Visualização Ampliada"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Controles Flutuantes Inferiores */}
        <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center justify-between gap-2 pointer-events-none">
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-full bg-black/75 backdrop-blur-md text-white/90 hover:text-white border border-white/20 pointer-events-auto transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <span className="px-2 py-1 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-mono font-bold text-white">
            {take.quality?.durationSeconds ? `${Math.round(take.quality.durationSeconds)}s` : '5s'}
          </span>
        </div>
      </div>

      {/* Seção de Diagnóstico Inteligente Local */}
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          {/* Badge de Coerência Vocal */}
          {take.voiceMatch && (
            <div 
              className="p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 border font-medium"
              style={{
                backgroundColor: take.voiceMatch.badgeColor === 'emerald'
                  ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5')
                  : take.voiceMatch.badgeColor === 'amber'
                  ? (isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb')
                  : (isDark ? 'rgba(244, 63, 94, 0.15)' : '#fff1f2'),
                borderColor: take.voiceMatch.badgeColor === 'emerald'
                  ? 'rgba(16, 185, 129, 0.3)'
                  : take.voiceMatch.badgeColor === 'amber'
                  ? 'rgba(245, 158, 11, 0.3)'
                  : 'rgba(244, 63, 94, 0.3)',
                color: take.voiceMatch.badgeColor === 'emerald'
                  ? '#059669'
                  : take.voiceMatch.badgeColor === 'amber'
                  ? '#d97706'
                  : '#e11d48'
              }}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Mic className="w-3.5 h-3.5 shrink-0" />
                <span className="font-bold truncate">{take.voiceMatch.badgeLabel}</span>
              </div>
              <span className="text-[10px] font-mono opacity-90 shrink-0">
                {take.audio?.pitchHz ? `~${take.audio.pitchHz}Hz` : ''}
              </span>
            </div>
          )}

          {/* Pílulas de Métricas Técnicas */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <div 
              className="p-2 rounded-lg border flex items-center justify-between"
              style={{ backgroundColor: theme.cardInnerBg, borderColor: theme.cardBorder }}
            >
              <span style={{ color: theme.textMuted }}>Nitidez:</span>
              <strong className="font-mono text-orange-500">{take.quality?.sharpnessScore || 85}%</strong>
            </div>

            <div 
              className="p-2 rounded-lg border flex items-center justify-between"
              style={{ backgroundColor: theme.cardInnerBg, borderColor: theme.cardBorder }}
            >
              <span style={{ color: theme.textMuted }}>Formato:</span>
              <strong className="font-mono text-emerald-500">{take.quality?.isTikTokVertical ? '9:16 OK' : 'Outro'}</strong>
            </div>
          </div>

          {/* Acordeão de Diagnóstico Técnico */}
          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className="w-full text-left text-[11px] font-bold text-orange-500 flex items-center justify-between pt-1 cursor-pointer"
          >
            <span>{showMetrics ? 'Ocultar Detalhes Técnicos' : 'Ver Diagnóstico Técnico'}</span>
            {showMetrics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showMetrics && (
            <div 
              className="p-3 rounded-xl border text-[11px] space-y-1.5"
              style={{
                backgroundColor: theme.cardInnerBg,
                borderColor: theme.cardBorder,
                color: theme.textBody
              }}
            >
              <div className="flex justify-between">
                <span style={{ color: theme.textMuted }}>Variância Laplaciana:</span>
                <strong className="font-mono" style={{ color: theme.textTitle }}>{take.quality?.laplacianVariance || 210}</strong>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.textMuted }}>Luminância Média:</span>
                <strong className="font-mono" style={{ color: theme.textTitle }}>{take.quality?.averageLuminance || 120}/255</strong>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.textMuted }}>Perfil Vocal:</span>
                <strong className="font-mono truncate max-w-[120px]" style={{ color: theme.textTitle }}>
                  {take.audio?.timbreLabel || 'Voz Padrão'}
                </strong>
              </div>
              {take.quality?.pros && take.quality.pros.length > 0 && (
                <div className="pt-1 border-t text-emerald-500 font-medium" style={{ borderColor: theme.cardBorder }}>
                  ✓ {take.quality.pros[0]}
                </div>
              )}
            </div>
          )}

          {/* Botões Rápidos para Atribuir Cena caso não classificado */}
          {take.assignedSceneIndex === 0 && (
            <div className="p-2 rounded-xl border space-y-1" style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}>
              <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: theme.textMuted }}>
                Atribuir a uma cena:
              </span>
              <div className="flex flex-wrap gap-1">
                {scriptScenes.map((_, sIdx) => (
                  <button
                    key={sIdx + 1}
                    onClick={() => onReassignScene(sIdx + 1)}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
                  >
                    + Cena {sIdx + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Feedback Opcional da IA se consultado */}
          {take.aiFeedback && (
            <div 
              className="p-3 rounded-xl border text-[11px] space-y-1"
              style={{
                backgroundColor: isDark ? 'rgba(249, 115, 22, 0.1)' : '#fff7ed',
                borderColor: 'rgba(249, 115, 22, 0.3)',
                color: theme.textBody
              }}
            >
              <div className="flex items-center gap-1 font-bold text-orange-500">
                <Sparkles className="w-3.5 h-3.5" /> Parecer Criativo da IA:
              </div>
              <p className="italic">"{take.aiFeedback.realismVerdict}"</p>
              <p className="font-semibold text-[10px] text-amber-500 pt-0.5">
                💡 Dica: {take.aiFeedback.retentionTip}
              </p>
            </div>
          )}
        </div>

        {/* Botões de Ação do Take */}
        <div 
          className="pt-3 border-t space-y-2"
          style={{ borderColor: theme.cardBorder }}
        >
          <button
            onClick={onToggleWinner}
            className={`w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md ${
              isWinner
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/20'
                : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/15'
            }`}
          >
            <Star className={`w-4 h-4 ${isWinner ? 'fill-current text-white' : 'text-amber-200'}`} />
            <span>{isWinner ? 'Take Campeão Escolhido' : 'Definir como Melhor Take'}</span>
          </button>

          {!take.aiFeedback && (
            <button
              onClick={onRequestAIReview}
              disabled={take.analyzing}
              className="w-full py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:opacity-80"
              style={{ color: theme.textMuted }}
            >
              <Sparkles className={`w-3 h-3 ${take.analyzing ? 'animate-spin text-orange-500' : ''}`} />
              <span>{take.analyzing ? 'Consultando IA...' : 'Parecer Criativo com IA (Opcional)'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
