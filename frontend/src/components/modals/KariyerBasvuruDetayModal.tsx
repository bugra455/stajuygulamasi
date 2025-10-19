import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import { api } from '../../lib/api';
import { useTranslation } from '../../hooks/useTranslation';

interface BasvuruKariyerDetay {
  id: number;
  kurumAdi: string;
  kurumAdresi?: string;
  sorumluTelefon?: string;
  sorumluMail?: string;
  yetkiliAdi?: string;
  yetkiliUnvani?: string;
  yurtDisi?: string;
  turkFirmasi?: string;
  stajTipi: string;
  baslangicTarihi: string;
  bitisTarihi: string;
  toplamGun?: number;
  onayDurumu: string;
  createdAt: string;
  danismanAciklama?: string;
  danismanOnayDurumu?: number; 
  kariyerMerkeziAciklama?: string;
  kariyerMerkeziOnayDurumu?: number;
  sirketAciklama?: string;
  sirketOnayDurumu?: number;
  // CAP fields
  isCapBasvuru?: boolean;
  capFakulte?: string | null;
  capBolum?: string | null;
  capDepartman?: string | null;
  ogrenci: {
    id: number;
    name: string;
    email: string;
    studentId: string;
    faculty?: string;
    class?: string;
    tcKimlik?: string;
  // CAP fields
  isCapOgrenci?: boolean;
  capFakulte?: string | null;
  capBolum?: string | null;
  capDepartman?: string | null;
  };
  danisman?: {
    id: number;
    name: string;
    email: string;
  };
  logs?: Array<{
    id: number;
    action: string;
    aciklama?: string;
    createdAt: string;
    degisikligiYapan: {
      id: number;
      name: string;
      userType: string;
    };
  }>;
}

interface KariyerBasvuruDetayModalProps {
  isOpen: boolean;
  onClose: () => void;
  basvuruId: number | null;
  onOnayla?: (id: number, aciklama?: string) => void;
  onReddet?: (id: number, sebep: string) => void;
  isProcessing?: boolean;
}

const KariyerBasvuruDetayModal: React.FC<KariyerBasvuruDetayModalProps> = ({ 
  isOpen, 
  onClose, 
  basvuruId,
  onOnayla,
  onReddet,
  isProcessing = false
}) => {
  const { t } = useTranslation();
  const [basvuru, setBasvuru] = useState<BasvuruKariyerDetay | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBasvuruDetay = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getKariyerBasvuru(basvuruId!);
      // Normalize to prefer ogrenciDetaylari if backend returned it
      const basvuruData = response.data || response;
      let normalizedOgrenci = basvuruData.ogrenci;
      if (basvuruData.ogrenciDetaylari) {
        normalizedOgrenci = {
          id: basvuruData.ogrenciDetaylari.id,
          name: basvuruData.ogrenciDetaylari.name,
          email: basvuruData.ogrenciDetaylari.email,
          studentId: basvuruData.ogrenciDetaylari.studentId || basvuruData.ogrenci.studentId,
          faculty: basvuruData.ogrenciDetaylari.faculty || basvuruData.ogrenci.faculty,
          class: basvuruData.ogrenciDetaylari.class || basvuruData.ogrenci.class,
          tcKimlik: basvuruData.ogrenciDetaylari.tcKimlik || basvuruData.ogrenci.tcKimlik,
          // CAP mapping (backend may return these under ogrenciDetaylari)
          isCapOgrenci: !!basvuruData.ogrenciDetaylari.isCapOgrenci,
          capFakulte: basvuruData.ogrenciDetaylari.capFakulte || basvuruData.ogrenci.capFakulte,
          capBolum: basvuruData.ogrenciDetaylari.capBolum || basvuruData.ogrenci.capBolum,
          capDepartman: basvuruData.ogrenciDetaylari.capDepartman || basvuruData.ogrenci.capDepartman,
        };
      }

      setBasvuru({
        ...basvuruData,
        ogrenci: normalizedOgrenci
      });
    } catch  {
      console.error("Başvuru detayları yüklenirken hata oluştu.");
      setBasvuru(null);
    } finally {
      setLoading(false);
    }
  }, [basvuruId]);

  useEffect(() => {
    if (isOpen && basvuruId) {
      fetchBasvuruDetay();
    }
  }, [isOpen, basvuruId, fetchBasvuruDetay]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const getStatusColor = (durum: string): string => {
    switch (durum) {
      case 'HOCA_ONAYI_BEKLIYOR':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'KARIYER_MERKEZI_ONAYI_BEKLIYOR':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'SIRKET_ONAYI_BEKLIYOR':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'ONAYLANDI':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'REDDEDILDI':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getStatusText = (durum: string): string => {
    switch (durum) {
      case 'HOCA_ONAYI_BEKLIYOR':
        return 'Danışman Onayı Bekliyor';
      case 'KARIYER_MERKEZI_ONAYI_BEKLIYOR':
        return 'Kariyer Merkezi Onayı Bekliyor';
      case 'SIRKET_ONAYI_BEKLIYOR':
        return 'Şirket Onayı Bekliyor';
      case 'ONAYLANDI':
        return 'Onaylandı';
      case 'REDDEDILDI':
        return 'Reddedildi';
      default:
        return durum;
    }
  };

  if (!isOpen) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={t("modals.basvuruDetay.title")}
      size="xl"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Başvuru detayları yükleniyor...</p>
          </div>
        ) : basvuru ? (
          <>
            {/* Header - Status and Basic Info */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{basvuru.kurumAdi}</h3>
                  <p className="text-lg text-gray-600">{basvuru.stajTipi}</p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(basvuru.onayDurumu)}`}>
                  {getStatusText(basvuru.onayDurumu)}
                </span>
              </div>
              
              {/* Student Info - Responsive Layout */}
              <div className="bg-white p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">👤</span>
                  <span>Öğrenci Bilgileri</span>
                </h4>
                
                {/* Mobile Grid Layout */}
                <div className="lg:hidden space-y-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border-l-4 border-l-blue-500 shadow-sm">
                    <div className="text-xs text-blue-700 font-bold mb-2 uppercase tracking-wide">👤 Ad Soyad</div>
                    <div className="text-base text-blue-900 font-bold break-words">
                      {basvuru.ogrenci.name}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-xl border-l-4 border-l-green-500 shadow-sm">
                      <div className="text-xs text-green-700 font-bold mb-2 uppercase tracking-wide">🆔 Öğrenci No</div>
                      <div className="text-sm text-green-900 font-bold">
                        {basvuru.ogrenci.studentId}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-3 rounded-xl border-l-4 border-l-purple-500 shadow-sm">
                      <div className="text-xs text-purple-700 font-bold mb-2 uppercase tracking-wide">📧 E-posta</div>
                      <div className="text-xs text-purple-900 font-semibold break-all">
                        {basvuru.ogrenci.email}
                      </div>
                    </div>
                  </div>
                  {(basvuru.ogrenci.tcKimlik || basvuru.ogrenci.faculty || basvuru.ogrenci.class) && (
                    <div className="grid grid-cols-1 gap-3">
                      {basvuru.ogrenci.tcKimlik && (
                        <div className="bg-gradient-to-br from-red-50 to-rose-50 p-3 rounded-xl border-l-4 border-l-red-500 shadow-sm">
                          <div className="text-xs text-red-700 font-bold mb-2 uppercase tracking-wide">🆔 TC Kimlik</div>
                          <div className="text-sm text-red-900 font-mono font-bold">
                            {basvuru.ogrenci.tcKimlik}
                          </div>
                        </div>
                      )}
                      {basvuru.ogrenci.faculty && (
                        <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-3 rounded-xl border-l-4 border-l-orange-500 shadow-sm">
                          <div className="text-xs text-orange-700 font-bold mb-2 uppercase tracking-wide">🏛️ Fakülte</div>
                          <div className="text-sm text-orange-900 font-semibold break-words">
                            {basvuru.ogrenci.faculty}
                          </div>
                        </div>
                      )}
                      {basvuru.ogrenci.class && (
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-3 rounded-xl border-l-4 border-l-indigo-500 shadow-sm">
                          <div className="text-xs text-indigo-700 font-bold mb-2 uppercase tracking-wide">📚 Sınıf</div>
                          <div className="text-sm text-indigo-900 font-semibold">
                            {basvuru.ogrenci.class}
                          </div>
                        </div>
                      )}
                      {/* CAP info - mobile */}
                      {(basvuru.ogrenci.isCapOgrenci || basvuru.isCapBasvuru) && (basvuru.ogrenci.capFakulte || basvuru.ogrenci.capBolum || basvuru.ogrenci.capDepartman || basvuru.capFakulte || basvuru.capBolum || basvuru.capDepartman) && (
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-3 rounded-xl border-l-4 border-l-amber-500 shadow-sm">
                          <div className="text-xs text-amber-700 font-bold mb-2 uppercase tracking-wide">🎓 CAP Bilgileri</div>
                          <div className="text-sm text-amber-900">
                            {basvuru.ogrenci.capFakulte || basvuru.capFakulte ? <div>Fakülte: {basvuru.ogrenci.capFakulte || basvuru.capFakulte}</div> : null}
                            {basvuru.ogrenci.capBolum || basvuru.capBolum ? <div>Bölüm: {basvuru.ogrenci.capBolum || basvuru.capBolum}</div> : null}
                            {basvuru.ogrenci.capDepartman || basvuru.capDepartman ? <div>Departman: {basvuru.ogrenci.capDepartman || basvuru.capDepartman}</div> : null}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Desktop Grid Layout */}
                <div className="hidden lg:grid lg:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Ad Soyad:</span>
                    <p className="font-medium">{basvuru.ogrenci.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Öğrenci No:</span>
                    <p className="font-medium">{basvuru.ogrenci.studentId}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">E-posta:</span>
                    <p className="font-medium">{basvuru.ogrenci.email}</p>
                  </div>
                  {basvuru.ogrenci.tcKimlik && (
                    <div>
                      <span className="text-gray-600">TC Kimlik:</span>
                      <p className="font-medium">{basvuru.ogrenci.tcKimlik}</p>
                    </div>
                  )}
                  {basvuru.ogrenci.faculty && (
                    <div>
                      <span className="text-gray-600">Fakülte:</span>
                      <p className="font-medium">{basvuru.ogrenci.faculty}</p>
                    </div>
                  )}
                  {basvuru.ogrenci.class && (
                    <div>
                      <span className="text-gray-600">Sınıf:</span>
                      <p className="font-medium">{basvuru.ogrenci.class}</p>
                    </div>
                  )}
                  {/* CAP info - desktop */}
                  {(basvuru.ogrenci.isCapOgrenci || basvuru.isCapBasvuru) && (basvuru.ogrenci.capFakulte || basvuru.ogrenci.capBolum || basvuru.ogrenci.capDepartman || basvuru.capFakulte || basvuru.capBolum || basvuru.capDepartman) && (
                    <div className="lg:col-span-2">
                      <span className="text-gray-600">CAP Bilgileri:</span>
                      <div className="font-medium text-amber-900">
                        {basvuru.ogrenci.capFakulte || basvuru.capFakulte ? <div>Fakülte: {basvuru.ogrenci.capFakulte || basvuru.capFakulte}</div> : null}
                        {basvuru.ogrenci.capBolum || basvuru.capBolum ? <div>Bölüm: {basvuru.ogrenci.capBolum || basvuru.capBolum}</div> : null}
                        {basvuru.ogrenci.capDepartman || basvuru.capDepartman ? <div>Departman: {basvuru.ogrenci.capDepartman || basvuru.capDepartman}</div> : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Application Details - Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    <span>Staj Bilgileri</span>
                  </h5>
                  
                  {/* Mobile Grid Layout */}
                  <div className="lg:hidden space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-l-4 border-l-green-500 shadow-sm">
                        <div className="text-xs text-green-700 font-bold mb-2 uppercase tracking-wide">🚀 Başlangıç</div>
                        <div className="text-sm text-green-900 font-bold">
                          {formatDate(basvuru.baslangicTarihi)}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-red-50 to-rose-50 p-4 rounded-xl border-l-4 border-l-red-500 shadow-sm">
                        <div className="text-xs text-red-700 font-bold mb-2 uppercase tracking-wide">🏁 Bitiş</div>
                        <div className="text-sm text-red-900 font-bold">
                          {formatDate(basvuru.bitisTarihi)}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gradient-to-br from-blue-50 to-sky-50 p-4 rounded-xl border-l-4 border-l-blue-500 shadow-sm">
                        <div className="text-xs text-blue-700 font-bold mb-2 uppercase tracking-wide">⏰ Süre</div>
                        <div className="text-sm text-blue-900 font-bold">
                          {basvuru.toplamGun ? `${basvuru.toplamGun} gün` : `${Math.ceil((new Date(basvuru.bitisTarihi).getTime() - new Date(basvuru.baslangicTarihi).getTime()) / (1000 * 60 * 60 * 24))} gün`}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-xl border-l-4 border-l-purple-500 shadow-sm">
                        <div className="text-xs text-purple-700 font-bold mb-2 uppercase tracking-wide">📅 Başvuru</div>
                        <div className="text-sm text-purple-900 font-bold">
                          {formatDate(basvuru.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden lg:block space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Başlangıç Tarihi:</span>
                      <p className="font-medium">{formatDate(basvuru.baslangicTarihi)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Bitiş Tarihi:</span>
                      <p className="font-medium">{formatDate(basvuru.bitisTarihi)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Staj Süresi:</span>
                      <p className="font-medium">
                        {basvuru.toplamGun ? `${basvuru.toplamGun} gün` : `${Math.ceil((new Date(basvuru.bitisTarihi).getTime() - new Date(basvuru.baslangicTarihi).getTime()) / (1000 * 60 * 60 * 24))} gün`}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Başvuru Tarihi:</span>
                      <p className="font-medium">{formatDate(basvuru.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* CAP Information */}
                {basvuru.isCapBasvuru && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                    <h5 className="font-medium text-amber-800 mb-3 flex items-center gap-2">
                      <span className="text-lg">🎓</span>
                      <span>CAP (Çift Anadal) Bilgileri</span>
                    </h5>
                    <div className="space-y-2 text-sm">
                      {basvuru.capFakulte && (
                        <div>
                          <span className="text-amber-700 font-medium">CAP-YAP Fakülte:</span>
                          <p className="text-amber-900 font-semibold">{basvuru.capFakulte}</p>
                        </div>
                      )}
                      {basvuru.capBolum && (
                        <div>
                          <span className="text-amber-700 font-medium">CAP-YAP Bölüm:</span>
                          <p className="text-amber-900 font-semibold">{basvuru.capBolum}</p>
                        </div>
                      )}
                      {basvuru.capDepartman && (
                        <div>
                          <span className="text-amber-700 font-medium">CAP-YAP Departman:</span>
                          <p className="text-amber-900 font-semibold">{basvuru.capDepartman}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-3">Kurum Bilgileri</h5>
                  <div className="space-y-2 text-sm">
                    {basvuru.kurumAdresi && (
                      <div>
                        <span className="text-gray-600">Adres:</span>
                        <p className="font-medium">{basvuru.kurumAdresi}</p>
                      </div>
                    )}
                    {basvuru.yetkiliAdi && (
                      <div>
                        <span className="text-gray-600">Yetkili:</span>
                        <p className="font-medium">{basvuru.yetkiliAdi} {basvuru.yetkiliUnvani ? `(${basvuru.yetkiliUnvani})` : ''}</p>
                      </div>
                    )}
                    {basvuru.sorumluMail && (
                      <div>
                        <span className="text-gray-600">E-posta:</span>
                        <p className="font-medium">{basvuru.sorumluMail}</p>
                      </div>
                    )}
                    {basvuru.sorumluTelefon && (
                      <div>
                        <span className="text-gray-600">Telefon:</span>
                        <p className="font-medium">{basvuru.sorumluTelefon}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Approval/Rejection Status Details */}
            {(basvuru.danismanAciklama || basvuru.kariyerMerkeziAciklama || basvuru.sirketAciklama) && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Onay Süreç Detayları</h4>
                <div className="space-y-4">
                  {/* Danışman Durumu */}
                  {(basvuru.danismanOnayDurumu !== undefined && basvuru.danismanOnayDurumu !== 0) && (
                    <div className="border-l-4 border-l-blue-500 pl-4 bg-blue-50 p-3 rounded-r">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm">Danışman Onayı</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          basvuru.danismanOnayDurumu === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {basvuru.danismanOnayDurumu === 1 ? 'Onaylandı' : 'Reddedildi'}
                        </span>
                      </div>
                      {basvuru.danismanAciklama && (
                        <p className="text-sm text-gray-700">{basvuru.danismanAciklama}</p>
                      )}
                      {/* Note: Danisman info not directly available in başvuru model */}
                    </div>
                  )}

                  {/* Kariyer Merkezi Durumu */}
                  {(basvuru.kariyerMerkeziOnayDurumu !== undefined && basvuru.kariyerMerkeziOnayDurumu !== 0) && (
                    <div className="border-l-4 border-l-purple-500 pl-4 bg-purple-50 p-3 rounded-r">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm">Kariyer Merkezi Onayı</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          basvuru.kariyerMerkeziOnayDurumu === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {basvuru.kariyerMerkeziOnayDurumu === 1 ? 'Onaylandı' : 'Reddedildi'}
                        </span>
                      </div>
                      {basvuru.kariyerMerkeziAciklama && (
                        <p className="text-sm text-gray-700">{basvuru.kariyerMerkeziAciklama}</p>
                      )}
                    </div>
                  )}

                  {/* Şirket Durumu */}
                  {(basvuru.sirketOnayDurumu !== undefined && basvuru.sirketOnayDurumu !== 0) && (
                    <div className="border-l-4 border-l-orange-500 pl-4 bg-orange-50 p-3 rounded-r">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm">Şirket Onayı</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          basvuru.sirketOnayDurumu === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {basvuru.sirketOnayDurumu === 1 ? 'Onaylandı' : 'Reddedildi'}
                        </span>
                      </div>
                      {basvuru.sirketAciklama && (
                        <p className="text-sm text-gray-700">{basvuru.sirketAciklama}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Document Downloads */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h5 className="font-medium text-gray-900 mb-3">Başvuru Evrakları</h5>
              <div className="flex gap-3">
                <button
                  onClick={() => window.open(`/api/kariyer-merkezi/basvurular/${basvuru.id}/download/transkript`, '_blank')}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  📄 Transkript İndir
                </button>
                <button
                  onClick={() => window.open(`/api/kariyer-merkezi/basvurular/${basvuru.id}/download/sigorta`, '_blank')}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  🛡️ Sigorta Evrakı İndir
                </button>
                <button
                  onClick={() => window.open(`/api/kariyer-merkezi/basvurular/${basvuru.id}/download/hizmet`, '_blank')}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  📋 Hizmet Dökümü İndir
                </button>
              </div>
            </div>

            {/* Operation Logs */}
            {basvuru.logs && basvuru.logs.length > 0 && (
              <div className="border-t pt-6">
                <h4 className="font-medium text-gray-900 mb-4">İşlem Geçmişi</h4>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {basvuru.logs.map((log) => (
                    <div key={log.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{log.action}</p>
                        {log.aciklama && <p className="text-xs text-gray-600">{log.aciklama}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{formatDate(log.createdAt)}</p>
                        <p className="text-xs text-gray-400">{log.degisikligiYapan.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-red-500 text-lg">Başvuru detayları yüklenemedi.</p>
          </div>
        )}

        {/* Footer with Action Buttons */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {basvuru && `Başvuru ID: ${basvuru.id}`}
          </div>
          
          <div className="flex gap-3">
            {basvuru && basvuru.onayDurumu === "KARIYER_MERKEZI_ONAYI_BEKLIYOR" && onOnayla && onReddet && (
              <>
                <button
                  onClick={() => onReddet(basvuru.id, "Kariyer Merkezi tarafından reddedildi")}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Reddet
                </button>
                <button
                  onClick={() => onOnayla(basvuru.id, "Kariyer Merkezi tarafından onaylandı")}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Onayla
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default KariyerBasvuruDetayModal;
