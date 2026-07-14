import { useCallback, useRef, useState } from 'react';

import { analyseOneStock } from '@/features/stocks/services/ai-report.service';
import type { AiReportData, AnalyseOneResponse } from '@/features/stocks/types';

export type AnalyseConfig = {
  provider: 'openai' | 'gemini';
  model: string;
  scopeExchange: string;
  options: {
    language: string;
    riskProfile: 'low' | 'medium' | 'high';
    timeHorizon: 'short_term' | 'medium_term' | 'long_term';
    includeExternalResearch: boolean;
    capitalVnd: number;
    riskPerTradePct: number;
    maxPositionPct: number;
  };
};

export function useAiAnalysis(config?: AnalyseConfig) {
  const [data, setData] = useState<AiReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const analyse = useCallback(
    async (symbol: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);
      setData(null);

      try {
        const payload = {
          provider: config?.provider ?? 'openai',
          model: config?.model ?? 'gpt-4.1-mini',
          symbol,
          scopeExchange: config?.scopeExchange ?? 'HOSE',
          options: config?.options ?? {
            language: 'vi',
            riskProfile: 'medium' as const,
            timeHorizon: 'medium_term' as const,
            includeExternalResearch: false,
            capitalVnd: 100_000_000,
            riskPerTradePct: 1,
            maxPositionPct: 12,
          },
        };

        const result: AnalyseOneResponse = await analyseOneStock(payload, controller.signal);
        setData(result.data ?? null);
        if (!result.data) setError('Không nhận được dữ liệu phân tích.');
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Không thể phân tích.');
      } finally {
        setIsLoading(false);
      }
    },
    [config],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { data, isLoading, error, analyse, reset };
}
