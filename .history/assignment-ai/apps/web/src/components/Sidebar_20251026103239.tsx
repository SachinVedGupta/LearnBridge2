'use client';

import { useState, useEffect, useCallback } from 'react';
import { askAPI, editAPI } from '@/lib/api';
import type { Editor } from '@tiptap/react';
import { mapSuggestionsToAbsolute } from '@/extensions/InlineSuggestions';
import type { MappedSuggestion } from '@assignment-ai/shared';
import { templates } from '@/lib/templates';
import { analyzeText, type WritingStats } from '@/lib/analytics';
import Analytics from './Analytics';

interface SidebarProps {
  response: string | null;
  loading: boolean;
  editor: Editor | null;
  onAskResponse: (text: string) => void;
  onLoadingChange: (loading: boolean) => void;
  courseCtx: string;
  onCourseCtxChange: (text: string) => void;
}

type Mode = 'ask' | 'agent';

export default function Sidebar({ response, loading, editor, onAskResponse, onLoadingChange, courseCtx, onCourseCtxChange }: SidebarProps) {
  const [instructions, setInstructions] = useState('');
  const [mode, setMode] = useState<Mode>('ask');
  const [error, setError] = useState<string | null>(null);
  const [showCourseCtx, setShowCourseCtx] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [agentSuggestions, setAgentSuggestions] = useState<MappedSuggestion[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; templateId: string | null }>({
    show: false,
    templateId: null,
  });
  const [stats, setStats] = useState<WritingStats>({
    wordCount: 0,
    charCount: 0,
    charCountNoSpaces: 0,
    sentenceCount: 0,
    paragraphCount: 0,
    avgSentenceLength: 0,
    readingTimeMinutes: 0,
    readabilityScore: 0,
    readabilityLevel: 'N/A',
    vocabularyDiversity: 0,
  });

  const updateLoading = (isLoading: boolean) => {
    onLoadingChange(isLoading);
  };

  // Update analytics when editor content changes (debounced)
  useEffect(() => {
    if (!editor) return;

    const updateAnalytics = () => {
      const text = editor.getText();
      const newStats = analyzeText(text);
      setStats(newStats);
    };

    // Initial update
    updateAnalytics();

    // Debounce subsequent updates
    let timeoutId: NodeJS.Timeout;
    const handleUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateAnalytics, 500);
    };

    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
      clearTimeout(timeoutId);
    };
  }, [editor]);

  const handleAsk = async () => {
    if (!editor) return;
    if (!instructions.trim()) {
      setError('Please enter a question');
      return;
    }

    updateLoading(true);
    setError(null);

    try {
      const docText = editor.getText();
      const result = await askAPI({
        docSlice: docText,
        instructions: instructions,
        courseCtx: courseCtx || undefined,
      });
      onAskResponse(result.assistant_text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
    } finally {
      updateLoading(false);
    }
  };

  const handleAgent = async () => {
    if (!editor) return;
    if (!instructions.trim()) {
      setError('Please enter brief instructions for suggestions');
      return;
    }
    const { from, to } = editor.state.selection;
    if (from === to) {
      setError('Please select text to receive inline suggestions');
      return;
    }

    updateLoading(true);
    setError(null);

    try {
      const selectedText = from !== to ? editor.state.doc.textBetween(from, to, ' ') : '';
      
      const result = await editAPI({
        docSlice: selectedText,
        range: { from, to },
        instructions: instructions,
        courseCtx: courseCtx || undefined,
      });

      // Map suggestion ranges (relative to selection) to absolute positions
      if (Array.isArray(result.suggestions) && result.suggestions.length > 0) {
        console.log('[Sidebar] Received suggestions:', result.suggestions);
        const mapped = mapSuggestionsToAbsolute(result.suggestions, from, editor);
        console.log('[Sidebar] Mapped suggestions:', mapped);
        editor.commands.setSuggestions(mapped, from);
        setAgentSuggestions(mapped);
      } else {
        console.log('[Sidebar] No suggestions returned');
      }

      if (result.summary) {
        onAskResponse(result.summary);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      updateLoading(false);
    }
  };

  const acceptSuggestion = (id: string) => {
    editor?.commands.acceptSuggestion(id);
    setAgentSuggestions(prev => prev.filter(s => s.id !== id));
  };

  const rejectSuggestion = (id: string) => {
    editor?.commands.rejectSuggestion(id);
    setAgentSuggestions(prev => prev.filter(s => s.id !== id));
  };

  const acceptAll = () => {
    if (!editor || agentSuggestions.length === 0) return;
    // Sort by position descending to avoid offset issues
    const sorted = [...agentSuggestions].sort((a, b) => b.absoluteFrom - a.absoluteFrom);
    for (const s of sorted) {
      editor.commands.acceptSuggestion(s.id);
    }
    setAgentSuggestions([]);
  };

  const rejectAll = () => {
    if (!editor || agentSuggestions.length === 0) return;
    for (const s of agentSuggestions) {
      editor.commands.rejectSuggestion(s.id);
    }
    setAgentSuggestions([]);
  };

  const handleSubmit = async () => {
    if (mode === 'ask') {
      await handleAsk();
    } else {
      await handleAgent();
    }
    setInstructions('');
    setError(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    if (!editor) return;

    // Check if editor has content
    const currentContent = editor.getText().trim();
    if (currentContent && currentContent.length > 0) {
      // Show confirmation modal
      setConfirmModal({ show: true, templateId });
    } else {
      // No content, apply template directly
      applyTemplate(templateId);
    }
  };

  const applyTemplate = (templateId: string) => {
    if (!editor) return;
    
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    // Clear editor and insert template
    editor.commands.setContent(template.content);
    editor.commands.focus();
    setShowTemplates(false);
    setConfirmModal({ show: false, templateId: null });
  };

  const handleConfirmTemplate = () => {
    if (confirmModal.templateId) {
      applyTemplate(confirmModal.templateId);
    }
  };

  const handleCancelTemplate = () => {
    setConfirmModal({ show: false, templateId: null });
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border border-gray-700 rounded-lg overflow-hidden shadow-xl">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <h2 className="text-base font-semibold text-gray-100 flex items-center gap-2">
          <span className="text-xl">🤖</span>
          AI Assistant
        </h2>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Analytics Section */}
        <div>
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="text-xs text-gray-400 hover:text-gray-300 underline mb-2"
          >
            {showAnalytics ? '− Hide' : '📊 Show'} Writing Stats
          </button>
          {showAnalytics && <Analytics stats={stats} />}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-sm text-gray-400">Thinking...</p>
            </div>
          </div>
        )}
        
        {!loading && response && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 shadow-sm">
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-gray-200 text-sm leading-relaxed">{response}</div>
            </div>
            {/* Suggestion actions (contextual) */}
            {agentSuggestions.length > 0 && (
              <div className="mt-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs text-gray-400">Apply suggestions:</span>
                  <button onClick={acceptAll} className="text-xs px-2 py-1 rounded bg-green-700 text-white hover:bg-green-600">Accept All</button>
                  <button onClick={rejectAll} className="text-xs px-2 py-1 rounded bg-red-700 text-white hover:bg-red-600">Reject All</button>
                </div>
                <ul className="space-y-2">
                  {agentSuggestions.map(s => (
                    <li key={s.id} className="bg-gray-900 border border-gray-700 rounded p-2 text-xs text-gray-200">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="text-gray-400 mb-1">
                            Replace [{s.absoluteFrom}..{s.absoluteTo}]
                            {s.stale && <span className="ml-2 text-red-400">(stale)</span>}
                            {s.severity && <span className="ml-2 text-blue-400">({s.severity})</span>}
                          </div>
                          <div className="flex flex-col gap-1">
                            <div><span className="bg-red-900/60 px-1 rounded">{s.original}</span></div>
                            <div><span className="bg-green-900/60 px-1 rounded">{s.replacement}</span></div>
                            {s.reason && <div className="text-gray-500">{s.reason}</div>}
                            {s.confidence !== undefined && (
                              <div className="text-gray-500">Confidence: {(s.confidence * 100).toFixed(0)}%</div>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex gap-2">
                          <button 
                            onClick={() => acceptSuggestion(s.id)} 
                            disabled={s.stale}
                            className="px-2 py-1 rounded bg-green-700 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Accept
                          </button>
                          <button 
                            onClick={() => rejectSuggestion(s.id)} 
                            className="px-2 py-1 rounded bg-red-700 text-white hover:bg-red-600"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        {!loading && !response && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-gray-300 text-sm mb-2 font-medium">
              Ready to help!
            </p>
            <p className="text-gray-500 text-xs max-w-xs">
              Ask me questions about your assignment or select text to improve it with Agent mode.
            </p>
          </div>
        )}
      </div>

      {/* Chat Input Area */}
      <div className="border-t border-gray-700 bg-gray-800 p-4">
        {/* Templates Section */}
        <div className="mb-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="text-xs text-gray-400 hover:text-gray-300 underline"
          >
            {showTemplates ? '− Hide' : '📝 Use'} Templates
          </button>
        </div>

        {/* Templates Dropdown */}
        {showTemplates && (
          <div className="mb-3 bg-gray-900 border border-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-2">Choose a template to get started:</p>
            <div className="grid grid-cols-1 gap-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  disabled={loading}
                  className="text-left px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{template.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-gray-400">{template.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Course Context Toggle */}
        <div className="mb-2">
          <button
            onClick={() => setShowCourseCtx(!showCourseCtx)}
            className="text-xs text-gray-400 hover:text-gray-300 underline"
          >
            {showCourseCtx ? '− Hide' : '+ Add'} Course Context
          </button>
        </div>

        {/* Course Context */}
        {showCourseCtx && (
          <div className="mb-3 bg-gray-900 border border-gray-700 rounded-lg p-3">
            <textarea
              value={courseCtx}
              onChange={(e) => onCourseCtxChange(e.target.value)}
              placeholder="Paste rubric or course guidelines..."
              className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
              rows={3}
              disabled={loading}
            />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-3 bg-red-900/50 border border-red-700 text-red-300 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Input Box */}
        <div className="bg-gray-700 border border-gray-600 rounded-2xl overflow-hidden">
          <div className="flex items-center p-2 gap-2">
            {/* Mode Dropdown */}
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              disabled={loading}
              className="px-3 py-2 text-sm font-medium bg-gray-800 text-gray-200 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:opacity-50 cursor-pointer"
            >
              <option value="ask">💡 Ask</option>
              <option value="agent">✨ Agent</option>
            </select>

            {/* Input Field */}
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={mode === 'ask' ? "Ask me anything..." : "Ask me to generate content..."}
              className="flex-1 px-3 py-2 text-sm bg-transparent text-gray-200 placeholder-gray-500 border-0 focus:outline-none focus:ring-0"
              disabled={loading}
            />

            {/* Send Button */}
            <button
              onClick={handleSubmit}
              disabled={loading || !editor || !instructions.trim()}
              className="flex-shrink-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mode hint */}
        <div className="mt-2 text-xs text-gray-500">
          {mode === 'ask' && '💡 Get tutoring guidance'}
          {mode === 'agent' && '✨ I will generate content based on your instructions'}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            {/* Icon */}
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-500/10 rounded-full mb-4">
              <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-100 text-center mb-2">
              Replace Current Content?
            </h3>

            {/* Message */}
            <p className="text-sm text-gray-400 text-center mb-6">
              This will replace your current content with the selected template. This action cannot be undone.
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCancelTemplate}
                className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTemplate}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

