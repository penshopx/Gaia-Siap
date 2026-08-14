import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import type { Case, CaseStatus } from '@workspace/api-client-react';

// ─── Status Badge ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<CaseStatus, { label: string; bg: string; text: string; borderColor: string }> = {
  draft:      { label: 'Draft',      bg: '#F1F5F9', text: '#64748B', borderColor: '#CBD5E1' },
  intake:     { label: 'Intake',     bg: '#EFF6FF', text: '#1D4ED8', borderColor: '#BFDBFE' },
  processing: { label: 'Processing', bg: '#FFFBEB', text: '#92400E', borderColor: '#FDE68A' },
  review:     { label: 'Review',     bg: '#F5F3FF', text: '#5B21B6', borderColor: '#DDD6FE' },
  completed:  { label: 'Completed',  bg: '#F0FDF4', text: '#166534', borderColor: '#BBF7D0' },
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: cfg.bg, borderColor: cfg.borderColor }]}>
      <Text style={[badgeStyles.text, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<'low' | 'normal' | 'high', { label: string; bg: string; text: string; borderColor: string }> = {
  low:    { label: 'Low',    bg: '#F8FAFC', text: '#64748B', borderColor: '#E2E8F0' },
  normal: { label: 'Normal', bg: '#EFF6FF', text: '#1D4ED8', borderColor: '#BFDBFE' },
  high:   { label: 'High',   bg: '#FEF2F2', text: '#DC2626', borderColor: '#FECACA' },
};

export function PriorityBadge({ priority }: { priority: 'low' | 'normal' | 'high' }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.normal;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: cfg.bg, borderColor: cfg.borderColor }]}>
      <Text style={[badgeStyles.text, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '600' as const,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});

// ─── Case Card ────────────────────────────────────────────────────────────────

interface CaseCardProps {
  item: Case;
  onPress: () => void;
}

export function CaseCard({ item, onPress }: CaseCardProps) {
  const colors = useColors();

  const updatedAt = new Date(item.updatedAt);
  const now = new Date();
  const diffMs = now.getTime() - updatedAt.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const timeLabel =
    diffDays === 0 ? 'Today' :
    diffDays === 1 ? 'Yesterday' :
    `${diffDays}d ago`;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.cardTop}>
        <View style={styles.badges}>
          <StatusBadge status={item.status} />
          {item.priority && item.priority !== 'normal' && (
            <PriorityBadge priority={item.priority as 'low' | 'normal' | 'high'} />
          )}
        </View>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>

      <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
        {item.title}
      </Text>

      {item.description ? (
        <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}

      <View style={styles.footer}>
        {item.category ? (
          <View style={[styles.categoryBadge, { backgroundColor: colors.muted }]}>
            <Text style={[styles.category, { color: colors.mutedForeground }]}>{item.category}</Text>
          </View>
        ) : <View />}
        <Text style={[styles.time, { color: colors.mutedForeground }]}>{timeLabel}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap' as const,
  },
  title: {
    fontSize: 15,
    fontWeight: '600' as const,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    lineHeight: 22,
  },
  desc: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  categoryBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  category: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  time: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
});
