import { Text } from '@/shared/ui/primitives';
import { Card } from '@/shared/ui/primitives';

type AppBannerProps = {
  body: string;
  title: string;
  tone?: 'default' | 'success' | 'warning';
};

export function AppBanner({ body, title, tone = 'default' }: AppBannerProps) {
  const colors =
    tone === 'success'
      ? { borderColor: 'rgba(34, 197, 94, 0.28)', surface: 'rgba(34, 197, 94, 0.08)', titleColor: '#22C55E' }
      : tone === 'warning'
        ? { borderColor: 'rgba(255, 183, 134, 0.32)', surface: 'rgba(255, 183, 134, 0.08)', titleColor: '#F59E0B' }
        : { borderColor: 'rgba(173, 198, 255, 0.2)', surface: 'rgba(173, 198, 255, 0.07)', titleColor: '#3B82F6' };

  return (
    <Card
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.borderColor,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 8,
      }}>
      <Text style={{ color: colors.titleColor, fontSize: 11, fontWeight: '700', letterSpacing: 0.72, textTransform: 'uppercase' }}>
        {title}
      </Text>
      <Text style={{ color: '#94A3B8', fontSize: 13, lineHeight: 19, marginTop: 4 }}>
        {body}
      </Text>
    </Card>
  );
}