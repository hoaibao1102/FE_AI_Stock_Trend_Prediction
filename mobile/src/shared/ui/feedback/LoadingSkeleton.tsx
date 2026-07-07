import { View } from 'react-native';

import { Card, Skeleton } from '@/shared/ui/primitives';

export function LoadingSkeleton() {
  return (
    <View style={{ gap: 16 }}>
      <Card style={styles.skeletonCard}>
        <Skeleton style={styles.skeletonHero} />
        <Skeleton style={styles.skeletonLineShort} />
        <Skeleton style={styles.skeletonLineLong} />
      </Card>
      <View style={styles.skeletonGrid}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} style={styles.skeletonMetric}>
            <Skeleton style={styles.skeletonMetricTitle} />
            <Skeleton style={styles.skeletonMetricValue} />
          </Card>
        ))}
      </View>
    </View>
  );
}

const styles = {
  skeletonCard: {
    backgroundColor: '#111827',
    borderColor: '#334155',
    borderRadius: 14,
    borderWidth: 1,
    gap: 16,
    padding: 16,
  } as const,
  skeletonHero: {
    borderRadius: 14,
    height: 140,
    width: '100%',
  } as const,
  skeletonLineShort: {
    borderRadius: 4,
    height: 14,
    width: '34%',
  } as const,
  skeletonLineLong: {
    borderRadius: 4,
    height: 12,
    width: '78%',
  } as const,
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  } as const,
  skeletonMetric: {
    backgroundColor: '#111827',
    borderColor: '#334155',
    borderRadius: 14,
    borderWidth: 1,
    flexBasis: '47%',
    gap: 8,
    padding: 16,
  } as const,
  skeletonMetricTitle: {
    borderRadius: 4,
    height: 11,
    width: '48%',
  } as const,
  skeletonMetricValue: {
    borderRadius: 4,
    height: 22,
    width: '62%',
  } as const,
};