import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Modal, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppStateTracking } from '@/hooks/useAppStateTracking';
import {
    completeBreathSession,
    interruptBreathSession,
    startBreathSession,
} from '@/storage/sessionStore';

const TOTAL_SECONDS = 5 * 60;

export default function BreathScreen() {
  useKeepAwake();
  const router = useRouter();
  const [remaining, setRemaining] = useState(TOTAL_SECONDS);
  const [isFinished, setIsFinished] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  
  const hasCompletedRef = useRef(false);
  const hasInterruptedRef = useRef(false);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(remaining / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (remaining % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [remaining]);

  useEffect(() => {
    startBreathSession();
  }, []);

  useEffect(() => {
    if (isFinished) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsFinished(true);
          
          // Prevent duplicate completion calls
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true;
            completeBreathSession();
            Vibration.vibrate([0, 100, 100, 100]);
          }
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isFinished]);

  useAppStateTracking({
    onBecameBackground: () => {
      if (!isFinished && remaining > 0 && !hasInterruptedRef.current && !hasCompletedRef.current) {
        hasInterruptedRef.current = true;
        interruptBreathSession();
      }
    },
  });

  useEffect(() => {
    const onBackPress = () => {
      if (!isFinished && remaining > 0) {
        setShowExitModal(true);
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => {
      subscription.remove();
    };
  }, [isFinished, remaining]);

  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, {
          duration: 4000,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(0.9, {
          duration: 4000,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
      true,
    );
  }, [scale]);

  const circleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: 0.9,
    };
  });

  const requestExit = () => {
    if (isFinished || remaining <= 0) {
      router.push('/');
    } else {
      setShowExitModal(true);
    }
  };

  const confirmExit = () => {
    // Prevent duplicate interruption calls
    if (!hasInterruptedRef.current && !hasCompletedRef.current) {
      hasInterruptedRef.current = true;
      interruptBreathSession();
    }
    setShowExitModal(false);
    router.push('/');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Pressable
          onPress={requestExit}
          style={({ pressed }) => [styles.exitButton, pressed && { opacity: 0.7 }]}>
          <Text style={styles.exitButtonText}>Vazgeç</Text>
        </Pressable>

        <Text style={styles.title}>Şu an sadece nefes al.</Text>
        <Text style={styles.message}>
          Lütfen telefonu masaya bırak, omuzlarını gevşet ve burnundan derin bir nefes al.
        </Text>

        <View style={styles.animationContainer}>
          <Animated.View style={[styles.circle, circleStyle]} />
        </View>

        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formattedTime}</Text>
          {isFinished ? (
            <>
              <Text style={styles.timerHint}>Tebrikler. Bu 5 dakikayı kendine ayırdın.</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => router.push('/')}>
                <Text style={styles.backButtonText}>Ana menüye dön</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.timerHint}>
              Bu süre boyunca başka hiçbir şey yapmana gerek yok.
            </Text>
          )}
        </View>

        <Modal
          visible={showExitModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowExitModal(false)}>
          <View style={styles.exitBackdrop}>
            <View style={styles.exitModal}>
              <Text style={styles.exitTitle}>Gerçekten çıkmak istiyor musun?</Text>
              <Text style={styles.exitMessage}>
                Bulutlar her zaman dağılır, gökyüzü hep oradadır. Sakinleşmek için sadece birkaç
                dakikaya ihtiyacın var. Gerçekten çıkmak istiyor musun?
              </Text>
              <View style={styles.exitButtonsRow}>
                <Pressable
                  onPress={() => {
                    setShowExitModal(false);
                  }}
                  style={({ pressed }) => [
                    styles.exitStayButton,
                    pressed && { opacity: 0.85 },
                  ]}>
                  <Text style={styles.exitStayText}>Kal ve nefes al</Text>
                </Pressable>
                <Pressable
                  onPress={confirmExit}
                  style={({ pressed }) => [
                    styles.exitLeaveButton,
                    pressed && { opacity: 0.85 },
                  ]}>
                  <Text style={styles.exitLeaveText}>Evet, çık</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#e5e7eb',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  animationContainer: {
    marginTop: 8,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.45)',
  },
  timerContainer: {
    marginTop: 12,
    alignItems: 'center',
    gap: 8,
  },
  timerText: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: 4,
    color: '#f9fafb',
  },
  timerHint: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: 260,
  },
  exitButton: {
    position: 'absolute',
    top: 16,
    left: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  exitButtonText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#4b5563',
    backgroundColor: 'rgba(15,23,42,0.9)',
  },
  backButtonText: {
    fontSize: 14,
    color: '#e5e7eb',
    fontWeight: '500',
  },
  exitBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  exitModal: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: '#020617',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f2937',
    padding: 20,
    gap: 12,
  },
  exitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  exitMessage: {
    fontSize: 14,
    color: '#9ca3af',
  },
  exitButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  exitStayButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  exitStayText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  exitLeaveButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f97316',
  },
  exitLeaveText: {
    fontSize: 13,
    color: '#0b1120',
    fontWeight: '600',
  },
});

