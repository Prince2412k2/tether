import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useApp } from '@/context/AppContext';
import type { Host } from '@/lib/types';
import { useColors } from '@/hooks/useColors';

interface Props {
  host: Host;
  onPress: () => void;
}

function timeAgo(iso?: string) {
  if (!iso) return 'Never connected';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function HostCard({ host, onPress }: Props) {
  const colors = useColors();
  const { deleteHost } = useApp();

  const handleLongPress = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      host.nickname,
      `${host.username}@${host.hostname}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteHost(host.id),
        },
      ]
    );
  };

  const s = styles(colors);
  return (
    <TouchableOpacity
      style={s.card}
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <View style={s.iconWrap}>
        <Feather name="terminal" size={20} color={colors.primary} />
      </View>
      <View style={s.info}>
        <Text style={s.nickname}>{host.nickname}</Text>
        <Text style={s.sub} numberOfLines={1}>
          {host.username}@{host.hostname}
        </Text>
        <Text style={s.time}>{timeAgo(host.lastConnected)}</Text>
      </View>
      <View style={s.right}>
        <Text style={s.cmd} numberOfLines={1}>
          {host.agentCommand.split(' ')[0]}
        </Text>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

const styles = (colors: ReturnType<typeof import('@/hooks/useColors').useColors>) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 14,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: {
      flex: 1,
      gap: 2,
    },
    nickname: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
      fontFamily: 'Inter_600SemiBold',
    },
    sub: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
    },
    time: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      marginTop: 2,
    },
    right: {
      alignItems: 'flex-end',
      gap: 4,
    },
    cmd: {
      fontSize: 11,
      color: colors.primary,
      fontFamily: 'Inter_500Medium',
      backgroundColor: colors.secondary,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
  });
