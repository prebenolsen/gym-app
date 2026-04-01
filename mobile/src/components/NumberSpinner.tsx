import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { colors, radius } from '../theme';

type ThemeColors = typeof colors;

const darkColors: ThemeColors = {
  accent: '#C65A1E',
  accentPressed: '#A94A16',
  accentSoft: '#35261E',
  background: '#0D0D0D',
  surface: '#1A1A1A',
  border: '#353535',
  textStrong: '#F2F2F2',
  textMuted: '#B1B1B1',
  success: '#4CAF73',
  successSoft: '#18251D',
  danger: '#E45D4F',
  dangerPressed: '#C84D41',
};

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
  const scheme = useColorScheme();
  const themeColors = scheme === 'dark' ? darkColors : colors;
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

const createStyles = (themeColors: ThemeColors) =>
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
  },
  value: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textStrong,
  },
});

export default NumberSpinner;
