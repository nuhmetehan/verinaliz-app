import { useEffect, useState } from 'react';
import { Animated, Easing, type ViewProps } from 'react-native';

import { useReducedMotion } from '@/hooks/use-reduced-motion';

export function MotionReveal({ delay = 0, style, children, ...props }: ViewProps & { delay?: number }) {
  const reducedMotion = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reducedMotion) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1, duration: 260, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, progress, reducedMotion]);

  return <Animated.View {...props} style={[style, {
    opacity: progress,
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  }]}>{children}</Animated.View>;
}
