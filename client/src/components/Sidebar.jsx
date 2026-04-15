import { NavLink } from 'react-router-dom';
import { FileText, MessageSquare, BarChart3, Brain, Zap } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Brain size={20} />
        </div>
        <div>
          <h2>NeuralDocs</h2>
          <span>Document Intelligence</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/documents"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <FileText size={18} />
          Documents
        </NavLink>

        <NavLink
          to="/chat"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <MessageSquare size={18} />
          Chat with Docs
        </NavLink>

        <NavLink
          to="/analytics"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <BarChart3 size={18} />
          Analytics
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-info">
          <span className="sidebar-footer-dot"></span>
          <Zap size={12} />
          Powered by Gemini AI — Free Tier
        </div>
      </div>
    </aside>
  );
}
