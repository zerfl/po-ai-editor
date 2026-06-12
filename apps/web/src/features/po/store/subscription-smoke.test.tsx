import { useEffect } from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  getEntryById,
  PoProvider,
  selectDocument,
  selectLoadFile,
  usePoStore,
  usePoStoreApi,
} from './index';
import { testPoFile } from './test-fixtures';

afterEach(() => {
  cleanup();
});

interface TestActions {
  selectEntry: (id: string) => void;
  toggleEntry: (id: string) => void;
}

interface RenderCounts {
  editor: number;
  rows: Record<string, number>;
}

function resetCounts(counts: RenderCounts) {
  counts.editor = 0;
  for (const id of Object.keys(counts.rows)) {
    counts.rows[id] = 0;
  }
}

function Bootstrap({ onReady }: { onReady: (actions: TestActions) => void }) {
  const api = usePoStoreApi();
  const loadFile = usePoStore(selectLoadFile);

  useEffect(() => {
    onReady({
      selectEntry: api.getState().selectEntry,
      toggleEntry: api.getState().toggleEntry,
    });
    loadFile(testPoFile);
  }, [api, loadFile, onReady]);

  return null;
}

function RowProbe({ entryId, onRender }: { entryId: string; onRender: (id: string) => void }) {
  onRender(entryId);

  const entry = usePoStore((state) => getEntryById(state, entryId));
  const isSelected = usePoStore((state) => state.selectedEntryId === entryId);
  const isChecked = usePoStore((state) => state.selectedIds.has(entryId));

  if (!entry) return null;

  return (
    <div data-testid={entryId}>
      {entry.msgid}:{String(isSelected)}:{String(isChecked)}
    </div>
  );
}

function RowGroup({ onRowRender }: { onRowRender: (id: string) => void }) {
  const document = usePoStore(selectDocument);
  if (!document) return null;

  return (
    <>
      {document.entryOrder.slice(0, 3).map((entryId) => (
        <RowProbe key={entryId} entryId={entryId} onRender={onRowRender} />
      ))}
    </>
  );
}

function EditorProbe({ onRender }: { onRender: () => void }) {
  onRender();

  const selectedEntryId = usePoStore((state) => state.selectedEntryId);
  const entry = usePoStore((state) =>
    selectedEntryId ? getEntryById(state, selectedEntryId) : undefined,
  );

  return <div data-testid="editor">{entry?.id ?? 'none'}</div>;
}

describe('po store subscriptions', () => {
  it('re-renders only the affected row/editor path for selection changes', async () => {
    const counts: RenderCounts = { editor: 0, rows: {} };
    const actionsRef: { current: TestActions | null } = { current: null };
    const trackRowRender = (id: string) => {
      counts.rows[id] = (counts.rows[id] ?? 0) + 1;
    };
    const trackEditorRender = () => {
      counts.editor += 1;
    };

    render(
      <PoProvider>
        <Bootstrap
          onReady={(nextActions) => {
            actionsRef.current = nextActions;
          }}
        />
        <RowGroup onRowRender={trackRowRender} />
        <EditorProbe onRender={trackEditorRender} />
      </PoProvider>,
    );

    await waitFor(() => {
      expect(actionsRef.current).not.toBeNull();
      expect(counts.rows['entry-welcome']).toBeGreaterThan(0);
      expect(counts.rows['entry-save']).toBeGreaterThan(0);
      expect(counts.rows['entry-archive']).toBeGreaterThan(0);
    });

    resetCounts(counts);

    const storeActions = actionsRef.current;
    if (!storeActions) {
      throw new Error('Store actions were not initialized');
    }

    act(() => {
      storeActions.selectEntry('entry-save');
    });

    expect(counts.rows['entry-welcome']).toBe(0);
    expect(counts.rows['entry-save']).toBeGreaterThan(0);
    expect(counts.rows['entry-archive']).toBe(0);
    expect(counts.editor).toBeGreaterThan(0);

    resetCounts(counts);

    act(() => {
      storeActions.toggleEntry('entry-save');
    });

    expect(counts.rows['entry-welcome']).toBe(0);
    expect(counts.rows['entry-save']).toBeGreaterThan(0);
    expect(counts.rows['entry-archive']).toBe(0);
    expect(counts.editor).toBe(0);
  });
});
