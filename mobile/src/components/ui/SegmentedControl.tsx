import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colors, radius } from '../../theme';
import { usePreferences } from '../../context/PreferencesContext';

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  options: ReadonlyArray<SegmentedOption<T>>;
  selectedValue: T;
  onChange: (value: T) => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  segmentStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export default function SegmentedControl<T extends string>({
  options,
  selectedValue,
  onChange,
  compact = false,
  style,
  segmentStyle,
  textStyle,
}: SegmentedControlProps<T>) {
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);

  return (
    <View style={[styles.container, style]}>
      {options.map((option) => {
        const isSelected = option.value === selectedValue;
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.segment,
              compact ? styles.segmentCompact : styles.segmentRegular,
              isSelected ? styles.segmentActive : styles.segmentInactive,
              segmentStyle,
            ]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.segmentText,
                compact ? styles.segmentTextCompact : styles.segmentTextRegular,
                isSelected ? styles.segmentTextActive : styles.segmentTextInactive,
                textStyle,
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (themeColors: typeof colors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: radius.sm,
      backgroundColor: themeColors.surface,
      overflow: 'hidden',
    },
    segment: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentRegular: {
      paddingVertical: 10,
      paddingHorizontal: 10,
    },
    segmentCompact: {
      paddingVertical: 8,
      paddingHorizontal: 8,
    },
    segmentInactive: {
      backgroundColor: themeColors.surface,
    },
    segmentActive: {
      backgroundColor: themeColors.accentSoft,
    },
    segmentText: {
      fontWeight: '700',
    },
    segmentTextRegular: {
      fontSize: 13,
    },
    segmentTextCompact: {
      fontSize: 12,
    },
    segmentTextInactive: {
      color: themeColors.textMuted,
    },
    segmentTextActive: {
      color: themeColors.accent,
    },
  });
