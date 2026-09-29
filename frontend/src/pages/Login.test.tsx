import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';
import { AuthProvider } from '../context/AuthContext';

describe('Login Component', () => {
  it('renders without crashing (smoke test)', () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </AuthProvider>
    );
    expect(screen.getByRole('heading', { name: /đăng nhập/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/tên đăng nhập hoặc email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mật khẩu/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /đăng nhập/i })).toBeInTheDocument();
  });
});
