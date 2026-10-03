import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/theme/colors';
import type { Script } from '@/types/script';

interface ScriptCardProps {
  script: Script;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function ScriptCardComponent({ script, onPress, onEdit, onDelete }: ScriptCardProps) {
  const preview = script.content.trim().replace(/\s+/g, ' ');
  const charCount = script.content.length;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${script.title} in teleprompter`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.title} numberOfLines={1}>
          {script.title}
        </Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${script.title}`}
            hitSlop={8}
            onPress={onEdit}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
          >
            <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete ${script.title}`}
            hitSlop={8}
            onPress={onDelete}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      <Text style={styles.preview} numberOfLines={2}>
        {preview.length > 0 ? preview : 'Empty script'}
      </Text>

      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Ionicons name="document-text-outline" size={13} color={colors.textTertiary} />
          <Text style={styles.metaText}>{charCount.toLocaleString()} chars</Text>
        </View>
        <Text style={styles.metaText}>{formatRelative(script.updatedAt)}</Text>
        <View style={styles.playHint}>
          <Ionicons name="play" size={13} color={colors.primary} />
          <Text style={styles.playHintText}>Teleprompt</Text>
        </View>
      </View>
    </Pressable>
  );
}

export const ScriptCard = memo(ScriptCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardPressed: {
    backgroundColor: colors.surfaceElevated,
    transform: [{ scale: 0.995 }],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPressed: {
    backgroundColor: colors.surfaceHighlight,
  },
  preview: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '500',
  },
  playHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  playHintText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
});
