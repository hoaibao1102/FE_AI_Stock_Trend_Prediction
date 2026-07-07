import { View } from 'react-native';

import { Text } from '@/shared/ui';

export function EmptySearchState({ query }: { query: string }) {
  const hasQuery = query.trim().length > 0;

  return (
    <View className="items-center gap-2 px-6 pt-[44px]">
      <Text className="text-base font-semibold leading-6 text-typography text-center">
        {hasQuery ? 'No matching stocks found' : 'Browse trending opportunities above'}
      </Text>
      <Text className="text-sm leading-5 text-typography-muted text-center">
        {hasQuery
          ? 'Try another ticker, company name, or market keyword.'
          : 'Use the search field to jump directly into a stock detail screen.'}
      </Text>
    </View>
  );
}

export function ErrorSearchState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View className="items-center gap-2 px-6 pt-[44px]">
      <Text className="text-base font-semibold leading-6 text-typography text-center">Could not load search data</Text>
      <Text className="text-sm leading-5 text-typography-muted text-center">{message}</Text>
      <Text onPress={onRetry} className="text-sm font-semibold text-primary-500 mt-2">
        Tap to retry
      </Text>
    </View>
  );
}
