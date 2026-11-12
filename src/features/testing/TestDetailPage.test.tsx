import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { components } from '@/api/schema';
import { SessionProvider } from '@/app/providers';
import { KeyedById } from '@/app/router';
import { api } from '@/lib/api';
import TestDetailPage from './TestDetailPage';

type Test = components['schemas']['TestDetailDto'];

const testFor = (id: string, version: number): Test => ({
  id,
  testCode: `T-${id}`,
  testName: `Test ${id}`,
  methodName: null,
  status: 'IN_PROGRESS',
  urgent: false,
  dueDate: null,
  overdue: false,
  sampleNo: `S-${id}`,
  jobNo: 'J-1',
  sampleDescription: 'Plate',
  customerName: null,
  currentStage: null,
  rejectionReason: null,
  holdReason: null,
  version,
  analysisMode: null,
  sampleId: `sample-${id}`,
  officeInstructions: null,
  technicalData: null,
  instrumentId: null,
  remarks: null,
  observations: null,
  notes: null,
  conductedByName: null,
  canEdit: true,
  assignedToMe: true,
  blockOverdueInstruments: false,
  instrumentWarning: null,
  stages: [],
  results: [],
  instruments: [],
  conversions: [],
  remarkOptions: [],
  assignedToName: null,
  submittedAt: null,
  approvedAt: null,
  approvedByName: null,
  outcome: 'PENDING',
});

afterEach(() => vi.restoreAllMocks());

describe('TestDetailPage', () => {
  it('saves to the test on screen after moving from one test to another in the app', async () => {
    // Test A has the higher version, the case where a stale queue would have saved B's entries to A.
    const tests: Record<string, Test> = { a: testFor('a', 7), b: testFor('b', 2) };
    const saves: { id: string; remarks: unknown; version: number }[] = [];
    vi.spyOn(api, 'GET').mockImplementation((async (path: string, init?: { params?: { path?: { id?: string } } }) => {
      if (path === '/api/v1/auth/me') return { data: { id: 'u1', name: 'Tech', email: 't@x', designation: null, roles: [], permissions: ['tests.work'], csrfToken: 'c', totpEnabled: false, mustChangePassword: false, totpAvailable: false } };
      if (path === '/api/v1/tests/{id}') return { data: tests[init!.params!.path!.id!] };
      return { data: [] };
    }) as never);
    vi.spyOn(api, 'PUT').mockImplementation((async (_path: string, init: { params: { path: { id: string } }; body: { version: number; remarks?: string } }) => {
      const id = init.params.path.id;
      saves.push({ id, remarks: init.body.remarks, version: init.body.version });
      tests[id] = { ...tests[id], remarks: init.body.remarks ?? null, version: tests[id].version + 1 };
      return { data: tests[id] };
    }) as never);

    const router = createMemoryRouter(
      [
        {
          path: '/my-tests/:id',
          element: (
            <KeyedById>
              <TestDetailPage />
            </KeyedById>
          ),
        },
      ],
      { initialEntries: ['/my-tests/a'] },
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <SessionProvider>
          <RouterProvider router={router} />
        </SessionProvider>
      </QueryClientProvider>,
    );
    const user = userEvent.setup();

    expect(await screen.findByRole('heading', { level: 1, name: /T-a/ })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Remarks'), 'for A');
    await user.tab();
    await waitFor(() => expect(saves.some((s) => s.remarks === 'for A')).toBe(true));

    // In-app navigation, as a scan or a notification link does.
    await act(() => router.navigate('/my-tests/b'));
    expect(await screen.findByRole('heading', { level: 1, name: /T-b/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Remarks')).toHaveValue('');
    await user.type(screen.getByLabelText('Remarks'), 'for B');
    await user.tab();
    await waitFor(() => expect(saves.some((s) => s.remarks === 'for B')).toBe(true));

    expect(saves.filter((s) => s.remarks === 'for A').every((s) => s.id === 'a')).toBe(true);
    expect(saves.filter((s) => s.remarks === 'for B').every((s) => s.id === 'b' && s.version >= 2 && s.version < 7)).toBe(true);
    expect(tests.a.remarks).toBe('for A');
    expect(tests.b.remarks).toBe('for B');
  });
});
