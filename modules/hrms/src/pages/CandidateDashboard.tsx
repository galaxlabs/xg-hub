import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { fetchCandidates } from '../api';
import { Briefcase, Calendar, CheckCircle, Clock, FileText, AlertCircle, User } from 'lucide-react';
import './CandidateDashboard.css';

const STEPS = ['Applied', 'Interview', 'Shortlisted', 'Joined'];

// Maps legacy status values (Screening, Offered, Hired) so old records still render correctly
const normalizeStatus = (status: string) => {
  switch (status) {
    case 'Screening': return 'Applied';
    case 'Offered': return 'Shortlisted';
    case 'Hired': return 'Joined';
    default: return status;
  }
};

const CandidateDashboard: React.FC = () => {
  const { user } = useAuth();
  const [candidate, setCandidate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCandidate = async () => {
      try {
        console.log("CandidateDashboard: Starting data load...");
        console.log("CandidateDashboard: User from context:", user);
        
        if (!user) {
          console.warn("CandidateDashboard: No user object found in auth context");
          setIsLoading(false);
          return;
        }

        const data = await fetchCandidates();
        console.log("CandidateDashboard: API data received:", data);
        
        if (!data || !Array.isArray(data)) {
          console.error("CandidateDashboard: Candidates data is not a valid array:", data);
          setCandidate(null);
          setIsLoading(false);
          return;
        }

        // Search by ID or Email (case-insensitive)
        const userEmail = user?.email?.toLowerCase().trim();
        const userEmpId = user?.empId || user?.id; // Check both empId and id

        console.log("CandidateDashboard: Searching for match with Email:", userEmail, "or ID:", userEmpId);

        const me = data.find((c: any) => {
          const candEmail = c.email?.toLowerCase().trim();
          const candId = c.id;
          const match = candId === userEmpId || candEmail === userEmail;
          if (match) console.log("CandidateDashboard: Match found!", c);
          return match;
        });

        if (!me) {
          console.warn("CandidateDashboard: No matching candidate found in the list");
        }
        
        setCandidate(me || null);
      } catch (err: any) {
        console.error("CandidateDashboard: Error in loadCandidate:", err);
        setCandidate(null);
      } finally {
        console.log("CandidateDashboard: Load finished, setting isLoading to false");
        setIsLoading(false);
      }
    };

    loadCandidate();
  }, [user]);

  // Safety check for empty render
  if (isLoading) {
    return (
      <div className="candidate-dashboard loading" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem', background: 'var(--card-bg)', margin: '1rem', borderRadius: '12px' }}>
        <Clock className="animate-spin" size={40} color="var(--primary-color)" />
        <p style={{ color: 'var(--text-main)' }}>Loading your application details...</p>
      </div>
    );
  }

  if (!candidate && !isLoading) {
    return (
      <div className="candidate-dashboard error" style={{ padding: '3rem 2rem', textAlign: 'center', background: 'var(--card-bg)', margin: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)' }}>
        <AlertCircle size={60} color="var(--danger-color)" style={{ margin: '0 auto 1.5rem' }} />
        <h2 style={{ margin: '0 0 1rem', color: 'var(--text-main)' }}>Application Record Not Found</h2>
        <p style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>We could not find an application associated with your account.</p>
        <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Email: {user?.email || 'N/A'}</p>
        <div style={{ marginTop: '2rem' }}>
          <button onClick={() => window.location.reload()} className="btn-primary" style={{ padding: '0.8rem 2rem' }}>
            Try Refreshing
          </button>
        </div>
      </div>
    );
  }

  const normalizedStatus = normalizeStatus(candidate.status);
  const currentStatusIndex = STEPS.indexOf(normalizedStatus) !== -1 ? STEPS.indexOf(normalizedStatus) : 0;
  const isRejected = normalizedStatus === 'Rejected';

  return (
    <div className="candidate-dashboard animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Candidate Portal</h1>
          <p className="page-subtitle">Welcome back, {candidate.firstName}. Track your application status here.</p>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="card status-card">
          <h2>Application Status</h2>
          
          {isRejected ? (
            <div className="rejected-status">
              <AlertCircle size={48} color="var(--danger-color)" />
              <h3>Application Unsuccessful</h3>
              <p>Thank you for applying. Unfortunately, we have decided to move forward with other candidates for this position.</p>
            </div>
          ) : (
            <div className="status-timeline">
              {STEPS.map((step, index) => {
                const isCompleted = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                
                return (
                  <div key={step} className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                    <div className="step-icon-container">
                      {isCompleted ? <CheckCircle size={24} className="step-icon" /> : <Clock size={24} className="step-icon pending" />}
                    </div>
                    <div className="step-content">
                      <h4 style={{ color: isCurrent ? 'var(--primary-color)' : 'var(--text-main)' }}>{step}</h4>
                      {isCurrent && <p className="step-desc">You are currently at this stage.</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card details-card">
          <h3>Application Details</h3>
          <div className="details-grid">
            <div className="detail-item">
              <Briefcase size={18} className="detail-icon" />
              <div>
                <label>Position Applied</label>
                <p className="bold-text">{candidate.position}</p>
              </div>
            </div>
            <div className="detail-item">
              <Calendar size={18} className="detail-icon" />
              <div>
                <label>Date Applied</label>
                <p>{candidate.applyDate}</p>
              </div>
            </div>
            <div className="detail-item">
              <User size={18} className="detail-icon" />
              <div>
                <label>Experience Level</label>
                <p>{candidate.experience} Years</p>
              </div>
            </div>
            <div className="detail-item">
              <FileText size={18} className="detail-icon" />
              <div>
                <label>Portfolio / Link</label>
                <p><a href={candidate.portfolio} target="_blank" rel="noreferrer">View Provided Link</a></p>
              </div>
            </div>
          </div>
          
          <div className="next-steps">
            <h4>Next Steps</h4>
            <p>
              {normalizedStatus === 'Applied' && "HR is reviewing your resume. We will contact you shortly if your profile matches our requirements."}
              {normalizedStatus === 'Interview' && (
                candidate.interviewDate
                  ? `Congratulations! Your interview is scheduled for ${candidate.interviewDate}${candidate.interviewTime ? ` at ${candidate.interviewTime}` : ''}. Please be available at the scheduled time.`
                  : "Congratulations! You have been moved to the interview stage. Please check your email for scheduling details."
              )}
              {normalizedStatus === 'Shortlisted' && "Great news! You have been shortlisted. Our HR team will reach out shortly with the next steps."}
              {normalizedStatus === 'Joined' && "Welcome aboard! Please check your email for onboarding instructions."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateDashboard;
