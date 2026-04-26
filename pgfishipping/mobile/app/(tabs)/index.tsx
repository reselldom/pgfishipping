import { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { fetchMe } from '@/src/lib/auth-api';
import { getApiErrorMessage } from '@/src/lib/api';
import { walletBalance } from '@/src/lib/mobile-api';
import { registerForPushToken } from '@/src/lib/notifications';
import { useAuthStore } from '@/src/lib/store/auth';

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [status, setStatus] = useState('Loading profile...');
  const [balUsd, setBalUsd] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const me = await fetchMe();
        setStatus(`Welcome back, ${me.firstName}.`);
      } catch (err) {
        setStatus(getApiErrorMessage(err));
      }
    })();
    void (async () => {
      try {
        const w = await walletBalance();
        setBalUsd(w.balanceUsd);
      } catch {
        // optional home card
      }
    })();
    void (async () => {
      const token = await registerForPushToken();
      if (token) setPushToken(token);
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>PGFI Shipping</Text>
        <Text style={styles.subtitle}>Customer: {user?.customerCode ?? '-'}</Text>
        {balUsd != null ? (
          <Text style={styles.balance}>Wallet: ${balUsd.toFixed(2)} USD</Text>
        ) : null}
        <Text style={styles.message}>{status}</Text>
        <Text style={styles.push}>
          Push token: {pushToken ? `${pushToken.slice(0, 28)}...` : 'not granted yet'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, gap: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  subtitle: { color: '#334155' },
  message: { color: '#0f172a' },
  balance: { color: '#166534', fontWeight: '700' },
  push: { color: '#64748b', fontSize: 12 },
});
