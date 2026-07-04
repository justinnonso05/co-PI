'use client';
import React, { useState } from 'react';
import { AiFactCard } from './AiFactCard';

export function LiteratureDigest({ repositoryId, documentId }: { repositoryId: string, documentId: string }) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleUpload = async () => {
    if (!files || files.length === 0) return;
    setLoading(true);
    
    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('files', f));
    formData.append('repositoryId', repositoryId);
    formData.append('documentId', documentId);

    try {
      const res = await fetch('http://localhost:3000/api/ai/literature-digest', {
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
        AI Literature Digest
      </h3>
      
      {!result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="file" 
            accept=".pdf" 
            multiple
            onChange={(e) => setFiles(e.target.files)}
            className="auth-input"
            style={{ maxWidth: '300px' }}
          />
          <button 
            onClick={handleUpload} 
            disabled={!files || loading}
            className="dash-btn-primary"
            style={{ alignSelf: 'flex-start', opacity: (!files || loading) ? 0.5 : 1 }}
          >
            {loading ? 'Synthesizing...' : 'Upload & Digest'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', position: 'relative' }}>
          <div className="ws-card ws-card--plain" style={{ flex: '1 1 300px' }}>
            <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#1A1A18' }}>Digest Summary</h4>
            <p style={{ color: 'rgba(26,26,24,0.7)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>{result.digest?.summary}</p>
            
            <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#D49A89' }}>Identified Gaps</h4>
            <ul style={{ listStyleType: 'disc', paddingLeft: '1.25rem', color: '#1A1A18', fontSize: '0.9rem', lineHeight: 1.6 }}>
              {result.digest?.gaps?.map((gap: string, i: number) => (
                <li key={i} style={{ marginBottom: '0.5rem' }}>{gap}</li>
              ))}
            </ul>
          </div>

          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '3rem' }}>
             <AiFactCard 
               fact="Literature review digested. Gaps identified."
               sourceType="paper"
               date={new Date().toISOString()}
             />
          </div>
        </div>
      )}
    </div>
  );
}
