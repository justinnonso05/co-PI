'use client';
import React, { useState } from 'react';
import { AiFactCard } from './AiFactCard';

export function DatasetReview({ repositoryId, documentId }: { repositoryId: string, documentId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('repositoryId', repositoryId);
    formData.append('documentId', documentId);

    try {
      const res = await fetch('http://localhost:3000/api/ai/dataset-review', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ws-card">
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1A1A18', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2A7C75' }}></span>
        AI Dataset Review
      </h3>
      
      {!result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="file" 
            accept=".csv" 
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="auth-input"
            style={{ maxWidth: '300px' }}
          />
          <button 
            onClick={handleUpload} 
            disabled={!file || loading}
            className="dash-btn-primary"
            style={{ alignSelf: 'flex-start', opacity: (!file || loading) ? 0.5 : 1 }}
          >
            {loading ? 'Reviewing...' : 'Upload & Review'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', position: 'relative' }}>
          <div className="ws-card ws-card--plain" style={{ flex: '1 1 300px' }}>
            <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#B4483C' }}>Findings</h4>
            <ul style={{ listStyleType: 'disc', paddingLeft: '1.25rem', color: '#1A1A18', fontSize: '0.9rem', lineHeight: 1.6 }}>
              {result.review?.findings?.map((f: any, i: number) => (
                <li key={i} style={{ marginBottom: '0.5rem' }}>
                  <strong>{f.type}:</strong> {f.description}
                </li>
              ))}
            </ul>
            <pre style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(26,26,24,0.05)', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace', overflowX: 'auto' }}>
              {result.stats}
            </pre>
          </div>
          
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '3rem' }}>
             <AiFactCard 
               fact="Dataset reviewed. Key issues flagged for missing values."
               sourceType="dataset"
               date={new Date().toISOString()}
             />
          </div>
        </div>
      )}
    </div>
  );
}
