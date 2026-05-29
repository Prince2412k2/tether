import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DiffView } from '@/components/DiffView';
import type { PendingPermission } from '@/lib/types';
import { useColors } from '@/hooks/useColors';

interface Props {
  permission: PendingPermission | null;
  onAllow: () => void;
  onDeny: () => void;
}

export function PermissionPrompt({ permission, onAllow, onDeny }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const s = styles(colors);

  const visible = !!permission;

  const handleAllow = () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAllow();
  };

  const handleDeny = () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDeny();
  };

  if (!visible) return null;

  const isWrite = permission!.toolName === 'write_file';
  const hasDiff = !!permission!.diff?.length;

  return (
    <View style={[StyleSheet.absoluteFill, s.overlay]}>
      <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={s.handle} />

        <View style={s.header}>
          <View style={s.warningIcon}>
            <Feather name="shield" size={20} color={colors.warning} />
          </View>
          <View style={s.headerText}>
            <Text style={s.title}>Permission Required</Text>
            <Text style={s.subtitle}>
              {isWrite ? 'Agent wants to write a file' : 'Agent wants to run a command'}
            </Text>
          </View>
        </View>

        {permission!.filePath && (
          <View style={s.pathRow}>
            <Feather name="file" size={14} color={colors.mutedForeground} />
            <Text style={s.path} numberOfLines={1}>
              {permission!.filePath}
            </Text>
          </View>
        )}

        {permission!.command && (
          <View style={s.commandBox}>
            <Text style={s.commandText}>{permission!.command}</Text>
          </View>
        )}

        {hasDiff && (
          <ScrollView style={s.diffScroll} nestedScrollEnabled>
            <DiffView
              diff={permission!.diff!}
              filePath={permission!.filePath}
            />
          </ScrollView>
        )}

        <View style={s.actions}>
          <TouchableOpacity
            style={[s.btn, s.btnDeny]}
            onPress={handleDeny}
            activeOpacity={0.8}
          >
            <Feather name="x" size={16} color={colors.destructive} />
            <Text style={[s.btnText, s.btnTextDeny]}>Deny</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btn, s.btnAllow]}
            onPress={handleAllow}
            activeOpacity={0.8}
          >
            <Feather name="check" size={16} color={colors.primaryForeground} />
            <Text style={[s.btnText, s.btnTextAllow]}>Allow</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = (colors: ReturnType<typeof import('@/hooks/useColors').useColors>) =>
  StyleSheet.create({
    overlay: {
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
      zIndex: 100,
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomWidth: 0,
    },
    handle: {
      width: 36,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    warningIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
    },
    subtitle: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      marginTop: 2,
    },
    pathRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
      backgroundColor: colors.secondary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    path: {
      flex: 1,
      fontSize: 13,
      color: colors.foreground,
      fontFamily: 'Inter_400Regular',
    },
    commandBox: {
      backgroundColor: colors.codeBackground,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    },
    commandText: {
      fontSize: 13,
      color: colors.primary,
      fontFamily: 'Inter_400Regular',
    },
    diffScroll: {
      maxHeight: 220,
      marginBottom: 12,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    btn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: colors.radius,
    },
    btnDeny: {
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    btnAllow: {
      backgroundColor: colors.primary,
    },
    btnText: {
      fontSize: 15,
      fontWeight: '600',
      fontFamily: 'Inter_600SemiBold',
    },
    btnTextDeny: {
      color: colors.destructive,
    },
    btnTextAllow: {
      color: colors.primaryForeground,
    },
  });
