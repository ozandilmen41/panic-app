import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();

  const handlePress = () => {
    Vibration.vibrate(50);
    router.push('/breath');
  };

  const handleProgressPress = () => {
    router.push('/history');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#0f172a', '#020617']} style={styles.gradient}>
        <View style={styles.container}>
          <Text style={styles.title}>Sakinleşmek için buradasın.</Text>
          <Text style={styles.subtitle}>Şu an güvendesin, yalnız değilsin.</Text>

          <Pressable
            onPress={handlePress}
            style={({ pressed }) => [
              styles.panicButtonWrapper,
              pressed && styles.panicButtonWrapperPressed,
            ]}>
            <LinearGradient
              colors={['#22c55e', '#16a34a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.panicButton}>
              <Text style={styles.buttonText}>PANIC</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={handleProgressPress}
            style={({ pressed }) => [
              styles.progressButton,
              pressed && styles.progressButtonPressed,
            ]}>
            <Text style={styles.progressText}>İlerlemem</Text>
          </Pressable>

          <Text style={styles.helperText}>Sadece 5 dakikalığına telefonu bırakmayı dene.</Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#e5e7eb',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  panicButtonWrapper: {
    marginTop: 8,
    borderRadius: 32,
    shadowColor: '#22c55e',
    shadowOpacity: 0.7,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 32,
    elevation: 14,
  },
  panicButtonWrapperPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  panicButton: {
    paddingVertical: 22,
    paddingHorizontal: 64,
    borderRadius: 32,
    minWidth: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 24,
    letterSpacing: 4,
    color: '#022c22',
    fontWeight: '700',
  },
  progressButton: {
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(15,118,110,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressButtonPressed: {
    opacity: 0.85,
  },
  progressText: {
    fontSize: 16,
    color: '#bbf7d0',
    fontWeight: '500',
  },
  helperText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: 280,
  },
});

