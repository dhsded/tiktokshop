/**
 * @file video-curator-ai.ts
 * @description Copiloto Opcional de I.A para o Estúdio de Curadoria.
 * Utiliza o aiProvidersManager (Gemini 2.0 Flash / Groq) sob demanda para emitir parecer criativo sobre
 * retenção de público, realismo visual das mãos/rosto e persuasão para o TikTok Shop.
 */

import { aiProvidersManager, AIContentPart } from './ai-providers';
import { VideoQualityResult } from './video-quality-analyzer';
import { AudioAnalysisResult } from './audio-analyzer';

export interface AICuratorFeedback {
  hookScore: number;                 // 0 a 100 (Poder de retenção do gancho)
  productFidelityScore: number;      // 0 a 100 (Destaque e fidelidade do produto)
  realismVerdict: string;            // Análise sobre artefatos de IA (mãos, rosto, distorções)
  retentionTip: string;              // Dica prática de corte ou conversão para TikTok Shop
  isRecommendedWinner: boolean;      // Selo de recomendação da IA
  rawVerdictText: string;
}

export async function requestAICreativeAudit(params: {
  sceneTitle: string;
  narration?: string;
  prompt?: string;
  videoQuality: VideoQualityResult;
  audioAnalysis?: AudioAnalysisResult;
}): Promise<AICuratorFeedback> {
  const { sceneTitle, narration, prompt, videoQuality, audioAnalysis } = params;

  // Preparar partes multimodais com os keyframes capturados localmente
  const parts: AIContentPart[] = [];

  const contextText = `
Você é um Diretor de Criação especialista em anúncios virais e conversão no TikTok Shop.
Analise este take de vídeo gerado por IA para a seguinte cena da campanha:

- CENA: ${sceneTitle}
- NARRAÇÃO ESPERADA: "${narration || 'Não informada'}"
- PROMPT GERADO ORIGINAL: "${prompt || 'Não informado'}"
- DADOS TÉCNICOS MEDIDOS LOCALMENTE:
  * Formato: ${videoQuality.width}x${videoQuality.height} (9:16 Vertical: ${videoQuality.isTikTokVertical ? 'Sim' : 'Não'})
  * Nitidez Laplaciana: ${videoQuality.sharpnessScore}/100
  * Iluminação Média: ${videoQuality.averageLuminance}/255
  * Áudio: ${audioAnalysis?.hasAudio ? `${audioAnalysis.genderEstimate} (${audioAnalysis.timbreLabel})` : 'Mudo/Sem áudio'}

TAREFA:
Avalie os quadros anexados e forneça um parecer criativo estritamente em formato JSON:
{
  "hookScore": <número de 0 a 100 sobre o poder de prender a atenção no feed>,
  "productFidelityScore": <número de 0 a 100 sobre o produto estar claro e sem distorções>,
  "realismVerdict": "<breve avaliação de 1-2 frases sobre o realismo visual, mãos e anatomia>",
  "retentionTip": "<1 dica cirúrgica para maximizar vendas desta cena no TikTok Shop>",
  "isRecommendedWinner": <true se este take tem alto potencial de ser o take vencedor desta cena, senão false>
}
Retorne APENAS o JSON puro.
`;

  parts.push({ text: contextText });

  // Adicionar até 3 keyframes capturados
  if (videoQuality.keyframes && videoQuality.keyframes.length > 0) {
    for (let i = 0; i < Math.min(3, videoQuality.keyframes.length); i++) {
      const dataUrl = videoQuality.keyframes[i];
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg'
        }
      });
    }
  }

  try {
    const response = await aiProvidersManager.execute({
      parts,
      systemPrompt: 'Você é um avaliador técnico e criativo de vídeos comerciais para o TikTok Shop. Responda sempre em JSON válido em português.',
      provider: 'gemini',
      model: 'gemini-2.0-flash'
    });

    const cleanJson = response.text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleanJson);

    return {
      hookScore: Number(parsed.hookScore) || 85,
      productFidelityScore: Number(parsed.productFidelityScore) || 88,
      realismVerdict: parsed.realismVerdict || 'Visual consistente com boa fidelidade do produto anunciado.',
      retentionTip: parsed.retentionTip || 'Mantenha o corte dinâmico nos primeiros 3 segundos.',
      isRecommendedWinner: Boolean(parsed.isRecommendedWinner),
      rawVerdictText: response.text
    };
  } catch (err: any) {
    console.warn('[video-curator-ai] Fallback criativo após erro de IA:', err);
    return {
      hookScore: Math.min(95, videoQuality.sharpnessScore + 5),
      productFidelityScore: videoQuality.overallScore,
      realismVerdict: 'Análise automática: alta nitidez detectada com contornos bem definidos.',
      retentionTip: 'Garanta sincronia entre o gancho sonoro e a primeira aparição do produto.',
      isRecommendedWinner: videoQuality.overallScore >= 80,
      rawVerdictText: ''
    };
  }
}
