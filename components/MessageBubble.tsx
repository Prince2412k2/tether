import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ToolCallCard } from '@/components/ToolCallCard';
import type { Message } from '@/lib/types';
import { useColors } from '@/hooks/useColors';

interface Props {
  message: Message;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function MessageBubble({ message }: Props) {
  const colors = useColors();
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const s = styles(colors);

  if (isSystem) {
    return (
      <View style={s.systemRow}>
        <Text style={s.systemText}>{message.content}</Text>
      </View>
    );
  }

  return (
    <View style={[s.row, isUser && s.rowUser]}>
      {!isUser && (
        <View style={s.avatar}>
          <Text style={s.avatarText}>A</Text>
        </View>
      )}

      <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAssistant]}>
        {message.content.length > 0 && (
          <Text style={[s.text, isUser ? s.textUser : s.textAssistant]}>
            {message.content}
            {message.isStreaming && (
              <Text style={s.cursor}>▋</Text>
            )}
          </Text>
        )}

        {message.toolCalls && message.toolCalls.length > 0 && (
          <View style={s.toolCalls}>
            {message.toolCalls.map((tc) => (
              <ToolCallCard key={tc.id} toolCall={tc} />
            ))}
          </View>
        )}

        {!message.isStreaming && (
          <Text style={[s.time, isUser && s.timeUser]}>
            {formatTime(message.timestamp)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = (colors: ReturnType<typeof import('@/hooks/useColors').useColors>) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      marginVertical: 4,
    },
    rowUser: {
      justifyContent: 'flex-end',
    },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primaryForeground,
      fontFamily: 'Inter_700Bold',
    },
    bubble: {
      maxWidth: '82%',
      borderRadius: colors.radius,
      padding: 12,
    },
    bubbleUser: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: 4,
    },
    bubbleAssistant: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomLeftRadius: 4,
    },
    text: {
      fontSize: 15,
      lineHeight: 22,
      fontFamily: 'Inter_400Regular',
    },
    textUser: {
      color: colors.primaryForeground,
    },
    textAssistant: {
      color: colors.foreground,
    },
    cursor: {
      color: colors.primary,
      fontWeight: '100',
    },
    toolCalls: {
      marginTop: 6,
    },
    time: {
      fontSize: 10,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      marginTop: 6,
      alignSelf: 'flex-end',
    },
    timeUser: {
      color: 'rgba(255,255,255,0.6)',
    },
    systemRow: {
      alignItems: 'center',
      marginVertical: 8,
    },
    systemText: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      backgroundColor: colors.secondary,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 20,
    },
  });
