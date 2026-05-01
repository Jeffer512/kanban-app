import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  /**
   * Handle form submission using React 19 native-aligned event types.
   */
  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await login(username, password);
      navigate('/');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg p-4">
      {/* The Card uses the semantic variable --color-card-bg */}
      <div className="w-full max-w-md rounded-2xl bg-card-bg p-8 shadow-2xl border border-border transition-colors duration-300">
        <h2 className="mb-8 text-center text-3xl font-extrabold text-text-main tracking-tight">
          Kanban
        </h2>
        
        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-text-muted mb-1.5">
              Username
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-border bg-app-bg px-4 py-2.5 text-text-main focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 outline-none transition-all"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-muted mb-1.5">
              Password
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-border bg-app-bg px-4 py-2.5 text-text-main focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-text-main py-3 text-sm font-bold text-app-bg hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-lg"
          >
            Sign In
          </button>
        </form>
        
        <p className="mt-8 text-center text-sm text-text-muted">
          New here? <Link to="/register" className="font-bold text-text-main hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;