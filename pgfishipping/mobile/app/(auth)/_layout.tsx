import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/src/lib/store/auth';

export default function AuthLayout() {
  const token = useAuthStore((s) => s.accessToken);
  if (token) return <Redirect href="/(tabs)" />;
  return (
    <Stack>
      <Stack.Screen name="login" options={{ title: 'Login' }} />
      <Stack.Screen name="register" options={{ title: 'Register' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Forgot password' }} />
    </Stack>
  );
}

