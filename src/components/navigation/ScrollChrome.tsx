import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  ScrollView,
  type ScrollViewInstance,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from 'react-native';

type ScrollChrome = {
  headerHidden: boolean;
  reportScroll(offsetY: number, contentHeight?: number, viewportHeight?: number): void;
  showHeader(): void;
};

// Outside the store layout (tests, admin) scrolling simply never hides anything.
const ScrollChromeContext = createContext<ScrollChrome>({
  headerHidden: false,
  reportScroll: () => undefined,
  showHeader: () => undefined,
});

const TOP_ZONE = 64;
const DIRECTION_THRESHOLD = 8;
const BOTTOM_ZONE = 200;

// Tracks the page scroll direction: scrolling down hides the store header,
// scrolling up (or reaching the top) brings it back.
export function ScrollChromeProvider({ children }: PropsWithChildren) {
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastOffset = useRef(0);

  const reportScroll = useCallback((offsetY: number, contentHeight = 0, viewportHeight = 0) => {
    const delta = offsetY - lastOffset.current;
    lastOffset.current = offsetY;
    // Hiding the header grows the viewport, which pulls the offset back near the
    // end of a page; that clamp is not the shopper scrolling up.
    const nearEnd = contentHeight > 0 && offsetY + viewportHeight >= contentHeight - BOTTOM_ZONE;
    if (offsetY <= TOP_ZONE) setHeaderHidden(false);
    else if (delta > DIRECTION_THRESHOLD) setHeaderHidden(true);
    else if (delta < -DIRECTION_THRESHOLD && !nearEnd) setHeaderHidden(false);
  }, []);

  const showHeader = useCallback(() => {
    lastOffset.current = 0;
    setHeaderHidden(false);
  }, []);

  const value = useMemo(() => ({ headerHidden, reportScroll, showHeader }), [headerHidden, reportScroll, showHeader]);
  return <ScrollChromeContext.Provider value={value}>{children}</ScrollChromeContext.Provider>;
}

export function useScrollChrome() {
  return useContext(ScrollChromeContext);
}

// Drop-in ScrollView for store pages: reports its offset so the header can auto-hide.
export const ChromeScrollView = forwardRef<ScrollViewInstance, ScrollViewProps>(function ChromeScrollView(
  { onScroll, scrollEventThrottle, ...props },
  ref,
) {
  const { reportScroll } = useScrollChrome();
  return (
    <ScrollView
      {...props}
      onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        reportScroll(contentOffset.y, contentSize.height, layoutMeasurement.height);
        onScroll?.(event);
      }}
      ref={ref}
      scrollEventThrottle={scrollEventThrottle ?? 16}
    />
  );
});
