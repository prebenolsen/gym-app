import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ApiClient, type Program } from '@gym-app/shared';

const ProgramsScreen = ({ navigation }: any) => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  const api = new ApiClient('http://localhost:3000');

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const data = await api.getPrograms();
      setPrograms(data);
    } catch (err) {
      console.error('Failed to fetch programs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProgram = async () => {
    try {
      const newProgram = await api.createProgram();
      setPrograms([...programs, newProgram]);
    } catch (err) {
      console.error('Failed to create program:', err);
      Alert.alert('Error', 'Failed to create program');
    }
  };

  const handleDeleteProgram = async (id: string, name: string) => {
    Alert.alert(
      'Delete Program',
      `Delete "${name}" and all its workouts?`,
      [
        { text: 'Cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await api.deleteProgram(id);
              setPrograms(programs.filter((p) => p.id !== id));
            } catch (err) {
              console.error('Failed to delete program:', err);
              Alert.alert('Error', 'Failed to delete program');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Programs</Text>
        <TouchableOpacity
          onPress={handleCreateProgram}
          style={styles.btnPrimary}
        >
          <Text style={styles.btnText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list}>
        {programs.length === 0 ? (
          <Text style={styles.noData}>
            No programs yet. Create one to get started!
          </Text>
        ) : (
          programs.map((program) => (
            <TouchableOpacity
              key={program.id}
              style={styles.programCard}
              onPress={() =>
                navigation.navigate('ProgramDetail', {
                  programId: program.id,
                  programName: program.name,
                })
              }
            >
              <View style={styles.programContent}>
                <Text style={styles.programName}>{program.name}</Text>
              </View>

              <TouchableOpacity
                onPress={() => handleDeleteProgram(program.id, program.name)}
                style={styles.btnSmall}
              >
                <Text style={styles.btnSmallText}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  btnPrimary: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  btnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  list: {
    flex: 1,
    padding: 16,
  },
  noData: {
    padding: 16,
    backgroundColor: '#d1ecf1',
    borderRadius: 4,
    color: '#0c5460',
    textAlign: 'center',
  },
  programCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  programContent: {
    flex: 1,
  },
  programName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  btnSmall: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  btnSmallText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ProgramsScreen;
