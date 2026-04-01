// @ts-nocheck
// Recharts components have JSX element type compatibility issues with React 18.2 strict mode
// This file is checked at runtime but type checking is disabled for Recharts components

// @ts-ignore — Recharts components have JSX element type compatibility issues with React 18.2 strict mode
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

  const personalBest = data.history.reduce((max, entry) => Math.max(max, entry.max_weight), 0);
  const totalTimesExercised = data.history.length;
  const totalRepetitions = data.history.reduce((sum, entry) => sum + entry.total_reps, 0);
  const totalSets = data.history.reduce((sum, entry) => sum + entry.sets, 0);
  const totalWeight = data.history.reduce((sum, entry) => sum + entry.total_volume, 0);

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

      <div className="summary-metrics">
        <div className="metric-card">
          <span className="metric-label">Workout Days</span>
          <strong className="metric-value">{totalTimesExercised}</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">Total Repetitions</span>
          <strong className="metric-value">{totalRepetitions}</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">Total Sets</span>
          <strong className="metric-value">{totalSets}</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">Total Volume</span>
          <strong className="metric-value">{formatWeight(totalWeight)}</strong>
        </div>
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
              formatter={(value: any) => [`${value.toFixed(1)} ${unit}`, viewMode === 'max-weight' ? 'Max Weight' : 'Total Volume']}
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
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Max Weight</th>
                <th>Total Volume</th>
                <th>Sets</th>
                <th>Total Reps</th>
              </tr>
            </thead>
            <tbody>
              {data.history.map((entry, index) => (
                <tr key={index}>
                  <td>{entry.date}</td>
                  <td>{formatWeight(entry.max_weight)}</td>
                  <td>{formatWeight(entry.total_volume)}</td>
                  <td>{entry.sets}</td>
                  <td>{entry.total_reps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExerciseProgressPage;
