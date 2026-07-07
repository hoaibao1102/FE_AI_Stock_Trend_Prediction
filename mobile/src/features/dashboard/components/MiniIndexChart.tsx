import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import type { DashboardIndexChartCandle } from '@/features/dashboard/types';

type MiniIndexChartProps = {
  data: DashboardIndexChartCandle[];
  isNegative?: boolean;
};

const CHART_HEIGHT = 96;
const CHART_WIDTH = 320;
const HORIZONTAL_PADDING = 10;
const VERTICAL_PADDING = 10;

export function MiniIndexChart({ data, isNegative = false }: MiniIndexChartProps) {
  const chart = useMemo(() => buildLineChart(data), [data]);

  if (!chart) {
    return <View className="h-24 w-full" />;
  }

  const strokeColor = isNegative ? '#EF4444' : '#22C55E';
  const gradientId = isNegative ? 'miniChartNegative' : 'miniChartPositive';

  return (
    <View className="h-24 w-full mt-0.5">
      <Svg height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} width="100%">
        <Defs>
          <LinearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
            <Stop offset="100%" stopColor={strokeColor} stopOpacity="0.03" />
          </LinearGradient>
        </Defs>
        <Path d={chart.areaPath} fill={`url(#${gradientId})`} />
        <Path
          d={chart.linePath}
          fill="none"
          stroke={strokeColor}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
        />
      </Svg>
    </View>
  );
}

function buildLineChart(data: DashboardIndexChartCandle[]) {
  if (data.length < 2) return null;

  const values = data.map((point) => point.close);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = Math.max(maxValue - minValue, 1);
  const usableWidth = CHART_WIDTH - HORIZONTAL_PADDING * 2;
  const usableHeight = CHART_HEIGHT - VERTICAL_PADDING * 2;

  const points = data.map((point, index) => {
    const x =
      HORIZONTAL_PADDING + (index / Math.max(data.length - 1, 1)) * usableWidth;
    const y =
      VERTICAL_PADDING + ((maxValue - point.close) / range) * usableHeight;

    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const baselineY = CHART_HEIGHT - VERTICAL_PADDING;
  const areaPath = `${linePath} L ${lastPoint.x} ${baselineY} L ${firstPoint.x} ${baselineY} Z`;

  return { areaPath, linePath };
}
