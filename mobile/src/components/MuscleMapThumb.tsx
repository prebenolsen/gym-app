import React from 'react';
import Svg, { Ellipse, Path, Rect } from 'react-native-svg';
import { type MuscleGroup } from '@gym-app/shared';

type Props = {
  group: MuscleGroup;
  size?: number;
  mutedColor?: string;
  highlightColor?: string;
  skinColor?: string;
  outlineColor?: string;
};

const DEFAULT_SKIN = '#71717a';
const DEFAULT_OUTLINE = '#3f3f46';
const DEFAULT_MUTED = '#3f3f46';
const DEFAULT_HIGHLIGHT = '#10b981';

const usesBackView = (group: MuscleGroup): boolean =>
  group === 'Back' || group === 'Hamstrings / Glutes' || group === 'Calves';

export default function MuscleMapThumb({
  group,
  size = 52,
  mutedColor = DEFAULT_MUTED,
  highlightColor = DEFAULT_HIGHLIGHT,
  skinColor = DEFAULT_SKIN,
  outlineColor = DEFAULT_OUTLINE,
}: Props) {
  const front = !usesBackView(group);

  const chest = group === 'Chest' ? highlightColor : mutedColor;
  const shoulders = group === 'Shoulders' ? highlightColor : mutedColor;
  const biceps = group === 'Biceps' ? highlightColor : mutedColor;
  const triceps = group === 'Triceps' ? highlightColor : mutedColor;
  const forearms = group === 'Biceps' || group === 'Triceps' ? highlightColor : mutedColor;
  const upperAbs = group === 'Core / Abs' ? highlightColor : mutedColor;
  const lowerAbs = group === 'Core / Abs' ? highlightColor : mutedColor;
  const obliques = group === 'Core / Abs' ? highlightColor : mutedColor;
  const lats = group === 'Back' ? highlightColor : mutedColor;
  const traps = group === 'Back' ? highlightColor : mutedColor;
  const rhomboids = group === 'Back' ? highlightColor : mutedColor;
  const lowerBack = group === 'Back' ? highlightColor : mutedColor;
  const quads = group === 'Legs (Quads focus)' ? highlightColor : mutedColor;
  const hamstrings = group === 'Hamstrings / Glutes' ? highlightColor : mutedColor;
  const glutes = group === 'Hamstrings / Glutes' ? highlightColor : mutedColor;
  const calves = group === 'Calves' ? highlightColor : mutedColor;

  return (
    <Svg width={size} height={Math.round(size * 3.25)} viewBox="0 0 80 260">
      <Ellipse cx={40} cy={14} rx={12} ry={14} fill={skinColor} stroke={outlineColor} strokeWidth={0.5} />
      <Rect x={34} y={26} width={12} height={10} rx={3} fill={skinColor} />

      <Path d="M22 36 Q40 32 58 36 L60 100 Q40 106 20 100Z" fill={skinColor} stroke={outlineColor} strokeWidth={0.5} />

      {front ? (
        <>
          <Ellipse cx={16} cy={46} rx={9} ry={12} fill={shoulders} opacity={0.9} />
          <Ellipse cx={64} cy={46} rx={9} ry={12} fill={shoulders} opacity={0.9} />

          <Path d="M26 40 Q40 36 42 40 L40 60 Q32 64 26 58Z" fill={chest} opacity={0.9} />
          <Path d="M54 40 Q40 36 38 40 L40 60 Q48 64 54 58Z" fill={chest} opacity={0.9} />

          <Rect x={33} y={63} width={6} height={7} rx={1.5} fill={upperAbs} opacity={0.9} />
          <Rect x={41} y={63} width={6} height={7} rx={1.5} fill={upperAbs} opacity={0.9} />
          <Rect x={33} y={73} width={6} height={7} rx={1.5} fill={lowerAbs} opacity={0.9} />
          <Rect x={41} y={73} width={6} height={7} rx={1.5} fill={lowerAbs} opacity={0.9} />
          <Rect x={33} y={83} width={6} height={7} rx={1.5} fill={lowerAbs} opacity={0.9} />
          <Rect x={41} y={83} width={6} height={7} rx={1.5} fill={lowerAbs} opacity={0.9} />

          <Path d="M22 58 Q20 72 22 96 L26 94 Q26 74 26 60Z" fill={obliques} opacity={0.85} />
          <Path d="M58 58 Q60 72 58 96 L54 94 Q54 74 54 60Z" fill={obliques} opacity={0.85} />

          <Rect x={6} y={56} width={10} height={30} rx={4} fill={skinColor} stroke={outlineColor} strokeWidth={0.5} />
          <Rect x={64} y={56} width={10} height={30} rx={4} fill={skinColor} stroke={outlineColor} strokeWidth={0.5} />
          <Path d="M7 58 Q11 56 14 58 L14 72 Q11 76 7 72Z" fill={biceps} opacity={0.9} />
          <Path d="M73 58 Q69 56 66 58 L66 72 Q69 76 73 72Z" fill={biceps} opacity={0.9} />

          <Rect x={4} y={86} width={12} height={22} rx={4} fill={forearms} opacity={0.85} />
          <Rect x={64} y={86} width={12} height={22} rx={4} fill={forearms} opacity={0.85} />

          <Rect x={22} y={100} width={36} height={20} rx={6} fill={skinColor} stroke={outlineColor} strokeWidth={0.5} />
          <Path d="M24 102 Q40 98 56 102 L54 118 Q40 122 26 118Z" fill={mutedColor} opacity={0.8} />

          <Rect x={22} y={118} width={16} height={64} rx={7} fill={skinColor} stroke={outlineColor} strokeWidth={0.5} />
          <Path d="M23 120 Q30 117 37 120 L36 176 Q30 180 24 176Z" fill={quads} opacity={0.9} />
          <Rect x={42} y={118} width={16} height={64} rx={7} fill={skinColor} stroke={outlineColor} strokeWidth={0.5} />
          <Path d="M57 120 Q50 117 43 120 L44 176 Q50 180 56 176Z" fill={quads} opacity={0.9} />

          <Ellipse cx={30} cy={184} rx={8} ry={7} fill={skinColor} stroke={outlineColor} strokeWidth={0.5} />
          <Ellipse cx={50} cy={184} rx={8} ry={7} fill={skinColor} stroke={outlineColor} strokeWidth={0.5} />
          <Rect x={22} y={190} width={16} height={62} rx={7} fill={skinColor} stroke={outlineColor} strokeWidth={0.5} />
          <Rect x={42} y={190} width={16} height={62} rx={7} fill={skinColor} stroke={outlineColor} strokeWidth={0.5} />
        </>
      ) : (
        <>
          <Path d="M28 36 Q40 32 52 36 L50 52 Q40 48 30 52Z" fill={traps} opacity={0.9} />
          <Path d="M30 52 Q40 48 50 52 L48 64 Q40 60 32 64Z" fill={rhomboids} opacity={0.9} />
          <Ellipse cx={16} cy={46} rx={9} ry={12} fill={shoulders} opacity={0.85} />
          <Ellipse cx={64} cy={46} rx={9} ry={12} fill={shoulders} opacity={0.85} />
          <Path d="M22 48 Q28 56 30 72 L26 82 Q18 68 20 52Z" fill={lats} opacity={0.9} />
          <Path d="M58 48 Q52 56 50 72 L54 82 Q62 68 60 52Z" fill={lats} opacity={0.9} />
          <Path d="M30 72 Q40 68 50 72 L50 98 Q40 102 30 98Z" fill={lowerBack} opacity={0.9} />

          <Rect x={6} y={56} width={10} height={52} rx={4} fill={skinColor} stroke={outlineColor} strokeWidth={0.5} />
          <Rect x={64} y={56} width={10} height={52} rx={4} fill={skinColor} stroke={outlineColor} strokeWidth={0.5} />
          <Rect x={4} y={86} width={12} height={22} rx={4} fill={forearms} opacity={0.85} />
          <Rect x={64} y={86} width={12} height={22} rx={4} fill={forearms} opacity={0.85} />

          <Rect x={22} y={100} width={36} height={22} rx={7} fill={glutes} opacity={0.9} />

          <Rect x={22} y={120} width={16} height={62} rx={7} fill={skinColor} stroke={outlineColor} strokeWidth={0.5} />
          <Path d="M23 122 Q30 119 37 122 L36 176 Q30 180 24 176Z" fill={hamstrings} opacity={0.9} />
          <Rect x={42} y={120} width={16} height={62} rx={7} fill={skinColor} stroke={outlineColor} strokeWidth={0.5} />
          <Path d="M57 122 Q50 119 43 122 L44 176 Q50 180 56 176Z" fill={hamstrings} opacity={0.9} />

          <Ellipse cx={30} cy={184} rx={8} ry={7} fill={skinColor} stroke={outlineColor} strokeWidth={0.5} />
          <Ellipse cx={50} cy={184} rx={8} ry={7} fill={skinColor} stroke={outlineColor} strokeWidth={0.5} />

          <Rect x={22} y={190} width={16} height={62} rx={7} fill={skinColor} stroke={outlineColor} strokeWidth={0.5} />
          <Rect x={42} y={190} width={16} height={62} rx={7} fill={skinColor} stroke={outlineColor} strokeWidth={0.5} />
          <Path d="M23 192 Q30 189 37 192 L36 232 Q30 238 24 232Z" fill={calves} opacity={0.9} />
          <Path d="M57 192 Q50 189 43 192 L44 232 Q50 238 56 232Z" fill={calves} opacity={0.9} />
        </>
      )}

      {!front && group === 'Back' ? (
        <Path d="M36 78 Q40 74 44 78 L42 86 Q40 88 38 86Z" fill={lats} opacity={0.95} />
      ) : null}

      {!front && group === 'Triceps' ? (
        <>
          <Path d="M6 78 Q11 74 16 78 L16 94 Q11 98 6 94Z" fill={triceps} opacity={0.9} />
          <Path d="M74 78 Q69 74 64 78 L64 94 Q69 98 74 94Z" fill={triceps} opacity={0.9} />
        </>
      ) : null}
    </Svg>
  );
}
