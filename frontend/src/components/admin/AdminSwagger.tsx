import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const AdminSwagger: React.FC = () => {
  const { token, user } = useAuth();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Request server to set a short-lived HttpOnly cookie for /api/docs using the Authorization header.
  // Note: hooks must be called unconditionally, so we check inside the effect and return early if not applicable.
  useEffect(() => {
    let cancelled = false;
    const initDocsSession = async () => {
      try {
        // If user isn't admin or there's no token, skip initializing the docs session.
        if (!user || user.userType !== 'YONETICI' || !token) return;

        setError(null);
        setReady(false);
        const res = await fetch('/api/docs/session', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          credentials: 'include'
        });

        if (!res.ok) {
          const body: unknown = await res.json().catch(() => ({}));
          const bodyObj = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
          const maybeError = bodyObj && typeof bodyObj['error'] === 'string' ? (bodyObj['error'] as string) : null;
          throw new Error(maybeError || `HTTP ${res.status}`);
        }

        if (!cancelled) setReady(true);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (!cancelled) setError(message || 'Yetkilendirme hatası');
      }
    };

    initDocsSession();
    return () => { cancelled = true; };
  }, [token, user]);

  if (error) {
    return (
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold">Swagger Dokümantasyonu</h2>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  // Only load the iframe after the server has set the cookie
  return (
    <div className="h-[80vh] bg-white rounded shadow overflow-hidden">
      {!ready && (
        <div className="p-6">
          <p>Swagger yükleniyor...</p>
        </div>
      )}
      {ready && (
        <iframe
          title="Swagger UI"
          src={`/api/docs`}
          className="w-full h-full border-0"
        />
      )}
    </div>
  );
};

export default AdminSwagger;
