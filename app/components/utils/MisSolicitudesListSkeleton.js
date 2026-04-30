import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from '../feedback/Skeleton/Skeleton';

const MisSolicitudesListSkeleton = () => (
  <View style={styles.root} accessibilityElementsHidden>
    {[0, 1, 2, 3, 4].map((k) => (
      <View key={k} style={styles.card}>
        <Skeleton width="100%" height={120} borderRadius={12} />
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    justifyContent: 'flex-start',
  },
  card: {
    marginBottom: 16,
  },
});

export default MisSolicitudesListSkeleton;
