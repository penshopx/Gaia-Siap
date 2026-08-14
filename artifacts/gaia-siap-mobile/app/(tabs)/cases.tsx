import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  useListCases,
  useCreateCase,
  type Case,
  type CaseStatus,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { CaseCard } from '@/components/CaseCard';
import * as Haptics from 'expo-haptics';

const FILTERS: { label: string; value: CaseStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Draft', value: 'draft' },
  { label: 'Intake', value: 'intake' },
  { label: 'Processing', value: 'processing' },
  { label: 'Review', value: 'review' },
  { label: 'Completed', value: 'completed' },
];

export default function CasesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isWeb = Platform.OS === 'web';

  const [activeFilter, setActiveFilter] = useState<CaseStatus | undefined>(undefined);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useListCases(
    activeFilter ? { status: activeFilter } : {}
  );

  const { mutateAsync: createCase, isPending: isCreating } = useCreateCase();

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      await createCase({ data: { title: newTitle.trim() } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['listCases'] });
      queryClient.invalidateQueries({ queryKey: ['getDashboardSummary'] });
      setNewTitle('');
      setShowCreate(false);
    } catch {
      setCreateError('Failed to create case. Please try again.');
    }
  };

  const s = makeStyles(colors, insets, isWeb);

  const filterBar = (
    <View style={s.filterWrap}>
      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(f) => f.label}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterContent}
        renderItem={({ item }) => {
          const active = item.value === activeFilter;
          return (
            <Pressable
              style={[s.filterChip, active && s.filterChipActive]}
              onPress={() => setActiveFilter(item.value)}
            >
              <Text style={[s.filterLabel, active && s.filterLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );

  const header = (
    <View style={s.header}>
      <Text style={s.title}>Cases</Text>
      <Pressable style={s.iconBtn} onPress={() => setShowCreate(true)}>
        <Feather name="plus" size={20} color={colors.primaryForeground} />
      </Pressable>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[s.container, s.center]}>
        {header}
        {filterBar}
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  const items: Case[] = data?.items ?? [];

  return (
    <View style={s.container}>
      <FlatList<Case>
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CaseCard
            item={item}
            onPress={() => router.push({ pathname: '/cases/[id]', params: { id: item.id } })}
          />
        )}
        ListHeaderComponent={
          <>
            {header}
            {filterBar}
          </>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Feather name="folder" size={36} color={colors.mutedForeground} />
            <Text style={s.emptyTitle}>No cases found</Text>
            <Text style={s.emptyText}>
              {activeFilter ? `No ${activeFilter} cases` : 'Create your first case'}
            </Text>
          </View>
        }
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      />

      {/* Create case modal */}
      <Modal
        visible={showCreate}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreate(false)}
      >
        <Pressable style={s.overlay} onPress={() => setShowCreate(false)}>
          <Pressable style={[s.sheet, { paddingBottom: insets.bottom + 20 }]} onPress={() => {}}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>New Case</Text>

            <Text style={s.inputLabel}>Case Title</Text>
            <TextInput
              style={s.sheetInput}
              placeholder="Describe the case..."
              placeholderTextColor={colors.mutedForeground}
              value={newTitle}
              onChangeText={(t) => { setNewTitle(t); setCreateError(null); }}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />

            {createError ? <Text style={s.error}>{createError}</Text> : null}

            <View style={s.sheetActions}>
              <Pressable
                style={[s.sheetBtn, s.sheetBtnSecondary]}
                onPress={() => setShowCreate(false)}
              >
                <Text style={[s.sheetBtnText, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[s.sheetBtn, s.sheetBtnPrimary, (!newTitle.trim() || isCreating) && s.btnDisabled]}
                onPress={handleCreate}
                disabled={!newTitle.trim() || isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[s.sheetBtnText, { color: colors.primaryForeground }]}>Create</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>, isWeb: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: { alignItems: 'center' },
    listContent: {
      paddingBottom: insets.bottom + 100,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: isWeb ? 67 + 12 : 12,
      paddingBottom: 8,
    },
    title: {
      fontSize: 22,
      fontWeight: '700' as const,
      color: colors.foreground,
      fontFamily: 'PlusJakartaSans_700Bold',
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterWrap: {
      paddingBottom: 8,
    },
    filterContent: {
      paddingHorizontal: 16,
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterLabel: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: 'PlusJakartaSans_500Medium',
    },
    filterLabelActive: {
      color: colors.primaryForeground,
    },
    empty: {
      alignItems: 'center',
      paddingTop: 60,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.foreground,
      fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    emptyText: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: 'PlusJakartaSans_400Regular',
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 12,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 16,
    },
    sheetTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.foreground,
      fontFamily: 'PlusJakartaSans_700Bold',
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.foreground,
      fontFamily: 'PlusJakartaSans_600SemiBold',
      marginBottom: 6,
    },
    sheetInput: {
      height: 48,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      fontSize: 15,
      color: colors.foreground,
      backgroundColor: colors.background,
      fontFamily: 'PlusJakartaSans_400Regular',
      marginBottom: 12,
    },
    error: {
      fontSize: 13,
      color: colors.destructive,
      fontFamily: 'PlusJakartaSans_400Regular',
      marginBottom: 8,
    },
    sheetActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    sheetBtn: {
      flex: 1,
      height: 46,
      borderRadius: colors.radius,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetBtnPrimary: {
      backgroundColor: colors.primary,
    },
    sheetBtnSecondary: {
      backgroundColor: colors.secondary,
    },
    sheetBtnText: {
      fontSize: 15,
      fontWeight: '600' as const,
      fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    btnDisabled: {
      opacity: 0.5,
    },
  });
}
