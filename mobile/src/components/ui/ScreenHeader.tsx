import React, { type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { usePreferences } from '../../context/PreferencesContext';

type ScreenHeaderProps = {
  title?: string;
  titleNode?: ReactNode;
  subtitle?: string;
  onBackPress?: () => void;
  rightActions?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  titleContainerStyle?: StyleProp<ViewStyle>;
};

export default function ScreenHeader({
  title,
  titleNode,
  subtitle,
  onBackPress,
  rightActions,
  containerStyle,
  titleStyle,
  titleContainerStyle,
}: ScreenHeaderProps) {
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.topRow}>
        <View style={styles.leftWrap}>
          {onBackPress ? (
            <TouchableOpacity
              onPress={onBackPress}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={24} color={themeColors.accent} />
            </TouchableOpacity>
          ) : null}

          <View style={[styles.titleWrap, titleContainerStyle]}>
            {titleNode ? (
              titleNode
            ) : (
              <Text style={[styles.title, titleStyle]} numberOfLines={1}>
                {title}
              </Text>
            )}
          </View>
        </View>

        {rightActions ? <View style={styles.rightActions}>{rightActions}</View> : null}
      </View>

      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const createStyles = (themeColors: typeof colors) =>
  StyleSheet.create({
    container: {
      backgroundColor: themeColors.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      gap: 4,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    leftWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
      minWidth: 0,
    },
    backButton: {
      padding: 10,
      marginLeft: -10,
    },
    titleWrap: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: themeColors.textStrong,
    },
    subtitle: {
      fontSize: 13,
      color: themeColors.textMuted,
      marginLeft: 36,
    },
    rightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
  });
