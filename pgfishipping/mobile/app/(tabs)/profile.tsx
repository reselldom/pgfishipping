import { router } from 'expo-router';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '@/src/lib/store/auth';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.meta}>{user?.email}</Text>
        <Text style={styles.meta}>{user?.customerCode}</Text>
        <Pressable
          style={styles.button}
          onPress={() => {
            clearSession();
            router.replace('/(auth)/login');
          }}
        >
          <Text style={styles.btnText}>Logout</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, gap: 8 },
  name: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  meta: { color: '#475569' },
  button: { backgroundColor: '#0f172a', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600' },
});

