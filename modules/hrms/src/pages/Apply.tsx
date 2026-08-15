import React, { useState, useRef } from 'react';
import { Upload, Send, CheckCircle } from 'lucide-react';
import { createCandidate, API_BASE_URL } from '../api';
import { Link } from 'react-router-dom';
import './Apply.css';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const Apply: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    position: '',
    experience: '',
    portfolio: ''
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resume, setResume] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setResume(e.dataTransfer.files[0]);
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResume(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      alert("Email and Password are required to create your candidate account.");
      return;
    }

    if (!resume) {
      alert("Please upload your resume.");
      return;
    }

    const formDataToSend = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      formDataToSend.append(key, value);
    });
    formDataToSend.append('cvFile', resume);

    try {
      const res = await fetch(`${API_BASE_URL}/candidates/apply`, {
        method: 'POST',
        body: formDataToSend,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Server error: ${res.status}`);
      }

      setIsSubmitted(true);
      setTimeout(() => {
        // Option to reset form if they want, but here we redirect them to login implicitly
      }, 4000);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to submit application.");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="apply-page">
      <div className="apply-container animate-fade-in">
        <div className="apply-header">
          <div className="apply-logo">
            <img src="/logo.png" alt="Xperts Global" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
          </div>
          <h1>Join Our Team</h1>
          <p>We are always looking for great talent. Apply now and track your progress through our candidate portal!</p>
        </div>

        <div className="card form-card">
          {isSubmitted ? (
            <div className="success-message animate-fade-in" style={{ padding: '2rem', textAlign: 'center' }}>
              <CheckCircle size={48} color="var(--success-color)" style={{ margin: '0 auto' }} />
              <h3 style={{ margin: '1rem 0' }}>Profile Created!</h3>
              <p>Your application has been received. You can now log into your Candidate Portal to track your status.</p>
              <div style={{ marginTop: '2rem' }}>
                <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', padding: '0.8rem 2rem' }}>Go to Login Page</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="application-form">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input required type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="e.g. John" />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input required type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="e.g. Doe" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email Address *</label>
                  <input required type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" />
                </div>
                <div className="form-group">
                  <label>Portal Password *</label>
                  <input required type="text" name="password" value={formData.password} onChange={handleChange} placeholder="Create a strong password" style={{ border: '1px solid var(--primary-color)' }} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 234 567 890" />
                </div>
                <div className="form-group">
                  <label>Position Applying For *</label>
                  <select required name="position" value={formData.position} onChange={handleChange}>
                    <option value="" disabled>Select a position</option>
                    <option value="Sales Executive">Sales Executive</option>
                    <option value="Sales Closer">Sales Closer</option>
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="AI Intern">AI Intern</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Years of Experience *</label>
                  <select required name="experience" value={formData.experience} onChange={handleChange}>
                    <option value="" disabled>Select experience level</option>
                    <option value="0-1">0-1 Years (Entry Level)</option>
                    <option value="1-3">1-3 Years (Junior)</option>
                    <option value="3-5">3-5 Years (Mid-Level)</option>
                    <option value="5+">5+ Years (Senior)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Portfolio / LinkedIn URL</label>
                  <input type="url" name="portfolio" value={formData.portfolio} onChange={handleChange} placeholder="https://..." />
                </div>
              </div>

              <div className="form-group">
                <label>Upload Resume / CV *</label>
                <div
                  className={`file-upload ${dragActive ? 'drag-active' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragActive ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    padding: '1.5rem',
                    textAlign: 'center',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: dragActive ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-color)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Upload size={24} className="upload-icon" style={{ margin: '0 auto', color: dragActive ? 'var(--primary-color)' : 'var(--text-muted)' }} />
                  <span style={{ display: 'block', marginTop: '0.5rem', color: dragActive ? 'var(--primary-color)' : 'inherit', fontWeight: resume ? 600 : 'normal' }}>
                    {resume ? `Selected File: ${resume.name}` : 'Click to browse or drag and drop your resume here'}
                  </span>
                  {!resume && <span className="file-hint" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PDF, DOCX up to 5MB</span>}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary form-submit-btn" style={{ width: '100%', padding: '1rem', marginTop: '1rem' }}>
                <Send size={18} style={{ marginRight: '0.5rem' }} /> Submit Application & Create Account
              </button>

              <div style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)' }}>
                Already have a candidate portal account? <Link to="/login" style={{ color: 'var(--primary-color)' }}>Sign in here</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Apply;
