import React, { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, Briefcase, Phone, Mail, Award, Calendar, Download, Trash2, RefreshCw, Upload, Clock, CalendarClock } from 'lucide-react';
import { fetchCandidates, updateCandidateStatus, updateInterviewSchedule, deleteCandidate, clearAllCandidates, createCandidate, getStaticFileUrl } from '../api';
import './Recruitment.css';

// Canonical pipeline stages (folders)
type Stage = 'Applied' | 'Interview' | 'Shortlisted' | 'Rejected' | 'Joined';

const TABS: { key: Stage; label: string }[] = [
  { key: 'Applied', label: 'Applied Candidates' },
  { key: 'Interview', label: 'Interview' },
  { key: 'Shortlisted', label: 'Shortlisted' },
  { key: 'Rejected', label: 'Rejected' },
  { key: 'Joined', label: 'Joined' },
];

// Maps any legacy/old status values (Screening, Offered, Hired) to one of the 5 folders above,
// so old records don't just disappear if they exist from before this update.
const getStage = (status: string): Stage => {
  switch (status) {
    case 'Interview': return 'Interview';
    case 'Shortlisted':
    case 'Offered': return 'Shortlisted';
    case 'Rejected': return 'Rejected';
    case 'Joined':
    case 'Hired': return 'Joined';
    case 'Applied':
    case 'Screening':
    default: return 'Applied';
  }
};

const Recruitment: React.FC = () => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<Stage>('Applied');
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Interview scheduling popup (shown when a candidate is moved into the Interview folder)
  const [interviewPrompt, setInterviewPrompt] = useState<{ id: string; name: string } | null>(null);
  const [promptDate, setPromptDate] = useState('');
  const [promptTime, setPromptTime] = useState('');

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    try {
      const data = await fetchCandidates();
      setCandidates(data);
    } catch(err) {
      console.error(err);
    }
  };

  // Called from the status dropdown. Interview needs a date+time first, so we intercept that case.
  const handleStatusSelect = (candidate: any, newStatus: Stage) => {
    if (newStatus === 'Interview') {
      setPromptDate(candidate.interviewDate || '');
      setPromptTime(candidate.interviewTime || '');
      setInterviewPrompt({ id: candidate.id, name: `${candidate.firstName} ${candidate.lastName}` });
      return; // status isn't changed until the popup is confirmed
    }
    applyStatusChange(candidate.id, newStatus);
  };

  const applyStatusChange = async (id: string, newStatus: Stage, interviewDate?: string, interviewTime?: string) => {
    try {
      await updateCandidateStatus(id, newStatus, interviewDate, interviewTime);
      setCandidates(prev => prev.map(c => c.id === id ? {
        ...c,
        status: newStatus,
        interviewDate: interviewDate ?? c.interviewDate,
        interviewTime: interviewTime ?? c.interviewTime
      } : c));
    } catch(err) {
      console.error("Failed to update status", err);
      alert("Failed to update status.");
    }
  };

  const confirmInterviewSchedule = async () => {
    if (!interviewPrompt) return;
    if (!promptDate || !promptTime) {
      alert("Please select both an interview date and time.");
      return;
    }
    await applyStatusChange(interviewPrompt.id, 'Interview', promptDate, promptTime);
    setInterviewPrompt(null);
    setPromptDate('');
    setPromptTime('');
  };

  // Editing date/time directly inside the Interview tab, without touching status
  const handleInterviewFieldChange = (id: string, field: 'interviewDate' | 'interviewTime', value: string) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const saveInterviewSchedule = async (candidate: any) => {
    if (!candidate.interviewDate || !candidate.interviewTime) {
      alert("Please select both date and time before saving.");
      return;
    }
    try {
      await updateInterviewSchedule(candidate.id, candidate.interviewDate, candidate.interviewTime);
    } catch (err) {
      console.error("Failed to update interview schedule", err);
      alert("Failed to save interview schedule.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this candidate?")) {
      try {
        await deleteCandidate(id);
        setCandidates(prev => prev.filter(c => c.id !== id));
      } catch(err) {
        alert("Failed to delete candidate.");
      }
    }
  };

  const handleClearAll = async () => {
    if (window.confirm("Are you sure you want to refresh the pipeline? This will permanently delete all candidates! (Typically used at end of month)")) {
      try {
        await clearAllCandidates();
        setCandidates([]);
      } catch(err) {
        alert("Failed to refresh the pipeline.");
      }
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Position', 'Experience', 'Status', 'Interview Date', 'Interview Time', 'Apply Date', 'Portfolio'];
    const rows = candidates.map(c => [
      c.id, c.firstName, c.lastName, c.email, c.phone, c.position, c.experience, c.status, c.interviewDate || '', c.interviewTime || '', c.applyDate, c.portfolio || 'N/A'
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(item => `"${item}"`).join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Candidates_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("Import candidates from this CSV file?")) {
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;
        
        const rows = text.split('\n').map(row => {
          const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
          return row.split(regex).map(val => val.replace(/^"|"$/g, '').trim());
        }).filter(row => row.some(val => val && val.trim() !== '')); 

        if (rows.length < 2) {
          alert("CSV is empty or missing data rows.");
          return;
        }

        const headers = rows[0].map(h => h.toLowerCase().trim());
        const expectedMap = {
          fnIndex: headers.findIndex(h => h.includes('first')),
          lnIndex: headers.findIndex(h => h.includes('last')),
          emailIndex: headers.findIndex(h => h.includes('email')),
          phoneIndex: headers.findIndex(h => h.includes('phone')),
          posIndex: headers.findIndex(h => h.includes('position')),
          expIndex: headers.findIndex(h => h.includes('experience'))
        };

        let importedCount = 0;
        for (let i = 1; i < rows.length; i++) {
          const rowData = rows[i];
          if (!rowData || rowData.length === 0) continue;

          const getVal = (idx: number) => (idx >= 0 && idx < rowData.length) ? rowData[idx] : '';
          
          const payload = {
            id: 'cand-' + Date.now() + Math.floor(Math.random()*1000) + '-' + i,
            firstName: getVal(expectedMap.fnIndex) || 'Unknown',
            lastName: getVal(expectedMap.lnIndex) || 'Unknown',
            email: getVal(expectedMap.emailIndex) || `unknown${i}_${Date.now()}@example.com`,
            phone: getVal(expectedMap.phoneIndex) || 'N/A',
            position: getVal(expectedMap.posIndex) || 'General Application',
            experience: getVal(expectedMap.expIndex) || '0',
            portfolio: '',
            password: `import-${Math.random().toString(36).slice(2, 12)}`, 
            status: 'Applied',
            applyDate: new Date().toISOString().split('T')[0]
          };

          await createCandidate(payload);
          importedCount++;
        }
        
        alert(`Successfully imported ${importedCount} candidates!`);
        await loadCandidates();
      } catch (err) {
        console.error("CSV Parse Error", err);
        alert("Failed to parse CSV. Please ensure formatting is standard.");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const filteredCandidates = candidates
    .filter(c => getStage(c.status) === activeTab)
    .filter(c =>
      c.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const countFor = (stage: Stage) => candidates.filter(c => getStage(c.status) === stage).length;

  return (
    <div className="recruitment-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Recruitment Pipeline</h1>
          <p className="page-subtitle">Manage candidate statuses. Candidates can apply and track their status at /apply</p>
        </div>
      </div>

      <div className="recruitment-container">
        <div className="card table-card">

          {/* Pipeline Tabs */}
          <div className="pipeline-tabs">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`pipeline-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                <span className="pipeline-tab-count">{countFor(tab.key)}</span>
              </button>
            ))}
          </div>

          <div className="table-actions">
             <h3>{TABS.find(t => t.key === activeTab)?.label}</h3>
             <div className="header-actions">
               <button onClick={handleClearAll} className="btn-refresh">
                 <RefreshCw size={18} /> Monthly Refresh
               </button>
               <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVUpload} style={{ display: 'none' }} />
               <button onClick={() => fileInputRef.current?.click()} className="btn-import" disabled={isImporting}>
                 <Upload size={18} /> {isImporting ? 'Importing...' : 'Import CSV'}
               </button>
               <button onClick={exportToCSV} className="btn-export">
                 <Download size={18} /> Export CSV
               </button>
               <div className="search-input">
                <Search size={18} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Search candidates..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Contact</th>
                  <th>Position</th>
                  <th>Date Applied</th>
                  {activeTab === 'Interview' && <th>Interview Schedule</th>}
                  <th>Move To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{fontWeight: 600, color: 'var(--text-main)'}}>{c.firstName} {c.lastName}</div>
                      <div style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>Id: {c.id}</div>
                    </td>
                    <td>
                      <div>{c.email}</div>
                      <div style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>{c.phone}</div>
                    </td>
                    <td>
                      <div>{c.position}</div>
                      <div style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>{c.experience} yrs</div>
                    </td>
                    <td>{c.applyDate}</td>

                    {activeTab === 'Interview' && (
                      <td>
                        <div className="interview-schedule-cell">
                          <input
                            type="date"
                            value={c.interviewDate || ''}
                            onChange={(e) => handleInterviewFieldChange(c.id, 'interviewDate', e.target.value)}
                          />
                          <input
                            type="time"
                            value={c.interviewTime || ''}
                            onChange={(e) => handleInterviewFieldChange(c.id, 'interviewTime', e.target.value)}
                          />
                          <button
                            className="btn-secondary interview-save-btn"
                            title="Save interview date & time"
                            onClick={() => saveInterviewSchedule(c)}
                          >
                            <CalendarClock size={14} />
                          </button>
                        </div>
                      </td>
                    )}

                    <td>
                      <select 
                        value={getStage(c.status)}
                        onChange={(e) => handleStatusSelect(c, e.target.value as Stage)}
                        className={`status-badge`} 
                        style={{ padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-color)', color: 'var(--text-main)', fontWeight: 'bold' }}
                      >
                        <option value="Applied">Applied</option>
                        <option value="Interview">Interview</option>
                        <option value="Shortlisted">Shortlisted</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Joined">Joined</option>
                      </select>
                    </td>
                    <td className="action-cell">
                      <button onClick={() => setSelectedCandidate(c)} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>View Profile</button>
                      <button onClick={() => handleDelete(c.id)} className="action-btn" style={{ color: 'var(--danger-color)' }} title="Delete Candidate">
                        <Trash2 size={16} />
                      </button>
                      {c.cvFile && (
                        <a href={getStaticFileUrl(c.cvFile)} target="_blank" download className="action-btn" style={{ color: 'var(--primary-color)' }} title="Download CV">
                           <FileText size={18} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredCandidates.length === 0 && (
                  <tr>
                    <td colSpan={activeTab === 'Interview' ? 7 : 6} style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>No candidates in this folder yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Interview scheduling popup - shown when moving a candidate into the Interview folder */}
      {interviewPrompt && (
        <div className="modal-overlay" onClick={() => setInterviewPrompt(null)}>
          <div className="modal-content recruitment-modal animate-fade-in" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><CalendarClock color="var(--primary-color)" /> Schedule Interview</h2>
              <button className="close-btn" onClick={() => setInterviewPrompt(null)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginTop: 0 }}>Select an interview date and time for <strong>{interviewPrompt.name}</strong>. This will show up automatically in the Interview folder.</p>
              <div className="form-row">
                <div className="form-group">
                  <label>Interview Date</label>
                  <input type="date" value={promptDate} onChange={(e) => setPromptDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Interview Time</label>
                  <input type="time" value={promptTime} onChange={(e) => setPromptTime(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setInterviewPrompt(null)}>Cancel</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={confirmInterviewSchedule}>Confirm & Move to Interview</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedCandidate && (
        <div className="modal-overlay" onClick={() => setSelectedCandidate(null)}>
          <div className="modal-content recruitment-modal animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><Briefcase color="var(--primary-color)" /> Candidate Details</h2>
              <button className="close-btn" onClick={() => setSelectedCandidate(null)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              
              <div className="candidate-profile-summary">
                <div className="summary-item">
                  <div className="summary-label">Full Name</div>
                  <div className="summary-value">{selectedCandidate.firstName} {selectedCandidate.lastName}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Candidate ID</div>
                  <div className="summary-value id-value">{selectedCandidate.id}</div>
                </div>
              </div>

              <div className="candidate-details-grid">
                <div className="detail-item">
                  <Mail color="var(--text-muted)" size={18} />
                  <div>
                    <div className="detail-label">Email Address</div>
                    <div className="detail-value">{selectedCandidate.email}</div>
                  </div>
                </div>
                <div className="detail-item">
                  <Phone color="var(--text-muted)" size={18} />
                  <div>
                    <div className="detail-label">Phone Number</div>
                    <div className="detail-value">{selectedCandidate.phone}</div>
                  </div>
                </div>
                <div className="detail-item">
                  <Briefcase color="var(--text-muted)" size={18} />
                  <div>
                    <div className="detail-label">Position Applied For</div>
                    <div className="detail-value highlight">{selectedCandidate.position}</div>
                  </div>
                </div>
                <div className="detail-item">
                  <Award color="var(--text-muted)" size={18} />
                  <div>
                    <div className="detail-label">Experience</div>
                    <div className="detail-value">{selectedCandidate.experience} Years</div>
                  </div>
                </div>
                {selectedCandidate.interviewDate && (
                  <div className="detail-item">
                    <Clock color="var(--text-muted)" size={18} />
                    <div>
                      <div className="detail-label">Interview Scheduled</div>
                      <div className="detail-value">{selectedCandidate.interviewDate} {selectedCandidate.interviewTime ? `at ${selectedCandidate.interviewTime}` : ''}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="candidate-extra-info">
                <div className="extra-item">
                  <div className="extra-label">Portfolio / LinkedIn</div>
                  {selectedCandidate.portfolio ? (
                    <a href={selectedCandidate.portfolio} target="_blank" rel="noreferrer" className="portfolio-link">{selectedCandidate.portfolio}</a>
                  ) : (
                     <div className="no-data">Not provided</div>
                  )}
                </div>
                <div className="extra-item">
                  <div className="extra-label">Application Date</div>
                  <div className="date-value"><Calendar size={14}/> {selectedCandidate.applyDate}</div>
                </div>
              </div>

              <div className="candidate-cv-section">
                <div className="cv-info">
                  <div className="cv-icon">
                    <FileText size={24} />
                  </div>
                  <div>
                    <div className="cv-title">Candidate Resume (CV)</div>
                    <div className="cv-status">
                      {selectedCandidate.cvFile ? 'Uploaded Document' : 'No Document Provided'}
                    </div>
                  </div>
                </div>
                {selectedCandidate.cvFile ? (
                  <a href={getStaticFileUrl(selectedCandidate.cvFile)} target="_blank" download className="btn-primary cv-download-btn">
                    Download CV
                  </a>
                ) : (
                  <button className="btn-secondary cv-unavailable-btn" disabled>
                    Unavailable
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Recruitment;
