import { useState } from 'react';
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
import { estimate } from '@/src/lib/mobile-api';
import type { CalculatorResult } from '@/src/lib/types';

export default function CalculatorScreen() {
  const [serviceType, setServiceType] = useState<'AIR' | 'SEA'>('AIR');
  const [weight, setWeight] = useState('2');
  const [fob, setFob] = useState('50');
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [error, setError] = useState('');

  async function runEstimate(): Promise<void> {
    setError('');
    const w = Number(weight || 0);
    const f = Number(fob || 0);
    try {
      const out = await estimate({
        serviceType,
        weightLbs: w,
        fobValue: f,
        fobCurrency: 'USD',
      });
      setResult(out);
    } catch (e) {
      setError(getApiErrorMessage(e) || 'Could not calculate estimate.');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.card}>
        <Text style={styles.title}>Quick estimate</Text>
        <View style={styles.row}>
          {(['AIR', 'SEA'] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => {
                setServiceType(s);
              }}
              style={[styles.chip, serviceType === s && styles.chipOn]}
            >
              <Text style={[styles.chipText, serviceType === s && styles.chipTextOn]}>
                {s}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={weight}
          onChangeText={setWeight}
          placeholder="Weight (lbs)"
        />
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={fob}
          onChangeText={setFob}
          placeholder="FOB (USD, optional)"
        />
        <Pressable style={styles.button} onPress={runEstimate}>
          <Text style={styles.btnText}>Calculate</Text>
        </Pressable>
        {result ? (
          <View style={styles.out}>
            <Text style={styles.resultLine}>
              Billable: {result.billableWeightLbs} lb · {result.serviceType}
            </Text>
            {result.lines.map((l, i) => (
              <View key={`${l.feeType}-${i}`} style={styles.lineRow}>
                <Text style={styles.lineName}>{l.name}</Text>
                <Text style={styles.lineAmt}>${l.amountUsd.toFixed(2)}</Text>
              </View>
            ))}
            <Text style={styles.sub}>
              Subtotal ${result.subtotalUsd.toFixed(2)} · tax ({(result.taxRate * 100).toFixed(0)}%) ${result.taxUsd.toFixed(2)}
            </Text>
            <Text style={styles.total}>
              Total: ${result.totalUsd.toFixed(2)} / HTG {result.totalHtg.toFixed(2)}
            </Text>
            <Text style={styles.hint}>
              HTG @ {result.exchangeRate.toFixed(2)} to USD
            </Text>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  card: { padding: 16, gap: 10, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  chipOn: { backgroundColor: '#0f172a' },
  chipText: { fontWeight: '600', color: '#334155' },
  chipTextOn: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, backgroundColor: 'white' },
  button: { backgroundColor: '#0f172a', borderRadius: 8, padding: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  out: { marginTop: 4, gap: 6, backgroundColor: 'white', padding: 12, borderRadius: 10 },
  resultLine: { color: '#334155', fontSize: 13 },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between' },
  lineName: { color: '#0f172a', flex: 1, paddingRight: 8 },
  lineAmt: { fontVariant: ['tabular-nums'] },
  sub: { color: '#64748b', fontSize: 12 },
  total: { color: '#166534', fontWeight: '700', fontSize: 16 },
  hint: { color: '#94a3b8', fontSize: 12 },
  error: { color: '#dc2626' },
});
