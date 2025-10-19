import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface Basvuru {
  id: number;
  kurumAdi: string;
  stajTipi: string;
  baslangicTarihi: string;
  bitisTarihi: string;
  onayDurumu: string;
  createdAt: string;
  // CAP fields
  isCapBasvuru?: boolean;
  capFakulte?: string | null;
  capBolum?: string | null;
  capDepartman?: string | null;
}

interface OgrenciModalProps {
  isOpen: boolean;
  onClose: () => void;
  ogrenci: {
    id: number;
    name: string;
    email: string;
    studentId: string;
    faculty: string;
    department?: string;
    class: string;
    toplamBasvuru: number;
    sonBasvuruTarihi: string;
    // CAP fields for student
    isCapOgrenci?: boolean;
    capFakulte?: string | null;
    capBolum?: string | null;
    capDepartman?: string | null;
  } | null;
  basvurular: Basvuru[];
  isLoading?: boolean;
}

const OgrenciModal: React.FC<OgrenciModalProps> = ({ 
  isOpen, 
  onClose, 
  ogrenci, 
  basvurular, 
  isLoading = false 
}) => {
  const { t } = useTranslation();
  
  if (!isOpen || !ogrenci) return null;

  const getStatusColor = (durum: string) => {
    switch (durum) {
      case "ONAYLANDI":
        return "bg-accent-green-100 text-accent-green-800";
      case "HOCA_ONAYI_BEKLIYOR":
        return "bg-accent-yellow-100 text-accent-yellow-800";
      case "KARIYER_MERKEZI_ONAYI_BEKLIYOR":
        return "bg-accent-blue-100 text-accent-blue-800";
      case "SIRKET_ONAYI_BEKLIYOR":
        return "bg-accent-purple-100 text-accent-purple-800";
      case "REDDEDILDI":
        return "bg-accent-red-100 text-accent-red-800";
      case "IPTAL_EDILDI":
        return "bg-background-300 text-text-dark";
      default:
        return "bg-background-200 text-text-light";
    }
  };

  const getStatusText = (durum: string, t: (key: string) => string) => {
    switch (durum) {
      case "HOCA_ONAYI_BEKLIYOR":
        return t("statuses.waitingAdvisorApproval");
      case "KARIYER_MERKEZI_ONAYI_BEKLIYOR":
        return t("statuses.waitingCareerCenterApproval");
      case "SIRKET_ONAYI_BEKLIYOR":
        return t("statuses.waitingCompanyApproval");
      case "ONAYLANDI":
        return t("statuses.approved");
      case "REDDEDILDI":
        return t("statuses.rejected");
      case "IPTAL_EDILDI":
        return t("statuses.cancelled");
      default:
        return durum;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-3 sm:p-6 border-b border-background-200">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-text-dark flex items-center gap-2">
              <span className="text-xl sm:text-2xl">👤</span>
              <span className="break-words">{ogrenci.name}</span>
            </h2>
            <p className="text-text-light text-sm sm:text-base">{t("modals.ogrenciModal.title")}</p>
          </div>
          <button
            onClick={onClose}
            className="text-text-light hover:text-text-dark text-xl sm:text-2xl font-bold p-1"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(95vh-140px)] sm:max-h-[calc(90vh-140px)]">
          {/* Öğrenci Bilgileri */}
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div>
              <h3 className="font-semibold text-text-dark mb-2 flex items-center gap-2">
                <span>📋</span>
                <span>{t("modals.ogrenciModal.personalInfo")}</span>
              </h3>
              <div className="space-y-1 text-sm">
                <p className="bg-white p-2 rounded border">
                  <span className="text-text-light font-medium">{t("modals.ogrenciModal.email")}:</span>
                  <span className="ml-2 break-words">{ogrenci.email}</span>
                </p>
                <p className="bg-white p-2 rounded border">
                  <span className="text-text-light font-medium">{t("modals.ogrenciModal.studentNumber")}:</span>
                  <span className="ml-2">{ogrenci.studentId}</span>
                </p>
                <p className="bg-white p-2 rounded border">
                  <span className="text-text-light font-medium">{t("modals.ogrenciModal.faculty")}:</span>
                  <span className="ml-2 break-words">{ogrenci.faculty}</span>
                </p>
                <p className="bg-white p-2 rounded border">
                  <span className="text-text-light font-medium">Departman:</span>
                  <span className="ml-2 break-words">{ogrenci.department ?? "Belirtilmemiş"}</span>
                </p>
                {ogrenci.class && (
                  <p className="bg-white p-2 rounded border">
                    <span className="text-text-light font-medium">{t("modals.ogrenciModal.class")}:</span>
                    <span className="ml-2">{ogrenci.class}</span>
                  </p>
                )}
              </div>

              {/* CAP Bilgileri */}
              {ogrenci.isCapOgrenci && (ogrenci.capFakulte || ogrenci.capBolum || ogrenci.capDepartman) && (
                <div className="mt-3 p-2 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
                  <h4 className="font-medium text-amber-800 mb-2 text-xs flex items-center gap-1">
                    <span>🎓</span>
                    <span>CAP (Çift Anadal)</span>
                  </h4>
                  <div className="space-y-1 text-xs">
                    {ogrenci.capFakulte && (
                      <p className="bg-white p-1.5 rounded border">
                        <span className="text-amber-700 font-medium">Fakülte:</span>
                        <span className="ml-1 text-amber-900">{ogrenci.capFakulte}</span>
                      </p>
                    )}
                    {ogrenci.capBolum && (
                      <p className="bg-white p-1.5 rounded border">
                        <span className="text-amber-700 font-medium">Bölüm:</span>
                        <span className="ml-1 text-amber-900">{ogrenci.capBolum}</span>
                      </p>
                    )}
                    {ogrenci.capDepartman && (
                      <p className="bg-white p-1.5 rounded border">
                        <span className="text-amber-700 font-medium">Departman:</span>
                        <span className="ml-1 text-amber-900">{ogrenci.capDepartman}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-text-dark mb-2 flex items-center gap-2">
                <span>📊</span>
                <span>{t("modals.ogrenciModal.statistics")}</span>
              </h3>
              <div className="space-y-2">
                <div className="bg-white p-3 rounded-lg border text-center">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">{ogrenci.toplamBasvuru}</div>
                  <div className="text-xs sm:text-sm text-text-light">{t("modals.ogrenciModal.totalApplications")}</div>
                </div>
                {ogrenci.sonBasvuruTarihi && (
                  <div className="bg-white p-2 rounded border text-sm">
                    <span className="text-text-light font-medium">{t("modals.ogrenciModal.lastApplication")}:</span>
                    <span className="ml-2">{new Date(ogrenci.sonBasvuruTarihi).toLocaleDateString("tr-TR")}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Başvurular */}
          <div>
            <h3 className="text-base sm:text-xl font-semibold text-text-dark mb-4 flex items-center gap-2">
              <span className="text-lg sm:text-xl">📋</span>
              <span>{t("modals.ogrenciModal.applications")} ({basvurular.length})</span>
            </h3>
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : basvurular.length === 0 ? (
              <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                <div className="text-gray-400 mb-4">
                  <div className="text-3xl sm:text-4xl mb-2">📋</div>
                </div>
                <p className="text-text-light text-sm sm:text-base">{t("modals.ogrenciModal.noApplicationsFound")}</p>
              </div>
            ) : (
              <>
                {/* Desktop View - Hidden on mobile */}
                <div className="hidden md:block space-y-4">
                  {basvurular.map((basvuru) => (
                    <div
                      key={basvuru.id}
                      className="border border-background-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg text-text-dark mb-1">
                            {basvuru.kurumAdi}
                          </h4>
                          <p className="text-text-light mb-2">
                            {basvuru.stajTipi}
                            {basvuru.isCapBasvuru && (
                              <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                                🎓 CAP
                              </span>
                            )}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(basvuru.onayDurumu)}`}>
                          {getStatusText(basvuru.onayDurumu, t)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="bg-gray-50 p-2 rounded">
                          <span className="text-text-light block font-medium">{t("modals.ogrenciModal.startDate")}:</span>
                          <span className="font-semibold">{new Date(basvuru.baslangicTarihi).toLocaleDateString("tr-TR")}</span>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <span className="text-text-light block font-medium">{t("modals.ogrenciModal.endDate")}:</span>
                          <span className="font-semibold">{new Date(basvuru.bitisTarihi).toLocaleDateString("tr-TR")}</span>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <span className="text-text-light block font-medium">{t("modals.ogrenciModal.applicationDate")}:</span>
                          <span className="font-semibold">{new Date(basvuru.createdAt).toLocaleDateString("tr-TR")}</span>
                        </div>
                      </div>

                      {/* CAP Information */}
                      {basvuru.isCapBasvuru && (
                        <div className="mt-3 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                          <h6 className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-1">
                            <span>🎓</span>
                            <span>CAP (Çift Anadal) Bilgileri</span>
                          </h6>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                            {basvuru.capFakulte && (
                              <div>
                                <span className="text-amber-700 font-medium">Fakülte:</span>
                                <p className="text-amber-900">{basvuru.capFakulte}</p>
                              </div>
                            )}
                            {basvuru.capBolum && (
                              <div>
                                <span className="text-amber-700 font-medium">Bölüm:</span>
                                <p className="text-amber-900">{basvuru.capBolum}</p>
                              </div>
                            )}
                            {basvuru.capDepartman && (
                              <div>
                                <span className="text-amber-700 font-medium">Departman:</span>
                                <p className="text-amber-900">{basvuru.capDepartman}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Mobile Grid View - Visible on mobile/tablet */}
                <div className="md:hidden grid grid-cols-1 gap-3">
                  {basvurular.map((basvuru) => (
                    <div
                      key={basvuru.id}
                      className="bg-gradient-to-br from-white to-gray-50 border border-background-200 rounded-xl p-3 hover:shadow-lg transition-all duration-200"
                    >
                      {/* Header */}
                      <div className="mb-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-text-dark break-words line-clamp-2">
                              🏢 {basvuru.kurumAdi}
                            </h4>
                          </div>
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(basvuru.onayDurumu)}`}>
                            {getStatusText(basvuru.onayDurumu, t)}
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-2">
                            <p className="text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded-md inline-block">
                              📋 {basvuru.stajTipi}
                            </p>
                            {basvuru.isCapBasvuru && (
                              <span className="text-xs px-2 py-1 font-medium rounded-md bg-amber-100 text-amber-800">
                                🎓 CAP
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="space-y-2">
                        <div className="bg-green-50 p-2 rounded-lg">
                          <div className="text-xs text-green-700 font-medium mb-1">🗓️ Başlangıç</div>
                          <div className="text-xs text-green-900 font-semibold">
                            {new Date(basvuru.baslangicTarihi).toLocaleDateString("tr-TR")}
                          </div>
                        </div>
                        <div className="bg-red-50 p-2 rounded-lg">
                          <div className="text-xs text-red-700 font-medium mb-1">🏁 Bitiş</div>
                          <div className="text-xs text-red-900 font-semibold">
                            {new Date(basvuru.bitisTarihi).toLocaleDateString("tr-TR")}
                          </div>
                        </div>
                        <div className="bg-blue-50 p-2 rounded-lg">
                          <div className="text-xs text-blue-700 font-medium mb-1">📅 Başvuru Tarihi</div>
                          <div className="text-xs text-blue-900 font-semibold">
                            {new Date(basvuru.createdAt).toLocaleDateString("tr-TR")}
                          </div>
                        </div>
                      </div>

                      {/* CAP Information - Mobile */}
                      {basvuru.isCapBasvuru && (
                        <div className="mt-3 bg-amber-50 border border-amber-200 p-2 rounded-lg">
                          <div className="text-xs font-medium text-amber-800 mb-2 flex items-center gap-1">
                            <span>🎓</span>
                            <span>CAP (Çift Anadal) Bilgileri</span>
                          </div>
                          <div className="space-y-1 text-xs">
                            {basvuru.capFakulte && (
                              <div className="bg-amber-100 p-1 rounded">
                                <span className="text-amber-700 font-medium">Fakülte:</span>
                                <span className="text-amber-900 ml-1">{basvuru.capFakulte}</span>
                              </div>
                            )}
                            {basvuru.capBolum && (
                              <div className="bg-amber-100 p-1 rounded">
                                <span className="text-amber-700 font-medium">Bölüm:</span>
                                <span className="text-amber-900 ml-1">{basvuru.capBolum}</span>
                              </div>
                            )}
                            {basvuru.capDepartman && (
                              <div className="bg-amber-100 p-1 rounded">
                                <span className="text-amber-700 font-medium">Departman:</span>
                                <span className="text-amber-900 ml-1">{basvuru.capDepartman}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OgrenciModal;