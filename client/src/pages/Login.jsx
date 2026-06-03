import { LogIn } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import FormInput from '../components/FormInput.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);

    if (existingScript) {
      existingScript.addEventListener('load', resolve, { once: true });
      existingScript.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const googleButtonRef = useRef(null);
  const { googleLogin, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function goToRoleHome(user) {
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
  }

  useEffect(() => {
    let cancelled = false;

    async function mountGoogleButton() {
      if (!GOOGLE_CLIENT_ID || !googleButtonRef.current) {
        return;
      }

      try {
        await loadGoogleIdentityScript();

        if (cancelled || !googleButtonRef.current) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            if (!response.credential) {
              setError('Google sign in did not return a credential.');
              return;
            }

            setError('');
            setSubmitting(true);

            try {
              const user = await googleLogin(response.credential);
              goToRoleHome(user);
            } catch (apiError) {
              setError(apiError.response?.data?.message || 'Google login failed.');
            } finally {
              setSubmitting(false);
            }
          }
        });
        googleButtonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          width: googleButtonRef.current.offsetWidth || 360
        });
      } catch (scriptError) {
        if (!cancelled) {
          setError('Google login could not load right now.');
        }
      }
    }

    mountGoogleButton();
    return () => {
      cancelled = true;
    };
  }, [googleLogin]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const user = await login(form);
      goToRoleHome(user);
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
        {GOOGLE_CLIENT_ID && (
          <>
            <div className="auth-divider">
              <span>or</span>
            </div>
            <div className="google-signin-slot" ref={googleButtonRef} />
          </>
        )}
        <p className="auth-link">
          New here? <Link to="/register">Create account</Link>
        </p>
      </form>
    </section>
  );
}
