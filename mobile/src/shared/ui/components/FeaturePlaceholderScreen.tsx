import { ReactNode } from 'react';
import { Card, Text } from '@/shared/ui/primitives';
import { AppScreen } from '@/shared/ui/layout/AppScreen';

type FeaturePlaceholderScreenProps = {
  body: string;
  eyebrow: string;
  footer?: ReactNode;
  title: string;
};

export function FeaturePlaceholderScreen({
  body,
  eyebrow,
  footer,
  title,
}: FeaturePlaceholderScreenProps) {
  return (
    <AppScreen footer={footer}>
      <Card className="bg-surface-low border border-border rounded-cardxl min-h-[220px] p-4">
        <Text className="text-primary-500 text-[11px] font-bold uppercase tracking-[0.84px]">{eyebrow}</Text>
        <Text className="text-typography text-[24px] font-bold leading-[32px] mt-2">{title}</Text>
        <Text className="text-typography-disabled text-sm leading-[21px] mt-2 max-w-[90%]">{body}</Text>
      </Card>
    </AppScreen>
  );
}
