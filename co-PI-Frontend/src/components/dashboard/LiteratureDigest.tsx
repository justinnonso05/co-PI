import React, { useState } from 'react';
import { AI_HACKATHON } from '@/lib/endpoints';
import { apiFetch } from '@/lib/api';

export default function LiteratureDigest({ repositoryId, documentId, editorText, onInsert }: { repositoryId: string, documentId: string, editorText?: string, onInsert?: (text: string) => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ digest: any } | null>(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'upload' | 'editor'>('editor');
  const [customPrompt, setCustomPrompt] = useState('');

  const handleAnalyze = async () => {
    if (mode === 'upload' && files.length === 0) {
      setError('Please select at least one PDF file.');
      return;
    }
    if (mode === 'editor' && !editorText) {
      setError('Editor is currently empty.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('repositoryId', repositoryId);
    formData.append('documentId', documentId);

    if (mode === 'upload') {
      files.forEach(f => formData.append('files', f));
    } else {
      formData.append('textContext', editorText!);
    }
    if (customPrompt.trim()) {
      formData.append('customPrompt', customPrompt.trim());
    }

    try {
      const data = await apiFetch<any>(AI_HACKATHON.LITERATURE_DIGEST, {
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
    <div style={{ padding: '1.5rem', background: 'var(--paper)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
      <h3 style={{ margin: '0 0 1rem 0', color: '#111', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        ✨ AI Document Assistant
      </h3>
      
      {!results ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input type="radio" checked={mode === 'editor'} onChange={() => setMode('editor')} />
              Analyze Current Draft (Editor)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input type="radio" checked={mode === 'upload'} onChange={() => setMode('upload')} />
              Upload Reference PDFs
            </label>
          </div>

          {mode === 'upload' && (
            <input 
              type="file" 
              accept=".pdf" 
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              style={{ padding: '1rem', border: '2px dashed #ccc', borderRadius: '4px', background: '#fafafa' }}
            />
          )}

          {mode === 'editor' && (
            <p style={{ fontSize: '0.9rem', color: 'gray', margin: 0 }}>
              The AI will read your current editor draft and generate a synthesized summary or answer your custom prompt.
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Custom Prompt (Optional)</label>
            <input 
              type="text" 
              className="auth-input" 
              placeholder="e.g. Focus specifically on methodologies used..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              style={{ padding: '0.6rem', fontSize: '0.9rem' }}
            />
          </div>

          {error && <p style={{ color: 'var(--error)', margin: 0, fontSize: '0.9rem' }}>{error}</p>}
          
          <button 
            onClick={handleAnalyze} 
            disabled={loading || (mode === 'upload' && files.length === 0) || (mode === 'editor' && !editorText)}
            className="dash-btn-primary"
            style={{ alignSelf: 'flex-start', background: '#2A7C75', marginTop: '0.5rem' }}
          >
            {loading ? 'Analyzing Document...' : 'Analyze Document'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(42,124,117,0.05)', borderRadius: '8px', borderLeft: '4px solid #2A7C75' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#2A7C75' }}>Synthesized Summary</h4>
            <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6 }}>
              {results.digest?.summary}
            </p>
          </div>
          
          <div>
            <h4 style={{ margin: '0 0 0.75rem 0' }}>Identified Research Gaps</h4>
            {results.digest?.gaps?.length > 0 ? (
              <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {results.digest.gaps.map((gap: string, i: number) => (
                  <li key={i} style={{ fontSize: '0.95rem', lineHeight: 1.5 }}>
                    {gap}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: 0, color: 'gray' }}>No obvious gaps identified.</p>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button onClick={() => setResults(null)} className="dash-btn-ghost" style={{ alignSelf: 'flex-start' }}>
              ← Start Over
            </button>
            <button 
              onClick={() => {
                const text = `Synthesized Summary:\n${results.digest?.summary}\n\nIdentified Research Gaps:\n${results.digest?.gaps?.map((g: string) => `- ${g}`).join('\n') || 'None'}`;
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
