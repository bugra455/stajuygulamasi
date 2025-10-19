import { useState, useEffect } from 'react';
import type { BaseBasvuru } from '../../types/common';
import { api } from '../../lib/api';

export const useDashboardData = () => {
  const [basvurular, setBasvurular] = useState<BaseBasvuru[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBasvurular = async () => {
    try {
      setIsLoading(true);
      const data = await api.getBasvurular();
      setBasvurular(Array.isArray(data) ? data : []);
      setError(null);
    } catch {
      setError('Başvurular yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBasvurular();
  }, []);

  return {
    basvurular,
    isLoading,
    error,
    refetch: fetchBasvurular
  };
};
