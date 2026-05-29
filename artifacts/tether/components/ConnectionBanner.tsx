import { Feather } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { ConnectionStatus } from '@/lib/types';
import { useColors } from '@/hooks/useColors';

interface Props {
  status: ConnectionStatus;
  error?: string;
}

const META: Record<
  ConnectionStatus,
  { label: string; color: string; icon?: string; spinner?: boolean } | null
> = {
  connected: null,
  disconnected: null,
  connecting: {
    label: 'Connecting via SSH...',
    color: '#F59E0B',
    spinner: true,
  },
  handshaking: {
    label: 'ACP handshake...',
    color: '#F59E0B',
    spinner: true,
  },
  reconnecting: {
    label: 'Reconnecting...',
    color: '#F59E0B',
    spinner: true,
  },
  error: {
    label: 'Connection failed',
    color: '#EF4444',
    icon: 'alert-circle',
  },
};

export function ConnectionBanner({ status, error }: Props) {
  const colors = useColors();
  const meta = META[status];

  if (!meta) return null;

  return (
    <View style={[styles.banner, { backgroundColor: meta.color + '22', borderColor: meta.color + '44' }]}>
      {meta.spinner && (
        <ActivityIndicator size="small" color={meta.color} />
      )}
      {meta.icon && (
        <Feather name={meta.icon as any} size={14} color={meta.color} />
      )}
      <Text style={[styles.text, { color: meta.color }]}>
        {error ?? meta.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  text: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
});
