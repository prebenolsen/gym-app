import React, { useMemo } from 'react';
import Svg, { G, Path } from 'react-native-svg';
import { BACK_SVG_PATHS } from './backSvgPaths.generated';

type Props = {
  size: number;
  height: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  activePaths: string[];
  mutedColor: string;
  highlightColor: string;
  mutedOpacity: number;
  highlightOpacity: number;
};

const BASE_SHAPE_IDS = new Set(['path1', 'back_body_bg']);

function comparePathIds(a: string, b: string): number {
  const aMatch = a.match(/^path(\d+)$/);
  const bMatch = b.match(/^path(\d+)$/);

  if (aMatch && bMatch) {
    return Number(aMatch[1]) - Number(bMatch[1]);
  }

  if (aMatch) return -1;
  if (bMatch) return 1;
  return a.localeCompare(b);
}

export default function MuscleMapThumbBack({
  size,
  height,
  viewBoxWidth,
  viewBoxHeight,
  activePaths,
  mutedColor,
  highlightColor,
  mutedOpacity,
  highlightOpacity,
}: Props) {
  const safeBackPaths = BACK_SVG_PATHS ?? {};
  const safeActivePaths = Array.isArray(activePaths) ? activePaths : [];

  const orderedEntries = useMemo(
    () => Object.entries(safeBackPaths).sort(([a], [b]) => comparePathIds(a, b)),
    [safeBackPaths],
  );

  return (
    <Svg
      width={size}
      height={height}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {orderedEntries.map(([pathId, pathInfo]) => {
        if (BASE_SHAPE_IDS.has(pathId)) {
          return (
            <G key={pathId} transform={pathInfo.transform}>
              <Path d={pathInfo.d} fill={pathInfo.fill ?? '#fafafa'} opacity={1} />
            </G>
          );
        }

        const isActive = safeActivePaths.includes(pathId);

        return (
          <G key={pathId} transform={pathInfo.transform}>
            <Path
              d={pathInfo.d}
              fill={isActive ? highlightColor : mutedColor}
              opacity={isActive ? highlightOpacity : mutedOpacity}
            />
          </G>
        );
      })}
    </Svg>
  );
}
