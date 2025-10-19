import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

interface StajBasvuru {
  id: number;
  kurumAdi: string;
  kurumAdresi: string;
  sorumluTelefon: string;
  sorumluMail: string;
  yetkiliAdi: string;
  yetkiliUnvani: string;
  stajTipi: string;
  baslangicTarihi: string;
  bitisTarihi: string;
  toplamGun: number;
  saglikSigortasiDurumu: string;
  danismanMail: string;
  onayDurumu: string;
  danismanOnayDurumu: number;
  kariyerMerkeziOnayDurumu: number;
  sirketOnayDurumu: number;
  createdAt: string;
  ogrenci: {
    id: number;
    name: string;
    email: string;
    studentId: string;
    faculty: string;
    class: string;
  };
}

interface ApplicationManagementProps {
  refreshTrigger?: number;
}

export const ApplicationManagement: React.FC<ApplicationManagementProps> = ({ refreshTrigger }) => {
  const [applications, setApplications] = useState<StajBasvuru[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const statusOptions = [
    { value: '', label: 'Tüm Durumlar' },
    { value: 'HOCA_ONAYI_BEKLIYOR', label: 'Danışman Onayı Bekliyor' },
    { value: 'KARIYER_MERKEZI_ONAYI_BEKLIYOR', label: 'Kariyer Merkezi Onayı Bekliyor' },
    { value: 'SIRKET_ONAYI_BEKLIYOR', label: 'Şirket Onayı Bekliyor' },
    { value: 'ONAYLANDI', label: 'Onaylandı' },
    { value: 'REDDEDILDI', label: 'Reddedildi' },
    { value: 'IPTAL_EDILDI', label: 'İptal Edildi' }
  ];

  const typeOptions = [
    { value: '', label: 'Tüm Tipler' },
    { value: 'IMU_402', label: 'IMU 402' },
    { value: 'IMU_404', label: 'IMU 404' },
    { value: 'MESLEKI_EGITIM_UYGULAMALI_DERS', label: 'Mesleki Eğitim Uygulamalı Ders' },
    { value: 'ISTEGE_BAGLI_STAJ', label: 'İsteğe Bağlı Staj' },
    { value: 'ZORUNLU_STAJ', label: 'Zorunlu Staj' }
  ];

  const fetchApplications = useCallback(async (searchTerm = '', statusFilterValue = '', typeFilterValue = '') => {
    try {
      setLoading(true);
      
      const data = await api.getAdminApplications({
        limit: 1000,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilterValue && { onayDurumu: statusFilterValue }),
        ...(typeFilterValue && { stajTipi: typeFilterValue })
      });
      
      setApplications(data.basvurular);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  // Search callback - only updates table content
  const handleSearch = useCallback(async (searchTerm: string, statusFilterValue: string, typeFilterValue: string) => {
    await fetchApplications(searchTerm, statusFilterValue, typeFilterValue);
  }, [fetchApplications]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Refresh when trigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchApplications();
    }
  }, [refreshTrigger, fetchApplications]);

  // Debounced search effect
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      handleSearch(search, statusFilter, typeFilter);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [search, statusFilter, typeFilter, handleSearch]);

  const handleDelete = async (applicationId: number) => {
    if (!confirm('Bu başvuruyu silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await api.deleteAdminApplication(applicationId);
      fetchApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    }
  };

  const getStatusLabel = (status: string) => {
    return statusOptions.find(option => option.value === status)?.label || status;
  };

  const getTypeLabel = (type: string) => {
    return typeOptions.find(option => option.value === type)?.label || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONAYLANDI': return 'bg-green-100 text-green-800';
      case 'REDDEDILDI': return 'bg-red-100 text-red-800';
      case 'IPTAL_EDILDI': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Staj Başvuruları Yönetimi</h2>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Ara (kurum, öğrenci, yetkili)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {typeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-sm text-red-600">{error}</div>
        </div>
      )}

      {/* Applications Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Öğrenci
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kurum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Staj Tipi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarih Aralığı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Onaylar
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {applications.map((application) => (
                <tr key={application.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{application.ogrenci.name}</div>
                      <div className="text-sm text-gray-500">{application.ogrenci.email}</div>
                      <div className="text-xs text-gray-400">No: {application.ogrenci.studentId}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{application.kurumAdi}</div>
                      <div className="text-sm text-gray-500">{application.yetkiliAdi}</div>
                      <div className="text-xs text-gray-400">{application.yetkiliUnvani}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {getTypeLabel(application.stajTipi)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div>{new Date(application.baslangicTarihi).toLocaleDateString('tr-TR')}</div>
                      <div>{new Date(application.bitisTarihi).toLocaleDateString('tr-TR')}</div>
                      <div className="text-xs">({application.toplamGun} gün)</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(application.onayDurumu)}`}>
                      {getStatusLabel(application.onayDurumu)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs">Danışman:</span>
                        <span className={`w-3 h-3 rounded-full ${
                          application.danismanOnayDurumu === 1 ? 'bg-green-500' :
                          application.danismanOnayDurumu === -1 ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs">Kariyer:</span>
                        <span className={`w-3 h-3 rounded-full ${
                          application.kariyerMerkeziOnayDurumu === 1 ? 'bg-green-500' :
                          application.kariyerMerkeziOnayDurumu === -1 ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs">Şirket:</span>
                        <span className={`w-3 h-3 rounded-full ${
                          application.sirketOnayDurumu === 1 ? 'bg-green-500' :
                          application.sirketOnayDurumu === -1 ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">

                      <button
                        onClick={() => handleDelete(application.id)}
                        className="text-red-600 hover:text-red-900 px-2 py-1 rounded"
                      >
                        🗑️ Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Show total count */}
      <div className="flex items-center justify-between mt-4">
        <div>
          <p className="text-sm text-gray-700">
            Toplam <span className="font-medium">{applications.length}</span> başvuru gösteriliyor
          </p>
        </div>
      </div>
    </div>
  );
};
