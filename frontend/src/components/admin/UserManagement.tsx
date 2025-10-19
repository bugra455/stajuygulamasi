import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

interface User {
  id: number;
  tcKimlik: string;
  kullaniciAdi: string;
  name: string;
  email: string;
  userType: 'OGRENCI' | 'DANISMAN' | 'YONETICI' | 'KARIYER_MERKEZI';
  studentId?: string;
  faculty?: string;
  class?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserManagementProps {
  onEditUser: (user: User) => void;
  onCreateUser: () => void;
  refreshTrigger?: number;
}

export const UserManagement: React.FC<UserManagementProps> = ({ onEditUser, onCreateUser, refreshTrigger }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const userTypes = [
    { value: '', label: 'Tüm Kullanıcılar' },
    { value: 'OGRENCI', label: 'Öğrenci' },
    { value: 'DANISMAN', label: 'Danışman' },
    { value: 'KARIYER_MERKEZI', label: 'Kariyer Merkezi' },
    { value: 'YONETICI', label: 'Yönetici' }
  ];

  const fetchUsers = useCallback(async (searchTerm = '', typeFilter = '') => {
    try {
      // Only show main loading on initial load, not on search
      if (!searchTerm && !typeFilter) {
        setLoading(true);
      } else {
        setIsSearching(true);
      }
      
      const data = await api.getAdminUsers({
        limit: 1000,
        ...(searchTerm && { search: searchTerm }),
        ...(typeFilter && { userType: typeFilter })
      });
      
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, []);

  // Search callback - only updates table content
  const handleSearch = useCallback(async (searchTerm: string, typeFilter: string) => {
    await fetchUsers(searchTerm, typeFilter);
  }, [fetchUsers]);

  // Initial fetch
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Refresh when trigger changes (manual refresh after create/update)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchUsers();
    }
  }, [refreshTrigger, fetchUsers]);

  // Debounced search effect - uses callback to only update table
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      handleSearch(search, userTypeFilter);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [search, userTypeFilter, handleSearch]);

  const handleDelete = async (userId: number) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await api.deleteAdminUser(userId);
      
      // Refresh the list
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    }
  };

  const getUserTypeLabel = (userType: string) => {
    return userTypes.find(type => type.value === userType)?.label || userType;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Kullanıcı Yönetimi</h2>
        <button
          onClick={onCreateUser}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          ➕ Yeni Kullanıcı
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Ara (isim, email, kullanıcı adı, TC)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <select
              value={userTypeFilter}
              onChange={(e) => setUserTypeFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {userTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-sm text-red-600">{error}</div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="overflow-x-auto">
          {isSearching && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
          <div className="relative">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kullanıcı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İletişim
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tür
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Öğrenci Bilgileri
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Oluşturulma
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">{users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">@{user.kullaniciAdi}</div>
                      <div className="text-xs text-gray-400">TC: {user.tcKimlik}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.userType === 'YONETICI' ? 'bg-purple-100 text-purple-800' :
                      user.userType === 'DANISMAN' ? 'bg-blue-100 text-blue-800' :
                      user.userType === 'KARIYER_MERKEZI' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getUserTypeLabel(user.userType)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.studentId && (
                      <div>
                        <div>No: {user.studentId}</div>
                        <div>{user.faculty}</div>
                        <div>{user.class}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onEditUser(user)}
                        className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded"
                      >
                        ✏️ Düzenle
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
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
      </div>

      {/* Show total count */}
      <div className="flex items-center justify-between mt-4">
        <div>
          <p className="text-sm text-gray-700">
            Toplam <span className="font-medium">{users.length}</span> kullanıcı gösteriliyor
          </p>
        </div>
      </div>
    </div>
  );
};
