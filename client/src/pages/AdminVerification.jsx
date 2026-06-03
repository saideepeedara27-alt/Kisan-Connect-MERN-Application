import { Clock3, FileSearch, RefreshCcw, ShieldCheck, Truck, UsersRound, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import StatCard from '../components/StatCard.jsx';

const statusOptions = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' }
];

function getStatusClass(status) {
  if (status === 'approved') return 'active';
  if (status === 'rejected') return 'cancelled';
  return 'packed';
}

export default function AdminVerification() {
  const [farmers, setFarmers] = useState([]);
  const [overview, setOverview] = useState({
    farmers: { total: 0, pending: 0, approved: 0, rejected: 0 },
    delivery: { partners: 0, availablePartners: 0, totalOrders: 0, active: 0, completed: 0, pendingAssignments: 0 }
  });
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadAdminData();
  }, [status]);

  async function loadAdminData() {
    setLoading(true);
    setError('');

    try {
      const [overviewResponse, farmersResponse] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/farmers', {
          params: { status }
        })
      ]);
      setOverview(overviewResponse.data.overview);
      setFarmers(farmersResponse.data.farmers);
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to load admin dashboard.');
    } finally {
      setLoading(false);
    }
  }

  async function updateVerification(farmerId, nextStatus) {
    setError('');
    setMessage('');

    try {
      await api.patch(`/admin/farmers/${farmerId}/verification`, { status: nextStatus });
      setMessage(`Farmer marked as ${nextStatus}.`);
      await loadAdminData();
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to update verification.');
    }
  }

  const stats = useMemo(
    () => ({
      total: farmers.length,
      pending: farmers.filter((farmer) => farmer.farmerProfile?.verificationStatus === 'pending').length,
      approved: farmers.filter((farmer) => farmer.farmerProfile?.verificationStatus === 'approved').length,
      rejected: farmers.filter((farmer) => farmer.farmerProfile?.verificationStatus === 'rejected').length
    }),
    [farmers]
  );

  return (
    <section className="page-pad admin-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Admin desk</p>
          <h1>Farmer verification</h1>
        </div>
        <button className="secondary-button" type="button" onClick={loadAdminData} disabled={loading}>
          <RefreshCcw size={18} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="admin-overview-grid">
        <div className="admin-overview-card">
          <div className="panel-title compact-title">
            <UsersRound size={21} />
            <h2>Farmers</h2>
          </div>
          <div className="admin-metrics">
            <span>
              <strong>{overview.farmers.total}</strong>
              Total
            </span>
            <span>
              <strong>{overview.farmers.pending}</strong>
              Pending
            </span>
            <span>
              <strong>{overview.farmers.approved}</strong>
              Approved
            </span>
          </div>
        </div>
        <div className="admin-overview-card">
          <div className="panel-title compact-title">
            <Truck size={21} />
            <h2>Delivery</h2>
          </div>
          <div className="admin-metrics">
            <span>
              <strong>{overview.delivery.partners}</strong>
              Partners
            </span>
            <span>
              <strong>{overview.delivery.availablePartners}</strong>
              Available
            </span>
            <span>
              <strong>{overview.delivery.pendingAssignments}</strong>
              Pending
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <StatCard label="Showing farmers" value={stats.total} />
        <StatCard label="Pending in view" value={stats.pending} tone="amber" />
        <StatCard label="Total orders" value={overview.delivery.totalOrders} tone="blue" />
        <StatCard label="Completed deliveries" value={overview.delivery.completed} tone="green" />
        <StatCard label="Pending assignment" value={overview.delivery.pendingAssignments} tone="amber" />
      </div>

      <div className="admin-filter-bar">
        {statusOptions.map((option) => (
          <button
            className={status === option.value ? 'active' : ''}
            key={option.value || 'all'}
            type="button"
            onClick={() => setStatus(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="table-shell">Loading verification requests...</div>
      ) : farmers.length === 0 ? (
        <EmptyState title="No farmers found" message="Verification requests matching this filter will appear here." />
      ) : (
        <div className="verification-list">
          {farmers.map((farmer) => {
            const profile = farmer.farmerProfile || {};
            const currentStatus = profile.verificationStatus || 'pending';

            return (
              <article className="verification-card" key={farmer._id}>
                <div className="verification-card-head">
                  <div>
                    <span className={`status ${getStatusClass(currentStatus)}`}>
                      {currentStatus}
                    </span>
                    <h2>{profile.farmName || farmer.name}</h2>
                    <p>{farmer.email}</p>
                  </div>
                  <FileSearch size={28} />
                </div>

                <div className="verification-details">
                  <span>
                    <strong>Farmer</strong>
                    {farmer.name}
                  </span>
                  <span>
                    <strong>Phone</strong>
                    {farmer.phone || 'Not provided'}
                  </span>
                  <span>
                    <strong>Village</strong>
                    {farmer.village || 'Not provided'}
                  </span>
                  <span>
                    <strong>Farm size</strong>
                    {profile.farmSize || 'Not provided'}
                  </span>
                  <span>
                    <strong>Experience</strong>
                    {profile.experienceYears || 0} years
                  </span>
                  <span>
                    <strong>Document</strong>
                    {profile.verificationIdType || 'Not provided'}
                  </span>
                </div>

                <div className="verification-address">
                  <strong>Farm address</strong>
                  <p>{profile.farmAddress || 'Not provided'}</p>
                </div>

                <div className="verification-actions">
                  <button
                    className="primary-button compact"
                    type="button"
                    disabled={currentStatus === 'approved'}
                    onClick={() => updateVerification(farmer._id, 'approved')}
                  >
                    <ShieldCheck size={17} />
                    Approve
                  </button>
                  <button
                    className="secondary-button compact"
                    type="button"
                    disabled={currentStatus === 'pending'}
                    onClick={() => updateVerification(farmer._id, 'pending')}
                  >
                    <Clock3 size={17} />
                    Pending
                  </button>
                  <button
                    className="secondary-button compact danger-text"
                    type="button"
                    disabled={currentStatus === 'rejected'}
                    onClick={() => updateVerification(farmer._id, 'rejected')}
                  >
                    <XCircle size={17} />
                    Reject
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
