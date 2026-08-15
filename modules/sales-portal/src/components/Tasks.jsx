import React, { useState } from 'react';
import { CheckSquare, Plus, X, Clock, User } from 'lucide-react';

const STATUS_OPTIONS = ['Pending', 'On Process', 'Completed'];

function getStatusColor(status) {
  switch (status) {
    case 'Pending': return 'var(--bx-text-muted)';
    case 'On Process': return 'var(--bx-accent-orange)';
    case 'Completed': return 'var(--bx-accent-green)';
    default: return 'var(--bx-text-muted)';
  }
}

export default function Tasks({ tasks, setTasks, currentUser, userRole }) {
  const [showModal, setShowModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    assignedToId: ''
  });
  const [error, setError] = useState('');

  const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';

  const openModal = async () => {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.filter(e => e.id !== currentUser?.id));
      }
    } catch (err) {
      console.error('Error loading employees:', err);
    }
    setShowModal(true);
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          assignedToId: Number(formData.assignedToId),
          assignedById: currentUser?.id
        })
      });
      if (res.ok) {
        const task = await res.json();
        setTasks([task, ...tasks]);
        setFormData({ title: '', description: '', deadline: '', assignedToId: '' });
        setShowModal(false);
      } else {
        setError('Task not assigned.');
      }
    } catch (err) {
      console.error('Error creating task:', err);
      setError('Server not reachable.');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks(tasks.map(t => t.id === taskId ? updated : t));
      }
    } catch (err) {
      console.error('Error updating task status:', err);
    }
  };

  return (
    <div className="bx-content" style={{ overflowY: 'auto' }}>
      <div className="bx-content-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h1 className="bx-page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckSquare color="var(--bx-accent-blue)" /> Tasks and Projects
          </h1>
          <p style={{ color: 'var(--bx-text-muted)' }}>{isAdmin ? 'Assign tasks to team' : 'Assigned tasks'}</p>
        </div>
        {isAdmin && (
          <button className="bx-btn bx-btn-primary" onClick={openModal}>
            <Plus size={16} /> Assign Task
          </button>
        )}
      </div>

      <div style={{ padding: '20px' }}>
        <div className="bx-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bx-border)', color: 'var(--bx-text-muted)' }}>
                <th style={{ padding: '12px' }}>Title</th>
                <th style={{ padding: '12px' }}>Description</th>
                {isAdmin && <th style={{ padding: '12px' }}>Assigned To</th>}
                <th style={{ padding: '12px' }}>Assigned Date</th>
                <th style={{ padding: '12px' }}>Deadline</th>
                <th style={{ padding: '12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task.id} style={{ borderBottom: '1px solid var(--bx-border)' }}>
                  <td style={{ padding: '16px 12px', fontWeight: 600 }}>{task.title}</td>
                  <td style={{ padding: '16px 12px', color: 'var(--bx-text-muted)', maxWidth: '250px' }}>{task.description || '—'}</td>
                  {isAdmin && (
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={12} /> {task.assignedTo?.name || '—'}
                      </div>
                    </td>
                  )}
                  <td style={{ padding: '16px 12px', color: 'var(--bx-text-muted)' }}>
                    {new Date(task.assignedDate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={12} color="var(--bx-accent-orange)" /> {new Date(task.deadline).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    {isAdmin ? (
                      <span style={{
                        padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                        color: getStatusColor(task.status), border: `1px solid ${getStatusColor(task.status)}`,
                        background: 'rgba(255,255,255,0.05)'
                      }}>
                        {task.status}
                      </span>
                    ) : (
                      <select
                        className="input-field"
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        style={{ margin: 0, backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)', width: 'auto' }}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s} style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}>{s}</option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} style={{ padding: '40px', textAlign: 'center', color: 'var(--bx-text-muted)' }}>
                    No tasks assigned.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckSquare color="var(--bx-accent-blue)" /> Assign Task
              </span>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowModal(false)} />
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Task Title</label>
                <input required className="input-field" value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Description</label>
                <textarea rows="3" className="input-field" value={formData.description} onChange={(e) => updateField('description', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Assign To</label>
                <select
                  required
                  className="input-field"
                  value={formData.assignedToId}
                  onChange={(e) => updateField('assignedToId', e.target.value)}
                  style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}
                >
                  <option value="" style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}>Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id} style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Deadline</label>
                <input required type="date" className="input-field" value={formData.deadline} onChange={(e) => updateField('deadline', e.target.value)} />
              </div>

              {error && <div className="error-text">{error}</div>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button type="button" className="bx-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="bx-btn bx-btn-primary">Assign Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}