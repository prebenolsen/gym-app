import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { type MuscleGroup } from '@gym-app/shared';
import { usePreferences } from '../context/PreferencesContext';

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
  size = 56,
  mutedColor = DEFAULT_MUTED,
  highlightColor = DEFAULT_HIGHLIGHT,
}: Props) {
  const { theme } = usePreferences();
  const height = Math.round(size * 2.2);
  const backView = usesBackView(group);
  const baseTint = theme === 'dark' ? '#cbd5e1' : mutedColor;
  const baseOpacity = theme === 'dark' ? 0.07 : 0.045;
  const activeOpacity = theme === 'dark' ? 0.68 : 0.62;
  const activeStroke = theme === 'dark' ? '#d1fae5' : '#065f46';
  const inactiveStroke = theme === 'dark' ? '#1e293b' : '#e2e8f0';
  const silhouette = theme === 'dark' ? '#f8fafc' : '#0f172a';
  const region = (target: MuscleGroup) => (isActive(target, group) ? highlightColor : baseTint);

  const chest = region('Chest');
  const shoulders = region('Shoulders');
  const biceps = region('Biceps');
  const triceps = region('Triceps');
  const core = region('Core / Abs');
  const back = region('Back');
  const quads = region('Legs (Quads focus)');
  const hamsGlutes = region('Hamstrings / Glutes');
  const calves = region('Calves');
  const frameBorder = theme === 'dark' ? '#64748b' : '#0f172a';
  const frameBackground = theme === 'dark' ? '#0b1220' : '#ffffff';
  const imgOpacity = theme === 'dark' ? 0.94 : 0.98;

  const regionStyle = (target: MuscleGroup, boost = 0) => ({
    fill: region(target),
    opacity: isActive(target, group) ? Math.min(0.8, activeOpacity + boost) : baseOpacity,
    stroke: isActive(target, group) ? activeStroke : inactiveStroke,
    strokeWidth: isActive(target, group) ? 9 : 2,
  });

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
      <Image
        source={backView ? anatomyBackImg : anatomyFrontImg}
        resizeMode="cover"
        style={[StyleSheet.absoluteFillObject, { opacity: imgOpacity }]}
      />

      <Svg
        width={size}
        height={height}
        viewBox="0 0 1024 1536"
        style={StyleSheet.absoluteFillObject}
      >
        {backView ? (
          <>
            <Path d="M512 150 C640 150 754 238 776 386 C804 564 720 790 610 1248 C578 1378 552 1450 512 1494 C472 1450 446 1378 414 1248 C304 790 220 564 248 386 C270 238 384 150 512 150 Z" fill={silhouette} opacity={theme === 'dark' ? 0.1 : 0.08} />

            <Path d="M318 404 C352 364 402 364 436 404 C426 444 390 468 346 458 C322 444 312 426 318 404 Z" {...regionStyle('Shoulders')} />
            <Path d="M706 404 C672 364 622 364 588 404 C598 444 634 468 678 458 C702 444 712 426 706 404 Z" {...regionStyle('Shoulders')} />

            <Path d="M406 392 C468 350 556 350 618 392 L618 562 C566 606 458 606 406 562 Z" {...regionStyle('Back')} />
            <Path d="M438 374 C478 338 546 338 586 374 L580 474 C546 496 478 496 444 474 Z" {...regionStyle('Back', -0.08)} />

            <Path d="M300 520 C336 548 350 626 332 712 C294 676 278 592 300 520 Z" {...regionStyle('Triceps')} />
            <Path d="M724 520 C746 592 730 676 692 712 C674 626 688 548 724 520 Z" {...regionStyle('Triceps')} />

            <Path d="M422 748 C468 722 556 722 602 748 L610 870 C562 904 462 904 414 870 Z" {...regionStyle('Hamstrings / Glutes')} />

            <Path d="M416 858 C458 832 566 832 608 858 L610 1048 C564 1084 460 1084 414 1048 Z" {...regionStyle('Hamstrings / Glutes', -0.08)} />

            <Path d="M434 1060 C470 1088 474 1220 444 1328 C414 1268 406 1128 434 1060 Z" {...regionStyle('Calves')} />
            <Path d="M590 1060 C618 1128 610 1268 580 1328 C550 1220 554 1088 590 1060 Z" {...regionStyle('Calves')} />
          </>
        ) : (
          <>
            <Path d="M512 150 C640 150 754 238 776 386 C804 564 720 790 610 1248 C578 1378 552 1450 512 1494 C472 1450 446 1378 414 1248 C304 790 220 564 248 386 C270 238 384 150 512 150 Z" fill={silhouette} opacity={theme === 'dark' ? 0.1 : 0.08} />

            <Path d="M318 410 C350 370 400 370 434 410 C424 448 390 470 346 462 C322 448 312 430 318 410 Z" {...regionStyle('Shoulders')} />
            <Path d="M706 410 C674 370 624 370 590 410 C600 448 634 470 678 462 C702 448 712 430 706 410 Z" {...regionStyle('Shoulders')} />

            <Path d="M406 420 C468 376 556 376 618 420 L602 560 C552 598 472 598 422 560 Z" {...regionStyle('Chest')} />

            <Path d="M450 560 C490 540 534 540 574 560 L578 772 C536 804 488 804 446 772 Z" {...regionStyle('Core / Abs')} />
            <Path d="M402 566 C438 598 444 690 426 782 C392 752 378 660 402 566 Z" {...regionStyle('Core / Abs', -0.1)} />
            <Path d="M622 566 C646 660 632 752 598 782 C580 690 586 598 622 566 Z" {...regionStyle('Core / Abs', -0.1)} />

            <Path d="M320 474 C360 506 372 584 352 674 C312 636 296 548 320 474 Z" {...regionStyle('Biceps')} />
            <Path d="M704 474 C728 548 712 636 672 674 C652 584 664 506 704 474 Z" {...regionStyle('Biceps')} />

            <Path d="M304 648 C336 680 338 764 318 846 C286 806 278 724 304 648 Z" {...regionStyle('Triceps')} />
            <Path d="M720 648 C746 724 738 806 706 846 C686 764 688 680 720 648 Z" {...regionStyle('Triceps')} />

            <Path d="M424 812 C468 782 556 782 600 812 L612 1068 C564 1104 460 1104 412 1068 Z" {...regionStyle('Legs (Quads focus)')} />

            <Path d="M438 790 C480 768 544 768 586 790 L592 866 C548 892 476 892 432 866 Z" {...regionStyle('Hamstrings / Glutes', -0.12)} />

            <Path d="M436 1062 C470 1088 476 1228 446 1332 C416 1272 408 1130 436 1062 Z" {...regionStyle('Calves')} />
            <Path d="M588 1062 C616 1130 610 1272 580 1332 C550 1228 554 1088 588 1062 Z" {...regionStyle('Calves')} />
          </>
        )}
      </Svg>
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
