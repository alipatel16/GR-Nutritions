export function safeReturnPath(value?: string): '/checkout' | '/account' {
  return value === '/checkout' ? '/checkout' : '/account';
}

export function parseAuthCallback(url: string): {
  code: string | null;
  error: string | null;
} {
  const parsed = new URL(url);
  return {
    code: parsed.searchParams.get('code'),
    error:
      parsed.searchParams.get('error_description') ??
      parsed.searchParams.get('error'),
  };
}
