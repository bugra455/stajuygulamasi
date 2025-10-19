import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api";
import { useTranslation } from "../../hooks/useTranslation";

interface BasvuruDetay {
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
  };
  danisman?: {
    id: number;
    name: string;
    email: string;
  };
  defter?: {
    id: number;
    defterDurumu: string;
    originalFileName?: string;
    uploadDate?: string;
    fileSize?: number;
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
  ogrenciBasvurular?: Array<{
    id: number;
    kurumAdi: string;
    stajTipi: string;
    baslangicTarihi: string;
    bitisTarihi: string;
    onayDurumu: string;
    createdAt: string;
  }>;
}

interface BasvuruDetayModalProps {
  isOpen: boolean;
  onClose: () => void;
  basvuruId: number | null;
  onOnayla?: (id: number, aciklama?: string) => void;
  onReddet?: (id: number, sebep: string) => void;
  isProcessing?: boolean;
  userType?: "DANISMAN" | "KARIYER_MERKEZI"; // Hangi API kullanılacağını belirler
}

const BasvuruDetayModal: React.FC<BasvuruDetayModalProps> = ({
  isOpen,
  onClose,
  basvuruId,
  onOnayla,
  onReddet,
  isProcessing = false,
  userType = "DANISMAN",
}) => {
  const { t } = useTranslation();
  const [basvuru, setBasvuru] = useState<BasvuruDetay | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"basvuru" | "ogrenci" | "gecmis">(
    "basvuru",
  );
  const [isOnayModalOpen, setIsOnayModalOpen] = useState(false);
  const [isRedModalOpen, setIsRedModalOpen] = useState(false);
  const [onayAciklama, setOnayAciklama] = useState("");
  const [redSebebi, setRedSebebi] = useState("");

  const fetchBasvuruDetay = useCallback(async () => {
    if (!basvuruId) return;

    setLoading(true);
    setError(null);
    try {
      // User type'a göre uygun API endpoint'ini kullan
      const basvuruResponse =
        userType === "KARIYER_MERKEZI"
          ? await api.getKariyerBasvuru(basvuruId)
          : await api.getDanismanBasvuru(basvuruId);

      const basvuruData = basvuruResponse.data || basvuruResponse;

      // If backend provided ogrenciDetaylari (CAP preferred fields), use it to populate ogrenci
      let normalizedOgrenci = basvuruData.ogrenci;
      if (basvuruData.ogrenciDetaylari) {
        normalizedOgrenci = {
          id: basvuruData.ogrenciDetaylari.id,
          name: basvuruData.ogrenciDetaylari.name,
          email: basvuruData.ogrenciDetaylari.email,
          studentId: basvuruData.ogrenciDetaylari.studentId || basvuruData.ogrenci.studentId,
          faculty: basvuruData.ogrenciDetaylari.faculty || basvuruData.ogrenci.faculty,
          class: basvuruData.ogrenciDetaylari.class || basvuruData.ogrenci.class,
          tcKimlik: basvuruData.ogrenciDetaylari.tcKimlik || basvuruData.ogrenci.tcKimlik
        };
      }

      const ogrenciBasvurularResponse =
        userType === "KARIYER_MERKEZI"
          ? await api.getKariyerOgrenciTumBasvurulari(basvuruData.ogrenci.id)
          : await api.getOgrenciTumBasvurulari(basvuruData.ogrenci.id);

      const ogrenciBasvurular =
        ogrenciBasvurularResponse.data?.basvurular ||
        ogrenciBasvurularResponse.data ||
        [];

      setBasvuru({
        ...basvuruData,
        ogrenci: normalizedOgrenci,
        ogrenciBasvurular,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : t("modals.basvuruDetay.applicationLoadError");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [basvuruId, userType, t]);

  useEffect(() => {
    if (isOpen && basvuruId) {
      fetchBasvuruDetay();
    }
  }, [isOpen, basvuruId, fetchBasvuruDetay]);

  const getStatusColor = (durum: string) => {
    switch (durum) {
      case "ONAYLANDI":
        return "bg-green-100 text-green-800";
      case "HOCA_ONAYI_BEKLIYOR":
        return "bg-yellow-100 text-yellow-800";
      case "KARIYER_MERKEZI_ONAYI_BEKLIYOR":
        return "bg-blue-100 text-blue-800";
      case "SIRKET_ONAYI_BEKLIYOR":
        return "bg-purple-100 text-purple-800";
      case "REDDEDILDI":
        return "bg-red-100 text-red-800";
      case "IPTAL_EDILDI":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (durum: string) => {
    switch (durum) {
      case "HOCA_ONAYI_BEKLIYOR":
        return t("modals.basvuruDetay.advisorApprovalWaiting");
      case "KARIYER_MERKEZI_ONAYI_BEKLIYOR":
        return t ("modals.basvuruDetay.careerCenterApprovalWaiting");
      case "SIRKET_ONAYI_BEKLIYOR":
        return t ("modals.basvuruDetay.companyApprovalWaiting");
      case "ONAYLANDI":
        return t ("modals.basvuruDetay.approved");
      case "REDDEDILDI":
        return t ("modals.basvuruDetay.rejected");
      case "IPTAL_EDILDI":
        return t ("modals.basvuruDetay.cancelled");
      default:
        return durum;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR");
  };

  // Toplam gün sayısını hesaplayan fonksiyon (tüm günler dahil - formun seçtiği günlere göre)
  const calculateTotalDays = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Milisaniye farkını gün sayısına çevir ve +1 ekle (başlangıç günü dahil)
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return totalDays;
  };

  const handleOnayla = () => {
    if (onOnayla && basvuru) {
      onOnayla(basvuru.id, onayAciklama || t("modals.basvuruDetay.advisorApprovalNote"));
      setIsOnayModalOpen(false);
      setOnayAciklama("");
      onClose();
    }
  };

  const handleReddet = () => {
    if (onReddet && basvuru && redSebebi.trim()) {
      onReddet(basvuru.id, redSebebi);
      setIsRedModalOpen(false);
      setRedSebebi("");
      onClose();
    }
  };

  // Evrak indirme işlemleri
  const handleDownload = async (type: "transcript" | "sigorta" | "hizmet") => {
    if (!basvuru) return;
    try {
      let blob;
      let filename = "";

      if (type === "transcript") {
        filename = "transkript.pdf";
        if (userType === "KARIYER_MERKEZI") {
          blob = await api.getFile(
            `/kariyer-merkezi/basvurular/${basvuru.id}/download/transkript`,
          );
        } else {
          blob = await api.getFile(
            `/danisman/basvurular/${basvuru.id}/download-transcript`,
          );
        }
      } else if (type === "sigorta") {
        filename = "sigorta.pdf";
        if (userType === "KARIYER_MERKEZI") {
          blob = await api.getFile(
            `/kariyer-merkezi/basvurular/${basvuru.id}/download/sigorta`,
          );
        } else {
          blob = await api.getFile(
            `/danisman/basvurular/${basvuru.id}/download-sigorta`,
          );
        }
      } else if (type === "hizmet") {
        filename = "hizmet_dokumu.pdf";
        if (userType === "KARIYER_MERKEZI") {
          blob = await api.getFile(
            `/kariyer-merkezi/basvurular/${basvuru.id}/download/hizmet`,
          );
        } else {
          blob = await api.getFile(
            `/danisman/basvurular/${basvuru.id}/download-hizmet`,
          );
        }
      } 

      if (!blob) return;

      // Dosyayı indir
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : t("modals.basvuruDetay.fileDownloadError");
      alert(errorMessage);
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
          <p className="mt-4 text-gray-600 text-center">
            {t("modals.basvuruDetay.loadingApplicationDetails")} 
          </p>
        </div>
      </div>
    );
  }

  if (!basvuru && !loading && error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="mb-4">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-2xl">⚠️</span>
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t("common.error")}</h3>
            <p className="text-red-600 text-center mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setError(null);
                  fetchBasvuruDetay();
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                {t("common.retry")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!basvuru) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <p className="text-red-600 text-center">
            {t("modals.basvuruDetay.applicationLoadError")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-t-xl sm:rounded-lg shadow-lg w-full sm:max-w-6xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 sm:p-6 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 break-words">
              {basvuru.kurumAdi}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 break-words">
              {t("modals.basvuruDetay.title")}

            </p>
            {basvuru?.isCapBasvuru && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">ÇAP-YAP Başvurusu</span>
            )}
            <span className="sm:hidden text-xs opacity-75">Öğrenci Bilgileri</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl sm:text-2xl font-bold self-end sm:self-auto p-1"
          >
            ✕
          </button>
        </div>

        {/* Tabs - Responsive with improved mobile/desktop design */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <nav className="flex px-2 sm:px-6 overflow-x-auto">
            {[
              { key: "basvuru", label: t("modals.basvuruDetay.tabs.applicationDetails"), icon: "📋", shortLabel: "Başvuru" },
              { key: "ogrenci", label: t("modals.basvuruDetay.tabs.studentInfo"), icon: "👤", shortLabel: "Öğrenci" },
              { key: "gecmis", label: t("modals.basvuruDetay.tabs.applicationHistory"), icon: "📜", shortLabel: "Geçmiş" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() =>
                  setActiveTab(tab.key as "basvuru" | "ogrenci" | "gecmis")
                }
                className={`py-3 px-2 sm:px-4 mx-1 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center gap-1 sm:gap-2 rounded-t-lg transition-all duration-200 min-w-0 flex-1 sm:flex-none ${
                  activeTab === tab.key
                    ? "bg-white text-blue-600 border-b-2 border-blue-500 shadow-sm"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-100 border-b-2 border-transparent"
                }`}
              >
                <span className="text-base sm:text-lg">{tab.icon}</span>
                <span className="hidden sm:inline truncate">{tab.label}</span>
                <span className="sm:hidden text-xs font-semibold truncate">{tab.shortLabel}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {/* Modal Content with Enhanced Layout */}
        <div className="flex flex-col max-h-[calc(95vh-180px)]">
          <div className="p-3 sm:p-6 overflow-y-auto flex-1">
            {activeTab === "basvuru" && (
            <div className="space-y-3 sm:space-y-6">
              {/* Application Status */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">
                    {t("modals.basvuruDetay.applicationStatus")}
                  </h3>
                  <span
                    className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium self-start ${getStatusColor(basvuru.onayDurumu)}`}
                  >
                    {getStatusText(basvuru.onayDurumu)}
                  </span>
                </div>
                {/* Evrak indirme butonları */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mt-3">
                  <button
                    onClick={() => handleDownload("transcript")}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-xs sm:text-sm disabled:opacity-50 transition-colors"
                    disabled={!basvuru}
                  >
                    <span>📄</span>
                    <span className="hidden sm:inline">{t("modals.basvuruDetay.downloadTranscript")}</span>
                    <span className="sm:hidden">Transkript</span>
                  </button>
                  <button
                    onClick={() => handleDownload("sigorta")}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-xs sm:text-sm disabled:opacity-50 transition-colors"
                    disabled={!basvuru}
                  >
                    <span>🛡️</span>
                    <span className="hidden sm:inline">{t("modals.basvuruDetay.downloadInsurance")}</span>
                    <span className="sm:hidden">Sigorta</span>
                  </button>
                  <button
                    onClick={() => handleDownload("hizmet")}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-xs sm:text-sm disabled:opacity-50 transition-colors"
                    disabled={!basvuru}
                  >
                    <span>📋</span>
                    <span className="hidden sm:inline">{t("modals.basvuruDetay.downloadService")}</span>
                    <span className="sm:hidden">Hizmet</span>
                  </button>
                </div>
              </div>

              {/* Application Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                <div className="space-y-3 sm:space-y-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <label className="block text-xs sm:text-sm font-medium text-blue-700 mb-1">
                      🏢 {t("modals.basvuruDetay.companyName")}
                    </label>
                    <p className="text-sm sm:text-lg font-semibold text-blue-900 break-words">
                      {basvuru.kurumAdi}
                    </p>
                  </div>

                  <div className="bg-purple-50 p-3 rounded-lg">
                    <label className="block text-xs sm:text-sm font-medium text-purple-700 mb-1">
                      📋 {t("modals.basvuruDetay.internshipType")}
                    </label>
                    <p className="text-xs sm:text-sm text-purple-900 break-words">
                      {basvuru.stajTipi}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      📅 {t("modals.basvuruDetay.applicationDate")}
                    </label>
                    <p className="text-xs sm:text-sm text-gray-900">
                      {formatDate(basvuru.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <label className="block text-xs sm:text-sm font-medium text-green-700 mb-1">
                      🚀 {t("modals.basvuruDetay.startDate")}
                    </label>
                    <p className="text-xs sm:text-sm text-green-900 font-semibold">
                      {formatDate(basvuru.baslangicTarihi)}
                    </p>
                  </div>

                  <div className="bg-red-50 p-3 rounded-lg">
                    <label className="block text-xs sm:text-sm font-medium text-red-700 mb-1">
                      🏁 {t("modals.basvuruDetay.endDate")}
                    </label>
                    <p className="text-xs sm:text-sm text-red-900 font-semibold">
                      {formatDate(basvuru.bitisTarihi)}
                    </p>
                  </div>

                  <div className="bg-amber-50 p-3 rounded-lg">
                    <label className="block text-xs sm:text-sm font-medium text-amber-700 mb-1">
                      ⏰ {t("modals.basvuruDetay.internshipDuration")}
                    </label>
                    <div className="text-xs sm:text-sm text-amber-900">
                      <div className="font-semibold">
                        {t("modals.basvuruDetay.total")}{" "}
                        {basvuru.toplamGun || calculateTotalDays(
                          basvuru.baslangicTarihi,
                          basvuru.bitisTarihi,
                        )}{" "}
                        {t("modals.basvuruDetay.days")}
                      </div>
                      <div className="text-xs text-amber-700 mt-1">
                        {t("modals.basvuruDetay.selectedDateRange")}:{" "}
                        {formatDate(basvuru.baslangicTarihi)} - {formatDate(basvuru.bitisTarihi)}
                      </div>
                    </div>
                  </div>

                  {/* CAP Information */}
                  {basvuru.isCapBasvuru && (
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                      <label className="block text-xs sm:text-sm font-medium text-blue-700 mb-2">
                        🎓 CAP-YAP Bilgileri
                      </label>
                      <div className="space-y-2">
                        {basvuru.capFakulte && (
                          <div>
                            <span className="text-xs text-blue-600 font-medium">CAP-YAP Fakülte:</span>
                            <p className="text-xs sm:text-sm text-blue-900 font-semibold">{basvuru.capFakulte}</p>
                          </div>
                        )}
                        {basvuru.capBolum && (
                          <div>
                            <span className="text-xs text-blue-600 font-medium">CAP-YAP Bölüm:</span>
                            <p className="text-xs sm:text-sm text-blue-900 font-semibold">{basvuru.capBolum}</p>
                          </div>
                        )}
                        {basvuru.capDepartman && (
                          <div>
                            <span className="text-xs text-blue-600 font-medium">CAP-YAP Departman:</span>
                            <p className="text-xs sm:text-sm text-blue-900 font-semibold">{basvuru.capDepartman}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Approval/Rejection Status Details */}
              {(basvuru.onayDurumu === "REDDEDILDI" ||
                basvuru.danismanAciklama ||
                basvuru.kariyerMerkeziAciklama ||
                basvuru.sirketAciklama) && (
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-lg p-3 sm:p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                    <span className="text-lg">⚖️</span>
                    <span className="text-sm sm:text-base">{t("modals.basvuruDetay.approvalRejectionStatus")}</span>
                  </h4>
                  <div className="space-y-3 sm:space-y-4">
                    {/* Danışman Durumu */}
                    {basvuru.danismanOnayDurumu !== undefined &&
                      basvuru.danismanOnayDurumu !== 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                            <span className="font-medium text-xs sm:text-sm text-blue-700 flex items-center gap-1">
                              <span>👨‍🏫</span>
                              {t("modals.basvuruDetay.advisor")}
                            </span>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full self-start ${
                                basvuru.danismanOnayDurumu === 1
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {basvuru.danismanOnayDurumu === 1
                                ? t("statuses.approved")
                                : t("statuses.rejected")}
                            </span>
                          </div>
                          {basvuru.danismanAciklama && (
                            <p className="text-xs sm:text-sm text-blue-900 bg-blue-100 p-2 rounded break-words">
                              {basvuru.danismanAciklama}
                            </p>
                          )}
                        </div>
                      )}

                    {/* Kariyer Merkezi Durumu */}
                    {basvuru.kariyerMerkeziOnayDurumu !== undefined &&
                      basvuru.kariyerMerkeziOnayDurumu !== 0 && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                            <span className="font-medium text-xs sm:text-sm text-purple-700 flex items-center gap-1">
                              <span>🏢</span>
                              {t("modals.basvuruDetay.careerCenter")}
                            </span>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full self-start ${
                                basvuru.kariyerMerkeziOnayDurumu === 1
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {basvuru.kariyerMerkeziOnayDurumu === 1
                                ? t("statuses.approved")
                                : t("statuses.rejected")}
                            </span>
                          </div>
                          {basvuru.kariyerMerkeziAciklama && (
                            <p className="text-xs sm:text-sm text-purple-900 bg-purple-100 p-2 rounded break-words">
                              {basvuru.kariyerMerkeziAciklama}
                            </p>
                          )}
                        </div>
                      )}

                    {/* Şirket Durumu */}
                    {basvuru.sirketOnayDurumu !== undefined &&
                      basvuru.sirketOnayDurumu !== 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                            <span className="font-medium text-xs sm:text-sm text-orange-700 flex items-center gap-1">
                              <span>🏭</span>
                              {t("modals.basvuruDetay.company")}
                            </span>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full self-start ${
                                basvuru.sirketOnayDurumu === 1
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {basvuru.sirketOnayDurumu === 1
                                ? t("statuses.approved")
                                : t("statuses.rejected")}
                            </span>
                          </div>
                          {basvuru.sirketAciklama && (
                            <p className="text-xs sm:text-sm text-orange-900 bg-orange-100 p-2 rounded break-words">
                              {basvuru.sirketAciklama}
                            </p>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Internship Diary */}
              {basvuru.defter && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-3 sm:p-4">
                  <h4 className="font-semibold text-emerald-900 mb-3 sm:mb-4 flex items-center gap-2">
                    <span className="text-lg">📖</span>
                    <span className="text-sm sm:text-base">{t("modals.basvuruDetay.internshipDiary")}</span>
                  </h4>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="bg-emerald-100 p-2 sm:p-3 rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <span className="text-xs sm:text-sm font-medium text-emerald-700 flex items-center gap-1">
                          <span>📊</span>
                          {t("modals.basvuruDetay.status")}:
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full self-start ${getStatusColor(basvuru.defter.defterDurumu)}`}
                        >
                          {basvuru.defter.defterDurumu}
                        </span>
                      </div>
                    </div>
                    {basvuru.defter.originalFileName && (
                      <div className="bg-emerald-100 p-2 sm:p-3 rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                          <span className="text-xs sm:text-sm font-medium text-emerald-700 flex items-center gap-1">
                            <span>📄</span>
                            {t("modals.basvuruDetay.file")}:
                          </span>
                          <span className="text-xs sm:text-sm text-emerald-900 font-medium break-all">
                            {basvuru.defter.originalFileName}
                          </span>
                        </div>
                      </div>
                    )}
                    {basvuru.defter.uploadDate && (
                      <div className="bg-emerald-100 p-2 sm:p-3 rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                          <span className="text-xs sm:text-sm font-medium text-emerald-700 flex items-center gap-1">
                            <span>📅</span>
                            {t("modals.basvuruDetay.uploadDate")}:
                          </span>
                          <span className="text-xs sm:text-sm text-emerald-900 font-medium">
                            {formatDate(basvuru.defter.uploadDate)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Şirket/Kurum Detayları */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-3 sm:p-4">
                <h4 className="font-semibold text-indigo-900 mb-3 sm:mb-4 flex items-center gap-2">
                  <span className="text-lg">🏢</span>
                  <span className="text-sm sm:text-base">{t("modals.basvuruDetay.companyInstitutionDetails")}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-3">
                    <div className="bg-indigo-100 p-3 rounded-lg">
                      <span className="text-xs sm:text-sm font-medium text-indigo-700 mb-1 flex items-center gap-1">
                        <span>🏭</span>
                        {t("modals.basvuruDetay.institutionName")}
                      </span>
                      <p className="text-xs sm:text-sm text-indigo-900 font-semibold break-words">
                        {basvuru.kurumAdi}
                      </p>
                    </div>
                    <div className="bg-indigo-100 p-3 rounded-lg">
                      <span className="text-xs sm:text-sm font-medium text-indigo-700 mb-1 flex items-center gap-1">
                        <span>📍</span>
                        {t("modals.basvuruDetay.institutionAddress")}:
                      </span>
                      <p className="text-xs sm:text-sm text-indigo-900 break-words">
                        {(basvuru as BasvuruDetay & { kurumAdresi?: string })
                          .kurumAdresi || t("modals.basvuruDetay.notSpecified")}
                      </p>
                    </div>
                    <div className="bg-indigo-100 p-3 rounded-lg">
                      <span className="text-xs sm:text-sm font-medium text-indigo-700 mb-1 flex items-center gap-1">
                        <span>📞</span>
                        {t("modals.basvuruDetay.responsiblePersonPhone")}:
                      </span>
                      <p className="text-xs sm:text-sm text-indigo-900 break-words">
                        {(basvuru as BasvuruDetay & { sorumluTelefon?: string })
                          .sorumluTelefon || t("modals.basvuruDetay.notSpecified")}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-purple-100 p-3 rounded-lg">
                      <span className="text-xs sm:text-sm font-medium text-purple-700 mb-1 flex items-center gap-1">
                        <span>📧</span>
                        {t("modals.basvuruDetay.responsiblePersonEmail")}:
                      </span>
                      <p className="text-xs sm:text-sm text-purple-900 break-all">
                        {(basvuru as BasvuruDetay & { sorumluMail?: string })
                          .sorumluMail || t("modals.basvuruDetay.notSpecified")}
                      </p>
                    </div>
                    <div className="bg-purple-100 p-3 rounded-lg">
                      <span className="text-xs sm:text-sm font-medium text-purple-700 mb-1 flex items-center gap-1">
                        <span>👤</span>
                        {t("modals.basvuruDetay.authorizedPersonName")}:
                      </span>
                      <p className="text-xs sm:text-sm text-purple-900 break-words">
                        {(basvuru as BasvuruDetay & { yetkiliAdi?: string })
                          .yetkiliAdi || t("modals.basvuruDetay.notSpecified")}
                      </p>
                    </div>
                    <div className="bg-purple-100 p-3 rounded-lg">
                      <span className="text-xs sm:text-sm font-medium text-purple-700 mb-1 flex items-center gap-1">
                        <span>🎯</span>
                        {t("modals.basvuruDetay.authorizedPersonTitle")}:
                      </span>
                      <p className="text-xs sm:text-sm text-purple-900 break-words">
                        {(basvuru as BasvuruDetay & { yetkiliUnvani?: string })
                          .yetkiliUnvani || t("modals.basvuruDetay.notSpecified")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Ek Bilgiler */}
                {((
                  basvuru as BasvuruDetay & {
                    yurtDisi?: string;
                    turkFirmasi?: string;
                  }
                ).yurtDisi ||
                  (
                    basvuru as BasvuruDetay & {
                      yurtDisi?: string;
                      turkFirmasi?: string;
                    }
                  ).turkFirmasi) && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(basvuru as BasvuruDetay & { yurtDisi?: string })
                        .yurtDisi && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">
                            {t("modals.basvuruDetay.location")}:
                          </span>
                          <p className="text-sm text-gray-900 mt-1">
                            {(basvuru as BasvuruDetay & { yurtDisi?: string })
                              .yurtDisi === "yurtdışı"
                              ? t("modals.basvuruDetay.abroad")
                              : t("modals.basvuruDetay.domestic")}
                          </p>
                        </div>
                      )}
                      {(basvuru as BasvuruDetay & { turkFirmasi?: string })
                        .turkFirmasi && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">
                            {t("modals.basvuruDetay.turkishCompany")}:
                          </span>
                          <p className="text-sm text-gray-900 mt-1">
                            {(
                              basvuru as BasvuruDetay & { turkFirmasi?: string }
                            ).turkFirmasi === "evet"
                              ? t("common.yes")
                              : t("common.no")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "ogrenci" && (
            <div className="space-y-4 sm:space-y-6">
              {/* Mobile Grid View - Hidden on desktop */}
              <div className="lg:hidden space-y-4">
                {/* Student Basic Info Card */}
                <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300">
                  <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-3">
                    <span className="text-2xl bg-blue-100 p-2 rounded-full">👤</span>
                    <span className="text-lg">Öğrenci Bilgileri</span>
                  </h4>
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl border-l-4 border-l-blue-500 shadow-sm">
                      <div className="text-xs text-blue-700 font-bold mb-2 uppercase tracking-wide">👤 Ad Soyad</div>
                      <div className="text-base text-blue-900 font-bold break-words">
                        {basvuru.ogrenci.name}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border-l-4 border-l-green-500 shadow-sm">
                      <div className="text-xs text-green-700 font-bold mb-2 uppercase tracking-wide">📧 E-posta</div>
                      <div className="text-sm text-green-900 font-semibold break-all">
                        {basvuru.ogrenci.email}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border-l-4 border-l-purple-500 shadow-sm">
                      <div className="text-xs text-purple-700 font-bold mb-2 uppercase tracking-wide">🆔 Öğrenci No</div>
                      <div className="text-sm text-purple-900 font-mono font-bold">
                        {basvuru.ogrenci.studentId}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Academic Info Card */}
                {(basvuru.ogrenci.faculty || basvuru.ogrenci.class || basvuru.ogrenci.tcKimlik) && (
                  <div className="bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 border-2 border-orange-200 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300">
                    <h4 className="font-bold text-orange-900 mb-4 flex items-center gap-3">
                      <span className="text-2xl bg-orange-100 p-2 rounded-full">🎓</span>
                      <span className="text-lg">Akademik Bilgiler</span>
                    </h4>
                    <div className="space-y-4">
                      {basvuru.ogrenci.faculty && (
                        <div className="bg-white p-4 rounded-xl border-l-4 border-l-orange-500 shadow-sm">
                          <div className="text-xs text-orange-700 font-bold mb-2 uppercase tracking-wide">🏛️ Fakülte</div>
                          <div className="text-sm text-orange-900 font-semibold break-words">
                            {basvuru.ogrenci.faculty}
                          </div>
                        </div>
                      )}
                      {basvuru.ogrenci.class && (
                        <div className="bg-white p-4 rounded-xl border-l-4 border-l-indigo-500 shadow-sm">
                          <div className="text-xs text-indigo-700 font-bold mb-2 uppercase tracking-wide">📚 Sınıf</div>
                          <div className="text-sm text-indigo-900 font-semibold">
                            {basvuru.ogrenci.class}
                          </div>
                        </div>
                      )}
                      {basvuru.ogrenci.tcKimlik && (
                        <div className="bg-white p-4 rounded-xl border-l-4 border-l-red-500 shadow-sm">
                          <div className="text-xs text-red-700 font-bold mb-2 uppercase tracking-wide">🆔 TC Kimlik</div>
                          <div className="text-sm text-red-900 font-mono font-bold">
                            {basvuru.ogrenci.tcKimlik}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Advisor Information Card */}
                {basvuru.danisman && (
                  <div className="bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50 border-2 border-teal-200 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300">
                    <h4 className="font-bold text-teal-900 mb-4 flex items-center gap-3">
                      <span className="text-2xl bg-teal-100 p-2 rounded-full">👨‍🏫</span>
                      <span className="text-lg">Danışman Bilgileri</span>
                    </h4>
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-xl border-l-4 border-l-teal-500 shadow-sm">
                        <div className="text-xs text-teal-700 font-bold mb-2 uppercase tracking-wide">👤 Ad Soyad</div>
                        <div className="text-base text-teal-900 font-bold break-words">
                          {basvuru.danisman.name}
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border-l-4 border-l-cyan-500 shadow-sm">
                        <div className="text-xs text-cyan-700 font-bold mb-2 uppercase tracking-wide">📧 E-posta</div>
                        <div className="text-sm text-cyan-900 font-semibold break-all">
                          {basvuru.danisman.email}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop Grid View - Hidden on mobile */}
              <div className="hidden lg:block">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                      <label className="text-xs sm:text-sm font-medium text-blue-700 mb-1 flex items-center gap-1">
                        <span>👤</span>
                        {t("modals.basvuruDetay.fullName")}
                      </label>
                      <p className="text-sm sm:text-lg font-semibold text-blue-900 break-words">
                        {basvuru.ogrenci.name}
                      </p>
                    </div>

                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                      <label className="text-xs sm:text-sm font-medium text-green-700 mb-1 flex items-center gap-1">
                        <span>📧</span>
                        {t("modals.basvuruDetay.email")}
                      </label>
                      <p className="text-xs sm:text-sm text-green-900 break-all">
                        {basvuru.ogrenci.email}
                      </p>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                      <label className="text-xs sm:text-sm font-medium text-purple-700 mb-1 flex items-center gap-1">
                        <span>🆔</span>
                        {t("modals.basvuruDetay.studentNumber")}
                      </label>
                      <p className="text-xs sm:text-sm text-purple-900 font-mono">
                        {basvuru.ogrenci.studentId}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    {basvuru.ogrenci.faculty && (
                      <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                        <label className="text-xs sm:text-sm font-medium text-orange-700 mb-1 flex items-center gap-1">
                          <span>🏛️</span>
                          {t("modals.basvuruDetay.faculty")}
                        </label>
                        <p className="text-xs sm:text-sm text-orange-900 break-words">
                          {basvuru.ogrenci.faculty}
                        </p>
                      </div>
                    )}

                    {basvuru.ogrenci.class && (
                      <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg">
                        <label className="text-xs sm:text-sm font-medium text-indigo-700 mb-1 flex items-center gap-1">
                          <span>📚</span>
                          {t("modals.basvuruDetay.class")}
                        </label>
                        <p className="text-xs sm:text-sm text-indigo-900">
                          {basvuru.ogrenci.class}
                        </p>
                      </div>
                    )}

                    {basvuru.ogrenci.tcKimlik && (
                      <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                        <label className="text-xs sm:text-sm font-medium text-red-700 mb-1 flex items-center gap-1">
                          <span>🆔</span>
                          {t("modals.basvuruDetay.tcIdentity")}
                        </label>
                        <p className="text-xs sm:text-sm text-red-900 font-mono">
                          {basvuru.ogrenci.tcKimlik}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Advisor Information - Desktop */}
                {basvuru.danisman && (
                  <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-lg p-3 sm:p-4 mt-6">
                    <h4 className="font-semibold text-teal-900 mb-3 sm:mb-4 flex items-center gap-2">
                      <span className="text-lg">👨‍🏫</span>
                      <span className="text-sm sm:text-base">{t("modals.basvuruDetay.advisorInformation")}</span>
                    </h4>
                    <div className="space-y-2 sm:space-y-3">
                      <div className="bg-teal-100 p-2 sm:p-3 rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                          <span className="text-xs sm:text-sm font-medium text-teal-700 flex items-center gap-1">
                            <span>👤</span>
                            {t("modals.basvuruDetay.authorizedPersonName")}:
                          </span>
                          <span className="text-xs sm:text-sm text-teal-900 font-semibold break-words">
                            {basvuru.danisman.name}
                          </span>
                        </div>
                      </div>
                      <div className="bg-teal-100 p-2 sm:p-3 rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                          <span className="text-xs sm:text-sm font-medium text-teal-700 flex items-center gap-1">
                            <span>📧</span>
                            {t("modals.basvuruDetay.responsiblePersonEmail")}:
                          </span>
                          <span className="text-xs sm:text-sm text-teal-900 break-all">
                            {basvuru.danisman.email}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "gecmis" && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📜</span>
                <h3 className="text-lg font-semibold text-gray-900">
                  {t("modals.basvuruDetay.studentAllApplications")} ({basvuru.ogrenciBasvurular?.length || 0})
                </h3>
              </div>

              {!basvuru.ogrenciBasvurular ||
              basvuru.ogrenciBasvurular.length === 0 ? (
                <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border">
                  <div className="text-gray-400 mb-4">
                    <div className="text-4xl sm:text-6xl mb-2">📝</div>
                  </div>
                  <p className="text-gray-500 text-base font-medium">Başka Başvuru Bulunamadı</p>
                  <p className="text-gray-400 text-sm mt-2">Bu öğrencinin başka staj başvurusu bulunmamaktadır.</p>
                </div>
              ) : (
                <>
                  {/* Mobile Grid View - Hidden on desktop */}
                  <div className="lg:hidden grid grid-cols-1 gap-4">
                    {basvuru.ogrenciBasvurular.map((app) => (
                      <div
                        key={app.id}
                        className={`rounded-2xl p-5 border-2 transition-all duration-300 hover:scale-102 ${
                          app.id === basvuru.id 
                            ? "border-blue-400 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 shadow-lg" 
                            : "border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:border-gray-300 hover:shadow-md"
                        }`}
                      >
                        {/* Header */}
                        <div className="mb-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h5 className="text-base font-bold text-gray-900 break-words line-clamp-2 mb-2">
                                🏢 {app.kurumAdi}
                                {app.id === basvuru.id && (
                                  <span className="ml-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                                    Mevcut Başvuru
                                  </span>
                                )}
                              </h5>
                              <div className="bg-white p-3 rounded-xl border-l-4 border-l-indigo-500 shadow-sm">
                                <div className="text-xs text-indigo-700 font-bold mb-1 uppercase tracking-wide">📋 Staj Tipi</div>
                                <div className="text-sm text-indigo-900 font-semibold">
                                  {app.stajTipi}
                                </div>
                              </div>
                            </div>
                            <span className={`ml-3 px-4 py-2 rounded-full text-xs font-bold shadow-md ${getStatusColor(app.onayDurumu)}`}>
                              {getStatusText(app.onayDurumu)}
                            </span>
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-xl border-l-4 border-l-green-500 shadow-sm">
                            <div className="text-xs text-green-700 font-bold mb-2 uppercase tracking-wide">🚀 Başlangıç</div>
                            <div className="text-xs text-green-900 font-bold">
                              {formatDate(app.baslangicTarihi)}
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-red-50 to-rose-50 p-3 rounded-xl border-l-4 border-l-red-500 shadow-sm">
                            <div className="text-xs text-red-700 font-bold mb-2 uppercase tracking-wide">🏁 Bitiş</div>
                            <div className="text-xs text-red-900 font-bold">
                              {formatDate(app.bitisTarihi)}
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-blue-50 to-sky-50 p-3 rounded-xl border-l-4 border-l-blue-500 shadow-sm">
                            <div className="text-xs text-blue-700 font-bold mb-2 uppercase tracking-wide">📅 Başvuru</div>
                            <div className="text-xs text-blue-900 font-bold">
                              {formatDate(app.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop List View - Hidden on mobile */}
                  <div className="hidden lg:block space-y-4">
                    {basvuru.ogrenciBasvurular.map((app) => (
                      <div
                        key={app.id}
                        className={`border rounded-lg p-4 ${app.id === basvuru.id ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h5 className="font-medium text-gray-900">
                              {app.kurumAdi}
                              {app.id === basvuru.id && (
                                <span className="ml-2 text-blue-600 text-sm">
                                  ({t("modals.basvuruDetay.currentApplication")})
                                </span>
                              )}
                            </h5>
                            <p className="text-sm text-gray-500">
                              {app.stajTipi}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(app.onayDurumu)}`}
                          >
                            {getStatusText(app.onayDurumu)}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">{t("modals.basvuruDetay.startDate")}:</span>
                            <p>{formatDate(app.baslangicTarihi)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">{t("modals.basvuruDetay.endDate")}:</span>
                            <p>{formatDate(app.bitisTarihi)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">{t("modals.basvuruDetay.applicationDate")}:</span>
                            <p>{formatDate(app.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Operation Logs */}
              {basvuru.logs && basvuru.logs.length > 0 && (
                <div className="border-t pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">📋</span>
                    <h4 className="font-medium text-gray-900">
                      {t("modals.basvuruDetay.operationHistory")}
                    </h4>
                  </div>
                  
                  {/* Mobile Logs View */}
                  <div className="lg:hidden space-y-4">
                    {basvuru.logs.map((log) => (
                      <div
                        key={log.id}
                        className="bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 border-2 border-slate-200 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <div className="mb-4">
                          <div className="bg-white p-4 rounded-xl border-l-4 border-l-blue-500 shadow-sm">
                            <div className="text-xs text-blue-700 font-bold mb-2 uppercase tracking-wide">🔄 İşlem</div>
                            <p className="text-base font-bold text-blue-900 break-words">
                              {log.action}
                            </p>
                          </div>
                          {log.aciklama && (
                            <div className="bg-white p-4 rounded-xl border-l-4 border-l-amber-500 shadow-sm mt-3">
                              <div className="text-xs text-amber-700 font-bold mb-2 uppercase tracking-wide">📝 Açıklama</div>
                              <p className="text-sm text-amber-900 leading-relaxed break-words">
                                {log.aciklama}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                          <div className="bg-teal-50 px-3 py-2 rounded-lg border-l-4 border-l-teal-500">
                            <div className="text-xs text-teal-700 font-bold uppercase tracking-wide">👤 Yapan</div>
                            <span className="text-sm text-teal-900 font-semibold">{log.degisikligiYapan.name}</span>
                          </div>
                          <div className="bg-purple-50 px-3 py-2 rounded-lg border-l-4 border-l-purple-500">
                            <div className="text-xs text-purple-700 font-bold uppercase tracking-wide">📅 Tarih</div>
                            <span className="text-sm text-purple-900 font-semibold">{formatDate(log.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Logs View */}
                  <div className="hidden lg:block space-y-3">
                    {basvuru.logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {log.action}
                          </p>
                          {log.aciklama && (
                            <p className="text-xs text-gray-600">
                              {log.aciklama}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {formatDate(log.createdAt)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {log.degisikligiYapan.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Enhanced Footer with Action Buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-white">
            <div className="text-xs sm:text-sm text-gray-600 flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
              <span className="text-lg">📋</span>
              <span className="font-semibold">{t("modals.basvuruDetay.applicationId")}: {basvuru.id}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {basvuru.onayDurumu === "HOCA_ONAYI_BEKLIYOR" &&
                onOnayla &&
                onReddet && (
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => setIsRedModalOpen(true)}
                      disabled={isProcessing}
                      className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                    >
                      <span className="text-lg">❌</span>
                      <span>{t("common.reject")}</span>
                    </button>
                    <button
                      onClick={() => setIsOnayModalOpen(true)}
                      disabled={isProcessing}
                      className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                    >
                      <span className="text-lg">✅</span>
                      <span>{t("common.approve")}</span>
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Onay Modal */}
        {isOnayModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">{t("modals.basvuruDetay.approveApplication")}</h3>
              <p className="text-gray-600 mb-4">
                {t("modals.basvuruDetay.approveApplicationConfirmation")}
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("modals.basvuruDetay.explanationOptional")}
                </label>
                <textarea
                  value={onayAciklama}
                  onChange={(e) => setOnayAciklama(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder={t("modals.basvuruDetay.approveApplicationConfirmation")}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setIsOnayModalOpen(false);
                    setOnayAciklama("");
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleOnayla}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  {t("common.approve")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Red Modal */}
        {isRedModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">{t("modals.basvuruDetay.rejectApplication")}</h3>
              <p className="text-gray-600 mb-4">
                {t("modals.basvuruDetay.rejectApplicationConfirmation")}
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("modals.basvuruDetay.rejectionReason")} *
                </label>
                <textarea
                  value={redSebebi}
                  onChange={(e) => setRedSebebi(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder={t("modals.basvuruDetay.rejectionReasonPlaceholder")}
                  required
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setIsRedModalOpen(false);
                    setRedSebebi("");
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleReddet}
                  disabled={!redSebebi.trim()}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("common.reject")}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default BasvuruDetayModal;
