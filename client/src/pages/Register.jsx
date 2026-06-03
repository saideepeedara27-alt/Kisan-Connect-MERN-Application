import { BadgeCheck, FileCheck2, ShieldCheck, Truck, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import FormInput from '../components/FormInput.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const [searchParams] = useSearchParams();
  const startingRole = useMemo(() => {
    const role = searchParams.get('role');
    return ['farmer', 'customer', 'delivery'].includes(role) ? role : 'customer';
  }, [searchParams]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: startingRole,
    phone: '',
    village: '',
    farmName: '',
    farmAddress: '',
    farmSize: '',
    experienceYears: '',
    verificationIdType: 'aadhaar',
    verificationIdNumber: '',
    serviceAreas: '',
    vehicleType: 'EV bike',
    vehicleNumber: '',
    licenseNumber: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const user = await register(form);
      navigate(user.role === 'farmer' ? '/farmer' : user.role === 'delivery' ? '/delivery' : '/market', { replace: true });
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-page auth-register">
      <form className="auth-card large" onSubmit={handleSubmit}>
        <p className="eyebrow">Create account</p>
        <h1>Join Kisan Connect</h1>
        <div className="auth-trust-strip">
          <span>
            <ShieldCheck size={16} />
            Verified farmer onboarding
          </span>
          <span>
            <FileCheck2 size={16} />
            Safer buying
          </span>
        </div>
        {error && <div className="alert error">{error}</div>}

        <div className="segmented-control">
          <label className={form.role === 'customer' ? 'active' : ''}>
            <input
              type="radio"
              name="role"
              value="customer"
              checked={form.role === 'customer'}
              onChange={updateField}
            />
            Customer
          </label>
          <label className={form.role === 'farmer' ? 'active' : ''}>
            <input
              type="radio"
              name="role"
              value="farmer"
              checked={form.role === 'farmer'}
              onChange={updateField}
            />
            Farmer
          </label>
          <label className={form.role === 'delivery' ? 'active' : ''}>
            <input
              type="radio"
              name="role"
              value="delivery"
              checked={form.role === 'delivery'}
              onChange={updateField}
            />
            Delivery
          </label>
        </div>

        <FormInput label="Full name" name="name" value={form.name} onChange={updateField} />
        <FormInput label="Email" name="email" type="email" value={form.email} onChange={updateField} />
        <FormInput
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={updateField}
        />
        <div className="two-column">
          <FormInput label="Phone" name="phone" value={form.phone} onChange={updateField} />
          <FormInput label="Village / City" name="village" value={form.village} onChange={updateField} />
        </div>

        {form.role === 'farmer' && (
          <div className="verification-panel">
            <div className="panel-title compact-title">
              <BadgeCheck size={21} />
              <h2>Farmer verification</h2>
            </div>
            <p>
              These details are stored with your profile and shown as a trust status after review.
            </p>
            <FormInput label="Farm name" name="farmName" value={form.farmName} onChange={updateField} />
            <label className="field">
              <span>Farm address</span>
              <textarea name="farmAddress" value={form.farmAddress} onChange={updateField} />
            </label>
            <div className="two-column">
              <FormInput label="Farm size" name="farmSize" value={form.farmSize} onChange={updateField} />
              <FormInput
                label="Experience years"
                name="experienceYears"
                type="number"
                value={form.experienceYears}
                onChange={updateField}
              />
            </div>
            <div className="two-column">
              <label className="field">
                <span>Verification document</span>
                <select name="verificationIdType" value={form.verificationIdType} onChange={updateField}>
                  <option value="aadhaar">Aadhaar</option>
                  <option value="pan">PAN</option>
                  <option value="voter_id">Voter ID</option>
                  <option value="farm_certificate">Farm certificate</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <FormInput
                label="Document number"
                name="verificationIdNumber"
                value={form.verificationIdNumber}
                onChange={updateField}
              />
            </div>
          </div>
        )}

        {form.role === 'delivery' && (
          <div className="verification-panel">
            <div className="panel-title compact-title">
              <Truck size={21} />
              <h2>Delivery partner details</h2>
            </div>
            <p>
              These details connect you with customer orders in your service areas.
            </p>
            <label className="field">
              <span>Service areas</span>
              <textarea
                name="serviceAreas"
                value={form.serviceAreas}
                onChange={updateField}
                placeholder="Pune, Nashik, Satara"
              />
            </label>
            <div className="two-column">
              <label className="field">
                <span>Vehicle type</span>
                <select name="vehicleType" value={form.vehicleType} onChange={updateField}>
                  <option value="EV bike">EV bike</option>
                  <option value="Bike">Bike</option>
                  <option value="Auto">Auto</option>
                  <option value="Mini truck">Mini truck</option>
                  <option value="Van">Van</option>
                </select>
              </label>
              <FormInput
                label="Vehicle number"
                name="vehicleNumber"
                value={form.vehicleNumber}
                onChange={updateField}
              />
            </div>
            <FormInput
              label="License number"
              name="licenseNumber"
              value={form.licenseNumber}
              onChange={updateField}
            />
          </div>
        )}

        <button className="primary-button wide" disabled={submitting}>
          <UserPlus size={18} />
          {submitting
            ? 'Creating...'
            : form.role === 'farmer'
              ? 'Submit verification'
              : form.role === 'delivery'
                ? 'Create delivery account'
                : 'Create account'}
        </button>
        <p className="auth-link">
          Already registered? <Link to="/login">Login</Link>
        </p>
      </form>
    </section>
  );
}
