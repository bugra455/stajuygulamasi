import { useState, useEffect } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { UserManagement } from '../components/admin/UserManagement';
import { ApplicationManagement } from '../components/admin/ApplicationManagement';
import { UserFormModal } from '../components/admin/UserFormModal';
import { ApplicationFormModal } from '../components/admin/ApplicationFormModal';
import OgrenciGuncelle from '../components/admin/OgrenciGuncelle';
import HocaGuncelle from '../components/admin/HocaGuncelle';
import CapGuncelle from '../components/admin/CapGuncelle';
import AdminSwagger from '../components/admin/AdminSwagger';
import { api } from '../lib/api';

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
  defter?: {
    id: number;
    defterDurumu: string;
    sirketOnayDurumu: number;
    danismanOnayDurumu: number;
  };
}

interface Statistics {
  totals: {
    users: number;
    basvurular: number;
    defterler: number;
  };
  usersByType: Array<{
    userType: string;
    _count: { id: number };
  }>;
  basvurularByStatus: Array<{
    onayDurumu: string;
    _count: { id: number };
  }>;
  defterlerByStatus: Array<{
    defterDurumu: string;
    _count: { id: number };
  }>;
  recentActivity: Array<{
    id: number;
    kurumAdi: string;
    createdAt: string;
    ogrenci: {
      name: string;
      email: string;
    };
  }>;
}

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [refreshUsers, setRefreshUsers] = useState(0);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<StajBasvuru | null>(null);
  const [refreshApplications, setRefreshApplications] = useState(0);

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
    { id: 'users', label: '👥 Kullanıcılar', icon: '👥' },
    { id: 'applications', label: '📝 Başvurular', icon: '📝' },
    { id: 'docs', label: '📚 API Doküman', icon: '📚' },
    { id: 'ogrenci-guncelle', label: '👨‍🎓 Öğrenci Güncelle', icon: '👨‍🎓' },
    { id: 'hoca-guncelle', label: '👨‍🏫 Hoca Güncelle', icon: '👨‍🏫' },
    { id: 'cap-guncelle', label: '🎓 CAP Güncelle', icon: '🎓' },
  ];

  const fetchStatistics = async () => {
    try {
      const data = await api.getAdminStatistics();
      setStatistics(data);
    } catch (error) {
      console.error('İstatistikler yüklenemedi:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchStatistics();
    }
  }, [activeTab]);

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsUserModalOpen(true);
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setIsUserModalOpen(true);
  };

  const handleUserModalSave = () => {
    setRefreshUsers(prev => prev + 1);
    setIsUserModalOpen(false);
    setEditingUser(null);
  };

  const handleApplicationModalSave = () => {
    setRefreshApplications(prev => prev + 1);
    setIsApplicationModalOpen(false);
    setEditingApplication(null);
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
      
      {statistics && (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="text-3xl mr-4">👥</div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Kullanıcı</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.totals.users}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="text-3xl mr-4">📝</div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Başvuru</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.totals.basvurular}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="text-3xl mr-4">📓</div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Defter</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.totals.defterler}</p>
                </div>
              </div>
            </div>
          </div>

          {/* User Types Distribution */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Kullanıcı Türleri</h3>
            <div className="space-y-3">
              {statistics.usersByType.map((item) => (
                <div key={item.userType} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{item.userType}</span>
                  <span className="font-medium">{item._count.id}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Application Status Distribution */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Başvuru Durumları</h3>
            <div className="space-y-3">
              {statistics.basvurularByStatus.map((item) => (
                <div key={item.onayDurumu} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{item.onayDurumu}</span>
                  <span className="font-medium">{item._count.id}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Son Başvurular</h3>
            <div className="space-y-3">
              {statistics.recentActivity.map((activity) => (
                <div key={activity.id} className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.ogrenci.name}</p>
                    <p className="text-xs text-gray-500">{activity.kurumAdi}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(activity.createdAt).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderNotebooks = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Defter Yönetimi</h2>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-600">Defter yönetimi özellikleri yakında eklenecek...</p>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Unified Tab Navigation */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className={['ogrenci-guncelle', 'hoca-guncelle', 'sirket-guncelle'].includes(activeTab) ? '' : 'bg-white p-6 rounded-lg shadow'}>
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'users' && (
            <UserManagement
              onEditUser={handleEditUser}
              onCreateUser={handleCreateUser}
              refreshTrigger={refreshUsers}
            />
          )}
          {activeTab === 'applications' && (
            <ApplicationManagement 
              refreshTrigger={refreshApplications}
            />
          )}
          {activeTab === 'ogrenci-guncelle' && <OgrenciGuncelle />}
          {activeTab === 'hoca-guncelle' && <HocaGuncelle />}
          {activeTab === 'cap-guncelle' && <CapGuncelle />}
          {activeTab === 'notebooks' && renderNotebooks()}
          {activeTab === 'docs' && <AdminSwagger />}
        </div>
      </div>

      {/* User Form Modal */}
      <UserFormModal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setEditingUser(null);
        }}
        onSave={handleUserModalSave}
        user={editingUser}
      />

      {/* Application Form Modal */}
      <ApplicationFormModal
        isOpen={isApplicationModalOpen}
        onClose={() => {
          setIsApplicationModalOpen(false);
          setEditingApplication(null);
        }}
        onSave={handleApplicationModalSave}
        application={editingApplication}
      />
    </AdminLayout>
  );
};

export default AdminPanel;
