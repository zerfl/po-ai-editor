import { useState } from 'react';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PoProvider, usePoStore } from './features/po/usePoStore';
import { PoLoader } from './features/po/PoLoader';
import { EntryList } from './features/po/EntryList';
import { EntryEditor } from './features/po/EntryEditor';
import { TranslatePanel } from './features/ai/TranslatePanel';
import { GlossaryEditor } from './features/glossary/GlossaryEditor';
import { ExportButtons } from './features/export/ExportButtons';
import { PotLoader } from './features/pot-merge/PotLoader';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { Glossary } from '@po-ai-editor/shared';

function AppContent() {
  const { state, dispatch } = usePoStore();
  const [glossary, setGlossary] = useState<Glossary>([]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="flex h-10 shrink-0 items-center justify-between border-b px-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xs font-semibold tracking-tight">
            PO AI Editor
          </h1>
          {state.file && (
            <>
              <span className="text-muted-foreground text-xs">/</span>
              <span className="text-muted-foreground text-xs">
                {state.file.filename}
              </span>
              <Badge variant="secondary" className="h-5 text-[10px]">
                {state.file.entries.length}
              </Badge>
            </>
          )}
        </div>
        {state.file && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => dispatch({ type: 'RESET_FILE' })}
            title="Close file"
          >
            <X />
          </Button>
        )}
      </header>

      {/* Main content */}
      {!state.file ? (
        <div className="flex flex-1 items-center justify-center">
          <PoLoader />
        </div>
      ) : (
        <ResizablePanelGroup
          orientation="horizontal"
          className="flex-1"
          id="po-editor-layout"
        >
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
                </TabsList>
              </div>
              <TabsContent
                value="translate"
                className="m-0 flex-1 overflow-auto"
              >
                <TranslatePanel glossary={glossary} />
              </TabsContent>
              <TabsContent
                value="glossary"
                className="m-0 flex-1 overflow-auto"
              >
                <GlossaryEditor glossary={glossary} onChange={setGlossary} />
              </TabsContent>
              <TabsContent
                value="export"
                className="m-0 flex-1 overflow-auto"
              >
                <div className="space-y-4 p-3">
                  <ExportButtons />
                  <PotLoader />
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
