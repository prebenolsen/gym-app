import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiClient, type Program } from '@gym-app/shared';
import './ProgramsPage.css';

const ProgramsPage = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(false);
  const [firstProgramName, setFirstProgramName] = useState('Program 01');
  const [showNewProgram, setShowNewProgram] = useState(false);
  const [newProgramName, setNewProgramName] = useState('');
  const navigate = useNavigate();

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

  const handleCreateFirstProgram = async () => {
    const name = firstProgramName.trim() || 'Program 01';
    try {
      const newProgram = await api.createProgram({ name });
      setPrograms([newProgram]);
      navigate(`/programs/${newProgram.id}`);
    } catch (err) {
      console.error('Failed to create program:', err);
    }
  };

  const handleCreateProgram = async () => {
    const name = newProgramName.trim() || 'Program 01';
    try {
      const newProgram = await api.createProgram({ name });
      setPrograms([...programs, newProgram]);
      setShowNewProgram(false);
      setNewProgramName('');
    } catch (err) {
      console.error('Failed to create program:', err);
    }
  };

  const cancelNewProgram = () => {
    setShowNewProgram(false);
    setNewProgramName('');
  };

  if (loading) return <div className="programs-page">Loading...</div>;

  if (programs.length === 0) {
    return (
      <div className="programs-page">
        <div className="first-program-container">
          <div className="first-program-content">
            <h2>Create Your First Program</h2>
            <p className="first-program-guidance">
              Name your first program, like "Push-Pull-Legs".
            </p>
            <div className="first-program-input-group">
              <input
                className="first-program-input"
                type="text"
                value={firstProgramName}
                onChange={(e) => setFirstProgramName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFirstProgram()}
                placeholder="Program 01"
              />
              <button className="btn-create-first" onClick={handleCreateFirstProgram}>
                Create Program
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="programs-page">
      <div className="programs-header">
        <h1>Programs</h1>
        {!showNewProgram && (
          <button
            onClick={() => { setShowNewProgram(true); setNewProgramName(''); }}
            className="btn-primary"
          >
            + Create Program
          </button>
        )}
      </div>

      <div className="programs-grid">
        {programs.map((program) => (
          <div key={program.id} className="program-card">
            <h3>{program.name}</h3>
            <div className="program-actions">
              <button
                onClick={() => navigate(`/programs/${program.id}`)}
                className="btn-view"
              >
                View
              </button>
            </div>
          </div>
        ))}

        {showNewProgram && (
          <div className="program-card program-card-new">
            <input
              className="new-program-input"
              type="text"
              value={newProgramName}
              autoFocus
              onChange={(e) => setNewProgramName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateProgram();
                if (e.key === 'Escape') cancelNewProgram();
              }}
              placeholder="Program name..."
            />
            <div className="program-actions">
              <button onClick={handleCreateProgram} className="btn-view">
                Create
              </button>
              <button onClick={cancelNewProgram} className="btn-delete">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgramsPage;
