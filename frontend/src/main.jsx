import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'

window.OneSignalDeferred = window.OneSignalDeferred || [];
window.OneSignalDeferred.push(async function(OneSignal) {
  try {
    if (!import.meta.env.VITE_ONESIGNAL_APP_ID) {
      console.warn('[OneSignal] VITE_ONESIGNAL_APP_ID is not configured');
      return;
    }
    await OneSignal.init({
      appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
      safari_web_id: 'web.onesignal.auto.' + import.meta.env.VITE_ONESIGNAL_APP_ID,
      notifyButton: {
        enable: false // We use our own bell — disable the default button
      },
      allowLocalhostAsSecureOrigin: true, // Required for localhost testing
    });
    window.__oneSignalInitialized = true;
    console.log('[OneSignal] Initialized');
  } catch (err) {
    console.warn('[OneSignal] Initialization failed:', err.message || err);
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
