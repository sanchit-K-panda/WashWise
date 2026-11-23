import { resolveIssue } from '../caretaker';
import { supabase } from '../supabase';

jest.mock('../supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('RLS & Security Tests: issue_reports resolution', () => {
  const mockIssueId = 'issue-uuid-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Student cannot resolve issue reports', () => {
    it('rejects student role attempting to call resolve_issue RPC with forbidden error', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: {
          code: '42501',
          message: 'forbidden',
        },
      });

      const result = await resolveIssue({
        issueId: mockIssueId,
        resultingMachineStatus: 'available',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('You do not have permission to perform this action.');
      expect(supabase.rpc).toHaveBeenCalledWith('resolve_issue', {
        p_report: mockIssueId,
        p_new_status: 'available',
        p_note: null,
      });
    });
  });

  describe('Caretaker can resolve issue reports and set machine status', () => {
    it('allows caretaker role to resolve issue and atomically update machine status', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: {
          id: mockIssueId,
          resolved_at: new Date().toISOString(),
        },
        error: null,
      });

      const result = await resolveIssue({
        issueId: mockIssueId,
        resultingMachineStatus: 'available',
        resolutionNote: 'Fixed door latch',
      });

      expect(supabase.rpc).toHaveBeenCalledWith('resolve_issue', {
        p_report: mockIssueId,
        p_new_status: 'available',
        p_note: 'Fixed door latch',
      });
      expect(result.success).toBe(true);
    });
  });
});
