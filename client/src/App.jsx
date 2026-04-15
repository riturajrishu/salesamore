import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useCallback, createContext, useContext } from 'react';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import DocumentsPage from './pages/DocumentsPage';
import ChatPage from './pages/ChatPage';
import AnalyticsPage from './pages/AnalyticsPage';

// ── Toast Context ──
const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

export default function App() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/documents" replace />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Routes>
        </main>
      </div>
      <Toast toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}
