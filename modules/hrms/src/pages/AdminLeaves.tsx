import React, { useState, useEffect } from 'react';
import { Check, X, FileText, Search, Filter, MessageSquare, AlertCircle } from 'lucide-react';
import { fetchAllLeaves, updateLeaveStatus, getStaticFileUrl } from '../api';
import toast from 'react-hot-toast';
import './AdminLeaves.css';

interface LeaveRecord {
  id: string;
  empId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  proofFile: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  adminComment: string | null;
  appliedDate: string;
}

const AdminLeaves: React.FC = () => {
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  
  // Modal for rejection comment
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [rejectionComment, setRejectionComment] = useState('');
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [selectedReasonTitle, setSelectedReasonTitle] = useState('');

  useEffect(() => {
    loadLeaves();
  }, []);

  const loadLeaves = async () => {
    try {
      const data = await fetchAllLeaves();
      setLeaves(data);
    } catch (error) {
      toast.error('Failed to load leaves');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: 'Approved' | 'Rejected', comment?: string) => {
    try {
      await updateLeaveStatus(id, { status, adminComment: comment });
      toast.success(`Leave ${status.toLowerCase()} successfully`);
      loadLeaves();
      if (status === 'Rejected') {
        setShowRejectModal(false);
        setRejectionComment('');
        setSelectedLeaveId(null);
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const openRejectModal = (id: string) => {
    setSelectedLeaveId(id);
    setShowRejectModal(true);
  };

  const openReasonModal = (reason: string, employeeName: string) => {
    setSelectedReason(reason);
    setSelectedReasonTitle(employeeName);
    setShowReasonModal(true);
  };

  const closeReasonModal = () => {
    setSelectedReason('');
    setSelectedReasonTitle('');
    setShowReasonModal(false);
  };

  const filteredLeaves = leaves.filter(leave => {
    const matchesSearch = leave.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          leave.empId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'All' || leave.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const renderDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return (
      <div className="duration-info">
        <span>{start.toLocaleDateString()}</span>
        <span className="duration-to">to</span>
        <span>{end.toLocaleDateString()}</span>
      </div>
    );
  };

  return (
    <div className="admin-leaves-container">
      <div className="admin-leaves-header">
        <div>
          <h1>Leave Management Dashboard</h1>
          <p>Review and manage employee leave requests</p>
        </div>
      </div>

      <div className="admin-controls">
        <div className="search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by employee name or ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-box">
          <Filter size={18} />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All Requests</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="admin-leaves-grid">
        {loading ? (
          <div className="loading-state">Loading leave requests...</div>
        ) : filteredLeaves.length === 0 ? (
          <div className="empty-state">No leave requests found matching your criteria.</div>
        ) : (
          <div className="leaves-table-wrapper">
            <table className="data-table admin-leaves-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Details</th>
                  <th>Duration</th>
                  <th>Reason</th>
                  <th>Proof</th>
                  <th>Status/Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map(leave => (
                  <tr key={leave.id}>
                    <td data-label="Employee">
                      <div className="emp-info">
                        <span className="emp-name">{leave.employeeName}</span>
                        <span className="emp-id">{leave.empId}</span>
                      </div>
                    </td>
                    <td data-label="Leave Details">
                      <span className={`type-tag ${leave.leaveType.toLowerCase()}`}>
                        {leave.leaveType}
                      </span>
                    </td>
                    <td data-label="Duration">
                      {renderDuration(leave.startDate, leave.endDate)}
                    </td>
                    <td data-label="Reason">
                      <div
                        className="reason-cell"
                        title="Click to view full reason"
                        onClick={() => openReasonModal(leave.reason, leave.employeeName)}
                      >
                        {leave.reason}
                      </div>
                    </td>
                    <td data-label="Proof" className="proof-cell">
                      {leave.proofFile ? (
                        <a 
                          href={getStaticFileUrl(leave.proofFile)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="view-link"
                        >
                          <FileText size={16} /> View
                        </a>
                      ) : (
                        <span className="no-proof">None</span>
                      )}
                    </td>
                    <td data-label="Status/Actions" className="status-actions-cell">
                      {leave.status === 'Pending' ? (
                        <div className="status-actions">
                          <div className="status-display">
                            <span className={`status-badge ${leave.status.toLowerCase()}`}>
                              {leave.status}
                            </span>
                          </div>
                          <div className="status-action-buttons">
                            <button 
                              className="status-action-btn approve-btn" 
                              onClick={() => handleStatusUpdate(leave.id, 'Approved')}
                              title="Approve"
                            >
                              <Check size={18} />
                            </button>
                            <button 
                              className="status-action-btn reject-btn" 
                              onClick={() => openRejectModal(leave.id)}
                              title="Reject"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="status-display">
                          <span className={`status-badge ${leave.status.toLowerCase()}`}>
                            {leave.status}
                          </span>
                          {leave.adminComment && (
                            <div className="comment-indicator" title={leave.adminComment}>
                              <MessageSquare size={14} />
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reason Modal */}
      {showReasonModal && (
        <div className="modal-overlay" onClick={closeReasonModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Leave Reason</h3>
            <p className="modal-subtitle">{selectedReasonTitle}</p>
            <div className="modal-text">
              {selectedReason}
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={closeReasonModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Reject Leave Request</h3>
            <p>Please provide a reason for rejection (optional):</p>
            <textarea 
              value={rejectionComment}
              onChange={(e) => setRejectionComment(e.target.value)}
              placeholder="Enter reason..."
            />
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button 
                className="confirm-reject-btn" 
                onClick={() => handleStatusUpdate(selectedLeaveId!, 'Rejected', rejectionComment)}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLeaves;
