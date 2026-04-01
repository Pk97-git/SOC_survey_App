import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Surface, useTheme } from 'react-native-paper';
import { Typography, Spacing, Radius, Colors } from '../constants/design';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

interface EmptyStateProps {
  title: string;
  description: string;
  illustration?: 'clipboard' | 'search' | 'folder' | 'photo' | 'survey' | 'assets' | 'sites';
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom SVG illustrations for common empty states
// ─────────────────────────────────────────────────────────────────────────────

const EmptyIllustrations = {
  clipboard: () => (
    <Svg width="140" height="140" viewBox="0 0 140 140">
      {/* Background circle */}
      <Circle cx="70" cy="70" r="60" fill={Colors.green[50]} />

      {/* Clipboard */}
      <Rect x="45" y="35" width="50" height="70" rx="4" fill={Colors.neutral[0]} stroke={Colors.green[300]} strokeWidth="2.5" />

      {/* Clipboard top clip */}
      <Rect x="60" y="30" width="20" height="8" rx="4" fill={Colors.green[400]} />

      {/* Lines on clipboard */}
      <Rect x="52" y="50" width="36" height="3" rx="1.5" fill={Colors.green[100]} />
      <Rect x="52" y="60" width="36" height="3" rx="1.5" fill={Colors.green[100]} />
      <Rect x="52" y="70" width="28" height="3" rx="1.5" fill={Colors.green[100]} />
      <Rect x="52" y="80" width="32" height="3" rx="1.5" fill={Colors.green[100]} />

      {/* Checkmarks */}
      <Circle cx="55" cy="51" r="2" fill={Colors.green[400]} />
      <Circle cx="55" cy="61" r="2" fill={Colors.green[400]} />
    </Svg>
  ),

  search: () => (
    <Svg width="140" height="140" viewBox="0 0 140 140">
      {/* Background circle */}
      <Circle cx="70" cy="70" r="60" fill={Colors.gold[50]} />

      {/* Magnifying glass circle */}
      <Circle cx="65" cy="65" r="24" fill="none" stroke={Colors.gold[400]} strokeWidth="3.5" />

      {/* Magnifying glass handle */}
      <Path d="M 83 83 L 98 98" stroke={Colors.gold[400]} strokeWidth="3.5" strokeLinecap="round" />

      {/* Question mark inside */}
      <Path d="M 65 58 Q 65 52, 70 52 Q 75 52, 75 57 Q 75 62, 65 65" stroke={Colors.gold[600]} strokeWidth="2" strokeLinecap="round" fill="none" />
      <Circle cx="65" cy="70" r="1.5" fill={Colors.gold[600]} />
    </Svg>
  ),

  folder: () => (
    <Svg width="140" height="140" viewBox="0 0 140 140">
      {/* Background circle */}
      <Circle cx="70" cy="70" r="60" fill={Colors.neutral[100]} />

      {/* Folder back */}
      <Path
        d="M 40 60 L 50 50 L 70 50 L 75 55 L 100 55 L 100 95 L 40 95 Z"
        fill={Colors.green[100]}
        stroke={Colors.green[300]}
        strokeWidth="2"
      />

      {/* Folder front */}
      <Rect x="40" y="60" width="60" height="35" rx="2" fill={Colors.green[200]} stroke={Colors.green[400]} strokeWidth="2" />

      {/* Folder tab */}
      <Path d="M 40 60 L 50 50 L 70 50 L 75 55 L 75 60 Z" fill={Colors.green[300]} />

      {/* Empty indicator - dashed lines */}
      <Path d="M 55 75 L 85 75" stroke={Colors.neutral[300]} strokeWidth="2" strokeDasharray="4,4" strokeLinecap="round" />
      <Path d="M 55 82 L 75 82" stroke={Colors.neutral[300]} strokeWidth="2" strokeDasharray="4,4" strokeLinecap="round" />
    </Svg>
  ),

  photo: () => (
    <Svg width="140" height="140" viewBox="0 0 140 140">
      {/* Background circle */}
      <Circle cx="70" cy="70" r="60" fill={Colors.green[50]} />

      {/* Photo frame */}
      <Rect x="40" y="45" width="60" height="50" rx="4" fill={Colors.neutral[0]} stroke={Colors.green[300]} strokeWidth="2.5" />

      {/* Sun */}
      <Circle cx="55" cy="60" r="6" fill={Colors.gold[400]} />

      {/* Mountains - scenic photo */}
      <Path d="M 40 80 L 55 60 L 70 75 L 85 55 L 100 75 L 100 95 L 40 95 Z" fill={Colors.green[100]} />
      <Path d="M 40 85 L 55 65 L 70 80 L 85 60 L 100 80 L 100 95 L 40 95 Z" fill={Colors.green[200]} />

      {/* Camera icon overlay (indicating no photos) */}
      <G opacity="0.5">
        <Rect x="62" y="80" width="16" height="12" rx="2" fill={Colors.neutral[400]} />
        <Circle cx="70" cy="86" r="3" fill={Colors.neutral[0]} />
        <Rect x="67" y="78" width="6" height="2" fill={Colors.neutral[400]} />
      </G>
    </Svg>
  ),

  survey: () => (
    <Svg width="140" height="140" viewBox="0 0 140 140">
      {/* Background circle */}
      <Circle cx="70" cy="70" r="60" fill={Colors.green[50]} />

      {/* Document/Survey sheet */}
      <Rect x="45" y="35" width="50" height="70" rx="4" fill={Colors.neutral[0]} stroke={Colors.green[400]} strokeWidth="2.5" />

      {/* Title bar */}
      <Rect x="45" y="35" width="50" height="12" rx="4" fill={Colors.green[400]} />
      <Rect x="52" y="40" width="20" height="2" rx="1" fill={Colors.neutral[0]} />

      {/* Survey items - checkboxes and lines */}
      <Circle cx="53" cy="58" r="3" fill="none" stroke={Colors.green[400]} strokeWidth="1.5" />
      <Rect x="60" y="56" width="28" height="2" rx="1" fill={Colors.neutral[200]} />

      <Circle cx="53" cy="68" r="3" fill="none" stroke={Colors.green[400]} strokeWidth="1.5" />
      <Path d="M 51 68 L 52.5 69.5 L 55 66" stroke={Colors.green[400]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="60" y="66" width="28" height="2" rx="1" fill={Colors.neutral[200]} />

      <Circle cx="53" cy="78" r="3" fill="none" stroke={Colors.neutral[300]} strokeWidth="1.5" />
      <Rect x="60" y="76" width="20" height="2" rx="1" fill={Colors.neutral[200]} />

      <Circle cx="53" cy="88" r="3" fill="none" stroke={Colors.neutral[300]} strokeWidth="1.5" />
      <Rect x="60" y="86" width="24" height="2" rx="1" fill={Colors.neutral[200]} />
    </Svg>
  ),

  assets: () => (
    <Svg width="140" height="140" viewBox="0 0 140 140">
      {/* Background circle */}
      <Circle cx="70" cy="70" r="60" fill={Colors.green[50]} />

      {/* Building/Asset icon */}
      <Rect x="50" y="45" width="40" height="50" rx="2" fill={Colors.neutral[0]} stroke={Colors.green[400]} strokeWidth="2.5" />

      {/* Windows */}
      <Rect x="56" y="52" width="8" height="8" rx="1" fill={Colors.green[100]} />
      <Rect x="68" y="52" width="8" height="8" rx="1" fill={Colors.green[100]} />
      <Rect x="56" y="64" width="8" height="8" rx="1" fill={Colors.green[100]} />
      <Rect x="68" y="64" width="8" height="8" rx="1" fill={Colors.green[100]} />
      <Rect x="56" y="76" width="8" height="8" rx="1" fill={Colors.green[100]} />
      <Rect x="68" y="76" width="8" height="8" rx="1" fill={Colors.green[100]} />

      {/* Door */}
      <Rect x="62" y="85" width="8" height="10" rx="1" fill={Colors.gold[400]} />

      {/* Roof */}
      <Path d="M 45 45 L 70 30 L 95 45 Z" fill={Colors.green[400]} />

      {/* Plus sign indicating add asset */}
      <Circle cx="85" cy="80" r="10" fill={Colors.gold[400]} />
      <Path d="M 85 74 L 85 86 M 79 80 L 91 80" stroke={Colors.neutral[0]} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  ),

  sites: () => (
    <Svg width="140" height="140" viewBox="0 0 140 140">
      {/* Background circle */}
      <Circle cx="70" cy="70" r="60" fill={Colors.green[50]} />

      {/* Map/Location icon */}
      <Circle cx="70" cy="65" r="28" fill="none" stroke={Colors.green[300]} strokeWidth="2.5" strokeDasharray="6,4" />

      {/* Location pin */}
      <Path
        d="M 70 45 C 62 45, 56 51, 56 59 C 56 67, 70 80, 70 80 C 70 80, 84 67, 84 59 C 84 51, 78 45, 70 45 Z"
        fill={Colors.green[400]}
        stroke={Colors.green[600]}
        strokeWidth="2"
      />
      <Circle cx="70" cy="59" r="4" fill={Colors.neutral[0]} />

      {/* Small dots indicating multiple sites */}
      <Circle cx="52" cy="60" r="3" fill={Colors.gold[400]} opacity="0.6" />
      <Circle cx="88" cy="60" r="3" fill={Colors.gold[400]} opacity="0.6" />
      <Circle cx="60" cy="78" r="3" fill={Colors.gold[400]} opacity="0.6" />
    </Svg>
  ),
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  illustration = 'clipboard',
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  const theme = useTheme();
  const IllustrationComponent = EmptyIllustrations[illustration] || EmptyIllustrations.clipboard;

  return (
    <View style={styles.container}>
      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={0}>
        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <IllustrationComponent />
        </View>

        {/* Text */}
        <Text style={[Typography.h3, { color: theme.colors.onSurface, textAlign: 'center', marginBottom: Spacing[2] }]}>
          {title}
        </Text>
        <Text style={[Typography.bodyMd, { color: theme.colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22, paddingHorizontal: Spacing[2] }]}>
          {description}
        </Text>

        {/* Actions */}
        {(actionLabel || secondaryActionLabel) && (
          <View style={styles.actions}>
            {actionLabel && onAction && (
              <Button
                mode="contained"
                onPress={onAction}
                style={{ borderRadius: Radius.lg }}
                contentStyle={{ height: 48 }}
                labelStyle={{ fontWeight: '600', fontSize: 15 }}
                buttonColor={theme.colors.primary}
              >
                {actionLabel}
              </Button>
            )}
            {secondaryActionLabel && onSecondaryAction && (
              <Button
                mode="text"
                onPress={onSecondaryAction}
                style={{ marginTop: Spacing[2] }}
                labelStyle={{ fontSize: 14 }}
              >
                {secondaryActionLabel}
              </Button>
            )}
          </View>
        )}
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[8],
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: Spacing[8],
    borderRadius: Radius.xl,
    alignItems: 'center',
  },
  illustrationContainer: {
    marginBottom: Spacing[6],
  },
  actions: {
    marginTop: Spacing[6],
    width: '100%',
  },
});
