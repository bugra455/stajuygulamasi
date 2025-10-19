import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import { api } from '../../lib/api';
import { useTranslation } from '../../hooks/useTranslation';

interface SirketDetayModalProps {
  isOpen: boolean;
  onClose: () => void;
  kurumAdi: string | null;
}

interface SirketDetay {
  kurumAdi: string;
  kurumAdresi: string;
  yetkiliAdi: string;
  yetkiliUnvani: string;
  sorumluMail: string;
  sorumluTelefon: string;
  danismanMail: string; // Danışman email'i ekledik
  toplamOgrenciSayisi: number;
  aktifStajSayisi: number;
  bekleyenBasvuruSayisi: number;
  basvurular: Array<{
    id: number;
    ogrenci: {
      id: number;
      name: string;
      email: string;
      studentId: string;
      faculty: string;
      class: string; // Sınıf bilgisi ekledik
    };
    baslangicTarihi: string;
    bitisTarihi: string;
    toplamGun: number; // Toplam gün bilgisi ekledik
    onayDurumu: string;
    stajTipi: string;
    defterDurumu: string;
    transkriptDosyasi: string; // Transkript dosya yolu ekledik
    hizmetDokumu?: string; // Hizmet dökümü dosya yolu
    sigortaDosyasi?: string; // Sigorta dosya yolu
    createdAt: string;
  }>;
}

const SirketDetayModal: React.FC<SirketDetayModalProps> = ({ isOpen, onClose, kurumAdi }) => {
  const { t } = useTranslation();
  const [sirket, setSirket] = useState<SirketDetay | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'bilgiler' | 'ogrenciler' | 'istatistikler'>('bilgiler');

  const fetchSirketDetay = useCallback(async () => {
    if (!kurumAdi) return;
    
    setLoading(true);
    try {
      const result = await api.getKariyerSirketDetay(kurumAdi);
      setSirket(result.success ? result.data : result);
    } catch (error: unknown) {
      console.error(t("modals.sirketDetay.loadingError"), error);
    } finally {
      setLoading(false);
    }
  }, [kurumAdi, t]);

  useEffect(() => {
    if (isOpen && kurumAdi) {
      fetchSirketDetay();
    }
  }, [isOpen, kurumAdi, fetchSirketDetay]);

  const getOnayDurumuColor = (durum: string) => {
    switch (durum) {
      case 'ONAYLANDI': return 'text-green-600 bg-green-100';
      case 'REDDEDILDI': return 'text-red-600 bg-red-100';
      case 'IPTAL_EDILDI': return 'text-gray-600 bg-gray-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={t("modals.sirketDetay.title")} size="xl">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Modal>
    );
  }

  if (!sirket) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${sirket.kurumAdi} - ${t("modals.sirketDetay.title")}`} size="xl">
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'bilgiler', label: t("modals.sirketDetay.tabs.companyInfo") },
              { key: 'ogrenciler', label: t("modals.sirketDetay.tabs.students") },
              { key: 'istatistikler', label: t("modals.sirketDetay.tabs.statistics") }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as 'bilgiler' | 'ogrenciler' | 'istatistikler')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'bilgiler' && (
          <div className="space-y-6">
            <h4 className="text-lg font-medium">{t("modals.sirketDetay.tabs.companyInfo")}</h4>
            
            {/* Şirket Bilgileri Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-blue-700 mb-2">🏢 {t("modals.sirketDetay.institutionName")}</label>
                <p className="text-base font-semibold text-blue-900 break-words">{sirket.kurumAdi}</p>
              </div>
              
              <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">📍 {t("modals.sirketDetay.address")}</label>
                <p className="text-sm text-gray-900 break-words leading-relaxed">{sirket.kurumAdresi}</p>
              </div>
            </div>
            {/* Özet İstatistikler */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h5 className="font-medium text-gray-900 mb-3">{t("modals.sirketDetay.summary")}</h5>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{sirket.toplamOgrenciSayisi}</div>
                  <div className="text-sm text-gray-500">{t("modals.sirketDetay.totalStudents")}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{sirket.aktifStajSayisi}</div>
                  <div className="text-sm text-gray-500">{t("modals.sirketDetay.activeInternships")}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{sirket.bekleyenBasvuruSayisi}</div>
                  <div className="text-sm text-gray-500">{t("modals.sirketDetay.pendingApprovals")}</div>
                </div>
              </div>
            </div>
          </div>
        )} 

        {activeTab === 'ogrenciler' && (
          <div className="space-y-4">
            <h4 className="text-lg font-medium">{t("modals.sirketDetay.studentsAtCompany")}</h4>
            
            {sirket.basvurular.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{t("modals.sirketDetay.noStudentsFound")}</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {sirket.basvurular.map((basvuru) => (
                  <div key={basvuru.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    {/* Öğrenci Bilgileri */}
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-blue-900 break-words">{basvuru.ogrenci.name}</h5>
                          <p className="text-sm text-blue-700 break-words">
                            {basvuru.ogrenci.studentId} • {basvuru.ogrenci.faculty}
                          </p>
                          <p className="text-sm text-blue-700 break-words">{basvuru.ogrenci.class}</p>
                          <p className="text-xs text-blue-600 break-words">{basvuru.ogrenci.email}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getOnayDurumuColor(basvuru.onayDurumu)}`}>
                          {basvuru.onayDurumu}
                        </span>
                      </div>
                    </div>

                    {/* Staj Bilgileri */}
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-xs text-green-600 mb-2">📝 Staj Bilgileri</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-green-700 font-medium">Başlangıç:</span>
                          <div className="text-green-900">{formatDate(basvuru.baslangicTarihi)}</div>
                        </div>
                        <div>
                          <span className="text-green-700 font-medium">Bitiş:</span>
                          <div className="text-green-900">{formatDate(basvuru.bitisTarihi)}</div>
                        </div>
                        <div>
                          <span className="text-green-700 font-medium">Toplam Gün:</span>
                          <div className="text-green-900">{basvuru.toplamGun} gün</div>
                        </div>
                        <div>
                          <span className="text-green-700 font-medium">Tip:</span>
                          <div className="text-green-900 text-xs break-words">{basvuru.stajTipi}</div>
                        </div>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'istatistikler' && (
          <div className="space-y-6">
            <h4 className="text-lg font-medium">Detaylı İstatistikler</h4>
            
            {/* Staj Durumu Dağılımı */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-4">Staj Durumu Dağılımı</h5>
              <div className="space-y-3">
                {Object.entries(
                  sirket.basvurular.reduce((acc, basvuru) => {
                    acc[basvuru.onayDurumu] = (acc[basvuru.onayDurumu] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([durum, sayi]) => (
                  <div key={durum} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{durum}</span>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 mr-3">{sayi}</span>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(sayi / sirket.basvurular.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Staj Tipi Dağılımı */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-4">Staj Tipi Dağılımı</h5>
              <div className="space-y-3">
                {Object.entries(
                  sirket.basvurular.reduce((acc, basvuru) => {
                    acc[basvuru.stajTipi] = (acc[basvuru.stajTipi] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([tip, sayi]) => (
                  <div key={tip} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{tip}</span>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 mr-3">{sayi}</span>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${(sayi / sirket.basvurular.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SirketDetayModal;
