import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

type Config = {
  onChange?: (nextState: AppStateStatus) => void;
  onBecameActive?: () => void;
  onBecameBackground?: () => void;
};

export function useAppStateTracking(config: Config) {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = appState.current;
      appState.current = nextState;

      config.onChange?.(nextState);

      const wasActive = prevState === 'active';
      const isNowBackground = nextState === 'background' || nextState === 'inactive';
      const wasBackground = prevState === 'background' || prevState === 'inactive';
      const isNowActive = nextState === 'active';

      if (wasActive && isNowBackground) {
        config.onBecameBackground?.();
      }

      if (wasBackground && isNowActive) {
        config.onBecameActive?.();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [config]);
}

