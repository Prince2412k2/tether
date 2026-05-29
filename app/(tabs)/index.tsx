import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HostCard } from '@/components/HostCard';
import { useApp } from '@/context/AppContext';
import type { Host, Session } from '@/lib/types';
import { useColors } from '@/hooks/useColors';

const makeId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { hosts, sessions, upsertSession, updateHost } = useApp();
  const [connecting, setConnecting] = useState<string | null>(null);

  const s = styles(colors);

  const handleConnect = async (host: Host) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConnecting(host.id);

    await new Promise((r) => setTimeout(r, 1500));

    const sessionId = makeId();
    const now = new Date().toISOString();
    const session: Session = {
      id: sessionId,
      hostId: host.id,
      hostNickname: host.nickname,
      createdAt: now,
      messages: [
        {
          id: makeId(),
          role: 'system',
          content: `Connected to ${host.nickname} · ${host.agentCommand}`,
          timestamp: now,
        },
      ],
    };
    await upsertSession(session);
    await updateHost(host.id, { lastConnected: now });
    setConnecting(null);
    router.push({ pathname: '/session', params: { id: sessionId } });
  };

  const recentSessions = sessions
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const topPad =
    Platform.OS === 'web'
      ? insets.top + 67
      : insets.top + 16;

  return (
    <View style={[s.root, { paddingTop: topPad }]}>
      <View style={s.titleRow}>
        <View>
          <Text style={s.brand}>Tether</Text>
          <Text style={s.tagline}>Your dev box in your pocket</Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => router.push('/add-host')}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={20} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: insets.bottom + 40 + (Platform.OS === 'web' ? 34 : 0) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {hosts.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Feather name="server" size={32} color={colors.mutedForeground} />
            </View>
            <Text style={s.emptyTitle}>No hosts yet</Text>
            <Text style={s.emptyText}>
              Add your dev box, cloud VM, or any machine running a coding agent.
            </Text>
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={() => router.push('/add-host')}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={16} color={colors.primaryForeground} />
              <Text style={s.emptyBtnText}>Add a host</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={s.sectionLabel}>HOSTS</Text>
            <View style={s.hostList}>
              {hosts.map((host) => (
                <View key={host.id}>
                  {connecting === host.id ? (
                    <View style={[s.connectingCard]}>
                      <View style={s.connectingInner}>
                        <View style={s.pulse} />
                        <Text style={s.connectingText}>Connecting to {host.nickname}...</Text>
                      </View>
                    </View>
                  ) : (
                    <HostCard host={host} onPress={() => handleConnect(host)} />
                  )}
                </View>
              ))}
            </View>

            {recentSessions.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { marginTop: 28 }]}>RECENT SESSIONS</Text>
                <View style={s.sessionList}>
                  {recentSessions.map((session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      onPress={() =>
                        router.push({ pathname: '/session', params: { id: session.id } })
                      }
                      colors={colors}
                    />
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SessionRow({
  session,
  onPress,
  colors,
}: {
  session: Session;
  onPress: () => void;
  colors: ReturnType<typeof import('@/hooks/useColors').useColors>;
}) {
  const lastMsg = session.messages.filter((m) => m.role !== 'system').slice(-1)[0];
  const s = sessionStyles(colors);
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <View style={s.dot} />
      <View style={s.info}>
        <Text style={s.host}>{session.hostNickname}</Text>
        {lastMsg && (
          <Text style={s.preview} numberOfLines={1}>
            {lastMsg.role === 'user' ? 'You: ' : ''}
            {lastMsg.content.slice(0, 60)}
          </Text>
        )}
      </View>
      <Text style={s.time}>
        {new Date(session.createdAt).toLocaleDateString([], {
          month: 'short',
          day: 'numeric',
        })}
      </Text>
    </TouchableOpacity>
  );
}

const sessionStyles = (colors: ReturnType<typeof import('@/hooks/useColors').useColors>) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.success,
    },
    info: { flex: 1, gap: 2 },
    host: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      fontFamily: 'Inter_600SemiBold',
    },
    preview: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
    },
    time: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
    },
  });

const styles = (colors: ReturnType<typeof import('@/hooks/useColors').useColors>) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    brand: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
      letterSpacing: -0.5,
    },
    tagline: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      marginTop: 2,
    },
    addBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.mutedForeground,
      fontFamily: 'Inter_600SemiBold',
      letterSpacing: 1,
      marginBottom: 10,
    },
    hostList: { gap: 10 },
    sessionList: { gap: 8 },
    empty: {
      alignItems: 'center',
      paddingTop: 80,
      gap: 12,
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
    },
    emptyText: {
      fontSize: 15,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: 20,
    },
    emptyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: colors.radius,
      marginTop: 8,
    },
    emptyBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primaryForeground,
      fontFamily: 'Inter_600SemiBold',
    },
    connectingCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.primary + '44',
      padding: 16,
    },
    connectingInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    pulse: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    connectingText: {
      fontSize: 14,
      color: colors.primary,
      fontFamily: 'Inter_500Medium',
    },
  });
