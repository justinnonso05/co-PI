'use client';
import React, { useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import io from 'socket.io-client';

// Basic Quill + Socket.io editor that streams @coPI responses
export function ProposalEditor({ repositoryId, documentId }: { repositoryId: string, documentId: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillInstance = useRef<Quill | null>(null);
  const socketRef = useRef<any>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!editorRef.current) return;

    // 1. Initialize Quill
    const quill = new Quill(editorRef.current, {
      theme: 'snow',
      placeholder: 'Type your proposal here. Use @coPI to ask AI for help...'
    });
    quillInstance.current = quill;

    // 2. Initialize Socket.IO
    const socket = io('http://localhost:3000');
    socketRef.current = socket;

    socket.emit('join-document', documentId, 'local-user');

    // 3. Listen for text changes to detect @coPI
    quill.on('text-change', (delta, oldDelta, source) => {
      if (source !== 'user') return;

      const text = quill.getText();
      const cursorIndex = quill.getSelection()?.index || 0;

      // Extremely basic trigger: if user typed "@coPI draft intro", we can parse it.
      // In a real app, you'd use a popover menu.
      const lastLineStr = text.substring(0, cursorIndex).split('\n').pop() || '';
      if (lastLineStr.startsWith('@coPI ') && lastLineStr.endsWith('...')) {
        const prompt = lastLineStr.replace('@coPI ', '').replace('...', '').trim();
        if (prompt) {
          setIsStreaming(true);
          // Delete the prompt trigger text so AI can replace it
          quill.deleteText(cursorIndex - lastLineStr.length, lastLineStr.length);
          
          socket.emit('copi-draft', documentId, { prompt, repositoryId });
        }
      }

      // Sync changes to others
      socket.emit('send-changes', documentId, delta);
    });

    // 4. Listen for other users' changes
    socket.on('receive-changes', (delta: any) => {
      quill.updateContents(delta);
    });

    // 5. Listen for AI Stream
    socket.on('copi-stream-chunk', (data: { documentId: string, chunk: string }) => {
      if (data.documentId === documentId && quillInstance.current) {
        const q = quillInstance.current;
        const length = q.getLength();
        // Insert at the end or at cursor (simplified to end for this demo)
        q.insertText(length - 1, data.chunk, { 'color': '#5B8C7B', 'font': 'monospace' });
      }
    });

    socket.on('copi-stream-end', () => {
      setIsStreaming(false);
    });

    socket.on('copi-stream-error', (data: any) => {
      setIsStreaming(false);
      console.error(data.error);
    });

    return () => {
      socket.emit('leave-document', documentId, 'local-user');
      socket.disconnect();
    };
  }, [repositoryId, documentId]);

  return (
    <div className="ws-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1A1A18' }}>Proposal Editor</h3>
        {isStreaming && (
          <span style={{ color: '#2A7C75', fontSize: '0.85rem', fontWeight: 500, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>@coPI is typing...</span>
        )}
      </div>
      {/* Quill editor container */}
      <div style={{ backgroundColor: '#fff', color: '#1A1A18', minHeight: '300px', border: '1px solid rgba(26,26,24,0.1)', borderRadius: '4px' }}>
        <div ref={editorRef} />
      </div>
      <p style={{ fontSize: '0.75rem', color: 'rgba(26,26,24,0.5)', marginTop: '0.5rem' }}>
        Tip: Type "@coPI draft an introduction..." and hit enter to stream AI.
      </p>
    </div>
  );
}
