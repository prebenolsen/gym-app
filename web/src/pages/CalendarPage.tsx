import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { type WorkoutHistoryByDate } from '@gym-app/shared';
import { useApi } from '../hooks/useApi';
import './CalendarPage.css';

const CalendarPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const api = useApi();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [datesWithWorkouts, setDatesWithWorkouts] = useState<Set<string>>(
    new Set()
  );
  const [workoutsInMonth, setWorkoutsInMonth] = useState<WorkoutHistoryByDate[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);

  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadDatesWithWorkouts = async () => {
    try {
      setLoadingDates(true);
      // Load dates for current month and surrounding months
      const startOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
      const endOfMonth = new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth() + 1,
        0
      );

      const startDate = formatDateToString(
        new Date(startOfMonth.getTime() - 7 * 24 * 60 * 60 * 1000)
      );
      const endDate = formatDateToString(
        new Date(endOfMonth.getTime() + 7 * 24 * 60 * 60 * 1000)
      );

      try {
        const dates = await api.getDatesWithWorkouts(startDate, endDate);
        setDatesWithWorkouts(new Set(dates));
      } catch (apiErr) {
        // If API call fails, just clear the dates (user can still browse)
        console.error('Failed to load dates with workouts:', apiErr);
        setDatesWithWorkouts(new Set());
      }
    } finally {
      setLoadingDates(false);
    }
  };

  const formatMonthToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const loadWorkoutsForMonth = async (date: Date) => {
    try {
      setLoadingWorkouts(true);
      const monthStr = formatMonthToString(date);
      const workouts = await api.getWorkoutsByMonth(monthStr);
      setWorkoutsInMonth(workouts);
    } catch (err) {
      console.error('Failed to load workouts:', err);
      setWorkoutsInMonth([]);
    } finally {
      setLoadingWorkouts(false);
    }
  };

  useEffect(() => {
    loadDatesWithWorkouts();
  }, [calendarMonth]);

  useEffect(() => {
    loadWorkoutsForMonth(calendarMonth);
  }, [calendarMonth]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDateChange = (value: any) => {
    if (value instanceof Date) {
      setSelectedDate(value);
    } else if (Array.isArray(value) && value.length > 0 && value[0] instanceof Date) {
      setSelectedDate(value[0]);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleActiveStartDateChange = (value: any) => {
    if (value?.activeStartDate instanceof Date) {
      setCalendarMonth(value.activeStartDate);
      return;
    }

    if (value instanceof Date) {
      setCalendarMonth(value);
    }
  };

  const tileClassName = ({ date }: { date: Date }): string => {
    const dateStr = formatDateToString(date);
    const hasWorkout = datesWithWorkouts.has(dateStr);
    const isSelected =
      date.toDateString() === selectedDate.toDateString();

    let classes = '';
    if (hasWorkout) classes += 'calendar-tile-with-workout ';
    if (isSelected) classes += 'calendar-tile-selected';

    return classes.trim();
  };

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (startIso: string, endIso: string): string => {
    const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime();
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}`;
  };

  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatMonthDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="calendar-page">
      <div className="calendar-container">
        <h1>Workout History</h1>

        <div className="calendar-wrapper">
          <Calendar
            value={selectedDate}
            onChange={handleDateChange}
            tileClassName={tileClassName}
            activeStartDate={calendarMonth}
            onActiveStartDateChange={handleActiveStartDateChange}
          />

          <div className="calendar-legend">
            <div className="legend-item">
              <div className="legend-dot active"></div>
              <span>Days with workouts</span>
            </div>
          </div>
        </div>
      </div>

      <div className="workouts-container">
        <h2>{formatMonthDisplay(calendarMonth)}</h2>

        {loadingWorkouts ? (
          <p className="loading">Loading workouts...</p>
        ) : workoutsInMonth.length === 0 ? (
          <p className="empty-state">No workouts completed in this month</p>
        ) : (
          <div className="workouts-list">
            {workoutsInMonth.map((workout) => (
              <div
                key={workout.id}
                className="workout-history-item"
                onClick={() =>
                  navigate(`/workout-history/${workout.id}`)
                }
              >
                <div className="workout-header">
                  <h3>{workout.workout_name}</h3>
                </div>
                <div className="workout-times">
                  <span>Start: {formatTime(workout.started_at)}</span>
                  {workout.ended_at && (
                    <span>Ended: {formatTime(workout.ended_at)}</span>
                  )}
                  {workout.ended_at && (
                    <span>Duration: {formatDuration(workout.started_at, workout.ended_at)}</span>
                  )}
                </div>
                <div className="workout-click-hint">
                  Click to see exercises performed →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarPage;
