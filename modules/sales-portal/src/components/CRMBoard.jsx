import React from 'react';
import { Plus, Filter, Settings } from 'lucide-react';

export default function CRMBoard() {
  const columns = [
    { id: 'new', title: 'New', color: '#00aeef', total: '$14,500' },
    { id: 'prep', title: 'Preparation', color: '#ff7900', total: '$8,200' },
    { id: 'invoice', title: 'Invoice', color: '#9dcf00', total: '$2,100' },
    { id: 'progress', title: 'In Progress', color: '#2fc6f6', total: '$45,000' },
  ];

  const deals = [
    { id: 1, title: 'Website Redesign', company: 'Acme Corp', price: '$5,000', col: 'new' },
    { id: 2, title: 'SEO Optimization', company: 'Stark Ind.', price: '$9,500', col: 'new' },
    { id: 3, title: 'Cloud Migration', company: 'Wayne Ent.', price: '$8,200', col: 'prep' },
    { id: 4, title: 'Software License', company: 'Cyberdyne', price: '$2,100', col: 'invoice' },
    { id: 5, title: 'Enterprise CRM Setup', company: 'Massive Dynamic', price: '$45,000', col: 'progress' },
  ];

  return (
    <div className="bx-content">
      <div className="bx-content-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="bx-page-title">Deals</h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="bx-btn">
              <Filter size={16} /> Filter and search
            </button>
            <button className="bx-btn bx-btn-primary">
              <Plus size={16} /> Create
            </button>
            <button className="bx-btn" style={{ padding: '8px' }}>
              <Settings size={16} />
            </button>
          </div>
        </div>

        <div className="bx-subnav">
          <div className="bx-subnav-item active">Kanban</div>
          <div className="bx-subnav-item">List</div>
          <div className="bx-subnav-item">Activities</div>
          <div className="bx-subnav-item">Calendar</div>
          <div className="bx-subnav-item">Sales Intelligence</div>
        </div>
      </div>

      <div className="bx-kanban">
        {columns.map(col => (
          <div key={col.id} className="bx-kanban-column">
            <div className="bx-kanban-header" style={{ borderTopColor: col.color }}>
              <span>{col.title} <span style={{ color: 'var(--bx-text-muted)', fontWeight: 'normal', fontSize: '12px' }}>({deals.filter(d => d.col === col.id).length})</span></span>
              <span>{col.total}</span>
            </div>
            
            {deals.filter(d => d.col === col.id).map(deal => (
              <div key={deal.id} className="bx-kanban-card" style={{ borderLeftColor: col.color }}>
                <div className="bx-card-title">{deal.title}</div>
                <div className="bx-card-price">{deal.price}</div>
                <div className="bx-card-meta">
                  <span>{deal.company}</span>
                  <span>Today</span>
                </div>
              </div>
            ))}
            
            <div style={{ padding: '8px', textAlign: 'center', color: 'var(--bx-text-muted)', cursor: 'pointer', background: 'rgba(0,0,0,0.02)', border: '1px dashed var(--bx-border-dark)', borderRadius: '2px' }}>
              + Quick deal
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
