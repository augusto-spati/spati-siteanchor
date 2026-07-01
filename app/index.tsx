import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ViroARSceneNavigator } from '@reactvision/react-viro';
import WorldAnchorScene from '@/components/ar-scenes/WorldAnchorScene';

export default function ARHome() {
  return (
    <View style={styles.container}>
      <ViroARSceneNavigator
        initialScene={{ scene: WorldAnchorScene }}
        numberOfTrackedImages={1}
        style={styles.nav}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: { flex: 1 },
});
