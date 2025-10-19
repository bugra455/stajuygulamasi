import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { UpdateApplicationData } from '../../lib/api';

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
  danismanAciklama?: string;
  kariyerMerkeziAciklama?: string;
  sirketAciklama?: string;
  yurtDisi?: string;
  turkFirmasi?: string;
  ogrenci: {
    id: number;
    name: string;
    email: string;
    studentId: string;
    faculty: string;
    class: string;
  };
}

interface ApplicationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  application: StajBasvuru | null;
}

export const ApplicationFormModal: React.FC<ApplicationFormModalProps> = ({ isOpen, onClose, onSave, application }) => {
  const [formData, setFormData] = useState({
    kurumAdi: '',
    kurumAdresi: '',
    sorumluTelefon: '',
    sorumluMail: '',
    yetkiliAdi: '',
    yetkiliUnvani: '',
    stajTipi: 'IMU_402',
    baslangicTarihi: '',
    bitisTarihi: '',
    toplamGun: 0,
    saglikSigortasiDurumu: 'ALIYORUM',
    danismanMail: '',
    onayDurumu: 'HOCA_ONAYI_BEKLIYOR',
    danismanOnayDurumu: 0,
    kariyerMerkeziOnayDurumu: 0,
    sirketOnayDurumu: 0,
    danismanAciklama: '',
    kariyerMerkeziAciklama: '',
    sirketAciklama: '',
    yurtDisi: 'yurtiçi',
    turkFirmasi: 'evet'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusOptions = [
    { value: 'HOCA_ONAYI_BEKLIYOR', label: 'Danışman Onayı Bekliyor' },
    { value: 'KARIYER_MERKEZI_ONAYI_BEKLIYOR', label: 'Kariyer Merkezi Onayı Bekliyor' },
    { value: 'SIRKET_ONAYI_BEKLIYOR', label: 'Şirket Onayı Bekliyor' },
    { value: 'ONAYLANDI', label: 'Onaylandı' },
    { value: 'REDDEDILDI', label: 'Reddedildi' },
    { value: 'IPTAL_EDILDI', label: 'İptal Edildi' }
  ];

  const typeOptions = [
    { value: 'IMU_402', label: 'IMU 402' },
    { value: 'IMU_404', label: 'IMU 404' },
    { value: 'MESLEKI_EGITIM_UYGULAMALI_DERS', label: 'Mesleki Eğitim Uygulamalı Ders' },
    { value: 'ISTEGE_BAGLI_STAJ', label: 'İsteğe Bağlı Staj' },
    { value: 'ZORUNLU_STAJ', label: 'Zorunlu Staj' }
  ];

  const approvalOptions = [
    { value: 0, label: 'Bekliyor' },
    { value: 1, label: 'Onaylandı' },
    { value: -1, label: 'Reddedildi' }
  ];

  useEffect(() => {
    if (application) {
      setFormData({
        kurumAdi: application.kurumAdi,
        kurumAdresi: application.kurumAdresi,
        sorumluTelefon: application.sorumluTelefon,
        sorumluMail: application.sorumluMail,
        yetkiliAdi: application.yetkiliAdi,
        yetkiliUnvani: application.yetkiliUnvani,
        stajTipi: application.stajTipi,
        baslangicTarihi: application.baslangicTarihi.split('T')[0],
        bitisTarihi: application.bitisTarihi.split('T')[0],
        toplamGun: application.toplamGun,
        saglikSigortasiDurumu: application.saglikSigortasiDurumu,
        danismanMail: application.danismanMail,
        onayDurumu: application.onayDurumu,
        danismanOnayDurumu: application.danismanOnayDurumu,
        kariyerMerkeziOnayDurumu: application.kariyerMerkeziOnayDurumu,
        sirketOnayDurumu: application.sirketOnayDurumu,
        danismanAciklama: application.danismanAciklama || '',
        kariyerMerkeziAciklama: application.kariyerMerkeziAciklama || '',
        sirketAciklama: application.sirketAciklama || '',
        yurtDisi: application.yurtDisi || 'yurtiçi',
        turkFirmasi: application.turkFirmasi || 'evet'
      });
    }
    setError(null);
  }, [application, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application) return;

    setLoading(true);
    setError(null);

    try {
      // Type cast for onayDurumu
      const updateData: UpdateApplicationData = {
        ...formData,
        onayDurumu: formData.onayDurumu as 'HOCA_ONAYI_BEKLIYOR' | 'KARIYER_MERKEZI_ONAYI_BEKLIYOR' | 'SIRKET_ONAYI_BEKLIYOR' | 'ONAYLANDI' | 'REDDEDILDI' | 'IPTAL_EDILDI'
      };
      if (updateData.onayDurumu) {
        updateData.onayDurumu = updateData.onayDurumu as 'HOCA_ONAYI_BEKLIYOR' | 'KARIYER_MERKEZI_ONAYI_BEKLIYOR' | 'SIRKET_ONAYI_BEKLIYOR' | 'ONAYLANDI' | 'REDDEDILDI' | 'IPTAL_EDILDI';
      }
      
      await api.updateAdminApplication(application.id, updateData);
      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !application) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Staj Başvurusu Düzenle - {application.ogrenci.name}
          </h3>
          
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
              <div className="text-sm text-red-600">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Kurum Bilgileri */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-md font-medium text-gray-900 mb-3">Kurum Bilgileri</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kurum Adı</label>
                  <input
                    type="text"
                    required
                    value={formData.kurumAdi}
                    onChange={(e) => setFormData({ ...formData, kurumAdi: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Yetkili Adı</label>
                  <input
                    type="text"
                    required
                    value={formData.yetkiliAdi}
                    onChange={(e) => setFormData({ ...formData, yetkiliAdi: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Yetkili Unvanı</label>
                  <input
                    type="text"
                    required
                    value={formData.yetkiliUnvani}
                    onChange={(e) => setFormData({ ...formData, yetkiliUnvani: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sorumlu Mail</label>
                  <input
                    type="email"
                    required
                    value={formData.sorumluMail}
                    onChange={(e) => setFormData({ ...formData, sorumluMail: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Kurum Adresi</label>
                  <textarea
                    required
                    value={formData.kurumAdresi}
                    onChange={(e) => setFormData({ ...formData, kurumAdresi: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Staj Bilgileri */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-md font-medium text-gray-900 mb-3">Staj Bilgileri</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Staj Tipi</label>
                  <select
                    value={formData.stajTipi}
                    onChange={(e) => setFormData({ ...formData, stajTipi: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {typeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    required
                    value={formData.baslangicTarihi}
                    onChange={(e) => setFormData({ ...formData, baslangicTarihi: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bitiş Tarihi</label>
                  <input
                    type="date"
                    required
                    value={formData.bitisTarihi}
                    onChange={(e) => setFormData({ ...formData, bitisTarihi: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Toplam Gün</label>
                  <input
                    type="number"
                    required
                    value={formData.toplamGun}
                    onChange={(e) => setFormData({ ...formData, toplamGun: parseInt(e.target.value) })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Onay Durumları */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-md font-medium text-gray-900 mb-3">Onay Durumları</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Genel Durum</label>
                  <select
                    value={formData.onayDurumu}
                    onChange={(e) => setFormData({ ...formData, onayDurumu: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Danışman Onayı</label>
                  <select
                    value={formData.danismanOnayDurumu}
                    onChange={(e) => setFormData({ ...formData, danismanOnayDurumu: parseInt(e.target.value) })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {approvalOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kariyer Merkezi Onayı</label>
                  <select
                    value={formData.kariyerMerkeziOnayDurumu}
                    onChange={(e) => setFormData({ ...formData, kariyerMerkeziOnayDurumu: parseInt(e.target.value) })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {approvalOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Şirket Onayı</label>
                  <select
                    value={formData.sirketOnayDurumu}
                    onChange={(e) => setFormData({ ...formData, sirketOnayDurumu: parseInt(e.target.value) })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {approvalOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

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
                {loading ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
