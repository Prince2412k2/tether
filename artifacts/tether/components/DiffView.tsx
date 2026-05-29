import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import type { DiffLine } from '@/lib/types';
import { useColors } from '@/hooks/useColors';

interface Props {
  diff: DiffLine[];
  filePath?: string;
}

export function DiffView({ diff, filePath }: Props) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const s = styles(colors);

  const addedCount = diff.filter((l) => l.type === 'add').length;
  const removedCount = diff.filter((l) => l.type === 'remove').length;

  return (
    <View style={s.container}>
      <TouchableOpacity
        style={s.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={s.headerLeft}>
          <Text style={s.filePath} numberOfLines={1}>
            {filePath ?? 'file'}
          </Text>
          <View style={s.stats}>
            {addedCount > 0 && (
              <Text style={s.added}>+{addedCount}</Text>
            )}
            {removedCount > 0 && (
              <Text style={s.removed}>-{removedCount}</Text>
            )}
          </View>
        </View>
        <Text style={s.toggle}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <ScrollView
          style={s.diffScroll}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <View style={s.diffContent}>
            {diff.map((line, i) => (
              <View
                key={i}
                style={[
                  s.line,
                  line.type === 'add' && s.lineAdd,
                  line.type === 'remove' && s.lineRemove,
                ]}
              >
                <Text style={s.linePrefix}>
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                </Text>
                <Text
                  style={[
                    s.lineText,
                    line.type === 'add' && s.lineTextAdd,
                    line.type === 'remove' && s.lineTextRemove,
                  ]}
                >
                  {line.content}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = (colors: ReturnType<typeof import('@/hooks/useColors').useColors>) =>
  StyleSheet.create({
    container: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginTop: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.codeBackground,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    filePath: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      flex: 1,
    },
    stats: {
      flexDirection: 'row',
      gap: 6,
    },
    added: {
      fontSize: 12,
      color: colors.diffAddText,
      fontFamily: 'Inter_600SemiBold',
    },
    removed: {
      fontSize: 12,
      color: colors.diffRemoveText,
      fontFamily: 'Inter_600SemiBold',
    },
    toggle: {
      fontSize: 10,
      color: colors.mutedForeground,
      marginLeft: 8,
    },
    diffScroll: {
      backgroundColor: colors.codeBackground,
    },
    diffContent: {
      padding: 8,
      minWidth: '100%',
    },
    line: {
      flexDirection: 'row',
      paddingVertical: 1,
      paddingHorizontal: 4,
      borderRadius: 2,
    },
    lineAdd: {
      backgroundColor: colors.diffAdd,
    },
    lineRemove: {
      backgroundColor: colors.diffRemove,
    },
    linePrefix: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      width: 14,
    },
    lineText: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.foreground,
    },
    lineTextAdd: {
      color: colors.diffAddText,
    },
    lineTextRemove: {
      color: colors.diffRemoveText,
    },
  });
