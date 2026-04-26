import { Link, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getApiErrorMessage } from '@/src/lib/api';
import { getShipment, payShipment } from '@/src/lib/mobile-api';
import type { ShipmentDetail } from '@/src/lib/types';

export default function ShipmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ShipmentDetail | null>(null);
  const [error, setError] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMsg, setPayMsg] = useState('');

  const load = useCallback(() => {
    if (!id) return;
    void (async () => {
      setError('');
      try {
        setData(await getShipment(id));
      } catch (e) {
        setError(getApiErrorMessage(e));
      }
    })();
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onPayFromWallet(): Promise<void> {
    if (!id) return;
    const n = Number(payAmount);
    if (!Number.isFinite(n) || n <= 0) {
      setPayMsg('Enter a valid USD amount.');
      return;
    }
    setPayMsg('');
    try {
      const r = await payShipment(id, n);
      setPayMsg(`Paid. New balance: $${r.balanceUsd.toFixed(2)}`);
      setPayAmount('');
      load();
    } catch (e) {
      setPayMsg(getApiErrorMessage(e));
    }
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.error}>{error}</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading…</Text>
      </SafeAreaView>
    );
  }

  const canPay = !data.paidAt;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.card}>
        <Text style={styles.code}>{data.trackingCode}</Text>
        <Text style={styles.meta}>
          {data.status} · {data.serviceType}
        </Text>
        {data.externalTracking ? (
          <Text style={styles.meta}>Carrier: {data.externalTracking}</Text>
        ) : null}
        <Text style={styles.body}>{data.contentsDescription || '—'}</Text>
        <Text style={styles.meta}>
          Total:{' '}
          {data.totalCost != null
            ? `$${data.totalCost.toFixed(2)}`
            : 'Pending'}
        </Text>
        <Text style={styles.meta}>
          {data.paidAt ? `Paid at ${data.paidAt}` : 'Not paid'}
        </Text>
      </View>

      {canPay ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Pay from wallet</Text>
          <Text style={styles.hint}>
            Enter amount in USD (up to the shipment total if known).
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Amount USD"
            keyboardType="decimal-pad"
            value={payAmount}
            onChangeText={setPayAmount}
          />
          <Pressable
            style={styles.outline}
            onPress={() => {
              if (data.totalCost != null) {
                setPayAmount(String(data.totalCost));
              }
            }}
          >
            <Text style={styles.outlineText}>Use full total</Text>
          </Pressable>
          <Pressable style={styles.primary} onPress={onPayFromWallet}>
            <Text style={styles.primaryText}>Pay from wallet</Text>
          </Pressable>
          {payMsg ? <Text style={styles.msg}>{payMsg}</Text> : null}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tracking</Text>
        {(data.trackingEvents ?? []).length === 0 ? (
          <Text style={styles.hint}>No events yet.</Text>
        ) : (
          (data.trackingEvents ?? []).map((ev) => (
            <View key={ev.id} style={styles.event}>
              <Text style={styles.eventLabel}>{ev.label || ev.status}</Text>
              <Text style={styles.hint}>
                {ev.timestamp} {ev.location ? `· ${ev.location}` : ''}
              </Text>
            </View>
          ))
        )}
      </View>

      <Link
        href={{ pathname: '/shipment/[id]/camera', params: { id: id! } }}
        asChild
      >
        <Pressable style={styles.primary}>
          <Text style={styles.primaryText}>Upload invoice (camera)</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  scroll: { padding: 16, paddingBottom: 32, gap: 14, backgroundColor: '#f8fafc' },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  code: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  meta: { color: '#475569', fontSize: 13 },
  body: { color: '#0f172a', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  hint: { color: '#64748b', fontSize: 12 },
  event: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  eventLabel: { color: '#0f172a', fontWeight: '600' },
  primary: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '600' },
  outline: {
    borderWidth: 1,
    borderColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  outlineText: { color: '#0f172a', fontWeight: '600' },
  error: { color: '#dc2626' },
  link: { color: '#2563eb', marginTop: 8 },
  msg: { color: '#166534' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});
