import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { type WorkoutSessionDetail } from '@gym-app/shared';
import { useUnit } from '../context/UnitContext';
import { useApi } from '../hooks/useApi';
import './WorkoutHistoryDetail.css';

const WorkoutHistoryDetail = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const api = useApi();
  const { formatWeight } = useUnit();

  const [sessionDetail, setSessionDetail] = useState<WorkoutSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSessionDetail = async () => {
      if (!sessionId) return;

      try {
        setLoading(true);
        const detail = await api.getSessionDetails(sessionId);
        setSessionDetail(detail);
      } catch (err) {
        console.error('Failed to load session detail:', err);
        setError('Failed to load workout details');
      } finally {
        setLoading(false);
      }
    };

    loadSessionDetail();
  }, [sessionId]);

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const calculateDuration = (startedAt: string, endedAt: string | null): string => {
    if (!endedAt) return 'In progress';

    const start = new Date(startedAt).getTime();
    const end = new Date(endedAt).getTime();
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Less than 1 min';
    if (diffMins < 60) return `${diffMins} min`;

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  // Group sets by exercise
  const groupedByExercise = sessionDetail?.sets.reduce(
    (acc, set) => {
      if (!acc[set.exercise_name]) {
        acc[set.exercise_name] = [];
      }
      acc[set.exercise_name].push(set);
      return acc;
    },
    {} as Record<string, typeof sessionDetail.sets>,
  );

  if (loading) {
    return (
      <div className="workout-history-detail">
        <p>Loading workout details...</p>
      </div>
    );
  }

  if (error || !sessionDetail) {
    return (
      <div className="workout-history-detail">
        <div className="error-state">
          <p>{error || 'Workout not found'}</p>
          <button onClick={() => navigate('/calendar')}>Back to Calendar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="workout-history-detail">
      <button className="back-button" onClick={() => navigate('/calendar')}>
        ← Back to Calendar
      </button>

      <div className="session-header">
        <div>
          <h1>Workout Details</h1>
          <p className="session-date">{formatDate(sessionDetail.session.started_at)}</p>
        </div>
        <div className="session-stats">
          <div className="stat">
            <span className="stat-label">Started</span>
            <span className="stat-value">
              {formatTime(sessionDetail.session.started_at)}
            </span>
          </div>
          {sessionDetail.session.ended_at && (
            <>
              <div className="stat">
                <span className="stat-label">Ended</span>
                <span className="stat-value">
                  {formatTime(sessionDetail.session.ended_at)}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Duration</span>
                <span className="stat-value">
                  {calculateDuration(
                    sessionDetail.session.started_at,
                    sessionDetail.session.ended_at,
                  )}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="exercises-section">
        {groupedByExercise &&
          Object.entries(groupedByExercise).map(([exerciseName, sets]) => (
            <div key={exerciseName} className="exercise-card">
              <h3>{exerciseName}</h3>
              <table className="sets-table">
                <thead>
                  <tr>
                    <th>Set</th>
                    <th>Weight</th>
                    <th>Reps</th>
                  </tr>
                </thead>
                <tbody>
                  {sets.map((set) => (
                    <tr key={`${set.id}`}>
                      <td className="set-number">#{set.set_number}</td>
                      <td className="weight">{formatWeight(set.weight)}</td>
                      <td className="reps">{set.reps} reps</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="exercise-totals">
                <span className="total-sets">
                  {sets.length} {sets.length === 1 ? 'set' : 'sets'}
                </span>
                <span className="avg-weight">
                  Avg:{' '}
                  {formatWeight(sets.reduce((sum, s) => sum + s.weight, 0) / sets.length)}
                </span>
              </div>
            </div>
          ))}
      </div>

      {(!groupedByExercise || Object.keys(groupedByExercise).length === 0) && (
        <div className="empty-exercises">
          <p>No exercises recorded for this workout</p>
        </div>
      )}
    </div>
  );
};

export default WorkoutHistoryDetail;
