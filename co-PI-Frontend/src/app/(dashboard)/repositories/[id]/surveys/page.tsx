'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, getToken } from '@/lib/api';
import { SURVEYS, PROJECTS, DOCUMENTS, AI_HACKATHON } from '@/lib/endpoints';
import './survey-mobile.css';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import DatasetReview from '@/components/dashboard/DatasetReview';

type QuestionType = 'SHORT_TEXT' | 'LONG_TEXT' | 'RADIO' | 'CHECKBOX';

interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options: string[];
}

export default function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = searchParams.get('survey');

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  
  // Builder State
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Results State
  const [surveySchema, setSurveySchema] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);

  useEffect(() => {
    if (!getToken()) { router.replace('/login'); return; }

    if (surveyId) {
      // Fetch results
      Promise.all([
        apiFetch<any>(SURVEYS.DETAIL(surveyId)),
        apiFetch<any>(SURVEYS.GET_RESPONSES(surveyId))
      ])
      .then(([schemaData, resData]) => {
        setSurveySchema(schemaData.survey);
        setResponses(resData.responses);
        setLoading(false);
      })
      .catch(e => {
        setError('Failed to load survey data.');
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [surveyId, router]);

  const addQuestion = (type: QuestionType) => {
    setQuestions([...questions, {
      id: crypto.randomUUID(),
      type,
      question: '',
      options: type === 'RADIO' || type === 'CHECKBOX' ? ['Option 1'] : []
    }]);
  };

  const updateQuestion = (id: string, field: string, value: any) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const updateOption = (qId: string, optIndex: number, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const newOpts = [...q.options];
        newOpts[optIndex] = value;
        return { ...q, options: newOpts };
      }
      return q;
    }));
  };

  const addOption = (qId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return { ...q, options: [...q.options, `Option ${q.options.length + 1}`] };
      }
      return q;
    }));
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleSave = async () => {
    if (!title.trim() || questions.length === 0) {
      setError('Title and at least one question are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiFetch(SURVEYS.CREATE(projectId), {
        method: 'POST',
        body: JSON.stringify({
          title,
          schemaJson: { questions }
        })
      });
      router.push(`/repositories/${projectId}`);
    } catch (e: any) {
      setError(e.message || 'Failed to save survey.');
      setSaving(false);
    }
  };

  const exportCSV = () => {
    if (!surveySchema || !responses.length) return;
    
    // Headers are question titles
    const headers = surveySchema.schemaJson.questions.map((q: any) => `"${q.question.replace(/"/g, '""')}"`);
    headers.unshift('"Date Submitted"');
    
    const rows = responses.map(r => {
      const rowData = surveySchema.schemaJson.questions.map((q: any) => {
        const val = r.answers[q.id] || '';
        return `"${Array.isArray(val) ? val.join(', ') : String(val).replace(/"/g, '""')}"`;
      });
      rowData.unshift(`"${new Date(r.createdAt).toLocaleString()}"`);
      return rowData.join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${surveySchema.title}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getChartData = (q: any) => {
    if (q.type !== 'RADIO' && q.type !== 'CHECKBOX') return [];
    
    const counts: Record<string, number> = {};
    q.options.forEach((opt: string) => counts[opt] = 0);
    
    responses.forEach(r => {
      const val = r.answers[q.id];
      if (Array.isArray(val)) {
        val.forEach((v: string) => { if (counts[v] !== undefined) counts[v]++; });
      } else if (val && counts[val] !== undefined) {
        counts[val]++;
      }
    });

    return Object.keys(counts).map(key => ({ name: key, count: counts[key] }));
  };

  // handleAnalyzeInDocument logic moved to the AI Panel's onInsert callback

  if (loading) return <div className="dash-shell"><div className="dash-main" style={{ padding: '2rem' }}>Loading...</div></div>;

  return (
    <div className="dash-shell">
      <main className="dash-main survey-main-container">
        <Link href={`/repositories/${projectId}`} className="dash-btn-ghost" style={{ marginBottom: '1rem', display: 'inline-block' }}>
          ← Back to Project
        </Link>

        {error && <div className="dash-error-box">{error}</div>}

        {surveyId ? (
          /* ── RESULTS VIEW ── */
          <div style={{ maxWidth: '900px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
              <div>
                <h1 className="proj-page-title" style={{ margin: '0 0 0.5rem 0' }}>{surveySchema?.title} - Results</h1>
                <p style={{ color: 'var(--text-muted)' }}>{responses.length} total responses</p>
                {error && <p style={{ color: 'var(--error)', marginTop: '0.5rem' }}>{error}</p>}
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={() => setShowAiPanel(true)}
                  disabled={analyzing || responses.length === 0}
                  className="dash-btn-primary"
                  style={{ background: '#2A7C75', color: '#F2EDE4', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {analyzing ? 'Saving...' : '✨ AI Chat & Analyze'}
                </button>
                <button onClick={exportCSV} className="dash-btn-primary survey-export-btn" disabled={responses.length === 0}>
                  Export CSV
                </button>
                <button
                  onClick={async () => {
                    if (confirm('Are you sure you want to mark Data Collection as complete? You should ensure all responses have been gathered.')) {
                      try {
                        await apiFetch(PROJECTS.UPDATE_STATUS(projectId), {
                          method: 'PATCH',
                          body: JSON.stringify({ status: 'DATA_ANALYSIS' })
                        });
                        router.push(`/repositories/${projectId}`);
                      } catch (e: any) { alert(e.message || 'Failed to update status'); }
                    }
                  }}
                  style={{ background: '#1A1A18', color: '#F2EDE4', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Mark Data Collection Complete
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(5,150,105,0.05)', borderRadius: '8px', border: '1px solid rgba(5,150,105,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Public Survey Link:</strong>
                <button 
                  onClick={() => navigator.clipboard.writeText(`${typeof window !== 'undefined' ? window.location.origin : ''}/surveys/${surveyId}`)}
                  className="dash-btn-ghost" 
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                >
                  Copy Link
                </button>
              </div>
              <a href={`/surveys/${surveyId}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline', wordBreak: 'break-all', display: 'block', marginTop: '0.5rem' }}>
                {typeof window !== 'undefined' ? window.location.origin : ''}/surveys/{surveyId}
              </a>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Share this link with participants to collect responses anonymously.</p>
            </div>

            {responses.length === 0 ? (
              <div className="dash-empty">No responses collected yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {surveySchema?.schemaJson.questions.map((q: any, i: number) => (
                  <div key={q.id} className="dash-card survey-card-mobile" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{i + 1}. {q.question}</h3>
                    
                    {(q.type === 'RADIO' || q.type === 'CHECKBOX') && (
                      <div style={{ height: '300px', width: '100%', marginTop: '1rem' }}>
                        <ResponsiveContainer>
                          <BarChart data={getChartData(q)} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                            <Bar dataKey="count" fill="var(--primary)" radius={[4,4,0,0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {(q.type === 'SHORT_TEXT' || q.type === 'LONG_TEXT') && (
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column' }}>
                        {responses.map((r, ri) => r.answers[q.id] && (
                          <li key={ri} style={{ padding: '1rem 0', borderBottom: ri === responses.length - 1 ? 'none' : '1px solid rgba(26,26,24,0.1)', fontSize: '0.95rem', lineHeight: 1.6, color: 'rgba(26,26,24,0.9)' }}>
                            {r.answers[q.id]}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── BUILDER VIEW ── */
          <div>
            <h1 className="proj-page-title" style={{ marginBottom: '2rem' }}>Build New Survey</h1>
            
            <div className="survey-builder-layout">
              <div className="survey-builder-main">
                <div className="dash-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Survey Title</label>
                  <input 
                    type="text" 
                    className="auth-input" 
                    placeholder="e.g. Patient Satisfaction Survey"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    style={{ fontSize: '1.2rem', padding: '0.8rem', width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                  {questions.map((q, index) => (
                    <div key={q.id} className="dash-card" style={{ padding: '1.5rem', position: 'relative' }}>
                      <button 
                        onClick={() => removeQuestion(q.id)}
                        className="dash-btn-ghost" 
                        style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'var(--error)' }}
                      >
                        Remove
                      </button>
                      
                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', width: 'calc(100% - 80px)' }}>
                        <div style={{ flex: 1 }}>
                          <input 
                            type="text" 
                            className="auth-input" 
                            placeholder="Type your question..."
                            value={q.question}
                            onChange={e => updateQuestion(q.id, 'question', e.target.value)}
                            style={{ fontWeight: 600, width: '100%' }}
                          />
                        </div>
                      </div>

                      {(q.type === 'SHORT_TEXT' || q.type === 'LONG_TEXT') && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', padding: '0.5rem 0' }}>
                          {q.type === 'SHORT_TEXT' ? 'Short text answer will be provided here.' : 'Long paragraph answer will be provided here.'}
                        </div>
                      )}

                      {(q.type === 'RADIO' || q.type === 'CHECKBOX') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '0.5rem' }}>
                          {q.options.map((opt, optIndex) => (
                            <div key={optIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ color: 'var(--primary)' }}>{q.type === 'RADIO' ? '○' : '☐'}</span>
                              <input 
                                type="text" 
                                className="auth-input" 
                                value={opt}
                                onChange={e => updateOption(q.id, optIndex, e.target.value)}
                                style={{ padding: '0.4rem', fontSize: '0.9rem', width: '100%' }}
                              />
                            </div>
                          ))}
                          <button onClick={() => addOption(q.id)} className="dash-btn-ghost" style={{ alignSelf: 'flex-start', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                            + Add Option
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {questions.length === 0 && (
                    <div className="dash-empty">Start by adding a question from the menu.</div>
                  )}
                </div>
              </div>

              {/* Mobile FAB to open sidebar */}
              <button 
                className="survey-mobile-fab dash-btn-primary" 
                onClick={() => setMobileSidebarOpen(true)}
              >
                + Add / Save
              </button>

              {/* Sidebar */}
              <div className={`survey-builder-sidebar dash-card ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem' }}>Survey Actions</h3>
                  <button className="survey-mobile-close dash-btn-ghost" onClick={() => setMobileSidebarOpen(false)}>×</button>
                </div>
                
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Add Question:</p>
                <button onClick={() => { addQuestion('SHORT_TEXT'); setMobileSidebarOpen(false); }} className="dash-btn-ghost" style={{ textAlign: 'left' }}>+ Short Text</button>
                <button onClick={() => { addQuestion('LONG_TEXT'); setMobileSidebarOpen(false); }} className="dash-btn-ghost" style={{ textAlign: 'left' }}>+ Paragraph</button>
                <button onClick={() => { addQuestion('RADIO'); setMobileSidebarOpen(false); }} className="dash-btn-ghost" style={{ textAlign: 'left' }}>+ Multiple Choice</button>
                <button onClick={() => { addQuestion('CHECKBOX'); setMobileSidebarOpen(false); }} className="dash-btn-ghost" style={{ textAlign: 'left' }}>+ Checkboxes</button>
                
                <div style={{ height: '1px', background: 'var(--border)', margin: '1rem 0' }}></div>
                
                <button onClick={handleSave} className="dash-btn-primary" disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
                  {saving ? 'Saving...' : 'Save & Publish'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* AI Tools Side Panel (Overlay) */}
      <aside style={{ 
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '400px', 
        maxWidth: '100%',
        background: '#ffffff', 
        borderLeft: '1px solid rgba(0,0,0,0.1)', 
        boxShadow: showAiPanel ? '-4px 0 24px rgba(0,0,0,0.08)' : 'none',
        display: 'flex', 
        flexDirection: 'column', 
        padding: '1.5rem', 
        overflowY: 'auto',
        gap: '2rem',
        transform: showAiPanel ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0, color: '#2A7C75', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>✨ AI Analysis</h2>
          <button onClick={() => setShowAiPanel(false)} className="dash-btn-ghost" style={{ padding: '0.2rem 0.5rem' }}>✕</button>
        </div>

        <DatasetReview 
          repositoryId={projectId} 
          rawData={responses.map(r => {
            const mappedAnswers: Record<string, any> = {};
            if (surveySchema?.schemaJson?.questions) {
              surveySchema.schemaJson.questions.forEach((q: any) => {
                mappedAnswers[q.question] = r.answers[q.id];
              });
            } else {
              return r;
            }
            return {
              "Submitted At": r.createdAt,
              ...mappedAnswers
            };
          })}
          actionButtonText="Save to New Document"
          onInsert={async (text) => {
            try {
              setAnalyzing(true);
              // 1. Create a new document
              const docRes = await apiFetch<any>(DOCUMENTS.CREATE(projectId), {
                method: 'POST',
                body: JSON.stringify({ title: `${surveySchema?.title || 'Survey'} Analysis` })
              });
              const newDocId = docRes.document.id;

              // 2. Save content to the new document
              await apiFetch(DOCUMENTS.SAVE(newDocId), {
                method: 'PUT',
                body: JSON.stringify({ content: { ops: [{ insert: text + '\n' }] } })
              });

              // 3. Navigate to the editor
              router.push(`/repositories/${projectId}/editor?doc=${newDocId}`);
            } catch (err: any) {
              setError(err.message || 'Failed to save document');
              setAnalyzing(false);
            }
          }}
        />
      </aside>

    </div>
  );
}
