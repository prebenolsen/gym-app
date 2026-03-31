import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    color: '#666',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
  },
  btnText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  value: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});

export default NumberSpinner;
