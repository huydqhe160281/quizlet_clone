/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { AIGenerateModal } from './AIGenerateModal';

const mockFetch = vi.fn();

describe('AIGenerateModal', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    pushMock.mockClear();
    mockFetch.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('Scenario: Open modal from sets list', () => {
    render(<AIGenerateModal open onOpenChange={vi.fn()} />);
    expect(screen.getByText('Generate with AI')).toBeInTheDocument();
    expect(screen.getByLabelText('Nội dung / chủ đề')).toBeInTheDocument();
  });

  it('Scenario: Slider default is 15', () => {
    render(<AIGenerateModal open onOpenChange={vi.fn()} />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '15');
  });

  it('Scenario: Prompt too short blocked client-side', () => {
    render(<AIGenerateModal open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Nội dung / chủ đề'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: /Tạo bộ thẻ/i }));
    expect(mockFetch).not.toHaveBeenCalled();
    expect(screen.getByText(/ít nhất 10 ký tự/)).toBeInTheDocument();
  });

  it('Scenario: Submit generation request', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          set: { id: 'set-1', title: 'Test', description: 'Desc', visibility: 'PRIVATE' },
          cards: [{ id: 'c1', front: 'a', back: 'b', example: null, sortOrder: 0 }],
        },
      }),
    });

    render(<AIGenerateModal open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Nội dung / chủ đề'), {
      target: { value: 'Create vocabulary about travel and food' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Tạo bộ thẻ/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/ai/generate-set',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Create vocabulary'),
        })
      );
    });
  });

  it('Scenario: Freeform unlimited mode omits cardCount', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          set: {
            id: 'set-unlimited',
            title: 'Unlimited',
            description: null,
            visibility: 'PRIVATE',
          },
          cards: [],
        },
      }),
    });

    render(<AIGenerateModal open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Không giới hạn số thẻ (để AI tự quyết)'));
    fireEvent.change(screen.getByLabelText('Nội dung / chủ đề'), {
      target: { value: 'Generate full hiragana set without limit' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Tạo bộ thẻ/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const lastCall = mockFetch.mock.calls.at(-1);
    const requestBody = JSON.parse((lastCall?.[1] as { body: string }).body);
    expect(requestBody.cardCount).toBeUndefined();
    expect(requestBody.prompt).toContain('hiragana');
  });

  it('Scenario: Guided mode composes prompt client-side', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          set: { id: 'set-guided', title: 'Guided', description: null, visibility: 'PRIVATE' },
          cards: [],
        },
      }),
    });

    render(<AIGenerateModal open onOpenChange={vi.fn()} />);
    const guidedTab = screen.getByRole('tab', { name: 'Theo form' });
    fireEvent.mouseDown(guidedTab);
    fireEvent.click(guidedTab);
    fireEvent.keyDown(guidedTab, { key: 'Enter' });
    fireEvent.change(await screen.findByLabelText('Nội dung học'), {
      target: { value: 'Bảng chữ cái hiragana' },
    });
    fireEvent.change(screen.getByLabelText('Chủ đề (tuỳ chọn)'), {
      target: { value: 'Cơ bản' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Tạo bộ thẻ/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const lastCall = mockFetch.mock.calls.at(-1);
    const requestBody = JSON.parse((lastCall?.[1] as { body: string }).body);
    expect(requestBody.cardCount).toBeUndefined();
    expect(requestBody.prompt).toContain('Language pair: Japanese -> Vietnamese.');
    expect(requestBody.prompt).toContain('Learning content: Bảng chữ cái hiragana.');
    expect(requestBody.prompt).toContain('Topic focus: Cơ bản.');
    expect(requestBody.prompt).toContain('No hard card limit.');
  });

  it('Scenario: Loading displayed', async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );

    render(<AIGenerateModal open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Nội dung / chủ đề'), {
      target: { value: 'Valid prompt for loading test' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Tạo bộ thẻ/i }));

    expect(await screen.findByText(/Đang phân tích/)).toBeInTheDocument();

    resolveFetch({
      ok: true,
      json: async () => ({
        data: {
          set: { id: 's1', title: 'T', description: null, visibility: 'PRIVATE' },
          cards: [],
        },
      }),
    });
  });

  it('Scenario: Preview after generation', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          set: {
            id: 'set-1',
            title: 'JLPT N5',
            description: 'Family words',
            visibility: 'PRIVATE',
          },
          cards: [{ id: 'c1', front: '家族', back: 'family', example: null, sortOrder: 0 }],
        },
      }),
    });

    render(<AIGenerateModal open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Nội dung / chủ đề'), {
      target: { value: 'Japanese family vocabulary N5' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Tạo bộ thẻ/i }));

    expect(await screen.findByText('JLPT N5')).toBeInTheDocument();
    expect(screen.getByText('家族')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Discard/i })).toBeInTheDocument();
  });

  it('Scenario: Rate limit error shown', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: 'RATE_LIMITED', message: 'Too many requests' }),
    });

    render(<AIGenerateModal open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Nội dung / chủ đề'), {
      target: { value: 'Valid prompt for rate limit test' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Tạo bộ thẻ/i }));

    await waitFor(() => {
      expect(screen.getByLabelText('Nội dung / chủ đề')).toBeInTheDocument();
    });
  });

  it('Scenario: Upstream AI failure shown', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: 'AI_GENERATION_FAILED', message: 'Failed' }),
    });

    render(<AIGenerateModal open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Nội dung / chủ đề'), {
      target: { value: 'Valid prompt for upstream failure' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Tạo bộ thẻ/i }));

    await waitFor(() => {
      expect(screen.getByLabelText('Nội dung / chủ đề')).toBeInTheDocument();
    });
  });

  it('Scenario: User confirms draft', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          set: { id: 'abc123', title: 'Set', description: null, visibility: 'PRIVATE' },
          cards: [],
        },
      }),
    });

    const onOpenChange = vi.fn();
    render(<AIGenerateModal open onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByLabelText('Nội dung / chủ đề'), {
      target: { value: 'Confirm navigation test prompt' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Tạo bộ thẻ/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Confirm/i }));

    expect(pushMock).toHaveBeenCalledWith('/sets/abc123');
  });

  it('Scenario: Confirm is navigation only', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          set: { id: 'abc123', title: 'Set', description: null, visibility: 'PRIVATE' },
          cards: [],
        },
      }),
    });

    render(<AIGenerateModal open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Nội dung / chủ đề'), {
      target: { value: 'No extra API on confirm test' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Tạo bộ thẻ/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Confirm/i }));

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('Scenario: User discards draft', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            set: { id: 'xyz789', title: 'Draft', description: null, visibility: 'PRIVATE' },
            cards: [],
          },
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<AIGenerateModal open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Nội dung / chủ đề'), {
      target: { value: 'Discard draft test prompt here' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Tạo bộ thẻ/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Discard/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/sets/xyz789', { method: 'DELETE' });
    });
  });

  it('Scenario: User closes modal without discard', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          set: { id: 'draft1', title: 'Draft', description: null, visibility: 'PRIVATE' },
          cards: [],
        },
      }),
    });

    const onOpenChange = vi.fn();
    render(<AIGenerateModal open onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByLabelText('Nội dung / chủ đề'), {
      target: { value: 'Close modal without discard test' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Tạo bộ thẻ/i }));
    await screen.findByText('Draft');

    onOpenChange(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('Scenario: Draft persists after modal close', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          set: { id: 'draft1', title: 'Draft', description: null, visibility: 'PRIVATE' },
          cards: [],
        },
      }),
    });

    render(<AIGenerateModal open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Nội dung / chủ đề'), {
      target: { value: 'Draft persists after close test' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Tạo bộ thẻ/i }));
    await screen.findByText('Draft');
    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.stringContaining('DELETE'),
      expect.anything()
    );
  });

  it('Scenario: Modal uses glass-panel styling', () => {
    render(<AIGenerateModal open onOpenChange={vi.fn()} />);
    expect(document.body.querySelector('.glass-panel')).toBeTruthy();
  });

  it('Scenario: Loading announced to screen readers', async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );

    render(<AIGenerateModal open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Nội dung / chủ đề'), {
      target: { value: 'Aria live region loading test' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Tạo bộ thẻ/i }));

    const liveRegion = await screen.findByText(/Đang phân tích/);
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');

    resolveFetch({
      ok: true,
      json: async () => ({
        data: {
          set: { id: 's1', title: 'T', description: null, visibility: 'PRIVATE' },
          cards: [],
        },
      }),
    });
  });
});
