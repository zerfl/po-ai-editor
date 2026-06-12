import { useState, lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  PoProvider,
  usePoStore,
  selectEntryCount,
  selectFilename,
  selectHasFile,
  selectResetFile,
} from './features/po/store';
import { PoLoader } from './features/po/PoLoader';
import { EntryList } from './features/po/EntryList';
import { EntryEditor } from './features/po/EntryEditor';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { Glossary } from '@po-ai-editor/shared';

const TranslatePanel = lazy(() =>
  import('./features/ai/TranslatePanel').then((m) => ({ default: m.TranslatePanel })),
);
const GlossaryEditor = lazy(() =>
  import('./features/glossary/GlossaryEditor').then((m) => ({ default: m.GlossaryEditor })),
);
const ExportButtons = lazy(() =>
  import('./features/export/ExportButtons').then((m) => ({ default: m.ExportButtons })),
);
const PotLoader = lazy(() =>
  import('./features/pot-merge/PotLoader').then((m) => ({ default: m.PotLoader })),
);

function AppContent() {
  const hasFile = usePoStore(selectHasFile);
  const filename = usePoStore(selectFilename);
  const entryCount = usePoStore(selectEntryCount);
  const resetFile = usePoStore(selectResetFile);
  const [glossary, setGlossary] = useState<Glossary>([]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="flex h-10 shrink-0 items-center justify-between border-b px-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xs font-semibold tracking-tight">PO AI Editor</h1>
          {hasFile && filename && (
            <>
              <span className="text-muted-foreground text-xs">/</span>
              <span className="text-muted-foreground text-xs">{filename}</span>
              <Badge variant="secondary" className="h-5 text-[10px]">
                {entryCount}
              </Badge>
            </>
          )}
        </div>
        {hasFile && (
          <Button variant="ghost" size="icon-xs" onClick={resetFile} title="Close file">
            <X />
          </Button>
        )}
      </header>

      {/* Main content */}
      {!hasFile ? (
        <div className="flex flex-1 items-center justify-center">
          <PoLoader />
        </div>
      ) : (
        <ResizablePanelGroup orientation="horizontal" className="flex-1" id="po-editor-layout">
          {/* Entry List Panel */}
          <ResizablePanel
            defaultSize="32%"
            minSize="20%"
            maxSize="50%"
            collapsible
            collapsedSize="0%"
          >
            <EntryList />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Editor Panel */}
          <ResizablePanel defaultSize="38%" minSize="25%">
            <EntryEditor />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Sidebar Panel */}
          <ResizablePanel
            defaultSize="30%"
            minSize="20%"
            maxSize="45%"
            collapsible
            collapsedSize="0%"
          >
            <Tabs defaultValue="translate" className="flex h-full flex-col">
              <div className="border-b px-3">
                <TabsList variant="line" className="h-9">
                  <TabsTrigger value="translate" className="text-xs">
                    Translate
                  </TabsTrigger>
                  <TabsTrigger value="glossary" className="text-xs">
                    Glossary
                  </TabsTrigger>
                  <TabsTrigger value="export" className="text-xs">
                    Export
                  </TabsTrigger>
                  <TabsTrigger value="update" className="text-xs">
                    Update
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="translate" className="m-0 flex-1 overflow-auto">
                <Suspense>
                  <TranslatePanel glossary={glossary} />
                </Suspense>
              </TabsContent>
              <TabsContent value="glossary" className="m-0 flex-1 overflow-auto">
                <Suspense>
                  <GlossaryEditor glossary={glossary} onChange={setGlossary} />
                </Suspense>
              </TabsContent>
              <TabsContent value="export" className="m-0 flex-1 overflow-auto">
                <div className="p-3">
                  <Suspense>
                    <ExportButtons />
                  </Suspense>
                </div>
              </TabsContent>
              <TabsContent value="update" className="m-0 flex-1 overflow-auto">
                <div className="flex h-full items-center justify-center p-3">
                  <Suspense>
                    <PotLoader />
                  </Suspense>
                </div>
              </TabsContent>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
      <Toaster position="bottom-right" />
    </div>
  );
}

export default function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <PoProvider>
        <AppContent />
      </PoProvider>
    </TooltipProvider>
  );
}
