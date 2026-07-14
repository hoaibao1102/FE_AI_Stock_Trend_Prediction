import { create } from 'zustand';

import type { AiReportData } from '@/features/stocks/types';
import type { HistoryListItem } from '@/features/stocks/services/ai-report.service';

type AiAnalysisStore = {
  history: HistoryListItem[];
  historyLoading: boolean;
  historyDetail: AiReportData | null;
  selectedSymbol: string | null;
  hasAnalysed: boolean;
  currentReport: AiReportData | null;
  showHistory: boolean;

  setHistory: (items: HistoryListItem[]) => void;
  setHistoryLoading: (loading: boolean) => void;
  setHistoryDetail: (data: AiReportData | null) => void;
  setSelectedSymbol: (symbol: string | null) => void;
  setHasAnalysed: (v: boolean) => void;
  setCurrentReport: (data: AiReportData | null) => void;
  toggleShowHistory: () => void;
  reset: () => void;
};

export const useAiAnalysisStore = create<AiAnalysisStore>((set) => ({
  history: [],
  historyLoading: false,
  historyDetail: null,
  selectedSymbol: null,
  hasAnalysed: false,
  currentReport: null,
  showHistory: false,

  setHistory: (items) => set({ history: items }),
  setHistoryLoading: (loading) => set({ historyLoading: loading }),
  setHistoryDetail: (data) => set({ historyDetail: data }),
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
  setHasAnalysed: (v) => set({ hasAnalysed: v }),
  setCurrentReport: (data) => set({ currentReport: data }),
  toggleShowHistory: () => set((s) => ({ showHistory: !s.showHistory })),
  reset: () =>
    set({
      historyDetail: null,
      selectedSymbol: null,
      hasAnalysed: false,
      currentReport: null,
    }),
}));
