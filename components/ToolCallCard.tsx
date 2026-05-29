import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { DiffView } from '@/components/DiffView';
import type { ToolCall } from '@/lib/types';
import { useColors } from '@/hooks/useColors';

interface Props {
  toolCall: ToolCall;
}

const TOOL_META: Record<
  ToolCall['name'],
  { label: string; icon: string }
> = {
  bash: { label: 'Run command', icon: 'terminal' },
  read_file: { label: 'Read file', icon: 'file-text' },
  write_file: { label: 'Write file', icon: 'edit-2' },
  list_dir: { label: 'List directory', icon: 'folder' },
  search: { label: 'Search', icon: 'search' },
  unknown: { label: 'Tool call', icon: 'cpu' },
};

function statusColor(
  status: ToolCall['status'],
  colors: ReturnType<typeof import('@/hooks/useColors').useColors>
) {
  switch (status) {
    case 'running':
      return colors.warning;
    case 'done':
      return colors.success;
    case 'error':
    case 'denied':
      return colors.destructive;
    case 'permission_needed':
      return colors.warning;
    default:
      return colors.mutedForeground;
  }
}

export function ToolCallCard({ toolCall }: Props) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const meta = TOOL_META[toolCall.name] ?? TOOL_META.unknown;
  const s = styles(colors);
  const sc = statusColor(toolCall.status, colors);

  const label =
    toolCall.name === 'bash'
      ? String(toolCall.input.command ?? 'shell command')
      : toolCall.filePath ?? String(toolCall.input.path ?? meta.label);

  const isRunning = toolCall.status === 'running';
  const hasOutput = !!toolCall.output;
  const hasDiff = !!toolCall.diff?.length;

  return (
    <View style={s.card}>
      <TouchableOpacity
        style={s.row}
        onPress={() => (hasOutput || hasDiff) && setExpanded((v) => !v)}
        activeOpacity={hasOutput || hasDiff ? 0.7 : 1}
      >
        <View style={[s.dot, { backgroundColor: sc }]} />
        <Feather
          name={meta.icon as any}
          size={14}
          color={colors.mutedForeground}
        />
        <Text style={s.label} numberOfLines={1}>
          {label}
        </Text>
        {isRunning && (
          <ActivityIndicator size="small" color={colors.warning} style={s.spinner} />
        )}
        {(hasOutput || hasDiff) && !isRunning && (
          <Feather
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.mutedForeground}
          />
        )}
      </TouchableOpacity>

      {expanded && hasOutput && (
        <ScrollView
          style={s.outputScroll}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.output}>{toolCall.output}</Text>
        </ScrollView>
      )}

      {hasDiff && (
        <DiffView diff={toolCall.diff!} filePath={toolCall.filePath} />
      )}
    </View>
  );
}

const styles = (colors: ReturnType<typeof import('@/hooks/useColors').useColors>) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.codeBackground,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginTop: 6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    label: {
      flex: 1,
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
    },
    spinner: {
      marginLeft: 'auto',
    },
    outputScroll: {
      maxHeight: 200,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    output: {
      fontSize: 11,
      color: colors.foreground,
      fontFamily: 'Inter_400Regular',
      padding: 12,
      lineHeight: 18,
    },
  });
