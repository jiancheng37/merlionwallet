import React, { useState, useEffect } from "react";

const BACKEND_URL = "http://localhost:3000"; // Change if needed

export default function LoginScreen() {
  const [user, setUser] = useState(() => {
    // Persist user session using localStorage
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = () => {
    setLoading(true);
    
    // Generate random nonce and state
    const nonce = Math.random().toString(36).substring(2, 15);
    const state = Math.random().toString(36).substring(2, 15);

    // Store state in sessionStorage to verify later
    sessionStorage.setItem("authState", state);
    
    // IMPORTANT: Set the correct redirect_uri to come back to the frontend
    // This should be a frontend URL, not your backend callback
    const frontendRedirectUri = window.location.origin + window.location.pathname;
    
    const authUrl = `http://localhost:5156/singpass/v2/authorize?client_id=my-mock-client-id&redirect_uri=${encodeURIComponent(frontendRedirectUri)}&response_type=code&scope=openid&nonce=${nonce}&state=${state}`;

    window.location.href = authUrl; // Redirect to authentication page
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");

    if (code) {
      setLoading(true);

      // Verify state
      const storedState = sessionStorage.getItem("authState");
      if (state && storedState && state !== storedState) {
        setError("Invalid state parameter. Possible CSRF attack.");
        setLoading(false);
        return;
      }

      sessionStorage.removeItem("authState"); // Clear stored state

      // Exchange code for token via backend 
      // Make sure to pass the code to your backend
      fetch(`${BACKEND_URL}/singpass/callback?code=${code}`)
        .then(response => {
          if (!response.ok) {
            return response.text().then(text => {
              throw new Error(`Authentication failed: ${text}`);
            });
          }
          return response.json();
        })
        .then(data => {
          console.log("Authentication successful:", data);
          // Save user data
          if (data.user) {
            setUser(data.user.payload || data.user);
            localStorage.setItem("user", JSON.stringify(data.user.payload || data.user));
          }
          // Clean up URL after successful login
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch(err => {
          console.error("Error during authentication:", err);
          setError(err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, []);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    sessionStorage.clear();
    window.location.href = window.location.pathname; // Refresh to clear URL params
  };

  // Extract user information for display
  const userInfo = user && (
    <div>
      <p><strong>NRIC:</strong> {user.sub ? user.sub.split(',')[0].replace('s=', '') : 'N/A'}</p>
      <p><strong>UUID:</strong> {user.sub ? user.sub.split(',')[1].replace('u=', '') : 'N/A'}</p>
      <p><strong>Issued at:</strong> {user.iat ? new Date(user.iat * 1000).toLocaleString() : 'N/A'}</p>
      <p><strong>Expires:</strong> {user.exp ? new Date(user.exp * 1000).toLocaleString() : 'N/A'}</p>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      {loading ? (
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-blue-500">Logging in...</span>
        </div>
      ) : error ? (
        <div className="text-red-500 mb-4 p-6 bg-white rounded-lg shadow-md">
          <p><strong>Error:</strong> {error}</p>
          <button
            onClick={() => window.location.href = window.location.pathname}
            className="mt-4 px-4 py-2 text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      ) : user ? (
        <div className="p-6 bg-white rounded-lg shadow-md max-w-lg w-full">
          <h1 className="text-xl font-bold text-gray-800 mb-4">
            Welcome, {user.sub ? user.sub.split(',')[0].replace('s=', '') : 'User'}!
          </h1>
          
          {userInfo}
          
          <div className="mt-4">
            <h2 className="text-lg font-semibold mb-2">Raw User Data:</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60 text-sm">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
          
          <button
            onClick={handleLogout}
            className="mt-4 px-4 py-2 text-white bg-red-600 rounded-lg shadow hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      ) : (
        <div className="p-6 bg-white rounded-lg shadow-md text-center">
          <h1 className="text-xl font-bold text-gray-800 mb-4">Singpass Login Demo</h1>
          <button
            onClick={handleLogin}
            className="px-6 py-3 text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700"
          >
            Login with Singpass
          </button>
        </div>
      )}
    </div>
  );
}