import { Stack } from 'expo-router';

export default function ShipmentLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
        headerTintColor: '#0f172a',
      }}
    />
  );
}
