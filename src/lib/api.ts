/**
 * API client with authentication support.
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

/**
 * Resolve a backend-relative path (e.g. /static/logos/logo.png) to a full URL.
 * In production (same origin) this is a no-op. In dev with VITE_API_URL set, it prepends the base.
 */
export function resolveStaticUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE_URL}${path}`;
}

export interface ApiError {
  detail: string;
  status: number;
}

// Transient-failure retry budget for idempotent GETs. In the MSW-backed demo,
// the service worker can be evicted while the tab sits in the background; the
// first requests after returning race ahead of the worker re-taking control and
// either reject (network error) or hit the dev server's SPA fallback and return
// non-JSON HTML. A couple of short retries gives the worker time to wake up so
// the page recovers without a reload. See
// .demo-plan/0-bug-background-tab-freeze.md.
const GET_RETRY_ATTEMPTS = 2;
const GET_RETRY_DELAY_MS = 150;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Whether a thrown error looks like the MSW wake-up race rather than a real
 * backend response: a fetch network rejection (TypeError) or our explicit
 * malformed-response marker. A normal ApiError carrying an HTTP status is a
 * genuine response and is NOT retried.
 */
function isTransient(err: unknown): boolean {
  if (err instanceof TypeError) return true; // fetch() rejected — no response
  return typeof err === 'object' && err !== null && (err as { transient?: boolean }).transient === true;
}

class ApiClient {
  private baseUrl: string;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    const stored = localStorage.getItem('atlaxia-auth');
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);
      return parsed.state?.accessToken || null;
    } catch {
      return null;
    }
  }

  private getRefreshToken(): string | null {
    const stored = localStorage.getItem('atlaxia-auth');
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);
      return parsed.state?.refreshToken || null;
    } catch {
      return null;
    }
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this._doRefresh().finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  private async _doRefresh(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) return null;

      const data = await response.json();

      const stored = localStorage.getItem('atlaxia-auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.state.accessToken = data.access_token;
        parsed.state.refreshToken = data.refresh_token;
        localStorage.setItem('atlaxia-auth', JSON.stringify(parsed));
      }

      return data.access_token;
    } catch {
      return null;
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const isGet = (options.method ?? 'GET').toUpperCase() === 'GET';
    const maxAttempts = isGet ? GET_RETRY_ATTEMPTS + 1 : 1;

    let lastErr: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await this._attempt<T>(endpoint, options);
      } catch (err) {
        lastErr = err;
        // Only retry transient failures on idempotent GETs. A well-formed
        // ApiError (4xx/5xx with a JSON body) is a real response, not the MSW
        // wake-up race, so it propagates immediately.
        if (!isGet || attempt === maxAttempts - 1 || !isTransient(err)) throw err;
        await sleep(GET_RETRY_DELAY_MS * (attempt + 1));
      }
    }
    throw lastErr;
  }

  private async _attempt<T>(endpoint: string, options: RequestInit): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && token) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers,
        });
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw { detail: error.detail || 'Request failed', status: response.status } as ApiError;
    }

    // A request that escaped MSW and hit the dev server's SPA fallback returns
    // HTML with a 200; parsing it throws a SyntaxError we treat as transient.
    try {
      return (await response.json()) as T;
    } catch {
      throw { detail: 'Malformed response', status: response.status, transient: true } as ApiError & { transient: true };
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async upload<T>(endpoint: string, file: File, fieldName = 'file'): Promise<T> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append(fieldName, file);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw { detail: error.detail || 'Upload failed', status: response.status } as ApiError;
    }

    return response.json();
  }

  async login(username: string, password: string): Promise<{
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  }> {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Login failed' }));
      throw { detail: error.detail || 'Login failed', status: response.status } as ApiError;
    }

    return response.json();
  }
}

export const api = new ApiClient(API_BASE_URL);
