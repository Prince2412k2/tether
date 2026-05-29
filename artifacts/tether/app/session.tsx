import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConnectionBanner } from '@/components/ConnectionBanner';
import { MessageBubble } from '@/components/MessageBubble';
import { PermissionPrompt } from '@/components/PermissionPrompt';
import { useApp } from '@/context/AppContext';
import {
  continueAfterPermission,
  makeMessage,
  simulateAgentResponse,
} from '@/lib/mockAcp';
import type {
  ConnectionStatus,
  Message,
  PendingPermission,
  Session,
  ToolCall,
} from '@/lib/types';
import { useColors } from '@/hooks/useColors';

const makeId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export default function SessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getSession, upsertSession } = useApp();

  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [pending, setPending] = useState<PendingPermission | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const listRef = useRef<FlatList<Message>>(null);
  const sessionRef = useRef<Session | null>(null);
  const pendingResolveFn = useRef<((granted: boolean) => void) | null>(null);

  useEffect(() => {
    if (!id) return;
    const s = getSession(id);
    if (!s) return;
    setSession(s);
    sessionRef.current = s;
    setMessages(s.messages.slice().reverse());

    const init = async () => {
      setStatus('connecting');
      await delay(800);
      setStatus('handshaking');
      await delay(600);
      setStatus('connected');
    };
    init();
  }, [id]);

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const updateMessages = useCallback(
    (updater: (prev: Message[]) => Message[]) => {
      setMessages((prev) => {
        const next = updater(prev);
        if (sessionRef.current) {
          const updated: Session = {
            ...sessionRef.current,
            messages: next.slice().reverse(),
          };
          sessionRef.current = updated;
          upsertSession(updated);
        }
        return next;
      });
    },
    [upsertSession]
  );

  const patchMessage = useCallback(
    (msgId: string, patch: Partial<Message>) => {
      updateMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, ...patch } : m))
      );
    },
    [updateMessages]
  );

  const patchToolCall = useCallback(
    (msgId: string, tcId: string, update: Partial<ToolCall>) => {
      updateMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                toolCalls: (m.toolCalls ?? []).map((tc) =>
                  tc.id === tcId ? { ...tc, ...update } : tc
                ),
              }
            : m
        )
      );
    },
    [updateMessages]
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isProcessing || status !== 'connected') return;

    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput('');
    setIsProcessing(true);

    const userMsg = makeMessage('user', text);
    const assistantMsg = makeMessage('assistant');
    assistantMsg.isStreaming = true;

    updateMessages((prev) => [assistantMsg, userMsg, ...prev]);

    const callbacks = {
      onToken: (msgId: string, token: string) => {
        updateMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, content: m.content + token } : m
          )
        );
      },
      onToolCall: (msgId: string, toolCall: ToolCall) => {
        updateMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, toolCalls: [...(m.toolCalls ?? []), toolCall] }
              : m
          )
        );
      },
      onToolCallUpdate: (msgId: string, tcId: string, update: Partial<ToolCall>) => {
        patchToolCall(msgId, tcId, update);
      },
      onPermissionNeeded: (msgId: string, tcId: string) => {
        const currentMsgs = messages;
        const msg = messages.find((m) => m.id === msgId);
        const tc = msg?.toolCalls?.find((t) => t.id === tcId);
        if (!tc) return;

        const permission: PendingPermission = {
          toolCallId: tcId,
          messageId: msgId,
          toolName: tc.name,
          filePath: tc.filePath,
          diff: tc.diff,
        };
        setPending(permission);
      },
      onDone: (msgId: string) => {
        patchMessage(msgId, { isStreaming: false });
        setIsProcessing(false);
      },
    };

    await simulateAgentResponse(text, assistantMsg.id, callbacks);
  }, [input, isProcessing, status, updateMessages, patchMessage, patchToolCall, messages]);

  const handleAllow = useCallback(async () => {
    if (!pending) return;
    const { toolCallId, messageId } = pending;
    patchToolCall(messageId, toolCallId, { status: 'done' });
    setPending(null);

    const callbacks = {
      onToken: (msgId: string, token: string) => {
        updateMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, content: m.content + token } : m
          )
        );
      },
      onToolCall: (_: string, tc: ToolCall) => {},
      onToolCallUpdate: (msgId: string, tcId: string, update: Partial<ToolCall>) => {
        patchToolCall(msgId, tcId, update);
      },
      onPermissionNeeded: (_: string, __: string) => {},
      onDone: (msgId: string) => {
        patchMessage(msgId, { isStreaming: false });
        setIsProcessing(false);
      },
    };

    const assistantMsgId = messages[0]?.id;
    if (assistantMsgId) {
      await continueAfterPermission(assistantMsgId, toolCallId, true, callbacks);
    } else {
      setIsProcessing(false);
    }
  }, [pending, patchToolCall, updateMessages, patchMessage, messages]);

  const handleDeny = useCallback(async () => {
    if (!pending) return;
    const { toolCallId, messageId } = pending;
    patchToolCall(messageId, toolCallId, { status: 'denied' });
    setPending(null);

    const callbacks = {
      onToken: (msgId: string, token: string) => {
        updateMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, content: m.content + token } : m
          )
        );
      },
      onToolCall: (_: string, tc: ToolCall) => {},
      onToolCallUpdate: (msgId: string, tcId: string, update: Partial<ToolCall>) => {
        patchToolCall(msgId, tcId, update);
      },
      onPermissionNeeded: (_: string, __: string) => {},
      onDone: (msgId: string) => {
        patchMessage(msgId, { isStreaming: false });
        setIsProcessing(false);
      },
    };

    const assistantMsgId = messages[0]?.id;
    if (assistantMsgId) {
      await continueAfterPermission(assistantMsgId, toolCallId, false, callbacks);
    } else {
      setIsProcessing(false);
    }
  }, [pending, patchToolCall, updateMessages, patchMessage, messages]);

  const s = styles(colors);

  const bottomPad =
    insets.bottom + 16 + (Platform.OS === 'web' ? 34 : 0);

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          s.header,
          {
            paddingTop:
              Platform.OS === 'web'
                ? insets.top + 67
                : insets.top + 12,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>
            {session?.hostNickname ?? 'Session'}
          </Text>
          <View style={s.statusRow}>
            <View
              style={[
                s.statusDot,
                {
                  backgroundColor:
                    status === 'connected'
                      ? colors.success
                      : status === 'error'
                      ? colors.destructive
                      : colors.warning,
                },
              ]}
            />
            <Text style={s.statusText}>
              {status === 'connected'
                ? 'Connected'
                : status === 'error'
                ? 'Error'
                : 'Connecting...'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={s.moreBtn}>
          <Feather name="more-horizontal" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ConnectionBanner status={status} />

      <KeyboardAvoidingView
        style={s.flex}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          inverted
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!!messages.length}
        />

        <View style={[s.inputBar, { paddingBottom: bottomPad }]}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder={
              status !== 'connected'
                ? 'Connecting...'
                : isProcessing
                ? 'Agent is working...'
                : 'Ask your agent...'
            }
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={4000}
            editable={status === 'connected' && !isProcessing}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              s.sendBtn,
              {
                backgroundColor:
                  !input.trim() || status !== 'connected' || isProcessing
                    ? colors.secondary
                    : colors.primary,
              },
            ]}
            onPress={handleSend}
            disabled={!input.trim() || status !== 'connected' || isProcessing}
            activeOpacity={0.8}
          >
            <Feather
              name="arrow-up"
              size={18}
              color={
                !input.trim() || status !== 'connected' || isProcessing
                  ? colors.mutedForeground
                  : colors.primaryForeground
              }
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <PermissionPrompt
        permission={pending}
        onAllow={handleAllow}
        onDeny={handleDeny}
      />
    </View>
  );
}

const styles = (colors: ReturnType<typeof import('@/hooks/useColors').useColors>) =>
  StyleSheet.create({
    root: { flex: 1 },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
      gap: 8,
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
      fontFamily: 'Inter_600SemiBold',
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 2,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusText: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
    },
    moreBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 4,
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      backgroundColor: colors.input,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.foreground,
      fontFamily: 'Inter_400Regular',
      borderWidth: 1,
      borderColor: colors.border,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
