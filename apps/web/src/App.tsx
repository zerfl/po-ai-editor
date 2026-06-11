import { useState } from 'react';
import { Toaster } from 'sonner';
import { PoProvider, usePoStore } from './features/po/usePoStore';
import { PoLoader } from './features/po/PoLoader';
import { EntryList } from './features/po/EntryList';
import { EntryEditor } from './features/po/EntryEditor';
import { TranslatePanel } from './features/ai/TranslatePanel';
import { GlossaryEditor } from './features/glossary/GlossaryEditor';
import { ExportButtons } from './features/export/ExportButtons';
import { PotLoader } from './features/pot-merge/PotLoader';
import type { Glossary } from '@po-ai-editor/shared';

function AppContent() {
  const { state } = usePoStore();
  const [glossary, setGlossary] = useState<Glossary>([]);
  const [sidebarTab, setSidebarTab] = useState<'translate' | 'glossary' | 'export'>('translate');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold">PO AI Editor</h1>
        {state.file && (
          <span className="text-sm text-muted-foreground">
            {state.file.filename} — {state.file.entries.length} entries
          </span>
        )}
      </header>
      <main className="p-6">
        {!state.file ? (
          <div className="max-w-xl mx-auto mt-12 relative">
            <PoLoader />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2">
              <EntryList />
            </div>
            <div>
              <EntryEditor />
            </div>
            <div className="space-y-4">
              <div className="flex border-b">
                <button
                  onClick={() => setSidebarTab('translate')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                    sidebarTab === 'translate'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground'
                  }`}
                >
                  Translate
                </button>
                <button
                  onClick={() => setSidebarTab('glossary')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                    sidebarTab === 'glossary'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground'
                  }`}
                >
                  Glossary
                </button>
                <button
                  onClick={() => setSidebarTab('export')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                    sidebarTab === 'export'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground'
                  }`}
                >
                  Export
                </button>
              </div>
              {sidebarTab === 'translate' && <TranslatePanel glossary={glossary} />}
              {sidebarTab === 'glossary' && <GlossaryEditor glossary={glossary} onChange={setGlossary} />}
              {sidebarTab === 'export' && (
                <div className="space-y-4">
                  <ExportButtons />
                  <PotLoader />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <PoProvider>
      <AppContent />
    </PoProvider>
  );
}
