import { useState, useEffect } from 'react';
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

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  user?: User | null;
}
export type userTypes = 'OGRENCI' | 'DANISMAN' | 'YONETICI' | 'KARIYER_MERKEZI';
export const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, onSave, user }) => {
  const [formData, setFormData] = useState({
    tcKimlik: '',
    kullaniciAdi: '',
    name: '',
    email: '',
    password: '',
    userType: 'OGRENCI' as 'OGRENCI' | 'DANISMAN' | 'YONETICI' | 'KARIYER_MERKEZI',
    studentId: '',
    faculty: '',
    class: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userTypes = [
    { value: 'OGRENCI', label: 'Öğrenci' },
    { value: 'DANISMAN', label: 'Danışman' },
    { value: 'KARIYER_MERKEZI', label: 'Kariyer Merkezi' },
    { value: 'YONETICI', label: 'Yönetici' }
  ];

  useEffect(() => {
    if (user) {
      setFormData({
        tcKimlik: user.tcKimlik,
        kullaniciAdi: user.kullaniciAdi,
        name: user.name,
        email: user.email,
        password: '',
        userType: user.userType,
        studentId: user.studentId || '',
        faculty: user.faculty || '',
        class: user.class || ''
      });
    } else {
      setFormData({
        tcKimlik: '',
        kullaniciAdi: '',
        name: '',
        email: '',
        password: '',
        userType: 'OGRENCI',
        studentId: '',
        faculty: '',
        class: ''
      });
    }
    setError(null);
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (user) {
        // Update - password boşsa gönderme
        const updateData: Partial<typeof formData> = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }
        await api.updateAdminUser(user.id, updateData);
      } else {
        // Create - tüm alanlar gerekli
        await api.createAdminUser(formData);
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {user ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Oluştur'}
          </h3>
          
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
              <div className="text-sm text-red-600">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">TC Kimlik</label>
              <input
                type="text"
                required
                maxLength={11}
                value={formData.tcKimlik}
                onChange={(e) => setFormData({ ...formData, tcKimlik: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Kullanıcı Adı</label>
              <input
                type="text"
                required
                value={formData.kullaniciAdi}
                onChange={(e) => setFormData({ ...formData, kullaniciAdi: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Ad Soyad</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Parola {user && '(Değiştirmek için doldurun)'}
              </label>
              <input
                type="password"
                required={!user}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Kullanıcı Türü</label>
              <select
                value={formData.userType}
                onChange={(e) => setFormData({ ...formData, userType: e.target.value as userTypes })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {userTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {formData.userType === 'OGRENCI' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Öğrenci Numarası</label>
                  <input
                    type="text"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Fakülte</label>
                  <input
                    type="text"
                    value={formData.faculty}
                    onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Sınıf</label>
                  <input
                    type="text"
                    value={formData.class}
                    onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Kaydediliyor...' : (user ? 'Güncelle' : 'Oluştur')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
