import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ApiClient, type ExerciseProgressHistory } from '@gym-app/shared';
import { useUnit } from '../context/UnitContext';
import './ExerciseProgressPage.css';

type ViewMode = 'max-weight' | 'total-volume';

const ExerciseProgressPage = () => {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();
  const { convertFromKg, formatWeight, unit } = useUnit();
  const [data, setData] = useState<ExerciseProgressHistory | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('max-weight');
  const [loading, setLoading] = useState(true);

  const api = new ApiClient('http://localhost:3000');

  useEffect(() => {
    const fetchExerciseProgress = async () => {
      if (!exerciseId) return;

      try {
        setLoading(true);
        const progressData = await api.getExerciseProgress(exerciseId, 90);
        setData(progressData);
      } catch (err) {
        console.error('Failed to fetch exercise progress:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchExerciseProgress();
  }, [exerciseId]);

  if (loading) {
    return <div className="exercise-progress-page">Loading...</div>;
  }

  if (!data || data.history.length === 0) {
    return (
      <div className="exercise-progress-page">
        <button className="btn-back" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
        <div className="empty-state">
          <p>No data available for this exercise yet.</p>
        </div>
      </div>
    );
  }

  // Transform data for display based on view mode
  const chartData = data.history.map((entry) => {
    if (viewMode === 'max-weight') {
      return {
        date: entry.date,
        value: convertFromKg(entry.max_weight),
        formattedValue: formatWeight(entry.max_weight),
      };
    } else {
      // Total volume in kg (sum of weight x reps)
      const volumeInKg = entry.total_volume;
      return {
        date: entry.date,
        value: convertFromKg(volumeInKg),
        formattedValue: formatWeight(volumeInKg),
      };
    }
  });

  const maxValue = Math.max(...chartData.map((d) => d.value));
  const personalBest = data.history.reduce((max, entry) => Math.max(max, entry.max_weight), 0);

  return (
    <div className="exercise-progress-page">
      <div className="progress-header">
        <button className="btn-back" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
        <div className="header-content">
          <h1>{data.exercise_name}</h1>
          <p className="personal-best">
            Personal Best: <strong>{formatWeight(personalBest)}</strong>
          </p>
        </div>
      </div>

      <div className="view-mode-toggle">
        <button
          className={`toggle-btn ${viewMode === 'max-weight' ? 'active' : ''}`}
          onClick={() => setViewMode('max-weight')}
        >
          Max Weight
        </button>
        <button
          className={`toggle-btn ${viewMode === 'total-volume' ? 'active' : ''}`}
          onClick={() => setViewMode('total-volume')}
        >
          Total Volume
        </button>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
            />
            <YAxis
              label={{
                value: unit === 'kg' ? 'Weight (kg)' : 'Weight (lbs)',
                angle: -90,
                position: 'insideLeft',
                fill: 'var(--color-text-muted)',
              }}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: `1px solid var(--color-border)`,
                borderRadius: '4px',
              }}
              labelStyle={{ color: 'var(--color-text-strong)' }}
              formatter={(value) => [`${value.toFixed(1)} ${unit}`, viewMode === 'max-weight' ? 'Max Weight' : 'Total Volume']}
            />
            <Legend wrapperStyle={{ color: 'var(--color-text-strong)' }} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--color-accent-500)"
              dot={{ fill: 'var(--color-accent-500)', r: 4 }}
              activeDot={{ r: 6 }}
              name={viewMode === 'max-weight' ? 'Max Weight' : 'Total Volume'}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="progress-details">
        <h3>Workout History</h3>
        <div className="details-table">
          <div className="table-header">
            <div className="col-date">Date</div>
            <div className="col-max">Max Weight</div>
            <div className="col-volume">Total Volume</div>
            <div className="col-sets">Sets</div>
            <div className="col-reps">Total Reps</div>
          </div>
          {data.history.map((entry, index) => (
            <div key={index} className="table-row">
              <div className="col-date">{entry.date}</div>
              <div className="col-max">{formatWeight(entry.max_weight)}</div>
              <div className="col-volume">{formatWeight(entry.total_volume)}</div>
              <div className="col-sets">{entry.sets}</div>
              <div className="col-reps">{entry.total_reps}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExerciseProgressPage;
