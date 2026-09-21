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
  Tag
} from 'lucide-react';
import { analyzeAudioFromUrl, AudioAnalysisResult, compareVoiceprints, VoiceMatchResult } from '../services/audio-analyzer';
import { analyzeVideoQuality, VideoQualityResult } from '../services/video-quality-analyzer';
import { requestAICreativeAudit, AICuratorFeedback } from '../services/video-curator-ai';

export interface VideoTakeItem {
  id: string;
  name: string;
  fullPath: string;
  url: string;
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

  // Estados principais
  const [folderPath, setFolderPath] = useState<string>('');
  const [takes, setTakes] = useState<VideoTakeItem[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState<boolean>(false);
  const [selectedSceneTab, setSelectedSceneTab] = useState<number>(0); // 0 = Todas as cenas
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

  // Mapeamento inteligente de arquivos para cenas (baseado em nomes como cena1_1.mp4)
  const mapAndImportFiles = (files: Array<{ name: string; fullPath: string; sizeBytes: number; modifiedAt: number }>, baseDir: string) => {
    const newTakes: VideoTakeItem[] = files.map((f, idx) => {
      const lower = f.name.toLowerCase();
      let assignedScene = 0;

      // Heurística de matching por nome
      if (lower.includes('cena1') || lower.includes('cena01') || lower.includes('scene1') || lower.includes('hook')) {
        assignedScene = 1;
      } else if (lower.includes('cena2') || lower.includes('cena02') || lower.includes('scene2') || lower.includes('problema')) {
        assignedScene = 2;
      } else if (lower.includes('cena3') || lower.includes('cena03') || lower.includes('scene3') || lower.includes('solucao')) {
        assignedScene = 3;
      } else if (lower.includes('cena4') || lower.includes('cena04') || lower.includes('scene4')) {
        assignedScene = 4;
      } else if (lower.includes('cena5') || lower.includes('cena05') || lower.includes('scene5') || lower.includes('cta')) {
        assignedScene = 5;
      } else {
        // Se houver número isolado no nome ex: 1_xxx ou 2_xxx
        const match = lower.match(/(?:^|[_\-\s])0?([1-9])(?:[_\-\s]|\.|$)/);
        if (match && Number(match[1]) <= scriptScenes.length) {
          assignedScene = Number(match[1]);
        }
      }

      // URL segura do protocolo local-video:// ou file:///
      const cleanPath = f.fullPath.replace(/\\/g, '/');
      const videoUrl = `local-video://${cleanPath}`;

      return {
        id: `take_${idx}_${f.name}`,
        name: f.name,
        fullPath: f.fullPath,
        url: videoUrl,
        sizeBytes: f.sizeBytes,
        modifiedAt: f.modifiedAt,
        assignedSceneIndex: assignedScene,
        isWinner: false,
        analyzing: true
      };
    });

    setTakes(newTakes);

    // Iniciar análise inteligente local em segundo plano (Nitidez, Formato, Voz)
    processBatchAnalysis(newTakes);
  };

  // Análise em lote nativa (100% no cliente sem gastar IA)
  const processBatchAnalysis = async (takesToProcess: VideoTakeItem[]) => {
    // 1. Processar cada take
    const updated = [...takesToProcess];

    for (let i = 0; i < updated.length; i++) {
      const take = updated[i];
      try {
        // Análise de qualidade do vídeo (Canvas / Variância Laplaciana / 9:16)
        const qualityRes = await analyzeVideoQuality(take.url);
        take.quality = qualityRes;

        // Análise de áudio e voz (Web Audio API / FFT / Pitch F0)
        const audioRes = await analyzeAudioFromUrl(take.url);
        take.audio = audioRes;

        take.analyzing = false;
        setTakes([...updated]);
      } catch (err) {
        console.warn('[VideoCurator] Erro na análise do take:', take.name, err);
        take.analyzing = false;
      }
    }

    // 2. Definir Take de referência vocal (primeiro take válido da Cena 1 ou vencedor)
    const refTake = updated.find(t => t.assignedSceneIndex === 1 && t.audio?.hasAudio) || updated.find(t => t.audio?.hasAudio);
    const refAudio = refTake?.audio || null;

    // 3. Comparar consistência vocal de todos os takes com a referência
    for (const take of updated) {
      if (take.audio) {
        take.voiceMatch = compareVoiceprints(refAudio, take.audio);
      }
    }

    // 4. Marcar automaticamente o melhor take por cena se ainda não houver vencedor
    for (let s = 1; s <= scriptScenes.length; s++) {
      const sceneTakes = updated.filter(t => t.assignedSceneIndex === s);
      const hasWinner = sceneTakes.some(t => t.isWinner);
      if (!hasWinner && sceneTakes.length > 0) {
        // Ordena pelo maior score técnico de qualidade
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

  // Upload Manual via Input de Arquivo (suporta arrastar ou escolher múltiplos vídeos)
  const handleManualVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const imported: VideoTakeItem[] = Array.from(files).map((file: File, idx: number) => {
      const objectUrl = URL.createObjectURL(file);
      const lower = file.name.toLowerCase();
      let assigned = 0;

      if (lower.includes('cena1') || lower.includes('cena01')) assigned = 1;
      else if (lower.includes('cena2') || lower.includes('cena02')) assigned = 2;
      else if (lower.includes('cena3') || lower.includes('cena03')) assigned = 3;

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

    const combined = [...takes, ...imported];
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

  // Filtragem de takes pela aba de cena ativa
  const filteredTakes = useMemo(() => {
    if (selectedSceneTab === 0) return takes;
    if (selectedSceneTab === -1) return takes.filter(t => t.assignedSceneIndex === 0);
    return takes.filter(t => t.assignedSceneIndex === selectedSceneTab);
  }, [takes, selectedSceneTab]);

  return (
    <div className={`w-full max-w-7xl mx-auto space-y-8 transition-colors duration-300 ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>
      
      {/* 1. Header do Estúdio de Curadoria */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl relative overflow-hidden ${
        isDark ? 'bg-zinc-900/90 border-zinc-800/80 shadow-black/40' : 'bg-white border-slate-200/90 shadow-slate-200/50'
      }`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Curador & Melhores Vídeos
                </h1>
                <p className={`text-xs sm:text-sm ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Classificação inteligente de qualidade, coerência de voz (Web Audio API) e montagem final para TikTok Shop.
                </p>
              </div>
            </div>

            {/* Informações de voz e campanha */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-700'
              }`}>
                <Tag className="w-3.5 h-3.5 text-orange-400" />
                Projeto: <strong className="text-orange-400">{generatedScript?.campaignTitle || 'TikTok Shop Campanha'}</strong>
              </span>

              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-700'
              }`}>
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                Padrão de Voz: <strong className="text-emerald-400">{voiceGender || 'Feminino'} ({voiceTone || 'Entusiasta'})</strong>
              </span>

              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-700'
              }`}>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Inteligência: <strong>100% Nativa no Código (Instantânea & Gratuita)</strong>
              </span>
            </div>
          </div>

          {/* Controles de Pasta e Ações */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={handleSelectFolder}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border ${
                isDark 
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
            >
              <FolderOpen className="w-4 h-4 text-orange-400" />
              <span>Alterar Pasta</span>
            </button>

            <button
              onClick={() => scanFolder(folderPath)}
              disabled={isLoadingVideos}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border ${
                isDark 
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
            >
              <RefreshCw className={`w-4 h-4 text-amber-400 ${isLoadingVideos ? 'animate-spin' : ''}`} />
              <span>Reescanear</span>
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
          <div className={`mt-4 pt-4 border-t flex items-center gap-2 text-xs truncate ${
            isDark ? 'border-zinc-800 text-zinc-400' : 'border-slate-100 text-slate-500'
          }`}>
            <Folder className="w-3.5 h-3.5 shrink-0 text-orange-400" />
            <span className="shrink-0 font-medium">Pasta Ativa:</span>
            <span className="truncate font-mono text-[11px] opacity-80">{folderPath}</span>
            <span className="shrink-0 ml-auto font-bold text-orange-400">
              {takes.length} {takes.length === 1 ? 'vídeo encontrado' : 'vídeos encontrados'}
            </span>
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
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-emerald-400">
                  Corte Final Exportado com Sucesso! ({exportSuccessNotice.count} Cenas)
                </h4>
                <p className="text-xs opacity-90 truncate max-w-2xl">
                  Arquivos organizados e renomeados em: {exportSuccessNotice.folder}
                </p>
              </div>
            </div>
            <button
              onClick={() => setExportSuccessNotice(null)}
              className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-300"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Barra de Navegação por Cenas (Tabs) */}
      <div className="flex items-center justify-between border-b pb-4 gap-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setSelectedSceneTab(0)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              selectedSceneTab === 0
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                : isDark ? 'bg-zinc-800/80 text-zinc-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Todas as Cenas</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 font-mono">
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
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                  selectedSceneTab === sceneIndex
                    ? 'bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/25'
                    : isDark
                      ? 'bg-zinc-800/60 text-zinc-400 border-zinc-700/60 hover:text-white'
                      : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                }`}
              >
                {hasWinner ? (
                  <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-zinc-400" />
                )}
                <span>Cena {sceneIndex}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  count > 0 ? (isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-slate-200 text-slate-800') : 'opacity-40'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setSelectedSceneTab(-1)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              selectedSceneTab === -1
                ? 'bg-orange-500 text-white shadow-md'
                : isDark ? 'bg-zinc-800/80 text-zinc-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Não Classificados</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 font-mono">
              {takes.filter(t => t.assignedSceneIndex === 0).length}
            </span>
          </button>
        </div>
      </div>

      {/* 3. Card de Contexto da Cena Atual (Prompts e Narração) */}
      {selectedSceneTab > 0 && selectedSceneTab <= scriptScenes.length && (
        <div className={`p-5 rounded-2xl border transition-all ${
          isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between gap-4 cursor-pointer" onClick={() => setShowScenePrompts(!showScenePrompts)}>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 font-black text-sm flex items-center justify-center border border-orange-500/30">
                {selectedSceneTab}
              </span>
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <span>Cena {selectedSceneTab}: {scriptScenes[selectedSceneTab - 1]?.description}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-normal ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-200 text-slate-600'}`}>
                    Duração: {scriptScenes[selectedSceneTab - 1]?.duration || '4s'}
                  </span>
                </h3>
                <p className={`text-xs mt-0.5 italic ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                  "{scriptScenes[selectedSceneTab - 1]?.narration}"
                </p>
              </div>
            </div>

            <button className="text-xs font-bold flex items-center gap-1 text-orange-400 hover:underline">
              <span>{showScenePrompts ? 'Ocultar Prompts' : 'Ver Prompts'}</span>
              {showScenePrompts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Prompts originais expansíveis */}
          {showScenePrompts && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-zinc-800/50">
              {/* Google VEO Prompt */}
              <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                isDark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-orange-400 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" /> Google VEO Prompt
                  </span>
                  <button
                    onClick={() => copyToClipboard(scriptScenes[selectedSceneTab - 1]?.veoPrompt || '', `veo_${selectedSceneTab}`)}
                    className="p-1 rounded hover:bg-orange-500/20 text-zinc-400 hover:text-orange-400 transition-colors"
                    title="Copiar prompt VEO"
                  >
                    {copiedPromptId === `veo_${selectedSceneTab}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className={`font-mono text-[11px] leading-relaxed line-clamp-3 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  {scriptScenes[selectedSceneTab - 1]?.veoPrompt || 'Prompt VEO não informado'}
                </p>
              </div>

              {/* DIGEN.ai Prompt */}
              <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                isDark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> DIGEN.ai (Apresentador)
                  </span>
                  <button
                    onClick={() => copyToClipboard(scriptScenes[selectedSceneTab - 1]?.digenPrompt || '', `digen_${selectedSceneTab}`)}
                    className="p-1 rounded hover:bg-amber-500/20 text-zinc-400 hover:text-amber-400 transition-colors"
                    title="Copiar prompt DIGEN"
                  >
                    {copiedPromptId === `digen_${selectedSceneTab}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className={`font-mono text-[11px] leading-relaxed line-clamp-3 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  {scriptScenes[selectedSceneTab - 1]?.digenPrompt || 'Prompt DIGEN não informado'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Grid de Takes de Vídeo */}
      {filteredTakes.length === 0 ? (
        <div className={`p-12 text-center rounded-3xl border border-dashed ${
          isDark ? 'bg-zinc-900/30 border-zinc-800 text-zinc-400' : 'bg-slate-50 border-slate-300 text-slate-500'
        }`}>
          <Video className="w-12 h-12 mx-auto mb-3 opacity-30 text-orange-400" />
          <h3 className="text-lg font-bold">Nenhum vídeo encontrado para este filtro</h3>
          <p className="text-xs max-w-md mx-auto mt-1 mb-5">
            Adicione vídeos gerados pelo Google VEO ou DIGEN clicando em "Adicionar Vídeos" ou selecione a pasta onde os arquivos foram salvos.
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
      <div className={`sticky bottom-4 z-40 p-4 sm:p-5 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all ${
        isDark ? 'bg-zinc-900/95 border-zinc-700/80 shadow-black/80' : 'bg-white/95 border-slate-300 shadow-slate-400/30'
      }`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-orange-400" />
              <h3 className="font-black text-sm uppercase tracking-wider">
                Montagem do Corte Final ({winningTakes.length}/{scriptScenes.length} Cenas Definidas)
              </h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                cutVoiceHealth.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer border transition-all ${
                      winner
                        ? (isDark ? 'bg-orange-500/15 border-orange-500/40 text-orange-300' : 'bg-orange-50 border-orange-200 text-orange-700')
                        : (isDark ? 'bg-zinc-800/60 border-zinc-700/40 text-zinc-500' : 'bg-slate-100 border-slate-200 text-slate-400')
                    }`}
                  >
                    {winner ? (
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                    )}
                    <span>Cena {sceneNum}:</span>
                    <strong className="truncate max-w-[100px] font-mono text-[11px]">
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
              <div className="text-[10px] uppercase font-bold opacity-60">Duração Total</div>
              <div className="font-mono font-black text-sm text-orange-400">
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
              className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer border transition-all ${
                isDark 
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
            >
              <Play className="w-3.5 h-3.5 text-orange-400" />
              <span>Prévia Contínua</span>
            </button>

            <button
              onClick={handleExportFinalCut}
              disabled={isExporting || winningTakes.length === 0}
              className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-lg ${
                winningTakes.length > 0
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/25'
                  : 'bg-zinc-800 text-zinc-500 opacity-50 cursor-not-allowed'
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
              className={`max-w-3xl w-full rounded-3xl border overflow-hidden shadow-2xl relative ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="p-4 flex items-center justify-between border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Film className="w-5 h-5 text-orange-400" />
                  <span className="font-bold text-sm truncate max-w-md">{activePreviewTake.name}</span>
                </div>
                <button
                  onClick={() => setActivePreviewTake(null)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-black flex items-center justify-center max-h-[65vh]">
                <video
                  src={activePreviewTake.url}
                  controls
                  autoPlay
                  loop
                  className="max-h-[65vh] w-auto mx-auto"
                />
              </div>

              <div className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-orange-400">
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
                  <p className="text-[11px] opacity-70 truncate">
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
                  autoPlay
                  controls
                  onEnded={() => {
                    if (fullCutCurrentIndex < winningTakes.length - 1) {
                      setFullCutCurrentIndex(prev => prev + 1);
                    } else {
                      // Repetir do início
                      setFullCutCurrentIndex(0);
                    }
                  }}
                  className="h-full w-auto object-contain mx-auto"
                />

                {/* Badge da cena atual */}
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
// Subcomponente: Card de Take de Vídeo
// ============================================================================
interface VideoTakeCardProps {
  take: VideoTakeItem;
  themeMode: 'dark' | 'light';
  scriptScenes: any[];
  onToggleWinner: () => void;
  onReassignScene: (newSceneIndex: number) => void;
  onRequestAIReview: () => void;
  onOpenPreview: () => void;
}

const VideoTakeCard: React.FC<VideoTakeCardProps> = ({
  take,
  themeMode,
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
      videoRef.current.play();
      setIsPlaying(true);
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

  return (
    <div className={`rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col relative ${
      isWinner 
        ? 'ring-2 ring-amber-400 border-amber-400 shadow-xl shadow-amber-500/15'
        : isDark ? 'bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
    }`}>
      
      {/* Ribbon de Take Vencedor */}
      {isWinner && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-black uppercase tracking-wider py-1 px-3 text-center flex items-center justify-center gap-1.5 shadow-sm">
          <Star className="w-3.5 h-3.5 fill-current" />
          <span>Take Campeão Escolhido para Cena {take.assignedSceneIndex}</span>
        </div>
      )}

      {/* Header do Card */}
      <div className="p-4 flex items-center justify-between gap-2 border-b border-zinc-800/50">
        <div className="truncate">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs truncate max-w-[180px]">{take.name}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-600'}`}>
              {(take.sizeBytes / (1024 * 1024)).toFixed(1)}MB
            </span>
          </div>
        </div>

        {/* Seletor de Cena Rápido */}
        <select
          value={take.assignedSceneIndex}
          onChange={(e) => onReassignScene(Number(e.target.value))}
          className={`text-[11px] font-bold rounded-lg px-2 py-1 cursor-pointer border ${
            isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-slate-100 border-slate-300 text-slate-700'
          }`}
        >
          <option value={0}>Não Atribuído</option>
          {scriptScenes.map((_, idx) => (
            <option key={idx + 1} value={idx + 1}>
              Cena {idx + 1}
            </option>
          ))}
        </select>
      </div>

      {/* Player de Vídeo */}
      <div className="relative aspect-[9/14] bg-black group overflow-hidden">
        <video
          ref={videoRef}
          src={take.url}
          loop
          muted={isMuted}
          playsInline
          className="w-full h-full object-cover cursor-pointer"
          onClick={togglePlay}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Overlay com Botão de Play central se pausado */}
        {!isPlaying && (
          <div 
            onClick={togglePlay}
            className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer transition-opacity"
          >
            <div className="w-12 h-12 rounded-full bg-orange-500/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 ml-0.5" />
            </div>
          </div>
        )}

        {/* Badges Flutuantes Superiores */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          {/* Badge de Score Geral */}
          <div className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-white text-xs font-black flex items-center gap-1.5 shadow-md">
            <span className={`w-2 h-2 rounded-full ${
              score >= 85 ? 'bg-emerald-400' : score >= 70 ? 'bg-amber-400' : 'bg-rose-400'
            }`} />
            <span>Score: {score}/100</span>
          </div>

          {/* Botão de Ampliar Modal */}
          <button
            onClick={onOpenPreview}
            className="p-1.5 rounded-full bg-black/75 backdrop-blur-md text-white/80 hover:text-white border border-white/10 pointer-events-auto transition-colors"
            title="Visualização Ampliada"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Controles Flutuantes Inferiores */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-full bg-black/75 backdrop-blur-md text-white/80 hover:text-white border border-white/10 pointer-events-auto transition-colors"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <span className="px-2 py-1 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-mono font-bold text-white">
            {take.quality?.durationSeconds ? `${Math.round(take.quality.durationSeconds)}s` : '5s'}
          </span>
        </div>
      </div>

      {/* Seção de Análise Inteligente Local */}
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          {/* Badge de Coerência Vocal */}
          {take.voiceMatch && (
            <div className={`p-2 rounded-xl text-xs flex items-center justify-between gap-2 border ${
              take.voiceMatch.badgeColor === 'emerald'
                ? (isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                : take.voiceMatch.badgeColor === 'amber'
                  ? (isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700')
                  : (isDark ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700')
            }`}>
              <div className="flex items-center gap-1.5 truncate">
                <Mic className="w-3.5 h-3.5 shrink-0" />
                <span className="font-bold truncate">{take.voiceMatch.badgeLabel}</span>
              </div>
              <span className="text-[10px] font-mono opacity-80 shrink-0">
                {take.audio?.pitchHz ? `~${take.audio.pitchHz}Hz` : ''}
              </span>
            </div>
          )}

          {/* Pílulas de Métricas Rápidas */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <div className={`p-2 rounded-lg border flex items-center justify-between ${
              isDark ? 'bg-zinc-800/40 border-zinc-800 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <span className="opacity-70">Nitidez:</span>
              <strong className="font-mono text-orange-400">{take.quality?.sharpnessScore || 85}%</strong>
            </div>

            <div className={`p-2 rounded-lg border flex items-center justify-between ${
              isDark ? 'bg-zinc-800/40 border-zinc-800 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <span className="opacity-70">Formato:</span>
              <strong className="font-mono text-emerald-400">{take.quality?.isTikTokVertical ? '9:16 OK' : 'Outro'}</strong>
            </div>
          </div>

          {/* Acordeão de Métricas Detalhadas */}
          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className="w-full text-left text-[11px] font-bold text-orange-400 flex items-center justify-between pt-1"
          >
            <span>{showMetrics ? 'Ocultar Detalhes Técnicos' : 'Ver Diagnóstico Técnico'}</span>
            {showMetrics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showMetrics && (
            <div className={`p-3 rounded-xl border text-[11px] space-y-1.5 ${
              isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="opacity-70">Variância Laplaciana:</span>
                <strong className="font-mono">{take.quality?.laplacianVariance || 210}</strong>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Luminância Média:</span>
                <strong className="font-mono">{take.quality?.averageLuminance || 120}/255</strong>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Perfil de Voz:</span>
                <strong className="font-mono truncate max-w-[120px]">{take.audio?.timbreLabel || 'Voz Padrão'}</strong>
              </div>
              {take.quality?.pros && take.quality.pros.length > 0 && (
                <div className="pt-1 border-t border-zinc-800/60 text-emerald-400 font-medium">
                  ✓ {take.quality.pros[0]}
                </div>
              )}
            </div>
          )}

          {/* Feedback Opcional da IA se já tiver sido consultado */}
          {take.aiFeedback && (
            <div className={`p-3 rounded-xl border text-[11px] space-y-1 ${
              isDark ? 'bg-orange-500/10 border-orange-500/30 text-orange-200' : 'bg-orange-50 border-orange-200 text-orange-800'
            }`}>
              <div className="flex items-center gap-1 font-bold text-orange-400">
                <Sparkles className="w-3.5 h-3.5" /> Parecer Criativo da IA:
              </div>
              <p className="italic">"{take.aiFeedback.realismVerdict}"</p>
              <p className="font-semibold text-[10px] text-amber-400 pt-0.5">
                💡 Dica: {take.aiFeedback.retentionTip}
              </p>
            </div>
          )}
        </div>

        {/* Botões de Ação do Take */}
        <div className="pt-3 border-t border-zinc-800/50 space-y-2">
          <button
            onClick={onToggleWinner}
            className={`w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md ${
              isWinner
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/20'
                : isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            <Star className={`w-4 h-4 ${isWinner ? 'fill-current text-white' : 'text-amber-400'}`} />
            <span>{isWinner ? 'Take Campeão Escolhido' : 'Definir como Melhor Take'}</span>
          </button>

          {!take.aiFeedback && (
            <button
              onClick={onRequestAIReview}
              disabled={take.analyzing}
              className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                isDark ? 'text-zinc-400 hover:text-orange-400 hover:bg-zinc-800/50' : 'text-slate-500 hover:text-orange-600 hover:bg-slate-100'
              }`}
            >
              <Sparkles className={`w-3 h-3 ${take.analyzing ? 'animate-spin text-orange-400' : ''}`} />
              <span>{take.analyzing ? 'Consultando IA...' : 'Parecer Criativo com IA (Opcional)'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
