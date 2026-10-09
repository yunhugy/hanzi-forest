import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { hydrateVoicePref } from '@/features/speech/voices';
import { ProgressProvider } from '@/store/progress';

export default function RootLayout() {
  // 朗读语音偏好存在本地，启动时读一次 —— 之后 speak() 就能直接用
  useEffect(() => {
    hydrateVoicePref().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <ProgressProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F7F4EA' } }}>
          <Stack.Screen name="(drawer)" />
        </Stack>
      </ProgressProvider>
    </SafeAreaProvider>
  );
}
