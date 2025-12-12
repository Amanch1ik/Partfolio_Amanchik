import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';

// Mock для useAuth хука
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { id: 1, email: 'test@example.com' },
  }),
}));

// Mock для localStorage
const localStorageMock = {
  getItem: jest.fn(() => 'mock-token'),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const TestComponent = () => <div>Test Content</div>;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders children when token exists', () => {
    localStorageMock.getItem.mockReturnValue('mock-token');

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  test('redirects to login when no token', () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { container } = render(
      <MemoryRouter>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </MemoryRouter>
    );

    // Проверяем, что компонент не рендерится
    expect(container.firstChild).toBeNull();
  });

  test('shows loading spinner when loading', () => {
    // Переопределяем мок для этого теста
    const useAuthMock = jest.spyOn(require('../../hooks/useAuth'), 'useAuth');
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      login: jest.fn(),
      logout: jest.fn(),
      setUser: jest.fn(),
    });

    localStorageMock.getItem.mockReturnValue('mock-token');

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </MemoryRouter>
    );

    // Проверяем наличие спиннера загрузки
    expect(screen.getByText('Загрузка...')).toBeInTheDocument();

    // Восстанавливаем оригинальный мок
    useAuthMock.mockRestore();
  });
});
