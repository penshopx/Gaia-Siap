import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useGetDashboardSummary, useGetRecentCases } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { CaseCard } from '@/components/CaseCard';
import type { Case } from '@workspace/api-client-react';

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | undefined;
  accent?: string;
}) {
  const colors = useColors();
  return (
    <View style={[statStyles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={[statStyles.value, { color: accent ?? colors.foreground }]}>
        {value ?? '–'}
      </Text>
      <Text style={[statStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    minWidth: 0,
    gap: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: '700' as const,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  label: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
});

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === 'web';

  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
    isRefetching: summaryRefetching,
  } = useGetDashboardSummary();

  const {
    data: recent,
    isLoading: recentLoading,
    refetch: refetchRecent,
    isRefetching: recentRefetching,
  } = useGetRecentCases({ limit: 5 });

  const isRefetching = summaryRefetching || recentRefetching;

  const handleRefresh = () => {
    refetchSummary();
    refetchRecent();
  };

  const s = makeStyles(colors, insets, isWeb);

  const headerComponent = (
    <View style={s.headerSection}>
      {/* Page header */}
      <View style={s.pageHeader}>
        <View>
          <Text style={s.greeting}>Dashboard</Text>
          <Text style={s.subtitle}>Overview of your cases</Text>
        </View>
        <Pressable
          style={s.iconBtn}
          onPress={() => router.push('/(tabs)/cases')}
        >
          <Feather name="plus" size={20} color={colors.primaryForeground} />
        </Pressable>
      </View>

      {/* Stats */}
      {summaryLoading ? (
        <View style={s.statsLoadWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          <View style={s.statsRow}>
            <StatCard label="Total Cases" value={summary?.totalCases} />
            <StatCard label="Recent (7d)" value={summary?.recentActivity} accent={colors.primary} />
          </View>
          <View style={s.statsRow}>
            <StatCard label="Draft" value={summary?.byStatus.draft} />
            <StatCard label="In Progress" value={(summary?.byStatus.intake ?? 0) + (summary?.byStatus.processing ?? 0)} />
            <StatCard label="Done" value={summary?.byStatus.completed} accent={colors.success} />
          </View>
        </>
      )}

      <Text style={s.sectionTitle}>Recent Cases</Text>
    </View>
  );

  if (recentLoading && !isRefetching) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const items = recent?.items ?? [];

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
        ListHeaderComponent={headerComponent}
        ListEmptyComponent={
          <View style={s.empty}>
            <Feather name="inbox" size={36} color={colors.mutedForeground} />
            <Text style={s.emptyText}>No recent cases</Text>
          </View>
        }
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>, isWeb: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    listContent: {
      paddingBottom: insets.bottom + 100,
    },
    headerSection: {
      paddingTop: isWeb ? 67 : 0,
      paddingHorizontal: 16,
      paddingBottom: 4,
    },
    pageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
      paddingTop: 12,
    },
    greeting: {
      fontSize: 22,
      fontWeight: '700' as const,
      color: colors.foreground,
      fontFamily: 'PlusJakartaSans_700Bold',
    },
    subtitle: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: 'PlusJakartaSans_400Regular',
      marginTop: 2,
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsLoadWrap: {
      height: 100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.foreground,
      fontFamily: 'PlusJakartaSans_600SemiBold',
      marginTop: 8,
      marginBottom: 8,
    },
    empty: {
      alignItems: 'center',
      paddingTop: 40,
      gap: 10,
    },
    emptyText: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: 'PlusJakartaSans_400Regular',
    },
  });
}
