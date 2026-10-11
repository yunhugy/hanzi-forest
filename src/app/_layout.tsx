import { useAudioPlayer } from 'expo-audio';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initAudioPlayer } from '@/features/speech/speak';
import { hydrateVoicePref } from '@/features/speech/voices';
import { promptUpdate } from '@/features/updates/check-update';
import { ProgressProvider } from '@/store/progress';

export default function RootLayout() {
  // 创建全局唯一 audio player，注入 speak 工具函数
  const player = useAudioPlayer();

  useEffect(() => {
    initAudioPlayer(player);
    hydrateVoicePref().catch(() => {});
    // 延迟 2.5 秒静默检测云端新版本，仅有新版本时友好提示
    const timer = setTimeout(() => {
      promptUpdate(false).catch(() => {});
    }, 2500);
    return () => clearTimeout(timer);
  }, [player]);

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
