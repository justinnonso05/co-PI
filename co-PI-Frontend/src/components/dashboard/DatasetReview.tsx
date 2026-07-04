import React, { useState } from 'react';
import { AI_HACKATHON } from '@/lib/endpoints';
import { apiFetch } from '@/lib/api';

export default function DatasetReview({ repositoryId, documentId, onInsert }: { repositoryId: string, documentId: string, onInsert?: (text: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ stats: string, review: any } | null>(null);
  const [error, setError] = useState('');

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a CSV file.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('repositoryId', repositoryId);
    formData.append('documentId', documentId);

    try {
      const data = await apiFetch<any>(AI_HACKATHON.DATASET_REVIEW, {
        method: 'POST',
        body: formData
      });

      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '1rem', background: 'var(--paper)', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
      <h3 style={{ margin: '0 0 1rem 0', color: '#111' }}>AI Dataset Review (CSV)</h3>
      
      {!results ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="file" 
            accept=".csv" 
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ padding: '0.5rem', border: '1px dashed #ccc', borderRadius: '4px' }}
          />
          {error && <p style={{ color: 'var(--error)', margin: 0 }}>{error}</p>}
          <button 
            onClick={handleUpload} 
            disabled={loading || !file}
            className="dash-btn-primary"
            style={{ alignSelf: 'flex-start', background: '#2A7C75' }}
          >
            {loading ? 'Analyzing Dataset...' : 'Review Dataset'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(42,124,117,0.05)', borderRadius: '4px', borderLeft: '3px solid #2A7C75' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#2A7C75' }}>Statistical Summary</h4>
            <pre style={{ margin: 0, fontSize: '0.85rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
              {results.stats}
            </pre>
          </div>
          
          <div>
            <h4 style={{ margin: '0 0 0.5rem 0' }}>AI Findings</h4>
            {results.review?.findings?.length > 0 ? (
              <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {results.review.findings.map((f: any, i: number) => (
                  <li key={i}>
                    <strong>{f.type}:</strong> {f.description}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: 0, color: 'gray' }}>No critical anomalies found.</p>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button onClick={() => setResults(null)} className="dash-btn-ghost" style={{ alignSelf: 'flex-start' }}>
              Analyze Another Dataset
            </button>
            <button 
              onClick={() => {
                const text = `Statistical Summary:\n${results.stats}\n\nAI Findings:\n${results.review?.findings?.map((f: any) => `- ${f.type}: ${f.description}`).join('\n') || 'None'}`;
                onInsert?.(text);
              }} 
              className="dash-btn-primary" 
              style={{ background: '#2A7C75' }}
            >
              Insert into Editor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
