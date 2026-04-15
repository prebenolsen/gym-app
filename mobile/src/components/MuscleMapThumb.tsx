import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { type MuscleGroup } from '@gym-app/shared';

type Props = {
  group: MuscleGroup;
  size?: number;
  mutedColor?: string;
  highlightColor?: string;
};

const DEFAULT_MUTED = '#3f3f46';
const DEFAULT_HIGHLIGHT = '#10b981';

const anatomyFrontImg = require('../../../shared/assets/anatomy_white.svg');
const anatomyBackImg = require('../../../shared/assets/anatomy_white_back.svg');

const usesBackView = (group: MuscleGroup): boolean =>
  group === 'Back' ||
  group === 'Hamstrings / Glutes' ||
  group === 'Calves' ||
  group === 'Triceps';

const isActive = (target: MuscleGroup, current: MuscleGroup): boolean => target === current;

export default function MuscleMapThumb({
  group,
  size = 52,
  mutedColor = DEFAULT_MUTED,
  highlightColor = DEFAULT_HIGHLIGHT,
}: Props) {
  const height = Math.round(size * 1.5);
  const backView = usesBackView(group);
  const region = (target: MuscleGroup) => (isActive(target, group) ? highlightColor : mutedColor);

  const chest = region('Chest');
  const shoulders = region('Shoulders');
  const biceps = region('Biceps');
  const triceps = region('Triceps');
  const core = region('Core / Abs');
  const back = region('Back');
  const quads = region('Legs (Quads focus)');
  const hamsGlutes = region('Hamstrings / Glutes');
  const calves = region('Calves');

  return (
    <View style={[styles.wrap, { width: size, height }]}>
      <Image
        source={backView ? anatomyBackImg : anatomyFrontImg}
        resizeMode="contain"
        style={StyleSheet.absoluteFillObject}
      />

      <Svg width={size} height={height} viewBox="0 0 1024 1536" style={StyleSheet.absoluteFillObject}>
        {backView ? (
          <>
            <Ellipse cx={385} cy={410} rx={95} ry={95} fill={shoulders} opacity={0.3} />
            <Ellipse cx={639} cy={410} rx={95} ry={95} fill={shoulders} opacity={0.3} />

            <Path d="M420 390 C470 350 554 350 604 390 L604 520 C560 560 464 560 420 520 Z" fill={back} opacity={0.34} />
            <Path d="M438 370 C476 338 548 338 586 370 L582 450 C548 470 476 470 442 450 Z" fill={back} opacity={0.26} />

            <Path d="M302 520 C334 548 344 626 326 704 C292 672 278 594 302 520 Z" fill={triceps} opacity={0.32} />
            <Path d="M722 520 C746 594 732 672 698 704 C680 626 690 548 722 520 Z" fill={triceps} opacity={0.32} />

            <Path d="M430 748 C470 730 554 730 594 748 L604 850 C560 878 464 878 420 850 Z" fill={hamsGlutes} opacity={0.34} />

            <Path d="M422 850 C462 832 506 832 512 832 C518 832 562 832 602 850 L608 1032 C564 1060 460 1060 416 1032 Z" fill={hamsGlutes} opacity={0.3} />

            <Path d="M436 1058 C470 1088 472 1216 444 1310 C414 1252 408 1124 436 1058 Z" fill={calves} opacity={0.34} />
            <Path d="M588 1058 C616 1124 610 1252 580 1310 C552 1216 554 1088 588 1058 Z" fill={calves} opacity={0.34} />
          </>
        ) : (
          <>
            <Ellipse cx={385} cy={413} rx={95} ry={95} fill={shoulders} opacity={0.32} />
            <Ellipse cx={639} cy={413} rx={95} ry={95} fill={shoulders} opacity={0.32} />

            <Path d="M420 418 C470 380 554 380 604 418 L592 530 C550 560 474 560 432 530 Z" fill={chest} opacity={0.34} />

            <Path d="M452 548 C492 536 532 536 572 548 L578 760 C534 784 490 784 446 760 Z" fill={core} opacity={0.33} />
            <Path d="M405 560 C440 590 446 678 430 770 C396 742 382 654 405 560 Z" fill={core} opacity={0.28} />
            <Path d="M619 560 C642 654 628 742 594 770 C578 678 584 590 619 560 Z" fill={core} opacity={0.28} />

            <Path d="M322 470 C358 498 372 575 354 664 C314 630 298 548 322 470 Z" fill={biceps} opacity={0.32} />
            <Path d="M702 470 C726 548 710 630 670 664 C652 575 666 498 702 470 Z" fill={biceps} opacity={0.32} />

            <Path d="M304 642 C334 676 336 756 316 834 C286 796 278 718 304 642 Z" fill={triceps} opacity={0.2} />
            <Path d="M720 642 C746 718 738 796 708 834 C688 756 690 676 720 642 Z" fill={triceps} opacity={0.2} />

            <Path d="M430 812 C468 788 508 780 512 780 C516 780 556 788 594 812 L606 1052 C564 1082 460 1082 418 1052 Z" fill={quads} opacity={0.32} />

            <Path d="M442 790 C482 772 542 772 582 790 L590 858 C548 878 476 878 434 858 Z" fill={hamsGlutes} opacity={0.23} />

            <Path d="M438 1054 C470 1082 474 1220 446 1320 C416 1260 410 1126 438 1054 Z" fill={calves} opacity={0.32} />
            <Path d="M586 1054 C614 1126 608 1260 578 1320 C550 1220 554 1082 586 1054 Z" fill={calves} opacity={0.32} />
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderRadius: 6,
  },
});
