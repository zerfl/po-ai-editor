import { useEffect } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TranslatePanel } from './TranslatePanel';
import { PoProvider, usePoStoreApi } from '../po/store';
import { testPoFile } from '../po/store/test-fixtures';
import type { PoFile } from '@po-ai-editor/shared';

const { translateMock } = vi.hoisted(() => ({
  translateMock: vi.fn(),
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;

vi.mock('@/api/client', () => ({
  getModels: vi.fn().mockResolvedValue({
    defaultModel: 'test-model',
    models: [{ id: 'test-model', label: 'Test model' }],
  }),
  translate: translateMock,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
  translateMock.mockReset();
});

function LoadedTranslatePanel({ file }: { file: PoFile }) {
  const store = usePoStoreApi();

  useEffect(() => {
    store.getState().loadFile(file);
    store.getState().selectAllVisible();
  }, [file, store]);

  return <TranslatePanel glossary={[]} />;
}

function renderTranslatePanel(file: PoFile) {
  render(
    <PoProvider>
      <LoadedTranslatePanel file={file} />
    </PoProvider>,
  );
}

describe('TranslatePanel', () => {
  it('uses PO Language metadata as the target language and English as the source', async () => {
    translateMock.mockResolvedValue({
      suggestions: [],
      usage: { inputTokens: 1, outputTokens: 1 },
    });

    renderTranslatePanel(testPoFile);

    await waitFor(() => {
      const input = screen.getByPlaceholderText('e.g., de_DE, fr, Spanish');
      expect(input).toBeInstanceOf(HTMLInputElement);
      expect((input as HTMLInputElement).value).toBe('de_DE');
    });

    fireEvent.click(screen.getByRole('button', { name: /translate/i }));

    await waitFor(() => {
      expect(translateMock).toHaveBeenCalled();
    });

    expect(translateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceLanguage: 'English',
        targetLanguage: 'de_DE',
      }),
    );
  });

  it('requires a target language for targetless template files', async () => {
    const templateFile: PoFile = {
      ...testPoFile,
      filename: 'messages.pot',
      metadata: {
        ...testPoFile.metadata,
        language: '',
      },
    };

    renderTranslatePanel(templateFile);

    await waitFor(() => {
      const input = screen.getByPlaceholderText('e.g., de_DE, fr, Spanish');
      expect(input).toBeInstanceOf(HTMLInputElement);
      expect((input as HTMLInputElement).value).toBe('');
    });

    const translateButton = screen.getByRole('button', { name: /translate/i });
    const allButton = screen.getByRole('button', { name: 'All' });
    expect(translateButton).toBeInstanceOf(HTMLButtonElement);
    expect(allButton).toBeInstanceOf(HTMLButtonElement);
    expect((translateButton as HTMLButtonElement).disabled).toBe(true);
    expect((allButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('uses edited target language metadata for translation', async () => {
    translateMock.mockResolvedValue({
      suggestions: [],
      usage: { inputTokens: 1, outputTokens: 1 },
    });

    const templateFile: PoFile = {
      ...testPoFile,
      filename: 'messages.pot',
      metadata: {
        ...testPoFile.metadata,
        language: '',
      },
    };

    renderTranslatePanel(templateFile);

    const targetInput = await screen.findByPlaceholderText('e.g., de_DE, fr, Spanish');
    fireEvent.change(targetInput, { target: { value: 'fr_FR' } });
    fireEvent.click(screen.getByRole('button', { name: /translate/i }));

    await waitFor(() => {
      expect(translateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          targetLanguage: 'fr_FR',
        }),
      );
    });
  });
});
