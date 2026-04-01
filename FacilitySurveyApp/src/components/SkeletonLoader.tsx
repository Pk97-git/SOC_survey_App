import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Surface, useTheme } from 'react-native-paper';
import { Spacing, Radius } from '../constants/design';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const SkeletonBox: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = Radius.sm,
  style
}) => {
  const theme = useTheme();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true
        }),
      ])
    ).start();
  }, []);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6]
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.colors.surfaceVariant,
          opacity
        },
        style
      ]}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Preset skeleton layouts for common screens
// ─────────────────────────────────────────────────────────────────────────────

export const SiteCardSkeleton: React.FC = () => {
  const theme = useTheme();

  return (
    <Surface style={[styles.siteCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
      <View style={styles.skeletonRow}>
        <SkeletonBox width={56} height={56} borderRadius={Radius.md} />
        <View style={{ flex: 1, marginLeft: Spacing[3] }}>
          <SkeletonBox width="70%" height={18} style={{ marginBottom: 8 }} />
          <SkeletonBox width="45%" height={14} />
        </View>
      </View>
    </Surface>
  );
};

export const AssetCardSkeleton: React.FC = () => {
  const theme = useTheme();

  return (
    <Surface style={[styles.assetCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
      {/* Header */}
      <View style={{ marginBottom: Spacing[3] }}>
        <SkeletonBox width="80%" height={20} style={{ marginBottom: 8 }} />
        <SkeletonBox width="40%" height={14} />
      </View>

      {/* Chips */}
      <View style={[styles.skeletonRow, { marginBottom: Spacing[4] }]}>
        <SkeletonBox width={80} height={28} borderRadius={Radius.full} />
        <SkeletonBox width={80} height={28} borderRadius={Radius.full} style={{ marginLeft: 8 }} />
        <SkeletonBox width={80} height={28} borderRadius={Radius.full} style={{ marginLeft: 8 }} />
      </View>

      {/* Divider */}
      <SkeletonBox width="100%" height={1} style={{ marginBottom: Spacing[4] }} />

      {/* Condition Rating Buttons */}
      <SkeletonBox width="50%" height={16} style={{ marginBottom: Spacing[2] }} />
      <View style={[styles.skeletonRow, { flexWrap: 'wrap', gap: Spacing[2], marginBottom: Spacing[4] }]}>
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <SkeletonBox key={i} width={50} height={36} borderRadius={Radius.sm} />
        ))}
      </View>

      {/* Overall Condition */}
      <SkeletonBox width="100%" height={44} borderRadius={Radius.sm} style={{ marginBottom: Spacing[4] }} />

      {/* Photos */}
      <View style={[styles.skeletonRow, { marginTop: Spacing[3] }]}>
        <SkeletonBox width={100} height={100} borderRadius={Radius.lg} />
        <SkeletonBox width={100} height={100} borderRadius={Radius.lg} style={{ marginLeft: 8 }} />
        <SkeletonBox width={100} height={100} borderRadius={Radius.lg} style={{ marginLeft: 8 }} />
      </View>
    </Surface>
  );
};

export const DashboardStatSkeleton: React.FC = () => {
  const theme = useTheme();

  return (
    <Surface style={[styles.statCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
      <SkeletonBox width={48} height={48} borderRadius={Radius.md} style={{ marginBottom: Spacing[3] }} />
      <SkeletonBox width="60%" height={32} style={{ marginBottom: Spacing[2] }} />
      <SkeletonBox width="40%" height={14} />
    </Surface>
  );
};

export const HierarchyCardSkeleton: React.FC = () => {
  const theme = useTheme();

  return (
    <Surface style={[styles.hierarchyCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
      {/* Building name */}
      <View style={[styles.skeletonRow, { marginBottom: Spacing[3] }]}>
        <SkeletonBox width="60%" height={20} />
        <SkeletonBox width={40} height={20} borderRadius={Radius.full} />
      </View>

      {/* Trade rows */}
      <View style={{ paddingLeft: Spacing[4] }}>
        <View style={[styles.skeletonRow, { marginBottom: Spacing[2], justifyContent: 'space-between' }]}>
          <View style={{ flex: 1 }}>
            <SkeletonBox width="50%" height={16} style={{ marginBottom: 6 }} />
            <SkeletonBox width="70%" height={12} />
          </View>
          <SkeletonBox width={80} height={32} borderRadius={Radius.sm} />
        </View>

        <View style={[styles.skeletonRow, { marginBottom: Spacing[2], justifyContent: 'space-between' }]}>
          <View style={{ flex: 1 }}>
            <SkeletonBox width="45%" height={16} style={{ marginBottom: 6 }} />
            <SkeletonBox width="65%" height={12} />
          </View>
          <SkeletonBox width={80} height={32} borderRadius={Radius.sm} />
        </View>
      </View>
    </Surface>
  );
};

export const SurveyListSkeleton: React.FC = () => {
  const theme = useTheme();

  return (
    <Surface style={[styles.surveyListCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
      <View style={[styles.skeletonRow, { justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={{ flex: 1 }}>
          <View style={[styles.skeletonRow, { marginBottom: Spacing[1] }]}>
            <SkeletonBox width="30%" height={16} style={{ marginRight: 8 }} />
            <SkeletonBox width={80} height={20} borderRadius={Radius.sm} />
          </View>
          <SkeletonBox width="60%" height={12} />
        </View>
        <SkeletonBox width={90} height={36} borderRadius={Radius.sm} />
      </View>
    </Surface>
  );
};

// Loading screen with multiple skeletons
export const SiteListLoadingSkeleton: React.FC = () => (
  <View style={{ padding: Spacing[5] }}>
    <SiteCardSkeleton />
    <SiteCardSkeleton />
    <SiteCardSkeleton />
    <SiteCardSkeleton />
    <SiteCardSkeleton />
  </View>
);

export const AssetListLoadingSkeleton: React.FC = () => (
  <View>
    <AssetCardSkeleton />
    <AssetCardSkeleton />
    <AssetCardSkeleton />
  </View>
);

export const DashboardLoadingSkeleton: React.FC = () => (
  <View style={{ padding: Spacing[5] }}>
    {/* Stats Grid */}
    <View style={[styles.skeletonRow, { flexWrap: 'wrap', gap: Spacing[4], marginBottom: Spacing[6] }]}>
      <DashboardStatSkeleton />
      <DashboardStatSkeleton />
      <DashboardStatSkeleton />
      <DashboardStatSkeleton />
    </View>

    {/* Hierarchy */}
    <HierarchyCardSkeleton />
    <HierarchyCardSkeleton />
    <HierarchyCardSkeleton />
  </View>
);

const styles = StyleSheet.create({
  siteCard: {
    padding: Spacing[4],
    marginHorizontal: Spacing[5],
    marginVertical: Spacing[2],
    borderRadius: Radius.lg,
  },
  assetCard: {
    padding: Spacing[4],
    marginHorizontal: Spacing[4],
    marginVertical: Spacing[2],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statCard: {
    padding: Spacing[5],
    borderRadius: Radius.xl,
    width: '48%',
  },
  hierarchyCard: {
    padding: Spacing[4],
    marginBottom: Spacing[3],
    borderRadius: Radius.lg,
  },
  surveyListCard: {
    padding: Spacing[3],
    marginBottom: Spacing[2],
    borderRadius: Radius.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
