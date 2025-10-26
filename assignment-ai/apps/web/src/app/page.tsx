'use client';

import { useState } from 'react';
import AssignmentLogo from '@/components/AssignmentLogo';
import Editor from '@/components/Editor';
import Sidebar, { type Mode } from '@/components/Sidebar';
import { Cog6ToothIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import type { Editor as TipTapEditor } from '@tiptap/react';

export default function Home() {
  const [editor, setEditor] = useState<TipTapEditor | null>(null);
  const [askResponse, setAskResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [courseCtx, setCourseCtx] = useState('');
  const [mode, setMode] = useState<Mode>('ask');
  const [docTitle, setDocTitle] = useState('Untitled Document');
  const [prefersDark, setPrefersDark] = useState(true);

  const handleEditorReady = (editorInstance: TipTapEditor) => {
    setEditor(editorInstance);
  };

  const handleAskResponse = (text: string) => {
    setAskResponse(text);
  };

  const handleLoadingChange = (isLoading: boolean) => {
    setLoading(isLoading);
  };

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-br from-gray-950 via-black to-gray-950 p-4 text-gray-100 md:p-6">
      <header className="mb-4 rounded-2xl border border-gray-800/80 bg-gray-900/80 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="grid gap-3 lg:grid-cols-[auto,1fr,auto] lg:items-center">
          <div className="flex items-center gap-3">
            <AssignmentLogo className="h-14 w-auto md:h-16" />
          </div>

          <div className="flex flex-col items-center gap-3 lg:flex-row lg:items-center lg:justify-center lg:gap-6">
            <label className="mx-auto flex w-full max-w-md items-center gap-2 rounded-xl border border-gray-800 bg-gray-950/70 px-3 py-2 text-sm shadow-inner shadow-black/30 focus-within:border-blue-500/70 focus-within:ring-2 focus-within:ring-blue-500/30">
              <span className="text-xs uppercase tracking-wide text-gray-500">Document</span>
              <input
                type="text"
                value={docTitle}
                onChange={(event) => setDocTitle(event.target.value)}
                className="flex-1 bg-transparent text-base font-medium text-gray-100 placeholder-gray-500 focus:outline-none"
                placeholder="Untitled document"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPrefersDark((prev) => !prev)}
              className="rounded-full border border-gray-800 bg-gray-950/60 p-2 text-gray-300 shadow-inner shadow-black/30 transition hover:border-gray-700 hover:bg-gray-900"
              aria-label={prefersDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {prefersDark ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
            </button>
            <button
              type="button"
              className="rounded-full border border-gray-800 bg-gray-950/60 p-2 text-gray-300 shadow-inner shadow-black/30 transition hover:border-gray-700 hover:bg-gray-900"
              aria-label="Open settings"
            >
              <Cog6ToothIcon className="h-5 w-5" />
            </button>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600/40 to-indigo-600/40 text-sm font-semibold text-[#e6eaf2] shadow-inner shadow-blue-500/30">
              <UserCircleIcon className="h-7 w-7 text-blue-200" />
            </span>
          </div>
        </div>
      </header>

      <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr),minmax(0,1fr)] md:gap-6">
        <div className="flex min-h-0 flex-col overflow-visible">
          <Editor onEditorReady={handleEditorReady} />
        </div>

        <div className="flex min-h-0 flex-col overflow-visible">
          <Sidebar
            response={askResponse}
            loading={loading}
            editor={editor}
            onAskResponse={handleAskResponse}
            onLoadingChange={handleLoadingChange}
            courseCtx={courseCtx}
            onCourseCtxChange={setCourseCtx}
            mode={mode}
            onModeChange={setMode}
          />
        </div>
      </div>
    </main>
  );
}
