import { Headphones, History, MessageCircle, Phone, Send, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const defaultConfig = {
  supportPhone: '+918880012345',
  supportEmail: 'support@kisanconnect.local',
  supportHours: 'Every day, 8 AM - 8 PM'
};

export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState(defaultConfig);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    topic: 'general',
    preferredContact: 'chat',
    message: ''
  });
  const [status, setStatus] = useState('');
  const [tickets, setTickets] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    api.get('/config').then((response) => setConfig(response.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    setForm((current) => ({
      ...current,
      name: current.name || user.name || '',
      email: current.email || user.email || '',
      phone: current.phone || user.phone || ''
    }));
  }, [user]);

  useEffect(() => {
    if (!open || !user) {
      return;
    }

    api
      .get('/support/mine')
      .then((response) => setTickets(response.data.tickets))
      .catch(() => {});
  }, [open, user]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submitTicket(event) {
    event.preventDefault();
    setStatus('');
    setSubmitting(true);

    try {
      await api.post('/support', {
        ...form,
        role: user?.role || 'guest'
      });
      setStatus('Support request sent. Our team will contact you soon.');
      setForm((current) => ({ ...current, message: '' }));
      if (user) {
        const response = await api.get('/support/mine');
        setTickets(response.data.tickets);
      }
    } catch (error) {
      setStatus(error.response?.data?.message || 'Unable to send support request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`support-widget ${open ? 'is-open' : ''}`}>
      {open && (
        <section className="support-panel" aria-label="Customer support">
          <div className="support-head">
            <div>
              <p className="eyebrow">Customer support</p>
              <h2>Chat or call Kisan Connect</h2>
              <span>{config.supportHours}</span>
            </div>
            <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close support">
              <X size={18} />
            </button>
          </div>

          <a className="call-support" href={`tel:${config.supportPhone}`}>
            <Phone size={18} />
            Call {config.supportPhone}
          </a>

          <form className="support-form" onSubmit={submitTicket}>
            <div className="two-column">
              <input name="name" placeholder="Name" value={form.name} onChange={updateField} />
              <input name="phone" placeholder="Phone" value={form.phone} onChange={updateField} />
            </div>
            <input name="email" placeholder="Email" value={form.email} onChange={updateField} />
            <div className="two-column">
              <select name="topic" value={form.topic} onChange={updateField}>
                <option value="general">General help</option>
                <option value="order">Order issue</option>
                <option value="payment">Payment issue</option>
                <option value="subscription">Subscription</option>
                <option value="product">Product listing</option>
              </select>
              <select name="preferredContact" value={form.preferredContact} onChange={updateField}>
                <option value="chat">Chat reply</option>
                <option value="call">Call me</option>
                <option value="email">Email me</option>
              </select>
            </div>
            <textarea
              name="message"
              placeholder="Tell us what you need help with"
              value={form.message}
              onChange={updateField}
            />
            {status && <div className="support-status">{status}</div>}
            <button className="primary-button wide" disabled={submitting}>
              <Send size={17} />
              {submitting ? 'Sending...' : 'Send message'}
            </button>
          </form>

          {user && tickets.length > 0 && (
            <div className="support-history">
              <h3>
                <History size={16} />
                Recent requests
              </h3>
              {tickets.slice(0, 3).map((ticket) => (
                <div className="support-ticket" key={ticket._id}>
                  <span className={`status ${ticket.status === 'resolved' ? 'active' : 'packed'}`}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                  <p>{ticket.message}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <button className="support-toggle" onClick={() => setOpen((current) => !current)}>
        {open ? <X size={22} /> : <Headphones size={22} />}
        <span>{open ? 'Close' : 'Support'}</span>
        {!open && <MessageCircle size={18} />}
      </button>
    </div>
  );
}
