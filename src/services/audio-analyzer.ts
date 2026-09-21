/**
 * @file audio-analyzer.ts
 * @description Analisador inteligente de áudio e voz 100% nativo no cliente (Web Audio API).
 * Detecta Frequência Fundamental (Pitch F0), Gênero Vocal, Impressão Digital de Timbre (Voiceprint)
 * e calcula Coerência Vocal entre takes sem necessidade de I.A externa ou envio de dados.
 */

export interface AudioAnalysisResult {
  hasAudio: boolean;
  isSilent: boolean;
  hasClipping: boolean;
  durationSeconds: number;
  rmsVolume: number;
  peakVolume: number;
  pitchHz: number;
  genderEstimate: 'Feminino' | 'Masculino' | 'Neutro / Indefinido';
  timbreLabel: string;
  voiceprint: number[]; // Vetor normalizado de 8 bandas espectrais
  clarityScore: number; // 0 a 100
}

export interface VoiceMatchResult {
  matchScore: number; // 0 a 100
  isMatch: boolean;
  status: 'identical' | 'similar' | 'different' | 'no_audio';
  badgeLabel: string;
  badgeColor: 'emerald' | 'amber' | 'rose' | 'gray';
  explanation: string;
}

/**
 * Decodifica o áudio de uma URL de vídeo ou Blob usando Web Audio API
 */
export async function analyzeAudioFromUrl(mediaUrl: string): Promise<AudioAnalysisResult> {
  const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtxClass) {
    return createEmptyAudioResult();
  }

  let audioCtx: AudioContext | null = null;
  try {
    audioCtx = new AudioCtxClass();

    // 1. Obter os bytes do arquivo de mídia
    const response = await fetch(mediaUrl);
    if (!response.ok) {
      throw new Error(`Falha ao carregar mídia para áudio: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();

    // 2. Decodificar buffer de áudio
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const duration = audioBuffer.duration;
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);

    if (!channelData || channelData.length === 0) {
      return createEmptyAudioResult();
    }

    // 3. Analisar Volume RMS e Picos (Detecção de silêncio e clipping)
    let sumSquares = 0;
    let peak = 0;
    let clippingCount = 0;
    const totalSamples = channelData.length;

    // Amostragem para performance (avalia até 300.000 amostras espaçadas)
    const step = Math.max(1, Math.floor(totalSamples / 300000));
    let measuredCount = 0;

    for (let i = 0; i < totalSamples; i += step) {
      const val = Math.abs(channelData[i]);
      if (val > peak) peak = val;
      if (val >= 0.98) clippingCount++;
      sumSquares += val * val;
      measuredCount++;
    }

    const rms = Math.sqrt(sumSquares / Math.max(1, measuredCount));
    const isSilent = rms < 0.006;
    const hasClipping = clippingCount > 15;

    if (isSilent) {
      return {
        hasAudio: false,
        isSilent: true,
        hasClipping: false,
        durationSeconds: duration,
        rmsVolume: 0,
        peakVolume: peak,
        pitchHz: 0,
        genderEstimate: 'Neutro / Indefinido',
        timbreLabel: 'Sem Áudio / Mudo',
        voiceprint: [0, 0, 0, 0, 0, 0, 0, 0],
        clarityScore: 0
      };
    }

    // 4. Detecção de Pitch (F0 - Frequência Fundamental) via Autocorrelação
    const pitchEstimates: number[] = [];
    const windowSize = 2048;
    const hopSize = 4096;
    const minLag = Math.floor(sampleRate / 400); // ~400 Hz limite agudo
    const maxLag = Math.floor(sampleRate / 75);  // ~75 Hz limite grave

    for (let i = 0; i + windowSize < totalSamples; i += hopSize) {
      // Calcular RMS da janela para ver se há voz ativa
      let winEnergy = 0;
      for (let j = 0; j < windowSize; j++) {
        const v = channelData[i + j];
        winEnergy += v * v;
      }
      const winRms = Math.sqrt(winEnergy / windowSize);

      // Se a janela tiver energia vocal acima do piso de ruído
      if (winRms > 0.02) {
        let bestLag = -1;
        let maxCorrelation = 0;

        for (let lag = minLag; lag <= maxLag; lag++) {
          let corr = 0;
          for (let j = 0; j < windowSize - lag; j++) {
            corr += channelData[i + j] * channelData[i + j + lag];
          }
          if (corr > maxCorrelation) {
            maxCorrelation = corr;
            bestLag = lag;
          }
        }

        if (bestLag > 0 && maxCorrelation > 0.25 * winEnergy) {
          const detectedPitch = sampleRate / bestLag;
          if (detectedPitch >= 75 && detectedPitch <= 380) {
            pitchEstimates.push(detectedPitch);
          }
        }
      }
    }

    // Calcular mediana ou média filtrada do Pitch
    let avgPitch = 0;
    if (pitchEstimates.length > 0) {
      pitchEstimates.sort((a, b) => a - b);
      const medianIdx = Math.floor(pitchEstimates.length / 2);
      avgPitch = Math.round(pitchEstimates[medianIdx]);
    }

    // 5. Estimativa de Gênero Vocal baseada na Frequência Fundamental F0
    let genderEstimate: 'Feminino' | 'Masculino' | 'Neutro / Indefinido' = 'Neutro / Indefinido';
    let timbreLabel = 'Locução Comercial';

    if (avgPitch >= 80 && avgPitch <= 165) {
      genderEstimate = 'Masculino';
      timbreLabel = avgPitch < 120 ? 'Masculina Grave' : 'Masculina Média';
    } else if (avgPitch > 165 && avgPitch <= 300) {
      genderEstimate = 'Feminino';
      timbreLabel = avgPitch > 220 ? 'Feminina Aguda' : 'Feminina Média';
    } else if (avgPitch > 0) {
      genderEstimate = 'Neutro / Indefinido';
      timbreLabel = 'Voz Neutra / Expressiva';
    }

    // 6. Impressão Digital de Timbre (Voiceprint em 8 Bandas de Frequência)
    const voiceprint = calculateSpectralVoiceprint(channelData, sampleRate);

    // 7. Score de Clareza de Áudio (0 a 100)
    let clarity = 100;
    if (isSilent) clarity = 0;
    if (hasClipping) clarity -= 25;
    if (rms < 0.02) clarity -= 15; // Áudio muito baixo
    if (rms > 0.6) clarity -= 15;  // Áudio muito alto
    if (pitchEstimates.length === 0) clarity -= 10; // Dificuldade de detectar fala contínua
    clarity = Math.max(20, Math.min(100, clarity));

    return {
      hasAudio: true,
      isSilent: false,
      hasClipping,
      durationSeconds: duration,
      rmsVolume: Number(rms.toFixed(3)),
      peakVolume: Number(peak.toFixed(3)),
      pitchHz: avgPitch,
      genderEstimate,
      timbreLabel,
      voiceprint,
      clarityScore: clarity
    };
  } catch (err) {
    console.warn('[audio-analyzer] Falha ao analisar áudio:', err);
    return createEmptyAudioResult();
  } finally {
    if (audioCtx) {
      try {
        await audioCtx.close();
      } catch (e) {}
    }
  }
}

/**
 * Calcula um vetor de energia de 8 bandas de frequência para impressão digital de timbre
 */
function calculateSpectralVoiceprint(channelData: Float32Array, sampleRate: number): number[] {
  // Bandas acústicas de interesse vocal:
  // 0: 80-160Hz   (Fundamental masculino)
  // 1: 160-320Hz  (Fundamental feminino / Harmônicos baixos)
  // 2: 320-640Hz  (Formante F1 / Corpo)
  // 3: 640-1250Hz (Formante F1-F2 / Abertura de vogais)
  // 4: 1250-2500Hz (Formante F2 / Inteligibilidade da fala)
  // 5: 2500-5000Hz (Presença vocal / F3)
  // 6: 5000-9000Hz (Brilho / Sibilância)
  // 7: 9000Hz+    (Ar / Ruído)
  const bands = [0, 0, 0, 0, 0, 0, 0, 0];
  const step = Math.max(1, Math.floor(channelData.length / 50000));
  const nyquist = sampleRate / 2;

  // Transformada aproximada por janela deslizante de energia
  for (let i = 0; i + 512 < channelData.length; i += step * 8) {
    let prev = channelData[i];
    let zeroCrossings = 0;
    let chunkEnergy = 0;

    for (let j = 0; j < 512; j++) {
      const cur = channelData[i + j];
      chunkEnergy += cur * cur;
      if ((prev >= 0 && cur < 0) || (prev < 0 && cur >= 0)) {
        zeroCrossings++;
      }
      prev = cur;
    }

    const approxFreq = (zeroCrossings * sampleRate) / (2 * 512);

    if (approxFreq < 160) bands[0] += chunkEnergy;
    else if (approxFreq < 320) bands[1] += chunkEnergy;
    else if (approxFreq < 640) bands[2] += chunkEnergy;
    else if (approxFreq < 1250) bands[3] += chunkEnergy;
    else if (approxFreq < 2500) bands[4] += chunkEnergy;
    else if (approxFreq < 5000) bands[5] += chunkEnergy;
    else if (approxFreq < 9000) bands[6] += chunkEnergy;
    else bands[7] += chunkEnergy;
  }

  // Normalizar para vetor unitário L2
  let sumSq = 0;
  for (let b = 0; b < 8; b++) {
    sumSq += bands[b] * bands[b];
  }
  const norm = Math.sqrt(sumSq) || 1;
  return bands.map(val => Number((val / norm).toFixed(4)));
}

/**
 * Compara dois perfis vocais e calcula a taxa de coerência (match)
 */
export function compareVoiceprints(
  reference: AudioAnalysisResult | null,
  target: AudioAnalysisResult | null
): VoiceMatchResult {
  if (!reference || !target) {
    return {
      matchScore: 100,
      isMatch: true,
      status: 'similar',
      badgeLabel: 'Referência Inicial',
      badgeColor: 'emerald',
      explanation: 'Este take define a voz de referência padrão.'
    };
  }

  if (!reference.hasAudio || !target.hasAudio || reference.isSilent || target.isSilent) {
    return {
      matchScore: 0,
      isMatch: false,
      status: 'no_audio',
      badgeLabel: 'Sem Áudio Detectado',
      badgeColor: 'gray',
      explanation: 'Um dos vídeos está sem faixa de áudio ou mudo.'
    };
  }

  // 1. Similaridade de Cosseno entre os vetores de timbre
  let dotProduct = 0;
  for (let i = 0; i < 8; i++) {
    dotProduct += (reference.voiceprint[i] || 0) * (target.voiceprint[i] || 0);
  }
  const spectralSim = Math.max(0, Math.min(1, dotProduct));

  // 2. Proximidade de Frequência Fundamental (Pitch F0)
  let pitchScore = 1;
  if (reference.pitchHz > 0 && target.pitchHz > 0) {
    const pitchDelta = Math.abs(reference.pitchHz - target.pitchHz);
    pitchScore = Math.max(0, 1 - (pitchDelta / 70));
  }

  // 3. Penalidade se gêneros estimados forem antagônicos
  let genderPenalty = 0;
  if (
    reference.genderEstimate !== 'Neutro / Indefinido' &&
    target.genderEstimate !== 'Neutro / Indefinido' &&
    reference.genderEstimate !== target.genderEstimate
  ) {
    genderPenalty = 35; // Penalidade alta para troca de gênero
  }

  // 4. Score consolidado de 0 a 100
  let rawScore = Math.round((spectralSim * 60 + pitchScore * 40) - genderPenalty);
  const finalScore = Math.max(10, Math.min(99, rawScore));

  if (finalScore >= 84) {
    return {
      matchScore: finalScore,
      isMatch: true,
      status: 'identical',
      badgeLabel: `🟢 ${finalScore}% Match Vocal (Mesma Voz)`,
      badgeColor: 'emerald',
      explanation: `Excelente coerência: mesmo timbre (${target.timbreLabel}) e pitch próximo (~${target.pitchHz}Hz).`
    };
  } else if (finalScore >= 68) {
    return {
      matchScore: finalScore,
      isMatch: true,
      status: 'similar',
      badgeLabel: `🟡 ${finalScore}% Match Vocal (Voz Similar)`,
      badgeColor: 'amber',
      explanation: `Timbre compatível com leve variação de energia ou cadência (${target.timbreLabel}).`
    };
  } else {
    return {
      matchScore: finalScore,
      isMatch: false,
      status: 'different',
      badgeLabel: `🔴 ${finalScore}% Divergência de Voz`,
      badgeColor: 'rose',
      explanation: `Atenção: A voz deste take (${target.timbreLabel}, ~${target.pitchHz}Hz) destoa do padrão da cena de referência.`
    };
  }
}

function createEmptyAudioResult(): AudioAnalysisResult {
  return {
    hasAudio: false,
    isSilent: true,
    hasClipping: false,
    durationSeconds: 0,
    rmsVolume: 0,
    peakVolume: 0,
    pitchHz: 0,
    genderEstimate: 'Neutro / Indefinido',
    timbreLabel: 'Indeterminado',
    voiceprint: [0, 0, 0, 0, 0, 0, 0, 0],
    clarityScore: 50
  };
}
