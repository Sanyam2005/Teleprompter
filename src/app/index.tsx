import { router } from 'expo-router';
import { useCallback } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { EmptyState } from '@/components/EmptyState';
import { ScriptCard } from '@/components/ScriptCard';
import { deleteScript, useScripts } from '@/storage/scripts';
import { colors, spacing } from '@/theme/colors';
import type { Script } from '@/types/script';

export default function DashboardScreen() {
  const scripts = useScripts();
  const insets = useSafeAreaInsets();

  const confirmDelete = useCallback((script: Script) => {
    Alert.alert(
      'Delete script',
      `Delete “${script.title}”? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteScript(script.id) },
      ],
    );
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>TELEPROMPTER</Text>
          <Text style={styles.title}>Scripts</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New script"
          onPress={() => router.push('/editor')}
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
        >
          <Ionicons name="add" size={28} color="#0A0A0C" />
        </Pressable>
      </View>

      <FlatList
        data={scripts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ScriptCard
            script={item}
            onPress={() => router.push({ pathname: '/teleprompter', params: { id: item.id } })}
            onEdit={() => router.push({ pathname: '/editor', params: { id: item.id } })}
            onDelete={() => confirmDelete(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing.xxl },
          scripts.length === 0 && styles.listEmpty,
        ]}
        ListEmptyComponent={<EmptyState onCreate={() => router.push('/editor')} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerText: {
    gap: 2,
  },
  kicker: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  addButtonPressed: {
    backgroundColor: colors.primaryPressed,
    transform: [{ scale: 0.95 }],
  },
  listContent: {
    paddingHorizontal: spacing.lg,
  },
  listEmpty: {
    flexGrow: 1,
  },
});
