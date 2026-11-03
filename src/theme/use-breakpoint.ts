import { useEffect, useState } from 'react';
import { Dimensions, Platform, type ScaledSize } from 'react-native';

import { breakpoints } from './tokens';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function breakpointForWidth(width: number): Breakpoint {
  if (width >= breakpoints.desktopMin) {
    return 'desktop';
  }

  if (width >= breakpoints.tabletMin) {
    return 'tablet';
  }

  return 'mobile';
}

export function initialBreakpointForPlatform(
  platform: string,
  width: number,
): Breakpoint {
  return platform === 'web' ? 'mobile' : breakpointForWidth(width);
}

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() =>
    initialBreakpointForPlatform(Platform.OS, Dimensions.get('window').width),
  );

  useEffect(() => {
    const hydrationTimer = setTimeout(() => {
      setBreakpoint(breakpointForWidth(Dimensions.get('window').width));
    }, 0);

    const subscription = Dimensions.addEventListener(
      'change',
      ({ window }: { window: ScaledSize }) => {
        setBreakpoint(breakpointForWidth(window.width));
      },
    );

    return () => {
      clearTimeout(hydrationTimer);
      subscription.remove();
    };
  }, []);

  return breakpoint;
}
