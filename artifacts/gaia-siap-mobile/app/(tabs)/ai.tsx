import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useListCases, useAiAssist } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import * as Haptics from 'expo-haptics';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
};

function MessageBubble({ msg, colors, onSuggestion }: {
  msg: Message;
  colors: ReturnType<typeof useColors>;
  onSuggestion: (s: string) => void;
}) {
  const isUser = msg.role === 'user';
  return (
    <View style={[bubbleStyles.row, isUser && bubbleStyles.rowUser]}>
      {!isUser && (
        <View style={[bubbleStyles.avatar, { backgroundColor: colors.primary }]}>
          <Feather name="cpu" size={14} color={colors.primaryForeground} />
        </View>
      )}
      <View style={{ maxWidth: '80%', gap: 8 }}>
        <View
          style={[
            bubbleStyles.bubble,
            isUser
              ? [bubbleStyles.bubbleUser, { backgroundColor: colors.primary }]
              : [bubbleStyles.bubbleAi, { backgroundColor: colors.card, borderColor: colors.border }],
          ]}
        >
          <Text
            style={[
              bubbleStyles.text,
              { color: isUser ? colors.primaryForeground : colors.foreground },
            ]}
          >
            {msg.content}
          </Text>
        </View>
        {!isUser && msg.suggestions && msg.suggestions.length > 0 && (
          <View style={bubbleStyles.suggestions}>
            {msg.suggestions.map((s, i) => (
              <Pressable
                key={i}
                style={[bubbleStyles.chip, { borderColor: colors.border, backgroundColor: colors.muted }]}
                onPress={() => onSuggestion(s)}
              >
                <Text style={[bubbleStyles.chipText, { color: colors.foreground }]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const bubbleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  rowUser: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bubble: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingLeft: 4,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
});

export default function AiAssistScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ caseId?: string }>();
  const isWeb = Platform.OS === 'web';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string | undefined>(params.caseId);

  const { data: casesData } = useListCases({ limit: 20 });
  const { mutateAsync: aiAssist, isPending } = useAiAssist();
  const flatRef = useRef<FlatList>(null);

  const cases = casesData?.items ?? [];
  const selectedCase = cases.find((c) => c.id === selectedCaseId);

  const handleSend = async () => {
    if (!input.trim() || !selectedCaseId || isPending) return;
    const prompt = input.trim();
    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
    };
    setMessages((prev) => [userMsg, ...prev]);

    try {
      const res = await aiAssist({
        data: { caseId: selectedCaseId, prompt },
      });
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.response,
        suggestions: res.suggestions ?? [],
      };
      setMessages((prev) => [aiMsg, ...prev]);
    } catch {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
      };
      setMessages((prev) => [errMsg, ...prev]);
    }
  };

  const s = makeStyles(colors, insets, isWeb);

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Feather name="cpu" size={18} color={colors.primary} />
          <Text style={s.headerTitle}>AI Assist</Text>
        </View>
      </View>

      {/* Case selector */}
      <View style={s.caseBar}>
        <FlatList
          horizontal
          data={cases}
          keyExtractor={(c) => c.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.caseBarContent}
          ListEmptyComponent={
            <Text style={[s.caseEmpty, { color: colors.mutedForeground }]}>
              No cases available
            </Text>
          }
          renderItem={({ item }) => {
            const active = item.id === selectedCaseId;
            return (
              <Pressable
                style={[s.caseChip, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.card }]}
                onPress={() => setSelectedCaseId(item.id)}
              >
                <Text
                  style={[s.caseChipText, { color: active ? colors.primaryForeground : colors.foreground }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Divider */}
      <View style={[s.divider, { backgroundColor: colors.border }]} />

      {/* Messages */}
      {messages.length === 0 ? (
        <View style={s.emptyChat}>
          <View style={[s.emptyIcon, { backgroundColor: colors.muted }]}>
            <Feather name="cpu" size={28} color={colors.mutedForeground} />
          </View>
          <Text style={[s.emptyChatTitle, { color: colors.foreground }]}>
            {selectedCase ? `Chat about "${selectedCase.title}"` : 'Select a case to begin'}
          </Text>
          <Text style={[s.emptyChatSub, { color: colors.mutedForeground }]}>
            Ask anything about the case, workflow steps, or recommendations.
          </Text>
        </View>
      ) : (
        <FlatList<Message>
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <MessageBubble
              msg={item}
              colors={colors}
              onSuggestion={(s) => setInput(s)}
            />
          )}
          inverted
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.messageList}
        />
      )}

      {/* Input bar */}
      <View style={[s.inputBar, { paddingBottom: insets.bottom + (isWeb ? 34 : 8) }]}>
        <TextInput
          style={[s.input, !selectedCaseId && s.inputDisabled]}
          placeholder={selectedCaseId ? 'Ask about this case…' : 'Select a case first'}
          placeholderTextColor={colors.mutedForeground}
          value={input}
          onChangeText={setInput}
          editable={!!selectedCaseId && !isPending}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit
        />
        <Pressable
          style={[s.sendBtn, { backgroundColor: input.trim() && selectedCaseId ? colors.primary : colors.muted }]}
          onPress={handleSend}
          disabled={!input.trim() || !selectedCaseId || isPending}
        >
          {isPending ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Feather name="send" size={16} color={input.trim() && selectedCaseId ? colors.primaryForeground : colors.mutedForeground} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>, isWeb: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: isWeb ? 67 + 12 : 12,
      paddingBottom: 10,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700' as const,
      color: colors.foreground,
      fontFamily: 'PlusJakartaSans_700Bold',
    },
    caseBar: {
      paddingBottom: 8,
    },
    caseBarContent: {
      paddingHorizontal: 16,
      gap: 8,
    },
    caseChip: {
      maxWidth: 180,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
    },
    caseChipText: {
      fontSize: 13,
      fontFamily: 'PlusJakartaSans_500Medium',
    },
    caseEmpty: {
      fontSize: 13,
      fontFamily: 'PlusJakartaSans_400Regular',
      paddingVertical: 6,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginHorizontal: 0,
    },
    emptyChat: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 36,
      gap: 12,
    },
    emptyIcon: {
      width: 60,
      height: 60,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    emptyChatTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      textAlign: 'center',
      fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    emptyChatSub: {
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 20,
      fontFamily: 'PlusJakartaSans_400Regular',
    },
    messageList: {
      paddingTop: 12,
      paddingBottom: 8,
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.foreground,
      backgroundColor: colors.card,
      fontFamily: 'PlusJakartaSans_400Regular',
    },
    inputDisabled: {
      opacity: 0.5,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
  });
}
