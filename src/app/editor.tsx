import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createScript, getScript, updateScript } from '@/storage/scripts';
import { colors, radius, spacing } from '@/theme/colors';

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();

  const existing = useMemo(() => (id ? getScript(id) : undefined), [id]);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [content, setContent] = useState(existing?.content ?? '');

  const isEditing = Boolean(existing);
  const canSave = title.trim().length > 0 || content.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    if (isEditing && existing) {
      updateScript(existing.id, { title, content });
    } else {
      createScript({ title, content });
    }
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            hitSlop={10}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{isEditing ? 'Edit script' : 'New script'}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save script"
            accessibilityState={{ disabled: !canSave }}
            hitSlop={10}
            disabled={!canSave}
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.pressed,
              !canSave && styles.saveDisabled,
            ]}
          >
            <Text style={[styles.saveLabel, !canSave && styles.saveLabelDisabled]}>Save</Text>
          </Pressable>
        </View>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Script title"
          placeholderTextColor={colors.textTertiary}
          style={styles.titleInput}
          returnKeyType="next"
          maxLength={120}
          selectionColor={colors.primary}
        />

        <View style={styles.metaRow}>
          <Ionicons name="document-text-outline" size={14} color={colors.textTertiary} />
          <Text style={styles.metaText}>{content.length.toLocaleString()} characters</Text>
        </View>

        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Write or paste your script here…"
          placeholderTextColor={colors.textTertiary}
          style={[styles.contentInput, { paddingBottom: insets.bottom + spacing.lg }]}
          multiline
          textAlignVertical="top"
          scrollEnabled
          selectionColor={colors.primary}
          autoCapitalize="sentences"
          keyboardType="default"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDisabled: {
    backgroundColor: colors.surfaceElevated,
  },
  saveLabel: {
    color: '#0A0A0C',
    fontWeight: '700',
    fontSize: 15,
  },
  saveLabelDisabled: {
    color: colors.textTertiary,
  },
  pressed: {
    opacity: 0.7,
  },
  titleInput: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    paddingVertical: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  metaText: {
    color: colors.textTertiary,
    fontSize: 13,
    fontWeight: '500',
  },
  contentInput: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    lineHeight: 26,
  },
});
