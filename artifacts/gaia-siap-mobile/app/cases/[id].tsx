import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useGetCase,
  useGetCaseWorkflow,
  useAdvanceCaseWorkflow,
  type WorkflowStep,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { StatusBadge, PriorityBadge } from '@/components/CaseCard';
import * as Haptics from 'expo-haptics';

const STEP_STATUS_ICON: Record<string, string> = {
  completed: 'check-circle',
  active: 'circle',
  pending: 'circle',
  blocked: 'x-circle',
};

function WorkflowStepRow({ step, isLast, colors }: {
  step: WorkflowStep;
  isLast: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const iconName = STEP_STATUS_ICON[step.status] ?? 'circle';
  const iconColor =
    step.status === 'completed' ? colors.success :
    step.status === 'active' ? colors.primary :
    step.status === 'blocked' ? colors.destructive :
    colors.mutedForeground;

  return (
    <View style={wStyles.row}>
      <View style={wStyles.timeline}>
        <Feather name={iconName as any} size={18} color={iconColor} />
        {!isLast && (
          <View style={[wStyles.line, { backgroundColor: colors.border }]} />
        )}
      </View>
      <View style={wStyles.content}>
        <Text style={[wStyles.stepTitle, { color: step.status === 'pending' ? colors.mutedForeground : colors.foreground }]}>
          {step.title}
        </Text>
        {step.description ? (
          <Text style={[wStyles.stepDesc, { color: colors.mutedForeground }]}>{step.description}</Text>
        ) : null}
        <Text style={[wStyles.stepStatus, { color: iconColor }]}>
          {step.status.charAt(0).toUpperCase() + step.status.slice(1)}
        </Text>
      </View>
    </View>
  );
}

const wStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  timeline: {
    alignItems: 'center',
    width: 20,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: 4,
    minHeight: 20,
  },
  content: {
    flex: 1,
    paddingBottom: 16,
    gap: 2,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  stepDesc: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 18,
  },
  stepStatus: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_500Medium',
    marginTop: 2,
  },
});

export default function CaseDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isWeb = Platform.OS === 'web';

  const { data: caseData, isLoading: caseLoading, error: caseError } = useGetCase(id);
  const { data: workflow, isLoading: workflowLoading, refetch: refetchWorkflow } = useGetCaseWorkflow(id);
  const { mutateAsync: advance, isPending: advancing } = useAdvanceCaseWorkflow();

  const handleAdvance = async () => {
    Alert.alert(
      'Advance Workflow',
      'Move this case to the next workflow step?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Advance',
          onPress: async () => {
            try {
              await advance({ id, data: {} });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              refetchWorkflow();
              queryClient.invalidateQueries({ queryKey: ['getCase', id] });
              queryClient.invalidateQueries({ queryKey: ['getDashboardSummary'] });
            } catch {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', 'Could not advance workflow. Please try again.');
            }
          },
        },
      ]
    );
  };

  const s = makeStyles(colors, insets, isWeb);

  if (caseLoading) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (caseError || !caseData) {
    return (
      <View style={[s.container, s.center]}>
        <Feather name="alert-circle" size={36} color={colors.destructive} />
        <Text style={s.errorText}>Case not found</Text>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const steps: WorkflowStep[] = workflow?.steps ?? [];
  const canAdvance = caseData.status !== 'completed';

  return (
    <>
      <Stack.Screen options={{ title: caseData.title, headerBackTitle: 'Cases' }} />
      <ScrollView
        style={s.container}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status & Priority */}
        <View style={s.badgeRow}>
          <StatusBadge status={caseData.status} />
          {caseData.priority && <PriorityBadge priority={caseData.priority as 'low' | 'normal' | 'high'} />}
        </View>

        {/* Case title */}
        <Text style={s.caseTitle}>{caseData.title}</Text>

        {/* Description */}
        {caseData.description && (
          <View style={s.card}>
            <Text style={s.cardLabel}>Description</Text>
            <Text style={s.cardBody}>{caseData.description}</Text>
          </View>
        )}

        {/* Meta */}
        <View style={s.card}>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Category</Text>
            <Text style={s.metaValue}>{caseData.category ?? '—'}</Text>
          </View>
          <View style={[s.metaRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 10 }]}>
            <Text style={s.metaLabel}>Created</Text>
            <Text style={s.metaValue}>{new Date(caseData.createdAt).toLocaleDateString()}</Text>
          </View>
          <View style={[s.metaRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 10 }]}>
            <Text style={s.metaLabel}>Updated</Text>
            <Text style={s.metaValue}>{new Date(caseData.updatedAt).toLocaleDateString()}</Text>
          </View>
        </View>

        {/* Workflow */}
        <Text style={s.sectionTitle}>Workflow</Text>
        {workflowLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : steps.length > 0 ? (
          <View style={s.workflowCard}>
            {steps.map((step, i) => (
              <WorkflowStepRow
                key={step.id}
                step={step}
                isLast={i === steps.length - 1}
                colors={colors}
              />
            ))}
          </View>
        ) : (
          <Text style={s.noSteps}>No workflow steps</Text>
        )}

        {/* Actions */}
        <View style={s.actions}>
          {canAdvance && (
            <Pressable
              style={[s.actionBtn, s.actionBtnPrimary, advancing && s.btnDisabled]}
              onPress={handleAdvance}
              disabled={advancing}
            >
              {advancing ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <>
                  <Feather name="chevrons-right" size={16} color={colors.primaryForeground} />
                  <Text style={[s.actionBtnText, { color: colors.primaryForeground }]}>Advance Workflow</Text>
                </>
              )}
            </Pressable>
          )}

          <Pressable
            style={[s.actionBtn, s.actionBtnSecondary]}
            onPress={() => router.push({ pathname: '/(tabs)/ai', params: { caseId: id } })}
          >
            <Feather name="cpu" size={16} color={colors.foreground} />
            <Text style={[s.actionBtnText, { color: colors.foreground }]}>AI Assist</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
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
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: insets.bottom + (isWeb ? 34 : 20) + 60,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 10,
    },
    caseTitle: {
      fontSize: 22,
      fontWeight: '700' as const,
      color: colors.foreground,
      fontFamily: 'PlusJakartaSans_700Bold',
      marginBottom: 16,
      lineHeight: 30,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius + 2,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 14,
      marginBottom: 12,
    },
    cardLabel: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: colors.mutedForeground,
      fontFamily: 'PlusJakartaSans_600SemiBold',
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    cardBody: {
      fontSize: 14,
      color: colors.foreground,
      fontFamily: 'PlusJakartaSans_400Regular',
      lineHeight: 22,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    metaLabel: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: 'PlusJakartaSans_400Regular',
    },
    metaValue: {
      fontSize: 13,
      color: colors.foreground,
      fontFamily: 'PlusJakartaSans_500Medium',
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.foreground,
      fontFamily: 'PlusJakartaSans_600SemiBold',
      marginBottom: 12,
      marginTop: 4,
    },
    workflowCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius + 2,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 16,
      marginBottom: 20,
    },
    noSteps: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: 'PlusJakartaSans_400Regular',
      marginBottom: 20,
    },
    actions: {
      gap: 10,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 48,
      borderRadius: colors.radius,
      gap: 8,
    },
    actionBtnPrimary: {
      backgroundColor: colors.primary,
    },
    actionBtnSecondary: {
      backgroundColor: colors.secondary,
    },
    actionBtnText: {
      fontSize: 15,
      fontWeight: '600' as const,
      fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    btnDisabled: {
      opacity: 0.6,
    },
    errorText: {
      fontSize: 16,
      color: colors.foreground,
      fontFamily: 'PlusJakartaSans_500Medium',
      marginTop: 12,
    },
    backBtn: {
      marginTop: 16,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: colors.radius,
      backgroundColor: colors.secondary,
    },
    backBtnText: {
      fontSize: 14,
      fontFamily: 'PlusJakartaSans_500Medium',
      color: colors.foreground,
    },
  });
}
