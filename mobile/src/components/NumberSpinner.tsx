import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';
import { usePreferences } from '../context/PreferencesContext';

interface NumberSpinnerProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

const NumberSpinner = ({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  label,
}: NumberSpinnerProps) => {
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);

  const handleIncrease = () => {
    if (value < max) onChange(value + step);
  };

  const handleDecrease = () => {
    if (value > min) onChange(value - step);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.controls}>
        <TouchableOpacity onPress={handleDecrease} style={styles.btn}>
          <Text style={styles.btnText}>▼</Text>
        </TouchableOpacity>

        <Text style={styles.value}>{value}</Text>

        <TouchableOpacity onPress={handleIncrease} style={styles.btn}>
          <Text style={styles.btnText}>▲</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (themeColors: typeof colors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'column',
      gap: 8,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      color: themeColors.textMuted,
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: radius.sm,
      backgroundColor: themeColors.surface,
      overflow: 'hidden',
    },
    btn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: themeColors.accentSoft,
    },
    btnText: {
      fontSize: 12,
      color: themeColors.textMuted,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    value: {
      flex: 1,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '600',
      color: themeColors.textStrong,
      textTransform: 'uppercase',
    },
  });

export default NumberSpinner;
