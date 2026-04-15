export default function StatCard({ icon: Icon, value, label, color = 'indigo' }) {
  return (
    <div className="glass-card stat-card">
      <div className="stat-card-header">
        <div className={`stat-card-icon ${color}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}
