/**
 * Centralized error mapping for WashWise.
 * Maps PostgreSQL and Supabase RPC error messages to user-friendly copy.
 */

export function mapRpcError(error: unknown, fallback: string = 'Operation failed'): string {
  if (!error) return fallback;

  const msg =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : (error as { message?: string })?.message || '';

  if (msg.includes('machine_unavailable') || msg.includes('not available')) {
    return 'This machine was just taken by someone else.';
  }
  if (msg.includes('overload')) {
    return 'Load weight exceeds machine capacity.';
  }
  if (msg.includes('already_running')) {
    return 'You already have an active wash cycle in progress.';
  }
  if (msg.includes('forbidden')) {
    return 'You do not have permission to perform this action.';
  }
  if (msg.includes('session_not_found')) {
    return 'Wash session could not be found.';
  }
  if (msg.includes('machine_not_found')) {
    return 'Machine could not be found.';
  }
  if (msg.includes('bad_outcome')) {
    return 'Invalid session outcome specified.';
  }
  if (msg.includes('invalid_status')) {
    return 'Invalid machine status specified.';
  }
  if (msg.includes('not_authenticated')) {
    return 'Please sign in to continue.';
  }
  if (msg.includes('bad_program')) {
    return 'Selected wash program is invalid or unavailable.';
  }
  if (msg.includes('bad_temp') || msg.includes('bad_spin')) {
    return 'Invalid temperature or spin speed setting.';
  }
  if (msg.includes('report_not_found')) {
    return 'Issue report could not be found.';
  }
  if (msg.includes('rate limit') || msg.includes('rate_limit')) {
    return 'Too many requests. Please wait a few moments and try again.';
  }
  if (msg.includes('Network request failed') || msg.includes('Failed to fetch')) {
    return 'Network connection error. Check your connection and retry.';
  }
  if (msg.includes('Invalid login credentials')) {
    return 'Invalid email/username or password.';
  }

  return msg || fallback;
}
