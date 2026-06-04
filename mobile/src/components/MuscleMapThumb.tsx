import React from 'react';
import { StyleSheet, View } from 'react-native';
import { type MuscleGroup } from '@gym-app/shared';
import { usePreferences } from '../context/PreferencesContext';
import MuscleMapThumbBack from './MuscleMapThumbBack';
import MuscleMapThumbFront from './MuscleMapThumbFront';

type Props = {
  group?: MuscleGroup;
  groups?: MuscleGroup[];
  size?: number;
  mutedColor?: string;
  highlightColor?: string;
};

const DEFAULT_MUTED = '#3f3f46';
const DEFAULT_HIGHLIGHT = '#10b981';
const VIEWBOX_WIDTH = 1024;
const VIEWBOX_HEIGHT = 1536;

function getViewAndPaths(muscleGroup: MuscleGroup): { useBack: boolean; paths: string[] } {
  const viewMap: Record<MuscleGroup, { useBack: boolean; paths: string[] }> = {
    Chest: { useBack: false, paths: ['chest_left', 'chest_right'] },
    Back: {
      useBack: true,
      paths: [
        'back_left',
        'back_right',
        'back_trapezius',
        'back_rear_delt_right_upper',
        'back_rear_delt_right_lower',
        'back_rear_delt_left_upper',
        'back_rear_delt_left_lower',
      ],
    },
    Shoulders: { useBack: false, paths: ['shoulder_left', 'shoulder_right'] },
    Biceps: { useBack: false, paths: ['arms_left', 'arms_right'] },
    Triceps: { useBack: false, paths: ['arms_left', 'arms_right'] },
    Forearms: { useBack: false, paths: ['arms_left', 'arms_right'] },
    'Core / Abs': {
      useBack: false,
      paths: [
        'abs_upper_left',
        'abs_upper_right',
        'abs_middle_left',
        'abs_middle_right',
        'abs_bottom_left',
        'abs_bottom_right',
      ],
    },
    'Legs': { useBack: false, paths: ['leg_left', 'leg_right'] },
    Hamstrings: {
      useBack: true,
      paths: [
        'hamstring_left_middle',
        'hamstring_left_left',
        'hamstring_left_right',
        'hamstring_right_left',
        'hamstring_right_middle',
        'hamstring_right_right',
      ],
    },
    Glutes: {
      useBack: true,
      paths: ['glutes_left', 'glutes_right'],
    },
    Calves: {
      useBack: true,
      paths: [
        'calves_left',
        'calves_right',
        'calves_left_left',
        'calves_left_right',
        'calves_right_left',
        'calves_right_right',
        'path37',
      ],
    },
  };

  return viewMap[muscleGroup] ?? { useBack: false, paths: [] };
}

export default function MuscleMapThumb({
  group,
  groups,
  size = 56,
  mutedColor,
  highlightColor,
}: Props) {
  const { colors } = usePreferences();
  const height = Math.round(size * (VIEWBOX_HEIGHT / VIEWBOX_WIDTH));
  const resolvedMutedColor = mutedColor ?? colors.textMuted ?? DEFAULT_MUTED;
  const resolvedHighlightColor = highlightColor ?? colors.accent ?? DEFAULT_HIGHLIGHT;
  const frameBorder = colors.thumbFrameBorder;
  const frameBackground = colors.thumbFrameBackground;
  const mutedOpacity = 0.1;
  const highlightOpacity = 0.65;

  const selectedGroups = groups?.length ? groups : group ? [group] : [];
  const { frontCount, backCount, frontPaths, backPaths } = selectedGroups.reduce(
    (acc, muscleGroup) => {
      const { useBack: isBackView, paths } = getViewAndPaths(muscleGroup);
      if (isBackView) {
        acc.backCount += 1;
        paths.forEach((path) => acc.backPaths.add(path));
      } else {
        acc.frontCount += 1;
        paths.forEach((path) => acc.frontPaths.add(path));
      }
      return acc;
    },
    {
      frontCount: 0,
      backCount: 0,
      frontPaths: new Set<string>(),
      backPaths: new Set<string>(),
    },
  );

  const resolvedUseBack = backCount > frontCount;
  const resolvedPaths = resolvedUseBack
    ? Array.from(backPaths)
    : Array.from(frontPaths);

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height,
          borderColor: frameBorder,
          backgroundColor: frameBackground,
        },
      ]}
    >
      {resolvedUseBack ? (
        <MuscleMapThumbBack
          size={size}
          height={height}
          viewBoxWidth={VIEWBOX_WIDTH}
          viewBoxHeight={VIEWBOX_HEIGHT}
          activePaths={resolvedPaths}
          mutedColor={resolvedMutedColor}
          highlightColor={resolvedHighlightColor}
          mutedOpacity={mutedOpacity}
          highlightOpacity={highlightOpacity}
        />
      ) : (
        <MuscleMapThumbFront
          size={size}
          height={height}
          viewBoxWidth={VIEWBOX_WIDTH}
          viewBoxHeight={VIEWBOX_HEIGHT}
          activePaths={resolvedPaths}
          mutedColor={resolvedMutedColor}
          highlightColor={resolvedHighlightColor}
          mutedOpacity={mutedOpacity}
          highlightOpacity={highlightOpacity}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
  },
});
