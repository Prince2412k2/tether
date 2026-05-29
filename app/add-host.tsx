import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '@/context/AppContext';
import type { Host } from '@/lib/types';
import { useColors } from '@/hooks/useColors';

const AGENT_SUGGESTIONS = [
  'opencode acp',
  'claude --acp',
  'gemini --experimental-acp',
];

export default function AddHostScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addHost } = useApp();

  const [nickname, setNickname] = useState('');
  const [hostname, setHostname] = useState('');
  const [username, setUsername] = useState('');
  const [port, setPort] = useState('22');
  const [authMethod, setAuthMethod] = useState<Host['authMethod']>('key');
  const [agentCommand, setAgentCommand] = useState(AGENT_SUGGESTIONS[0]);
  const [saving, setSaving] = useState(false);

  const s = styles(colors);

  const handleSave = async () => {
    if (!nickname.trim() || !hostname.trim() || !username.trim()) {
      Alert.alert('Missing fields', 'Please fill in nickname, hostname, and username.');
      return;
    }

    setSaving(true);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await addHost({
      nickname: nickname.trim(),
      hostname: hostname.trim(),
      username: username.trim(),
      port: parseInt(port, 10) || 22,
      authMethod,
      agentCommand: agentCommand.trim() || AGENT_SUGGESTIONS[0],
    });

    setSaving(false);
    router.back();
  };

  const topPad =
    Platform.OS === 'web'
      ? insets.top + 67
      : insets.top + 12;

  return (
    <View style={[s.root, { paddingTop: topPad }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.title}>Add Host</Text>
        <TouchableOpacity
          style={[s.saveBtn, saving && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={s.saveBtnText}>{saving ? 'Saving...' : 'Add'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: insets.bottom + 40 + (Platform.OS === 'web' ? 34 : 0) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.section}>
          <Text style={s.sectionLabel}>IDENTITY</Text>
          <View style={s.fieldGroup}>
            <Field
              label="Nickname"
              value={nickname}
              onChangeText={setNickname}
              placeholder="My Dev Box"
              colors={colors}
            />
            <Divider colors={colors} />
            <Field
              label="Hostname"
              value={hostname}
              onChangeText={setHostname}
              placeholder="devbox.tailnet.ts.net"
              autoCapitalize="none"
              keyboardType="url"
              colors={colors}
            />
            <Divider colors={colors} />
            <Field
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="alice"
              autoCapitalize="none"
              colors={colors}
            />
            <Divider colors={colors} />
            <Field
              label="Port"
              value={port}
              onChangeText={setPort}
              placeholder="22"
              keyboardType="number-pad"
              colors={colors}
            />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>AUTH METHOD</Text>
          <View style={s.fieldGroup}>
            <TouchableOpacity
              style={s.authRow}
              onPress={() => setAuthMethod('key')}
              activeOpacity={0.7}
            >
              <View style={s.authLeft}>
                <Feather name="key" size={18} color={authMethod === 'key' ? colors.primary : colors.mutedForeground} />
                <View>
                  <Text style={[s.authTitle, authMethod === 'key' && { color: colors.primary }]}>
                    SSH Key
                  </Text>
                  <Text style={s.authSub}>From iOS Keychain (recommended)</Text>
                </View>
              </View>
              {authMethod === 'key' && (
                <Feather name="check" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
            <Divider colors={colors} />
            <TouchableOpacity
              style={s.authRow}
              onPress={() => setAuthMethod('password')}
              activeOpacity={0.7}
            >
              <View style={s.authLeft}>
                <Feather name="lock" size={18} color={authMethod === 'password' ? colors.primary : colors.mutedForeground} />
                <View>
                  <Text style={[s.authTitle, authMethod === 'password' && { color: colors.primary }]}>
                    Password
                  </Text>
                  <Text style={s.authSub}>Stored securely in Keychain</Text>
                </View>
              </View>
              {authMethod === 'password' && (
                <Feather name="check" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>AGENT COMMAND</Text>
          <View style={s.suggestions}>
            {AGENT_SUGGESTIONS.map((cmd) => (
              <TouchableOpacity
                key={cmd}
                style={[s.suggestion, agentCommand === cmd && s.suggestionActive]}
                onPress={() => setAgentCommand(cmd)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    s.suggestionText,
                    agentCommand === cmd && s.suggestionTextActive,
                  ]}
                >
                  {cmd}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={[s.fieldGroup, { marginTop: 8 }]}>
            <Field
              label="Command"
              value={agentCommand}
              onChangeText={setAgentCommand}
              placeholder="opencode acp"
              autoCapitalize="none"
              colors={colors}
            />
          </View>
          <Text style={s.hint}>
            The command to start the ACP agent on the remote host. Must support JSON-RPC 2.0 over stdio.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'url' | 'number-pad';
  colors: ReturnType<typeof import('@/hooks/useColors').useColors>;
}) {
  const s = fieldStyles(colors);
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function Divider({ colors }: { colors: ReturnType<typeof import('@/hooks/useColors').useColors> }) {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: colors.border,
        marginLeft: 16,
      }}
    />
  );
}

const fieldStyles = (colors: ReturnType<typeof import('@/hooks/useColors').useColors>) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    label: {
      fontSize: 15,
      color: colors.foreground,
      fontFamily: 'Inter_400Regular',
      width: 88,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.foreground,
      fontFamily: 'Inter_400Regular',
      textAlign: 'right',
    },
  });

const styles = (colors: ReturnType<typeof import('@/hooks/useColors').useColors>) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.foreground,
      fontFamily: 'Inter_600SemiBold',
    },
    saveBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    saveBtnDisabled: {
      opacity: 0.5,
    },
    saveBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primaryForeground,
      fontFamily: 'Inter_600SemiBold',
    },
    scroll: { flex: 1 },
    scrollContent: {
      padding: 20,
      gap: 24,
    },
    section: { gap: 10 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.mutedForeground,
      fontFamily: 'Inter_600SemiBold',
      letterSpacing: 1,
    },
    fieldGroup: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    authRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    authLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    authTitle: {
      fontSize: 15,
      color: colors.foreground,
      fontFamily: 'Inter_500Medium',
    },
    authSub: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      marginTop: 2,
    },
    suggestions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    suggestion: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    suggestionActive: {
      backgroundColor: colors.primary + '22',
      borderColor: colors.primary,
    },
    suggestionText: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
    },
    suggestionTextActive: {
      color: colors.primary,
      fontFamily: 'Inter_500Medium',
    },
    hint: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      lineHeight: 18,
    },
  });
