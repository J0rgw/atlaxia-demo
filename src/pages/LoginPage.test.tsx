import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

// Track navigation calls
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null, pathname: '/login', search: '', hash: '', key: 'default' }),
  };
});

// Mock auth store with controllable state
const mockLogin = vi.fn();
const mockClearError = vi.fn();

let authStoreState: {
  isLoading: boolean;
  error: string | null;
} = {
  isLoading: false,
  error: null,
};

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      login: mockLogin,
      isLoading: authStoreState.isLoading,
      error: authStoreState.error,
      clearError: mockClearError,
    };
    return selector(state);
  },
}));

// Mock installation store
const mockFetchStatus = vi.fn().mockResolvedValue({ setup_completed: true });

let installationStoreState: {
  status: { setup_completed: boolean } | null;
  statusLoading: boolean;
} = {
  status: { setup_completed: true },
  statusLoading: false,
};

vi.mock('@/stores/installationStore', () => ({
  useInstallationStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      status: installationStoreState.status,
      statusLoading: installationStoreState.statusLoading,
      fetchStatus: mockFetchStatus,
      branding: null,
      fetchBranding: vi.fn().mockResolvedValue(undefined),
    };
    return selector ? selector(state) : state;
  },
}));

// Mock lucide-react icons (render simple text so we can query by role/name)
vi.mock('lucide-react', () => ({
  Eye: () => <span>Eye</span>,
  EyeOff: () => <span>EyeOff</span>,
  AlertCircle: () => <span>AlertIcon</span>,
}));

// ---------------------------------------------------------------------------
// Import component after mocks
// ---------------------------------------------------------------------------

import { LoginPage } from './LoginPage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <LoginPage />
    </MemoryRouter>
  );
}

/**
 * The LoginPage labels lack `htmlFor` attributes, so we cannot use
 * `getByLabelText`. Instead we query by placeholder text which is the
 * next-best accessible query for these inputs.
 */
function getUsernameInput() {
  return screen.getByPlaceholderText(/ingrese su usuario/i);
}

function getPasswordInput() {
  return screen.getByPlaceholderText(/ingrese su contrase/i);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStoreState = { isLoading: false, error: null };
    installationStoreState = {
      status: { setup_completed: true },
      statusLoading: false,
    };
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  describe('rendering', () => {
    it('renders the login form with username and password fields', () => {
      renderLoginPage();

      expect(getUsernameInput()).toBeInTheDocument();
      expect(getPasswordInput()).toBeInTheDocument();
    });

    it('renders label text for both fields', () => {
      renderLoginPage();

      expect(screen.getByText('Usuario')).toBeInTheDocument();
      expect(screen.getByText('Contrasena')).toBeInTheDocument();
    });

    it('renders the submit button with correct text', () => {
      renderLoginPage();

      const button = screen.getByRole('button', { name: /ingresar/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('renders the AtlaXia brand name', () => {
      renderLoginPage();

      expect(screen.getByText('AtlaXia')).toBeInTheDocument();
    });

    it('renders the welcome heading', () => {
      renderLoginPage();

      expect(screen.getByRole('heading', { name: /bienvenido/i })).toBeInTheDocument();
    });

    it('renders password field as type password by default', () => {
      renderLoginPage();

      expect(getPasswordInput()).toHaveAttribute('type', 'password');
    });

    it('marks both fields as required', () => {
      renderLoginPage();

      expect(getUsernameInput()).toBeRequired();
      expect(getPasswordInput()).toBeRequired();
    });
  });

  // -------------------------------------------------------------------------
  // User interactions
  // -------------------------------------------------------------------------

  describe('user interactions', () => {
    it('allows typing in the username field', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const usernameInput = getUsernameInput();
      await user.type(usernameInput, 'admin');

      expect(usernameInput).toHaveValue('admin');
    });

    it('allows typing in the password field', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const passwordInput = getPasswordInput();
      await user.type(passwordInput, 'secret123');

      expect(passwordInput).toHaveValue('secret123');
    });

    it('toggles password visibility when eye button is clicked', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const passwordInput = getPasswordInput();
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Find the toggle button (it contains the Eye icon text)
      const toggleButton = screen.getByRole('button', { name: /eye/i });
      await user.click(toggleButton);

      expect(passwordInput).toHaveAttribute('type', 'text');

      // Click again to hide
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  // -------------------------------------------------------------------------
  // Login flow
  // -------------------------------------------------------------------------

  describe('login flow', () => {
    it('calls login with username and password on form submit', async () => {
      mockLogin.mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(getUsernameInput(), 'admin');
      await user.type(getPasswordInput(), 'password123');
      await user.click(screen.getByRole('button', { name: /ingresar/i }));

      expect(mockClearError).toHaveBeenCalled();
      expect(mockLogin).toHaveBeenCalledWith('admin', 'password123');
    });

    it('navigates to home after successful login', async () => {
      mockLogin.mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(getUsernameInput(), 'admin');
      await user.type(getPasswordInput(), 'pass');
      await user.click(screen.getByRole('button', { name: /ingresar/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
      });
    });

    it('does not navigate when login fails', async () => {
      mockLogin.mockRejectedValue({ detail: 'Invalid credentials' });
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(getUsernameInput(), 'wrong');
      await user.type(getPasswordInput(), 'wrong');
      await user.click(screen.getByRole('button', { name: /ingresar/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });

      // Navigate should NOT have been called (login threw)
      expect(mockNavigate).not.toHaveBeenCalledWith('/', expect.anything());
    });
  });

  // -------------------------------------------------------------------------
  // Error display
  // -------------------------------------------------------------------------

  describe('error display', () => {
    it('displays error message when auth store has an error', () => {
      authStoreState.error = 'Credenciales invalidas';
      renderLoginPage();

      expect(screen.getByText('Credenciales invalidas')).toBeInTheDocument();
    });

    it('does not show error container when there is no error', () => {
      authStoreState.error = null;
      renderLoginPage();

      // The error message would appear with an AlertIcon; verify no error alert
      // is rendered. We check for the specific error text, not "credenciales"
      // which also appears in the subtitle "Ingresa tus credenciales..."
      expect(screen.queryByText('Credenciales invalidas')).not.toBeInTheDocument();
      expect(screen.queryByText('AlertIcon')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  describe('loading state', () => {
    it('disables the submit button when isLoading is true', () => {
      authStoreState.isLoading = true;
      renderLoginPage();

      const button = screen.getByRole('button', { name: /ingresando/i });
      expect(button).toBeDisabled();
    });

    it('shows "Ingresando..." text when loading', () => {
      authStoreState.isLoading = true;
      renderLoginPage();

      expect(screen.getByText(/ingresando/i)).toBeInTheDocument();
    });

    it('shows "Ingresar" text when not loading', () => {
      authStoreState.isLoading = false;
      renderLoginPage();

      expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Installation status check
  // -------------------------------------------------------------------------

  describe('installation status', () => {
    it('calls fetchStatus on mount', () => {
      renderLoginPage();

      expect(mockFetchStatus).toHaveBeenCalledTimes(1);
    });

    it('shows loading spinner when statusLoading is true', () => {
      installationStoreState.statusLoading = true;
      renderLoginPage();

      expect(screen.getByText(/verificando instalacion/i)).toBeInTheDocument();
      // The form should NOT be visible
      expect(screen.queryByPlaceholderText(/ingrese su usuario/i)).not.toBeInTheDocument();
    });

    it('shows login form when status check completes', () => {
      installationStoreState.statusLoading = false;
      installationStoreState.status = { setup_completed: true };
      renderLoginPage();

      expect(getUsernameInput()).toBeInTheDocument();
      expect(screen.queryByText(/verificando/i)).not.toBeInTheDocument();
    });

    it('redirects to /setup if setup is not completed', () => {
      installationStoreState.status = { setup_completed: false };
      renderLoginPage();

      expect(mockNavigate).toHaveBeenCalledWith('/setup', { replace: true });
    });
  });
});
