import React, { useState, useEffect } from 'react';
import { Calendar, FileText, Upload, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { applyLeave, fetchMyLeaves, getStaticFileUrl } from '../api';
import { useAuth } from '../context/useAuth';
import toast from 'react-hot-toast';
import './LeaveApply.css';

interface LeaveRecord {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  proofFile: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  adminComment: string | null;
  appliedDate: string;
}

const LeaveApply: React.FC = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: 'Sick',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [proofFile, setProofFile] = useState<File | null>(null);

  useEffect(() => {
    loadMyLeaves();
  }, []);

  const loadMyLeaves = async () => {
    try {
      const data = await fetchMyLeaves();
      console.log("Fetched leaves data:", data);
      setLeaves(data);
    } catch (error) {
      console.error('Error loading leaves:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProofFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append('leaveType', formData.leaveType);
      data.append('startDate', formData.startDate);
      data.append('endDate', formData.endDate);
      data.append('reason', formData.reason);
      if (proofFile) {
        data.append('proofFile', proofFile);
      }

      await applyLeave(data);
      toast.success('Leave application submitted!');
      setFormData({
        leaveType: 'Sick',
        startDate: '',
        endDate: '',
        reason: ''
      });
      setProofFile(null);
      loadMyLeaves();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit leave');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    switch (s) {
      case 'approved':
        return <span className="badge approved"><CheckCircle size={14} /> Approved</span>;
      case 'rejected':
        return <span className="badge rejected"><XCircle size={14} /> Rejected</span>;
      default:
        return <span className="badge pending"><Clock size={14} /> Pending</span>;
    }
  };

  return (
    <div className="leave-apply-container">
      <div className="leave-header">
        <h1>Leave Management</h1>
        <p>Apply for leaves and track your requests</p>
      </div>

      <div className="leave-grid">
        {/* Application Form */}
        <div className="leave-card application-form">
          <h2>Apply for Leave</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Leave Type</label>
              <select name="leaveType" value={formData.leaveType} onChange={handleInputChange}>
                <option value="Sick">Sick Leave</option>
                <option value="Casual">Casual Leave</option>
                <option value="Annual">Annual Leave</option>
                <option value="Emergency">Emergency Leave</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Date</label>
                <input 
                  type="date" 
                  name="startDate" 
                  value={formData.startDate} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input 
                  type="date" 
                  name="endDate" 
                  value={formData.endDate} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label>Reason</label>
              <textarea 
                name="reason" 
                value={formData.reason} 
                onChange={handleInputChange} 
                placeholder="Briefly explain the reason for leave..."
                required
              />
            </div>

            <div className="form-group">
              <label>Proof / Attachment (Optional)</label>
              <div className="file-upload-wrapper">
                <Upload size={20} />
                <span>{proofFile ? proofFile.name : 'Upload screenshot/document'}</span>
                <input type="file" onChange={handleFileChange} accept="image/*,.pdf" />
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>

        {/* Leave History */}
        <div className="leave-card leave-history">
          <h2>My Leave History</h2>
          <div className="history-table-wrapper">
            <table className="data-table history-table">
              <thead>
                <tr>
                  <th>Date Range</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Proof</th>
                </tr>
              </thead>
              <tbody>
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="no-data">No leave history found</td>
                  </tr>
                ) : (
                  leaves.map(leave => (
                    <tr key={leave.id}>
                      <td data-label="Date Range">
                        <div className="date-range">
                          <span>{new Date(leave.startDate).toLocaleDateString()}</span>
                          <span className="date-sep">to</span>
                          <span>{new Date(leave.endDate).toLocaleDateString()} </span>
                        </div>
                      </td>
                      <td data-label="Type">{leave.leaveType}</td>
                      <td data-label="Status">{getStatusBadge(leave.status)}</td>
                      <td data-label="Proof" className="action-cell">
                        {leave.proofFile ? (
                          <a 
                            href={getStaticFileUrl(leave.proofFile)} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="view-proof-link"
                          >
                            View
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveApply;
