import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { getApiErrorMessage } from '@/src/lib/api';
import {
  initDeposit,
  redeemGiftCard,
  walletBalance,
} from '@/src/lib/mobile-api';
import type { WalletTransaction } from '@/src/lib/types';

const MIN_DEPOSIT = 5;

const METHODS = [
  { id: 'MONCASH' as const, label: 'MonCash' },
  { id: 'NATCASH' as const, label: 'NatCash' },
  { id: 'PAYMON' as const, label: 'PayMon' },
  { id: 'BANK_TRANSFER' as const, label: 'Bank' },
];

export default function WalletScreen() {
  const [balanceUsd, setBalanceUsd] = useState<number | null>(null);
  const [balanceHtg, setBalanceHtg] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [items, setItems] = useState<WalletTransaction[]>([]);
  const [amount, setAmount] = useState('25');
  const [method, setMethod] = useState<(typeof METHODS)[number]['id']>(
    'MONCASH',
  );
  const [giftCode, setGiftCode] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    void (async () => {
      setMessage('');
      try {
        const data = await walletBalance();
        setBalanceUsd(data.balanceUsd);
        setBalanceHtg(data.balanceHtg);
        setRate(data.exchangeRate);
        setItems(data.transactions.items);
      } catch (e) {
        setMessage(getApiErrorMessage(e));
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onDeposit(): Promise<void> {
    const n = Number(amount);
    if (!Number.isFinite(n) || n < MIN_DEPOSIT) {
      setMessage(`Minimum deposit is $${MIN_DEPOSIT} USD.`);
      return;
    }
    setMessage('');
    try {
      const res = await initDeposit(n, method);
      if (res.redirectUrl) {
        await WebBrowser.openBrowserAsync(res.redirectUrl);
        setMessage(
          'Deposit started. When the provider confirms, your balance will update. Pull to refresh on Wallet.',
        );
        load();
      }
      if (res.sandboxConfirmation) {
        const ref = (res.sandboxConfirmation.payload as { reference?: string })
          .reference;
        if (__DEV__ && ref) {
          console.log('[sandbox] confirm deposit; reference=', ref);
        }
      }
    } catch (e) {
      setMessage(getApiErrorMessage(e));
    }
  }

  async function onRedeem(): Promise<void> {
    if (!giftCode.trim()) {
      setMessage('Enter a gift card code.');
      return;
    }
    setMessage('');
    try {
      const r = await redeemGiftCard(giftCode.trim());
      setMessage(
        `Credited $${r.creditedUsd.toFixed(2)}. New balance: $${r.balanceUsd.toFixed(2)}`,
      );
      setGiftCode('');
      load();
    } catch (e) {
      setMessage(getApiErrorMessage(e));
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.balanceCard}>
          <Text style={styles.label}>Balance (USD)</Text>
          <Text style={styles.big}>${(balanceUsd ?? 0).toFixed(2)}</Text>
          <Text style={styles.small}>
            HTG {(balanceHtg ?? 0).toFixed(2)}
            {rate != null ? ` @ ${rate.toFixed(2)}` : ''}
          </Text>
        </View>

        {message ? <Text style={styles.msg}>{message}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.h2}>Deposit</Text>
          <Text style={styles.hint}>
            Min ${MIN_DEPOSIT} USD. Opens a browser for the provider.
          </Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="Amount USD"
          />
          <View style={styles.methodRow}>
            {METHODS.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => {
                  setMethod(m.id);
                }}
                style={[
                  styles.chip,
                  method === m.id && styles.chipOn,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    method === m.id && styles.chipTextOn,
                  ]}
                >
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.primary} onPress={onDeposit}>
            <Text style={styles.primaryText}>Start deposit</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.h2}>Redeem gift card</Text>
          <TextInput
            style={styles.input}
            value={giftCode}
            onChangeText={setGiftCode}
            autoCapitalize="characters"
            placeholder="Code"
          />
          <Pressable style={styles.outline} onPress={onRedeem}>
            <Text style={styles.outlineText}>Redeem</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.listHead}>
        <Text style={styles.h2}>Recent transactions</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        renderItem={({ item: t }) => (
          <View style={styles.row}>
            <View>
              <Text style={styles.tType}>{t.type}</Text>
              <Text style={styles.tDate}>
                {new Date(t.createdAt).toLocaleString()}
              </Text>
            </View>
            <Text style={styles.tAmt}>
              {t.type === 'PAYMENT' ? '-' : '+'}$
              {Math.abs(t.amount).toFixed(2)}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 16, paddingBottom: 0, gap: 12 },
  balanceCard: { backgroundColor: '#0f172a', borderRadius: 12, padding: 16 },
  label: { color: '#cbd5e1', fontSize: 12 },
  big: { color: '#fff', fontSize: 28, fontWeight: '700' },
  small: { color: '#e2e8f0' },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  h2: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  hint: { color: '#64748b', fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
  },
  chipOn: { backgroundColor: '#0f172a' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  chipTextOn: { color: '#fff' },
  primary: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '600' },
  outline: {
    borderWidth: 1,
    borderColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  outlineText: { color: '#0f172a', fontWeight: '600' },
  msg: { color: '#b45309' },
  listHead: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  row: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tType: { color: '#0f172a', fontWeight: '600' },
  tDate: { color: '#94a3b8', fontSize: 11 },
  tAmt: { fontWeight: '700', color: '#0f172a' },
});
