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
  const mockMachineId = 'machine-uuid-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Student cannot resolve issue reports', () => {
    it('rejects student role attempting to call resolve_issue_report RPC with 42501 unauthorized', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: {
          code: '42501',
          message: 'Unauthorized: Only caretakers can resolve issue reports',
        },
      });

      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: { id: 'student-user-1' } },
      });

      // Direct fallback update attempt by student is also rejected by RLS
      (supabase.from as jest.Mock).mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValueOnce({
            error: {
              code: '42501',
              message: 'new row violates row-level security policy for table "issue_reports"',
            },
          }),
        }),
      });

      const result = await resolveIssue({
        issueId: mockIssueId,
        resultingMachineStatus: 'available',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('security policy');
    });
  });

  describe('Caretaker can resolve issue reports and set machine status', () => {
    it('allows caretaker role to resolve issue and atomically update machine status', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          issue_id: mockIssueId,
          machine_id: mockMachineId,
          machine_status: 'available',
        },
        error: null,
      });

      const result = await resolveIssue({
        issueId: mockIssueId,
        resultingMachineStatus: 'available',
        resolutionNote: 'Fixed door latch',
      });

      expect(supabase.rpc).toHaveBeenCalledWith('resolve_issue_report', {
        p_issue_id: mockIssueId,
        p_machine_status: 'available',
        p_status_note: 'Fixed door latch',
      });
      expect(result.success).toBe(true);
    });
  });
});
