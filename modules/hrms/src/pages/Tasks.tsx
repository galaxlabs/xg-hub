import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { useAuth } from '../context/useAuth'; 
import type { Employee } from './Employees';
import { fetchTasks, fetchEmployees, createTask, updateTask, deleteTask } from '../api';
import './Tasks.css';

export interface EmployeeTask {
  id: string;
  empId: string;
  empName: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'Pending' | 'Completed';
}



const Tasks: React.FC = () => {
  const { user } = useAuth();
  
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newTask, setNewTask] = useState<Partial<EmployeeTask>>({});
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const emps = await fetchEmployees();
      setEmployees(emps);

      const data = await fetchTasks();
      setTasks(data);
    } catch (e) {
      console.error(e);
      setTasks([]);
    }
  };

  // Determine what tasks to show
  // Admins see all tasks. Employees see only their assigned tasks.
  const visibleTasks = user?.role === 'admin' 
    ? tasks 
    : tasks.filter(t => t.empName === user?.name || t.empId === user?.email); // Fallback to email mapping if necessary

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.empId || !newTask.title || !newTask.dueDate) {
      alert("Please fill in the Employee, Title, and Due Date.");
      return;
    }

    const assignedEmp = employees.find(emp => emp.id === newTask.empId);
    if (!assignedEmp) return;

    const taskToAdd: EmployeeTask = {
      id: `TSK-${Math.floor(Math.random() * 10000)}`,
      empId: assignedEmp.id,
      empName: assignedEmp.name,
      title: newTask.title,
      description: newTask.description || '',
      dueDate: newTask.dueDate,
      status: 'Pending'
    };

    try {
      await createTask(taskToAdd);
      setTasks(prev => [taskToAdd, ...prev]);
      setNewTask({});
      setIsAssigning(false);
    } catch (e) {
       console.error(e);
    }
  };

  const handleMarkComplete = async (id: string) => {
    try {
      const task = tasks.find(t => t.id === id);
      if (task) {
        console.log(`Marking task ${id} as completed`);
        await updateTask(id, { ...task, status: 'Completed' });
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'Completed' } : t));
        // Show success feedback
        alert('Task marked as completed!');
      }
    } catch (e: any) {
      console.error('Error marking task complete:', e);
      alert(`Failed to mark task complete: ${e.message || 'Unknown error'}`);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteTask(id);
        setTasks(prev => prev.filter(t => t.id !== id));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const pendingCount = visibleTasks.filter(t => t.status === 'Pending').length;
  const completedCount = visibleTasks.filter(t => t.status === 'Completed').length;

  return (
    <div className="tasks-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Task Management</h1>
          <p className="page-subtitle">Track project deliverables, monitor deadlines, and update completions.</p>
        </div>
        {user?.role === 'admin' && (
          <button className="btn-primary" onClick={() => setIsAssigning(!isAssigning)}>
            <Plus size={18} /> {isAssigning ? 'Cancel Assignment' : 'Assign New Task'}
          </button>
        )}
      </div>

      <div className="metrics-grid" style={{ marginBottom: '2rem' }}>
        <div className="metric-card">
          <div className="metric-icon" style={{backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning-color)'}}>
            <Clock size={24} />
          </div>
          <div className="metric-details">
            <h3>Pending Tasks</h3>
            <div className="metric-value">{pendingCount}</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)'}}>
            <CheckCircle size={24} />
          </div>
          <div className="metric-details">
            <h3>Completed Tasks</h3>
            <div className="metric-value" style={{color: 'var(--success-color)'}}>{completedCount}</div>
          </div>
        </div>
      </div>

      {isAssigning && user?.role === 'admin' && (
        <div className="card task-form-card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--primary-color)' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-main)' }}>Assign New Task</h3>
          <form onSubmit={handleAssignTask} className="task-form">
            <div className="form-group">
              <label>Assign To Employee</label>
              <select 
                className="form-control" 
                value={newTask.empId || ''} 
                onChange={(e) => setNewTask({...newTask, empId: e.target.value})}
              >
                <option value="">-- Select Employee --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                ))}
              </select>
            </div>
            <div className="form-group row-span-2">
              <label>Task Title</label>
              <input 
                type="text" 
                placeholder="e.g. Server Maintenance" 
                className="form-control"
                value={newTask.title || ''}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input 
                type="date" 
                className="form-control"
                value={newTask.dueDate || ''}
                onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Task Description Instructions</label>
              <textarea 
                className="form-control" 
                rows={3} 
                placeholder="Provide detailed instructions..."
                value={newTask.description || ''}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
              />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-primary">Deliver Assignment</button>
            </div>
          </form>
        </div>
      )}

      <div className="card table-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                {user?.role === 'admin' && <th>Assigned Employee</th>}
                <th>Task Details</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map(task => (
                <tr key={task.id} className={task.status === 'Completed' ? 'task-completed-row' : ''}>
                  {user?.role === 'admin' && (
                    <td><strong>{task.empName}</strong><br/><small className="emp-dept">{task.empId}</small></td>
                  )}
                  <td style={{ maxWidth: '300px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{task.title}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{task.description}</div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace' }}>{task.dueDate}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${task.status.toLowerCase()}`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="action-cell">
                    <div className="action-buttons">
                      {task.status === 'Pending' && (
                        <button className="action-btn success" title="Mark as Completed" onClick={() => handleMarkComplete(task.id)}>
                          <CheckCircle size={18} />
                        </button>
                      )}
                      {user?.role === 'admin' && (
                        <button className="action-btn delete" title="Revoke Task" onClick={() => handleDeleteTask(task.id)}>
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleTasks.length === 0 && (
                <tr>
                  <td colSpan={user?.role === 'admin' ? 5 : 4} style={{ textAlign: 'center', padding: '2rem' }}>
                    <ClipboardList size={40} style={{ color: 'var(--border-color)', marginBottom: '1rem' }} />
                    <p style={{ color: 'var(--text-muted)' }}>No tasks found in the database.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Tasks;
