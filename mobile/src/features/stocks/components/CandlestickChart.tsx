import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

import { Text } from '@/shared/ui';
import type { StockChartPoint } from '@/features/stocks/types';
import { formatMoney } from '@/features/stocks/utils/stockDetailCalculations';

type CandlestickChartProps = {
  data: StockChartPoint[];
  error: string | null;
  isLoading: boolean;
  onRetry: () => void;
};

const CHART_HEIGHT = 210;
const VOLUME_HEIGHT = 54;
const CANDLE_WIDTH = 9;
const GAP = 7;
const PADDING = 12;

export function CandlestickChart({
  data,
  error,
  isLoading,
  onRetry,
}: CandlestickChartProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const chart = useMemo(() => buildChart(data, containerWidth), [data, containerWidth]);

  return (
    <View
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
      className="border border-border bg-surface rounded-md mx-4 p-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-base font-bold leading-6 text-typography">Price Chart</Text>
        <Text className="text-[11px] font-bold leading-[14px] text-typography-muted">OHLCV</Text>
      </View>

      {isLoading ? (
        <ChartState title="Loading price history">
          <ActivityIndicator color="#3B82F6" size="small" />
        </ChartState>
      ) : error ? (
        <ChartState body={error} title="Chart unavailable">
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            className="items-center justify-center bg-primary-500 rounded-sm h-9 px-4 mt-2">
            <Text className="text-[13px] font-bold text-typography">Retry</Text>
          </Pressable>
        </ChartState>
      ) : data.length === 0 ? (
        <ChartState title="No chart data" body="No price history was returned for this range." />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Svg height={CHART_HEIGHT + VOLUME_HEIGHT} width={chart.width}>
            {chart.gridLines.map((y) => (
              <Line
                key={y}
                stroke="#334155"
                strokeOpacity={0.35}
                strokeWidth={1}
                x1={0}
                x2={chart.width}
                y1={y}
                y2={y}
              />
            ))}
            {chart.candles.map((candle) => {
              const color = candle.isUp ? '#22C55E' : '#EF4444';

              return (
                <Svg key={candle.key}>
                  <Line
                    stroke={color}
                    strokeWidth={2}
                    x1={candle.centerX}
                    x2={candle.centerX}
                    y1={candle.highY}
                    y2={candle.lowY}
                  />
                  <Rect
                    fill={color}
                    height={candle.bodyHeight}
                    rx={2}
                    width={CANDLE_WIDTH}
                    x={candle.x}
                    y={candle.bodyY}
                  />
                  <Rect
                    fill={color}
                    height={candle.volumeHeight}
                    opacity={0.45}
                    rx={2}
                    width={CANDLE_WIDTH}
                    x={candle.x}
                    y={CHART_HEIGHT + VOLUME_HEIGHT - candle.volumeHeight}
                  />
                </Svg>
              );
            })}
          </Svg>
        </ScrollView>
      )}

      {!isLoading && !error && data.length > 0 ? (
        <View className="flex-row justify-between mt-1">
          <Text className="text-[11px] leading-[14px] text-typography-muted">{formatMoney(chart.minPrice)}</Text>
          <Text className="text-[11px] leading-[14px] text-typography-muted">{formatMoney(chart.maxPrice)}</Text>
        </View>
      ) : null}
    </View>
  );
}

type ChartStateProps = {
  body?: string;
  children?: ReactNode;
  title: string;
};

function ChartState({ body, children, title }: ChartStateProps) {
  return (
    <View className="items-center justify-center gap-2 min-h-[210px]">
      {children}
      <Text className="text-sm font-bold leading-5 text-typography text-center">{title}</Text>
      {body ? <Text className="text-xs leading-[18px] text-typography-muted text-center">{body}</Text> : null}
    </View>
  );
}

function buildChart(data: StockChartPoint[], containerWidth: number) {
  const contentWidth = data.length * (CANDLE_WIDTH + GAP) + PADDING * 2;
  const width = Math.max(containerWidth, contentWidth);
  const lows = data.map((point) => point.low);
  const highs = data.map((point) => point.high);
  const volumes = data.map((point) => point.volume);
  const minPrice = lows.length > 0 ? Math.min(...lows) : 0;
  const maxPrice = highs.length > 0 ? Math.max(...highs) : 0;
  const maxVolume = volumes.length > 0 ? Math.max(...volumes) : 0;
  const priceRange = Math.max(maxPrice - minPrice, 1);
  const yForPrice = (price: number) =>
    PADDING + ((maxPrice - price) / priceRange) * (CHART_HEIGHT - PADDING * 2);

  return {
    candles: data.map((point, index) => {
      const x = PADDING + index * (CANDLE_WIDTH + GAP);
      const openY = yForPrice(point.open);
      const closeY = yForPrice(point.close);

      return {
        bodyHeight: Math.max(Math.abs(closeY - openY), 3),
        bodyY: Math.min(openY, closeY),
        centerX: x + CANDLE_WIDTH / 2,
        highY: yForPrice(point.high),
        isUp: point.close >= point.open,
        key: `${point.time}-${index}`,
        lowY: yForPrice(point.low),
        volumeHeight: maxVolume > 0 ? (point.volume / maxVolume) * (VOLUME_HEIGHT - 8) : 0,
        x,
      };
    }),
    gridLines: [42, 84, 126, 168],
    maxPrice,
    minPrice,
    width,
  };
}
