import { LogIn } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import FormInput from '../components/FormInput.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const user = await login(form);
      const next =
        location.state?.from ||
        (user.role === 'farmer'
          ? '/farmer'
          : user.role === 'admin'
            ? '/admin'
            : user.role === 'delivery'
              ? '/delivery'
              : '/market');
      navigate(next, { replace: true });
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-page auth-login">
      <form className="auth-card" onSubmit={handleSubmit}>
        <p className="eyebrow">Welcome back</p>
        <h1>Login</h1>
        {error && <div className="alert error">{error}</div>}
        <FormInput label="Email" name="email" type="email" value={form.email} onChange={updateField} />
        <FormInput
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={updateField}
        />
        <button className="primary-button wide" disabled={submitting}>
          <LogIn size={18} />
          {submitting ? 'Logging in...' : 'Login'}
        </button>
        <p className="auth-link">
          New here? <Link to="/register">Create account</Link>
        </p>
      </form>
    </section>
  );
}
