import { View } from 'react-native';

import { Card, Skeleton } from '@/shared/ui';

function SkeletonRow() {
  return (
    <Card className="bg-surface border-border rounded-cardxl border p-4">
      <View className="flex-row gap-2">
        <Skeleton className="w-9 h-9 rounded-sm" />
        <View className="flex-1 gap-2">
          <Skeleton className="h-[14px] w-[48%] rounded-sm" />
          <Skeleton className="h-[14px] w-[72%] rounded-sm" />
        </View>
      </View>
    </Card>
  );
}

export function ProfileSkeleton() {
  return (
    <View className="gap-4">
      <Card className="bg-surface-elevated border-border rounded-cardxl border p-4 gap-4">
        <View className="flex-row gap-4">
          <Skeleton className="w-14 h-14 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-5 w-[56%] rounded-sm" />
            <Skeleton className="h-[14px] w-[72%] rounded-sm" />
            <View className="flex-row gap-2">
              <Skeleton className="h-[22px] w-[72px] rounded-full" />
              <Skeleton className="h-[22px] w-[72px] rounded-full" />
            </View>
          </View>
        </View>
        <View className="flex-row gap-4 justify-between">
          <Skeleton className="h-[14px] w-[42%] rounded-sm" />
          <Skeleton className="h-[14px] w-[42%] rounded-sm" />
        </View>
      </Card>

      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </View>
  );
}
