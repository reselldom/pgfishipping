import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { uploadShipmentInvoice } from '@/src/lib/mobile-api';

export default function ShipmentInvoiceCameraScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const cameraRef = useRef<CameraView | null>(null);

  async function captureAndUpload(): Promise<void> {
    if (!cameraRef.current || !id) return;
    setBusy(true);
    setMessage('');
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      await uploadShipmentInvoice(id, photo.uri);
      setMessage('Invoice uploaded successfully.');
    } catch {
      setMessage('Failed to upload invoice.');
    } finally {
      setBusy(false);
    }
  }

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ marginBottom: 10 }}>Camera permission is required.</Text>
        <Pressable style={styles.button} onPress={() => void requestPermission()}>
          <Text style={styles.btnText}>Grant camera access</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <View style={styles.footer}>
        <Text style={styles.title}>Capture invoice</Text>
        <Pressable style={styles.button} disabled={busy} onPress={captureAndUpload}>
          <Text style={styles.btnText}>
            {busy ? 'Uploading...' : 'Capture & upload'}
          </Text>
        </Pressable>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <Pressable
          onPress={() => {
            if (id) {
              router.replace(`/shipment/${id}`);
            } else {
              router.back();
            }
          }}
        >
          <Text style={styles.back}>Back to shipment</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  footer: { padding: 16, backgroundColor: '#0f172a', gap: 8 },
  title: { color: '#fff', fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  button: { backgroundColor: '#2563eb', borderRadius: 8, padding: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  message: { color: '#cbd5e1' },
  back: { color: '#93c5fd', textAlign: 'center', marginTop: 4 },
});
