import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { forgotPassword } from '@/src/lib/auth-api';
import { getApiErrorMessage } from '@/src/lib/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  async function onSubmit(): Promise<void> {
    setMessage('');
    try {
      await forgotPassword(email);
      setMessage('If your account exists, a reset email has been sent.');
    } catch (err) {
      setMessage(getApiErrorMessage(err));
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Forgot password</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Pressable style={styles.button} onPress={onSubmit}>
          <Text style={styles.btnText}>Send reset email</Text>
        </Pressable>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', padding: 20 },
  card: { gap: 10, backgroundColor: 'white', borderRadius: 12, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10 },
  button: { backgroundColor: '#0f172a', borderRadius: 8, padding: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  message: { color: '#334155' },
});

