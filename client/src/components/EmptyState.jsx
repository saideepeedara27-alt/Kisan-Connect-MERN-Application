import { Sprout } from 'lucide-react';

export default function EmptyState({ title, message, action }) {
  return (
    <div className="empty-state">
      <Sprout size={34} />
      <h3>{title}</h3>
      <p>{message}</p>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
