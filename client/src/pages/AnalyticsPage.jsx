import { useState, useEffect } from 'react';
import {
  BarChart3,
  FileText,
  Layers,
  Search,
  Clock,
  MessageSquare,
  Zap,
  AlertCircle,
  PieChart,
  Activity,
} from 'lucide-react';
import { getAnalytics } from '../services/api';
import { useToast } from '../App';
import StatCard from '../components/StatCard';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const addToast = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await getAnalytics();
      setData(res);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page" id="analytics-page">
        <div className="page-header">
          <h1><BarChart3 size={24} /> Analytics</h1>
        </div>
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxType = Math.max(...(data.typeDistribution?.map((t) => t.count) || [1]), 1);

  return (
    <div className="page" id="analytics-page">
      <div className="page-header">
        <div>
          <h1>
            <BarChart3 size={24} />
            Analytics
          </h1>
          <p className="page-subtitle">
            System performance and usage insights
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <StatCard icon={FileText} value={data.totalDocs} label="Total Documents" color="indigo" />
        <StatCard icon={Layers} value={data.totalChunks} label="Indexed Chunks" color="cyan" />
        <StatCard icon={Search} value={data.totalQueries} label="Queries Made" color="emerald" />
        <StatCard icon={Clock} value={`${data.avgResponseTime}ms`} label="Avg. Retrieval Time" color="amber" />
        <StatCard icon={MessageSquare} value={data.totalSessions} label="Chat Sessions" color="indigo" />
        <StatCard icon={Zap} value={data.readyDocs} label="Ready Documents" color="emerald" />
        <StatCard icon={Activity} value={data.processingDocs} label="Processing" color="amber" />
        <StatCard icon={AlertCircle} value={data.errorDocs} label="Errors" color="rose" />
      </div>

      {/* Charts */}
      <div className="analytics-grid">
        {/* Document Type Distribution */}
        <div className="glass-card-static analytics-section">
          <h3>
            <PieChart size={16} style={{ color: 'var(--accent-1)' }} />
            Document Types
          </h3>
          {data.typeDistribution?.length > 0 ? (
            <div className="chart-bar-group">
              {data.typeDistribution.map((item) => (
                <div key={item.type} className="chart-bar-item">
                  <span className="chart-bar-label">.{item.type}</span>
                  <div className="chart-bar-track">
                    <div
                      className="chart-bar-fill"
                      style={{ width: `${Math.max((item.count / maxType) * 100, 15)}%` }}
                    >
                      {item.count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              No documents uploaded yet
            </p>
          )}
        </div>

        {/* Recent Queries */}
        <div className="glass-card-static analytics-section">
          <h3>
            <Activity size={16} style={{ color: 'var(--emerald)' }} />
            Recent Queries
          </h3>
          {data.recentQueries?.length > 0 ? (
            <table className="recent-queries-table">
              <thead>
                <tr>
                  <th>Query</th>
                  <th>Time</th>
                  <th>Sources</th>
                </tr>
              </thead>
              <tbody>
                {data.recentQueries.map((q, i) => (
                  <tr key={i}>
                    <td>
                      <span className="query-text">{q.query}</span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                      {q.responseTime}ms
                    </td>
                    <td>{q.chunkCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              No queries yet — start chatting with your documents!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
