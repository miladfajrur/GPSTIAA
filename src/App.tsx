/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { ToastProvider } from './ToastContext';
import { useToast } from './ToastContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function AppContent() {
  const { user } = useAuth();
  
  if (!user) {
    return <Login />;
  }

  return <Dashboard />;
}

// Global Toast Renderer can be added here if needed, or in AppContent
function ToastRenderer() {
  const { toasts, removeToast } = useToast();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm text-white animate-in slide-in-from-right-8 fade-in duration-300 pointer-events-auto ${
            toast.type === 'success' ? 'bg-emerald-600' : 
            toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
          }`}
        >
          {toast.type === 'success' ? (
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : toast.type === 'error' ? (
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="font-medium whitespace-pre-wrap">{toast.message}</span>
          <button 
            onClick={() => removeToast(toast.id)}
            className="p-1 hover:bg-white/20 rounded-full transition-colors ml-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
          <ToastRenderer />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

