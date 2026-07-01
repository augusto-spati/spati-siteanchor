import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ViroARSceneNavigator } from '@reactvision/react-viro';
import WorldAnchorScene from '@/components/ar-scenes/WorldAnchorScene';

export default function ARHome() {
  const [started, setStarted] = useState(false);
  const [url, setUrl] = useState('');

  if (started) {
    const modelUri = url.trim() || undefined;
    return (
      <View style={styles.container}>
        <ViroARSceneNavigator
          initialScene={{ scene: WorldAnchorScene }}
          viroAppProps={{ modelUri }}
          numberOfTrackedImages={1}
          style={styles.nav}
        />
      </View>
    );
  }

  return (
    <View style={styles.home}>
      <Text style={styles.title}>Spati SiteAnchor</Text>
      <Text style={styles.subtitle}>
        Aponte a câmera para o QR do projeto para ancorar o modelo no cômodo. Deixe o campo abaixo vazio para usar o
        modelo de demonstração.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="URL do modelo .glb (opcional)"
        placeholderTextColor="#8A8F98"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        value={url}
        onChangeText={setUrl}
      />
      <Pressable style={styles.button} onPress={() => setStarted(true)}>
        <Text style={styles.buttonText}>Abrir em AR</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: { flex: 1 },
  home: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, backgroundColor: '#0B0C0E' },
  title: { fontSize: 28, fontWeight: '600', color: '#FFFFFF', marginBottom: 12 },
  subtitle: { fontSize: 15, lineHeight: 22, color: '#B4B9C2', marginBottom: 28 },
  input: {
    borderWidth: 1,
    borderColor: '#2A2E37',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
    backgroundColor: '#15171B',
    marginBottom: 16,
  },
  button: { backgroundColor: '#4C6FFF', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
