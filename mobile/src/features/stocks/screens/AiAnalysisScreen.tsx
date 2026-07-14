import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootScreenProps } from '@/app/navigation/navigation.types';
import { SwipeBackGesture } from '@/shared/ui/components/SwipeBackGesture';
import { Text } from '@/shared/ui';
import { palette } from '@/shared/design/tokens';
import { useWatchlistStore } from '@/stores/watchlist-symbols.store';
import { useAiAnalysisStore } from '@/stores/ai-analysis.store';
import { useAiAnalysis } from '@/features/stocks/hooks/useAiAnalysis';
import {
  fetchHistory,
  fetchHistoryDetail,
  type HistoryListItem,
} from '@/features/stocks/services/ai-report.service';
import type { AiReportData } from '@/features/stocks/types';

const FAST_CONFIG = {
  provider: 'openai' as const,
  model: 'gpt-4.1-mini',
  scopeExchange: 'HOSE',
  options: {
    language: 'vi',
    riskProfile: 'medium' as const,
    timeHorizon: 'medium_term' as const,
    includeExternalResearch: false,
    capitalVnd: 100_000_000,
    riskPerTradePct: 1,
    maxPositionPct: 12,
  },
};

function fmtPrice(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString('en-US');
}
function num(obj: unknown, ...paths: string[]): number | null {
  if (!obj || typeof obj !== 'object') return null;
  const r = obj as Record<string, unknown>;
  for (const k of paths) {
    const v = r[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') { const n = Number(v.replace(/,/g, '')); if (Number.isFinite(n)) return n; }
  }
  return null;
}
function txt(obj: unknown, ...paths: string[]): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const r = obj as Record<string, unknown>;
  for (const k of paths) { const v = r[k]; if (typeof v === 'string' && v.trim()) return v.trim(); }
  return null;
}

// ─── Collapsible Section ─────────────────────────────────

function Section({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <View className="border border-border bg-surface rounded-cardxl overflow-hidden">
      <Pressable onPress={() => setOpen((o) => !o)} className="flex-row items-center justify-between px-4 py-3 active:opacity-70">
        <Text className="text-[11px] font-semibold uppercase tracking-[0.6px] text-typography-muted">{title}</Text>
        <Text className="text-typography-muted text-sm">{open ? '−' : '+'}</Text>
      </Pressable>
      {open && <View className="px-4 pb-4 gap-3">{children}</View>}
    </View>
  );
}

function MetricPill({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' | 'warning' }) {
  const color =
    tone === 'up' ? 'text-market-up' : tone === 'down' ? 'text-market-down' : tone === 'warning' ? 'text-warning' : 'text-typography';
  return (
    <View className="flex-1 min-w-[80px] border border-border bg-surface-elevated rounded-cardxl p-3 gap-1">
      <Text className="text-[10px] font-semibold uppercase tracking-[0.5px] text-typography-muted">{label}</Text>
      <Text className={`text-base font-bold leading-5 ${color}`}>{value}</Text>
    </View>
  );
}

// ─── Report sections ─────────────────────────────────────

function ReportView({ data, summary }: { data: AiReportData; summary: NonNullable<AiReportData['summary']> }) {
  const lm = summary.latest_market as Record<string, unknown> | undefined;
  const scores = summary.scores as Record<string, unknown> | undefined;

  const metrics = useMemo(() => {
    const list: { label: string; value: string; tone?: 'up' | 'down' | 'warning' }[] = [];
    const p = num(lm, 'price', 'latestPrice', 'close_price');
    if (p != null) { const pct = num(lm, 'priceChangePercent') ?? 0; list.push({ label: 'Giá', value: fmtPrice(p), tone: pct >= 0 ? 'up' : 'down' }); }
    const sc = num(scores, 'overall', 'total', 'score');
    if (sc != null) list.push({ label: 'Điểm', value: sc.toFixed(1), tone: sc >= 6 ? 'up' : sc >= 4 ? 'warning' : 'down' });
    const eps = num(lm, 'eps', 'EPS');
    if (eps != null) list.push({ label: 'EPS', value: fmtPrice(eps) });
    const pe = num(lm, 'pe', 'PE', 'P/E');
    if (pe != null) list.push({ label: 'P/E', value: pe.toFixed(1) });
    return list;
  }, [lm, scores]);

  return (
    <View className="gap-3">
      {data.generated_at && (
        <Text className="text-2xs text-typography-muted text-right">
          {new Date(data.generated_at).toLocaleString('vi-VN')}
        </Text>
      )}
      {metrics.length > 0 && <View className="flex-row flex-wrap gap-2">{metrics.map((m) => <MetricPill key={m.label} {...m} />)}</View>}

      <Section title="Tóm tắt" defaultOpen>
        {summary.system_decision && Array.isArray((summary.system_decision as Record<string, unknown>).reasons)
          ? ((summary.system_decision as Record<string, unknown>).reasons as string[]).map((r, i) => <Text key={i} className="text-sm leading-5 text-typography">{`• ${r}`}</Text>)
          : <Text className="text-sm text-typography-muted italic">Không có dữ liệu</Text>}
      </Section>

      {(summary.strengths?.length ?? 0) > 0 && (
        <Section title="Điểm mạnh">
          {summary.strengths!.map((s, i) => (
            <View key={i} className="flex-row items-start gap-2">
              <View className="w-1.5 h-1.5 rounded-full bg-market-up mt-2" />
              <Text className="text-sm leading-5 text-typography flex-1">{s}</Text>
            </View>
          ))}
        </Section>
      )}

      {(summary.weaknesses?.length ?? 0) > 0 && (
        <Section title="Rủi ro / Điểm yếu">
          {summary.weaknesses!.map((w, i) => (
            <View key={i} className="flex-row items-start gap-2">
              <View className="w-1.5 h-1.5 rounded-full bg-market-down mt-2" />
              <Text className="text-sm leading-5 text-typography flex-1">{w}</Text>
            </View>
          ))}
        </Section>
      )}

      {summary.industry_peer_context && (
        <Section title="So sánh cùng ngành">
          {((summary.industry_peer_context as Record<string, unknown>).peers as Record<string, unknown>[] | undefined)?.map((peer, i) => (
            <View key={i} className="flex-row items-center border-b border-border pb-2">
              <Text className="text-sm font-bold text-typography flex-1">{txt(peer, 'symbol', 'ticker', 'code') ?? ''}</Text>
              <View className="flex-row gap-3">
                {num(peer, 'pe', 'PE') != null && <Text className="text-xs text-typography-muted">P/E {num(peer, 'pe', 'PE')!.toFixed(1)}</Text>}
                {num(peer, 'roe', 'ROE') != null && <Text className="text-xs text-market-up">{num(peer, 'roe', 'ROE')!.toFixed(1)}%</Text>}
              </View>
            </View>
          ))}
        </Section>
      )}

      {summary.investment_plan && (
        <Section title="Kế hoạch hành động">
          {(['short_term', 'medium_term', 'watch_points', 'risk_management'] as const).map((key) => {
            const plan = summary.investment_plan as Record<string, unknown>;
            const items = plan[key] as unknown[];
            if (!Array.isArray(items) || !items.length) return null;
            const labels: Record<string, string> = { short_term: 'Ngắn hạn', medium_term: 'Trung hạn', watch_points: 'Theo dõi', risk_management: 'Quản trị rủi ro' };
            return (
              <View key={key} className="gap-1">
                <Text className="text-xs font-bold text-typography-muted uppercase tracking-[0.3px]">{labels[key]}</Text>
                {items.map((item, i) => {
                  const text = typeof item === 'string' ? item : String((item as Record<string, unknown>)?.action ?? (item as Record<string, unknown>)?.description ?? '');
                  return <Text key={i} className="text-sm leading-5 text-typography ml-3">{`• ${text}`}</Text>;
                })}
              </View>
            );
          })}
        </Section>
      )}

      {summary.report_presentation && Array.isArray((summary.report_presentation as Record<string, unknown>).scenarios) && (
        <Section title="Kịch bản">
          {((summary.report_presentation as Record<string, unknown>).scenarios as Record<string, unknown>[]).map((s, i) => {
            const title = txt(s, 'title', 'name', 'scenario') ?? `KB ${i + 1}`;
            const prob = txt(s, 'probability', 'prob');
            const desc = txt(s, 'description', 'detail', 'desc');
            const tp = num(s, 'target_price', 'targetPrice', 'target');
            const tone = i === 0 ? 'text-market-up' : i === 1 ? 'text-warning' : 'text-market-down';
            return (
              <View key={i} className="border border-border rounded-cardxl p-3 gap-1">
                <View className="flex-row items-center justify-between">
                  <Text className={`text-sm font-bold ${tone}`}>{title}</Text>
                  {prob && <Text className={`text-xs font-semibold ${tone}`}>{prob}</Text>}
                </View>
                {desc && <Text className="text-xs leading-4 text-typography-muted">{desc}</Text>}
                {tp != null && <Text className="text-xs font-semibold text-typography">Target: {fmtPrice(tp)}</Text>}
              </View>
            );
          })}
        </Section>
      )}

      {summary.disclaimer && (
        <Text className="text-2xs leading-4 text-typography-muted italic text-center px-2">{summary.disclaimer}</Text>
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────

export function AiAnalysisScreen({ navigation }: RootScreenProps<'AiAnalysis'>) {
  const insets = useSafeAreaInsets();
  const { data: reportData, isLoading, error, analyse, reset: resetHook } = useAiAnalysis(FAST_CONFIG);
  const watchlistSymbols = useWatchlistStore((s) => s.symbols);

  const store = useAiAnalysisStore();
  const [query, setQuery] = useState('');

  const filteredSymbols = useMemo(() => {
    const q = query.trim().toUpperCase();
    return q ? watchlistSymbols.filter((s) => s.includes(q)) : watchlistSymbols;
  }, [watchlistSymbols, query]);

  // Load history once
  useEffect(() => {
    if (store.history.length > 0) return; // preserve across navigations
    let mounted = true;
    store.setHistoryLoading(true);
    fetchHistory({ limit: 10 })
      .then((res) => { if (mounted) store.setHistory(res.data?.items ?? []); })
      .catch(() => {})
      .finally(() => { if (mounted) store.setHistoryLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync fresh analysis result to store
  useEffect(() => {
    if (reportData) store.setCurrentReport(reportData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportData]);

  const startAnalysis = useCallback(
    (symbol: string) => {
      store.setSelectedSymbol(symbol);
      store.setHistoryDetail(null);
      store.setHasAnalysed(true);
      void analyse(symbol);
    },
    [analyse, store],
  );

  const viewHistoryReport = useCallback(
    async (id: string) => {
      resetHook();
      store.setHasAnalysed(false);
      try {
        const res = await fetchHistoryDetail(id);
        if (res.data?.report_json?.data) {
          store.setHistoryDetail(res.data.report_json.data);
        }
      } catch { /* ignore */ }
    },
    [resetHook, store],
  );

  const goBack = useCallback(() => {
    resetHook();
    store.reset();
  }, [resetHook, store]);

  const goToPicker = useCallback(() => {
    resetHook();
    store.setHistoryDetail(null);
    store.setHasAnalysed(false);
    store.setCurrentReport(null);
    store.setSelectedSymbol(null);
  }, [resetHook, store]);

  const activeData = store.currentReport ?? store.historyDetail;
  const showReportScreen = (store.hasAnalysed && !isLoading && activeData) || store.historyDetail;

  // ── Picker ──
  if (!store.hasAnalysed && !store.historyDetail) {
    return (
      <SwipeBackGesture onGoBack={() => navigation.goBack()}>
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center justify-between px-4 mb-5">
          <View>
            <Text className="text-typography text-xl font-bold">Phân tích AI</Text>
            <Text className="text-typography-muted text-xs">Chọn mã để phân tích nhanh</Text>
          </View>
          <Pressable onPress={() => navigation.goBack()} className="w-8 h-8 items-center justify-center rounded-full bg-surface-elevated active:opacity-70">
            <Text className="text-typography text-lg font-bold">✕</Text>
          </Pressable>
        </View>

        <View className="mx-4 border border-border bg-surface rounded-lg px-3 py-2 mb-4">
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm mã cổ phiếu..."
            placeholderTextColor="#64748B"
            className="text-typography text-sm"
            autoCapitalize="characters"
          />
        </View>

        <ScrollView className="flex-1 px-4" contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
          {filteredSymbols.length === 0 ? (
            <View className="w-full items-center py-12">
              <Text className="text-typography-muted text-sm">
                {watchlistSymbols.length === 0 ? 'Danh sách theo dõi trống' : 'Không tìm thấy mã'}
              </Text>
            </View>
          ) : (
            filteredSymbols.map((sym) => (
              <Pressable key={sym} onPress={() => startAnalysis(sym)} className="rounded-lg border border-border bg-surface px-3.5 py-2 active:bg-surface-elevated">
                <Text className="text-sm font-semibold text-typography">{sym}</Text>
              </Pressable>
            ))
          )}
        </ScrollView>

        {/* History */}
        {store.history.length > 0 && (
          <View className="border-t border-border mx-4">
            <Pressable onPress={store.toggleShowHistory} className="flex-row items-center justify-between py-3 active:opacity-70">
              <Text className="text-xs font-semibold text-typography-muted uppercase tracking-[0.5px]">
                Lịch sử ({store.history.length})
              </Text>
              <Text className="text-typography-muted text-sm">{store.showHistory ? '−' : '+'}</Text>
            </Pressable>
            {store.showHistory && (
              <View className="pb-3">
                {store.historyLoading && store.history.length === 0 ? (
                  <ActivityIndicator color={palette.primary} size="small" />
                ) : (
                  store.history.map((item) => (
                    <Pressable key={item.id} onPress={() => viewHistoryReport(item.id)} className="flex-row items-center py-2.5 border-b border-border active:opacity-70">
                      <View className="flex-1 gap-0.5">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-sm font-bold text-typography">{item.symbol}</Text>
                          {item.decision_label && (
                            <Text className={`text-2xs font-semibold ${(item.decision_label === 'MUA' || item.decision_label === 'BUY') ? 'text-market-up' : (item.decision_label === 'BÁN' || item.decision_label === 'SELL') ? 'text-market-down' : 'text-warning'}`}>
                              {item.decision_label}
                            </Text>
                          )}
                        </View>
                        <Text className="text-2xs text-typography-disabled">{new Date(item.created_at).toLocaleString('vi-VN')}</Text>
                      </View>
                      {item.score != null && (
                        <Text className={`text-sm font-bold ml-2 ${item.score >= 6 ? 'text-market-up' : item.score >= 4 ? 'text-warning' : 'text-market-down'}`}>
                          {item.score.toFixed(1)}
                        </Text>
                      )}
                    </Pressable>
                  ))
                )}
              </View>
            )}
          </View>
        )}
      </View>
    </SwipeBackGesture>
    );
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <SwipeBackGesture onGoBack={goToPicker}>
      <View className="flex-1 bg-background items-center justify-center" style={{ paddingTop: insets.top + 8 }}>
        <ActivityIndicator color={palette.primary} size="large" />
        <Text className="text-typography-muted text-sm mt-4">Đang phân tích {store.selectedSymbol}...</Text>
        <Text className="text-typography-disabled text-xs mt-1">Sẽ hoàn tất trong vài giây</Text>
        <Pressable onPress={goToPicker} className="mt-6">
          <Text className="text-primary-500 text-xs font-semibold">Huỷ</Text>
        </Pressable>
      </View>
    </SwipeBackGesture>
    );
  }

  // ── Error ──
  if (error && !isLoading) {
    return (
      <SwipeBackGesture onGoBack={goToPicker}>
      <View className="flex-1 bg-background items-center justify-center px-6" style={{ paddingTop: insets.top + 8 }}>
        <Text className="text-market-down text-base font-semibold">Phân tích thất bại</Text>
        <Text className="text-typography-muted text-sm text-center mt-2">{error}</Text>
        <View className="flex-row gap-3 mt-6">
          <Pressable onPress={goToPicker} className="border border-border rounded-lg px-5 py-2.5 active:opacity-70">
            <Text className="text-typography text-sm font-semibold">Quay lại</Text>
          </Pressable>
          <Pressable onPress={() => { resetHook(); store.setHasAnalysed(false); }} className="bg-primary-500 rounded-lg px-5 py-2.5 active:opacity-80">
            <Text className="text-white text-sm font-bold">Thử lại</Text>
          </Pressable>
        </View>
      </View>
    </SwipeBackGesture>
    );
  }

  // ── Report ──
  if (showReportScreen && activeData) {
    return (
      <SwipeBackGesture onGoBack={goToPicker}>
      <View className="flex-1 bg-background">
        <View className="flex-row items-center justify-between px-4 border-b border-border" style={{ paddingTop: insets.top + 8, paddingBottom: 12 }}>
          <View className="flex-row items-center gap-3 flex-1">
            <Pressable onPress={goToPicker} className="w-8 h-8 items-center justify-center rounded-full bg-surface-elevated active:opacity-70">
              <Text className="text-typography text-lg font-bold">←</Text>
            </Pressable>
            <View className="flex-1">
              <Text className="text-typography text-lg font-bold leading-6">{activeData.symbol ?? store.selectedSymbol}</Text>
              {activeData.company && <Text className="text-typography-muted text-xs leading-4" numberOfLines={1}>{activeData.company}</Text>}
            </View>
          </View>
          {store.selectedSymbol && (
            <Pressable onPress={() => startAnalysis(store.selectedSymbol!)} className="bg-primary-500/15 rounded-lg px-3 py-1.5 active:opacity-70">
              <Text className="text-primary-500 text-xs font-bold">Làm mới</Text>
            </Pressable>
          )}
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12 }} showsVerticalScrollIndicator={false}>
          {activeData.summary ? <ReportView data={activeData} summary={activeData.summary} /> : <View className="items-center py-12"><Text className="text-typography-muted text-sm italic">Không có dữ liệu phân tích</Text></View>}
        </ScrollView>
      </View>
    </SwipeBackGesture>
    );
  }

  return <View className="flex-1 bg-background" />;
}
