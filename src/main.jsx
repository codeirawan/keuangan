import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js"));
}

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div style={{
        minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg,#1e1b2e 0%,#12111c 100%)",
        fontFamily: "system-ui,sans-serif", padding: "24px", boxSizing: "border-box",
      }}>
        <div style={{
          maxWidth: 420, width: "100%", background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)", borderRadius: 24,
          padding: "40px 32px", textAlign: "center", backdropFilter: "blur(20px)",
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔧</div>
          <h2 style={{ color: "#e2e8f0", margin: "0 0 8px", fontSize: 22, fontWeight: 700 }}>
            Sedang dalam pemeliharaan
          </h2>
          <p style={{ color: "#94a3b8", margin: "0 0 24px", fontSize: 15, lineHeight: 1.6 }}>
            Aplikasi tidak dapat terhubung ke server saat ini.<br />
            Coba beberapa saat lagi.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
              color: "#fff", border: "none", borderRadius: 12,
              padding: "12px 28px", fontSize: 15, fontWeight: 600,
              cursor: "pointer", transition: "opacity .2s",
            }}
            onMouseOver={e => e.target.style.opacity = .8}
            onMouseOut={e => e.target.style.opacity = 1}
          >
            Coba lagi
          </button>
          {import.meta.env.DEV && (
            <pre style={{
              marginTop: 20, fontSize: 11, color: "#f87171", textAlign: "left",
              background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 12, overflowX: "auto",
            }}>
              {String(this.state.err)}
            </pre>
          )}
        </div>
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
