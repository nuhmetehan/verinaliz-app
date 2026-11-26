import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, elevation, radius, spacing, typography } from '@/theme/theme';

export type RenameTitleModalProps = {
  visible: boolean;
  initialTitle: string;
  onSave: (newTitle: string) => void;
  onClose: () => void;
};

export function RenameTitleModal(props: RenameTitleModalProps) {
  if (!props.visible) return null;
  return <RenameTitleModalContent key={props.initialTitle} {...props} />;
}

function RenameTitleModalContent({
  visible,
  initialTitle,
  onSave,
  onClose,
}: RenameTitleModalProps) {
  const [title, setTitle] = useState(initialTitle);


  function handleSave() {
    const trimmed = title.trim();
    if (trimmed) {
      onSave(trimmed);
      onClose();
    }
  }

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.dialogCard}>
          <Text style={styles.dialogTitle}>Ürün İsmini Değiştir</Text>
          <Text style={styles.dialogSubtitle}>
            Bu analiz kaydı için görünmesini istediğiniz ismi belirleyin.
          </Text>

          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ürün adı girin..."
            placeholderTextColor={colors.onSurfaceVariant}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
            maxLength={60}
          />

          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onClose}>
              <Text style={styles.cancelButtonText}>Vazgeç</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                !title.trim() && styles.saveButtonDisabled,
                pressed && styles.buttonPressed,
              ]}
              disabled={!title.trim()}
              onPress={handleSave}>
              <Text style={styles.saveButtonText}>Kaydet</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xxl,
    padding: spacing.cardInternal,
    gap: 14,
    ...elevation.level2Active,
  },
  dialogTitle: {
    ...typography.headlineSm,
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  dialogSubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  input: {
    ...typography.bodyMd,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.onSurface,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHigh,
  },
  cancelButtonText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.75,
  },
});
