import { View } from 'react-native';

type TrendMarkProps = {
  size: number;
};

export function TrendMark({ size }: TrendMarkProps) {
  const strokeWidth = Math.max(1.35, size * 0.016);
  const dotSize = Math.max(size * 0.08, 5);
  const sparkleSize = size * 0.18;
  const smallSparkleSize = size * 0.12;

  return (
    <View style={{ height: size, width: size, position: 'relative' }}>
      <View
        style={{
          backgroundColor: 'rgba(173, 198, 255, 0.26)',
          bottom: '21%',
          height: strokeWidth,
          left: '16%',
          right: '12%',
          position: 'absolute',
        }}
      />
      <View
        style={{
          backgroundColor: 'rgba(173, 198, 255, 0.26)',
          bottom: '21%',
          left: '16%',
          position: 'absolute',
          top: '21%',
          width: strokeWidth,
        }}
      />
      <View
        style={{
          backgroundColor: '#3B82F6',
          borderRadius: 999,
          bottom: '37%',
          height: strokeWidth * 1.15,
          left: '23%',
          position: 'absolute',
          transform: [{ rotate: '-24deg' }],
          width: '30%',
        }}
      />
      <View
        style={{
          backgroundColor: '#3B82F6',
          borderRadius: 999,
          bottom: '46%',
          height: strokeWidth * 1.15,
          left: '47%',
          position: 'absolute',
          transform: [{ rotate: '-43deg' }],
          width: '34%',
        }}
      />
      <View
        style={{
          backgroundColor: '#3B82F6',
          borderRadius: 999,
          height: dotSize,
          position: 'absolute',
          width: dotSize,
          bottom: '31%',
          left: '20%',
        }}
      />
      <View
        style={{
          backgroundColor: '#3B82F6',
          borderRadius: 999,
          height: dotSize,
          position: 'absolute',
          width: dotSize,
          bottom: '44%',
          left: '46%',
        }}
      />
      <View
        style={{
          backgroundColor: '#3B82F6',
          borderRadius: 999,
          height: dotSize,
          position: 'absolute',
          width: dotSize,
          bottom: '66%',
          left: '72%',
        }}
      />
      <View
        style={{
          height: sparkleSize,
          position: 'absolute',
          width: sparkleSize,
          right: '17%',
          top: '13%',
        }}>
        <View
          style={{
            backgroundColor: '#3B82F6',
            borderRadius: 999,
            bottom: 0,
            left: '46%',
            position: 'absolute',
            top: 0,
            width: strokeWidth,
          }}
        />
        <View
          style={{
            backgroundColor: '#3B82F6',
            borderRadius: 999,
            height: strokeWidth,
            left: 0,
            position: 'absolute',
            right: 0,
            top: '46%',
          }}
        />
      </View>
      <View
        style={{
          height: smallSparkleSize,
          opacity: 0.72,
          position: 'absolute',
          width: smallSparkleSize,
          left: '25%',
          top: '20%',
        }}>
        <View
          style={{
            backgroundColor: '#3B82F6',
            borderRadius: 999,
            bottom: 0,
            left: '46%',
            position: 'absolute',
            top: 0,
            width: strokeWidth,
          }}
        />
        <View
          style={{
            backgroundColor: '#3B82F6',
            borderRadius: 999,
            height: strokeWidth,
            left: 0,
            position: 'absolute',
            right: 0,
            top: '46%',
          }}
        />
      </View>
    </View>
  );
}
