import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  listShipments,
  type ShipmentTab,
} from '@/src/lib/mobile-api';
import type { Shipment } from '@/src/lib/types';

const TABS: { key: ShipmentTab; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PRE_ALERTS', label: 'Pre-alerts' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'DELIVERED', label: 'Done' },
];

export default function ShipmentsScreen() {
  const [tab, setTab] = useState<ShipmentTab>('ALL');
  const [items, setItems] = useState<Shipment[]>([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    void (async () => {
      setError('');
      try {
        setItems(await listShipments(tab));
      } catch {
        setError('Failed to load shipments.');
      }
    })();
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function onRefresh(): Promise<void> {
    setRefreshing(true);
    try {
      setError('');
      setItems(await listShipments(tab));
    } catch {
      setError('Failed to load shipments.');
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => {
              setTab(t.key);
            }}
            style={[styles.tab, tab === t.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ gap: 10, padding: 16, paddingTop: 0 }}
        ListEmptyComponent={
          <Text style={styles.empty}>No shipments in this view.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.code}>{item.trackingCode}</Text>
            <Text style={styles.meta}>
              {item.status} · {item.serviceType}
            </Text>
            <Text style={styles.meta} numberOfLines={2}>
              {item.contentsDescription || 'No description'}
            </Text>
            <Link href={`/shipment/${item.id}`} asChild>
              <Pressable style={styles.button}>
                <Text style={styles.btnText}>Open</Text>
              </Pressable>
            </Link>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
  },
  tabActive: { backgroundColor: '#0f172a' },
  tabText: { color: '#334155', fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  error: { color: '#dc2626', marginHorizontal: 16, marginTop: 4 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 24 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, gap: 4 },
  code: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  meta: { color: '#475569', fontSize: 13 },
  button: {
    marginTop: 8,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
});
