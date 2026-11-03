import { PropsWithChildren, useEffect, useState } from 'react';
import { Animated, Platform, StyleProp, View, ViewStyle } from 'react-native';

import { motion } from '@/theme/tokens';
import { useReducedMotion } from '@/theme/use-reduced-motion';

type RevealProps = PropsWithChildren<{
  delay?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>;

export function Reveal({ children, delay = 0, style, testID }: RevealProps) {
  const reducedMotion = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(14));

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }

    const animation = Animated.parallel([
      Animated.timing(opacity, {
        delay,
        duration: motion.expressive,
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(translateY, {
        delay,
        duration: motion.expressive,
        toValue: 0,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [delay, opacity, reducedMotion, translateY]);

  if (reducedMotion) {
    return (
      <View style={[style, { opacity: 1 }]} testID={testID}>
        {children}
      </View>
    );
  }

  return (
    <Animated.View
      style={[style, { opacity, transform: [{ translateY }] }]}
      testID={testID}
    >
      {children}
    </Animated.View>
  );
}
