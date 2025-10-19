import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import IptalModal from "../../components/modals/IptalModal";
import AppNotification from "../../components/common/AppNotification";
import { useTranslation } from "../../hooks/useTranslation";

// Dashboard'daki arayüzü burada da kullanalım
import { StajTipiEnum } from "../../types/staj.types";

interface StajBasvurusu {
  id: number;
  kurumAdi: string;
  kurumAdresi: string;
  yetkiliAdi: string;
  stajTipi: StajTipiEnum;
  baslangicTarihi: string;
  bitisTarihi: string;
  toplamGun: number;
  danismanMail: string;
  onayDurumu:
    | "HOCA_ONAYI_BEKLIYOR"
    | "KARIYER_MERKEZI_ONAYI_BEKLIYOR"
    | "SIRKET_ONAYI_BEKLIYOR"
    | "ONAYLANDI"
    | "REDDEDILDI"
    | "IPTAL_EDILDI";
  iptalSebebi?: string | null;
  // CAP başvuru bilgileri
  isCapBasvuru?: boolean;
  capFakulte?: string | null;
  capBolum?: string | null;
  capDepartman?: string | null;
  // Optional department provided by backend
  department?: string | null;
  logs?: Array<{
    id: number;
    action: string;
    detaylar?: string;
    createdAt: string;
    degisikligiYapan: {
      name: string;
    };
  }>;
}

interface MuafiyetBasvuru {
  id: number;
  ogrenciId: number;
  sgk4a: string;
  danismanMail: string;
  onayDurumu: string;
  danismanOnayDurumu: string | null;
  danismanAciklama: string | null;
  createdAt: string;
  updatedAt: string;
  type: 'MUAFIYET';
  // CAP bilgileri
  isCapBasvuru: boolean;
  capFakulte: string | null;
  capBolum: string | null;
  capDepartman: string | null;
}

// Modal Component
interface DetailModalProps {
  basvuru: StajBasvurusu | null;
  isOpen: boolean;
  onClose: () => void;
  freshUserData: {tcKimlik?: string, studentId?: string, name?: string, faculty?: string, class?: string, department?: string} | null;
  normalRecord: {faculty?: string, class?: string, department?: string} | null;
}

const DetailModal: React.FC<DetailModalProps> = ({
  basvuru,
  isOpen,
  onClose,
  normalRecord
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  if (!isOpen || !basvuru) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ONAYLANDI":
        return "text-accent-green-600";
      case "REDDEDILDI":
        return "text-primary-600";
      case "IPTAL_EDILDI":
        return "text-gray-600";
      default:
        return "text-accent-orange-600";
    }
  };

  // Helper to translate status enum
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ONAYLANDI":
        return t("pages.basvuruTakip.statuses.approved");
      case "REDDEDILDI":
        return t("pages.basvuruTakip.statuses.rejected");
      case "IPTAL_EDILDI":
        return t("pages.basvuruTakip.statuses.cancelled");
      case "HOCA_ONAYI_BEKLIYOR":
        return t("pages.basvuruTakip.statuses.advisorApproval");
      case "KARIYER_MERKEZI_ONAYI_BEKLIYOR":
        return t("pages.basvuruTakip.statuses.careerCenterApproval");
      case "SIRKET_ONAYI_BEKLIYOR":
        return t("pages.basvuruTakip.statuses.companyApproval");
      default:
        return t("status.unknown");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("tr-TR");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-md w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-accent-purple-25">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-cyan-900 truncate">
                {basvuru.kurumAdi}
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mt-1 flex items-center gap-2">
                <span className="text-lg">📋</span>
                {t(`internshipTypes.${basvuru.stajTipi}`) || basvuru.stajTipi}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Kapat"
              className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-5 bg-white">
          {/* Bölüm Bilgileri - styled to match other sections */}
          <div className="bg-accent-purple-25 p-4 sm:p-5 rounded-sm border border-gray-300 shadow-sm">
              <h3 className="text-lg sm:text-xl font-bold text-cyan-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">🎓</span>
              {t("pages.basvuruTakip.section.academicInfo")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded-sm border border-gray-200">
                  <div className="text-sm font-bold text-cyan-700 mb-2 flex items-center gap-2">
                  <span className="text-xl">🏛️</span>
                  {t("modals.basvuruDetay.faculty")}
                </div>
                <p className="text-base font-bold text-cyan-900">
                  {basvuru.isCapBasvuru ? basvuru.capFakulte : (normalRecord?.faculty || user?.faculty || t("common.notAvailable"))}
                </p>
              </div>
              <div className="p-3 bg-white rounded-sm border border-gray-200">
                <div className="text-sm font-bold text-sky-700 mb-2 flex items-center gap-2">
                  <span className="text-xl">📚</span>
                  {t("modals.basvuruDetay.programLabel")}
                </div>
                <p className="text-base font-bold text-sky-900">
                  {basvuru.isCapBasvuru ? basvuru.capBolum : basvuru.department} - {normalRecord?.class || user?.class || t("common.notAvailable")}
                </p>
              </div>
            </div>
            {basvuru.isCapBasvuru && (
              <div className="mt-4 bg-accent-green-50 p-3 rounded-sm border border-emerald-300 shadow-sm">
                <div className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                  <span className="text-lg">🔗</span>
                  <span>{t("pages.basvuruTakip.capNote.title")}</span>
                </div>
                <p className="text-sm text-emerald-900 mt-2">
                  {t("pages.basvuruTakip.capNote.description")}
                </p>
              </div>
            )}
          </div>

          {/* Başvuru Durumu */}
          <div className="bg-accent-blue-25 p-4 sm:p-5 rounded-sm border border-gray-300 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="text-2xl">📊</span>
                {t("pages.basvuruTakip.section.status")}
              </h3>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(basvuru.onayDurumu)}`}>
                {getStatusLabel(basvuru.onayDurumu)}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-sm border border-gray-200">
                <div className="text-xs font-semibold text-gray-600 mb-1">{t("pages.basvuruTakip.applicationId")}</div>
                <div className="text-sm font-bold text-gray-900">#{basvuru.id}</div>
              </div>
              <div className="p-3 bg-white rounded-sm border border-gray-200">
                <div className="text-xs font-semibold text-gray-600 mb-1">{t("pages.basvuruTakip.internshipType")}</div>
                <div className="text-sm font-bold text-gray-900">{t(`internshipTypes.${basvuru.stajTipi}`) || basvuru.stajTipi}</div>
              </div>
              <div className="p-3 bg-white rounded-sm border border-gray-200">
                <div className="text-xs font-semibold text-gray-600 mb-1">{t("pages.basvuruTakip.totalDays")}</div>
                <div className="text-sm font-bold text-gray-900">{basvuru.toplamGun} {t("common.day")}</div>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-accent-emerald-25 p-4 rounded-sm border border-gray-300 shadow-sm">
            <h3 className="text-lg font-bold text-green-900 mb-3 flex items-center gap-2"><span className="text-2xl">📅</span>{t("pages.basvuruTakip.internshipDates")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-sm border border-gray-200">
                <div className="text-xs font-semibold text-gray-600 mb-1">{t("pages.basvuruTakip.startDate")}</div>
                <div className="text-sm font-bold text-gray-900">{new Date(basvuru.baslangicTarihi).toLocaleDateString("tr-TR")}</div>
              </div>
              <div className="p-3 bg-white rounded-sm border border-gray-200">
                <div className="text-xs font-semibold text-gray-600 mb-1">{t("pages.basvuruTakip.endDate")}</div>
                <div className="text-sm font-bold text-gray-900">{new Date(basvuru.bitisTarihi).toLocaleDateString("tr-TR")}</div>
              </div>
            </div>
          </div>

          {/* Company */}
          <div className="bg-accent-indigo-25 p-4 rounded-sm border border-gray-300 shadow-sm">
            <h3 className="text-lg font-bold text-indigo-900 mb-3 flex items-center gap-2"><span className="text-2xl">🏢</span>{t("pages.basvuruTakip.section.company")}</h3>
            <div className="p-3 bg-white rounded-sm border border-gray-200 mb-3">
              <div className="text-xs font-semibold text-gray-600">{t("pages.basvuruTakip.companyAddress")}</div>
              <div className="text-sm font-bold text-gray-900">{basvuru.kurumAdresi}</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-sm border border-gray-200">
                <div className="text-xs font-semibold text-gray-600">{t("pages.basvuruTakip.supervisorName")}</div>
                <div className="text-sm font-bold text-gray-900">{basvuru.yetkiliAdi}</div>
              </div>
              <div className="p-3 bg-white rounded-sm border border-gray-200">
                <div className="text-xs font-semibold text-gray-600">{t("pages.basvuruTakip.advisorEmail")}</div>
                <div className="text-sm font-bold text-gray-900 break-all">{basvuru.danismanMail}</div>
              </div>
            </div>
          </div>

          {/* Cancellation reason */}
          {basvuru.onayDurumu === "IPTAL_EDILDI" && basvuru.iptalSebebi && (
            <div className="p-3 bg-red-50 rounded-sm border border-red-200 text-red-800">
              <div className="font-semibold mb-2">{t("pages.basvuruTakip.cancellationReason")}</div>
              <div>{basvuru.iptalSebebi}</div>
            </div>
          )}

          {/* Logs */}
          {basvuru.logs && basvuru.logs.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-sm border border-gray-200">
              <div className="font-semibold mb-3">{t("pages.basvuruTakip.processHistory")}</div>
              <div className="space-y-3">
                {basvuru.logs.map((log) => (
                  <div key={log.id} className="p-3 bg-white rounded-sm border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm">{log.action.replace(/([A-Z])/g, " $1").trim()}</div>
                        <div className="text-xs text-gray-600">{t("pages.basvuruTakip.changedBy")} {log.degisikligiYapan.name}</div>
                        {log.detaylar && <div className="mt-2 text-sm text-gray-800 bg-gray-100 p-2 rounded">{log.detaylar}</div>}
                      </div>
                      <div className="text-xs text-gray-500">{formatDate(log.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function BasvuruTakip() {
  const {
    user,
    token,
    logout,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();
  const navigate = useNavigate();
  const { t, translateError, translateSuccess } = useTranslation();
  const [basvurular, setBasvurular] = useState<StajBasvurusu[]>([]);
  const [muafiyetBasvurular, setMuafiyetBasvurular] = useState<MuafiyetBasvuru[]>([]);
  const [freshUserData, setFreshUserData] = useState<{tcKimlik?: string, studentId?: string, name?: string, faculty?: string, class?: string, department?: string} | null>(null);
  const [normalRecord, setNormalRecord] = useState<{faculty?: string, class?: string, department?: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBasvuru, setSelectedBasvuru] = useState<StajBasvurusu | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // State for cancellation modal
  const [isIptalModalOpen, setIsIptalModalOpen] = useState(false);
  const [basvuruToCancel, setBasvuruToCancel] = useState<number | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    // Sadece authenticate kontrolü yap, role kontrolü backend'te yapılacak
    if (!authLoading && !isAuthenticated) {
      navigate("/");
      return;
    }
  }, [authLoading, isAuthenticated, navigate]);

  const fetchBasvurular = useCallback(
    async (showLoading = true) => {
      // Auth durumu netleşmeden işlem yapma
      if (authLoading) return;

      if (isAuthenticated && token) {
        try {
          if (showLoading) setIsLoading(true);
          
          // Fresh user bilgilerini çek
          try {
            const studentData = await api.getStudentRecords();
            if (studentData.userInfo) {
              setFreshUserData(studentData.userInfo);
              console.log("Fresh user data:", studentData.userInfo);
            }
            if (studentData.normalRecord) {
              setNormalRecord({
                faculty: studentData.normalRecord.faculty,
                class: studentData.normalRecord.class,
                department: studentData.normalRecord.department ?? studentData.normalRecord.faculty ?? ''
              });
              console.log("Normal record data:", studentData.normalRecord);
            }
          } catch (userError) {
            console.error("User data fetch error:", userError);
          }
          
          // Fetch regular applications first
          const basvuruData = await api.getBasvurular();
          setBasvurular(Array.isArray(basvuruData) ? basvuruData : []);
          
          // Try to fetch muafiyet applications separately with better error handling
          try {
            console.log("Attempting to fetch muafiyet applications...");
            const muafiyetData = await api.getMuafiyetBasvurular();
            console.log("Muafiyet data received:", muafiyetData);
            console.log("Muafiyet data type:", typeof muafiyetData);
            console.log("Is muafiyet data array?", Array.isArray(muafiyetData));
            setMuafiyetBasvurular(Array.isArray(muafiyetData) ? muafiyetData : []);
          } catch (muafiyetError) {
            console.error("Muafiyet API hatası:", muafiyetError);
            console.error("Error details:", muafiyetError instanceof Error ? muafiyetError.message : muafiyetError);
            setMuafiyetBasvurular([]); // Empty array on error
          }
          
        } catch (error: unknown) {
          console.error("Error fetching applications:", error);
        } finally {
          // Her durumda yüklemeyi bitir
          if (showLoading) setIsLoading(false);
        }
      } else {
        // Kullanıcı giriş yapmamışsa da yüklemeyi bitir
        if (showLoading) setIsLoading(false);
      }
    },
    [authLoading, isAuthenticated, token],
  );

  useEffect(() => {
    fetchBasvurular();
  }, [fetchBasvurular]);

  const handleDetailClick = (basvuru: StajBasvurusu) => {
    setSelectedBasvuru(basvuru);
    setIsModalOpen(true);
  };

  const openCancelModal = (id: number) => {
    setBasvuruToCancel(id);
    setIsIptalModalOpen(true);
  };

  const handleCancelConfirm = async (iptalSebebi: string) => {
    if (!basvuruToCancel || !token) return;

    setIsCancelling(true);
    setNotification(null);

    try {
      await api.cancelBasvuru(basvuruToCancel, iptalSebebi);

      // Başvuru listesini yeniden fetch et (loading gösterme)
      await fetchBasvurular(false);

      setNotification({
        message: translateSuccess(t("success.applicationCancelled")),
        type: "success",
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : t("errors.applicationCancelError");
      setNotification({
        message: `${t("errors.generic")}: ${translateError(errorMessage)}`,
        type: "error",
      });
    } finally {
      setIsCancelling(false);
      setIsIptalModalOpen(false);
      setBasvuruToCancel(null);
    }
  };

  const handleMuafiyetPdfDownload = async (muafiyetId: number, fileName: string) => {
    try {
      const blob = await api.downloadMuafiyetPdf(muafiyetId);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = fileName || `muafiyet-belgesi-${muafiyetId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setNotification({
        message: translateSuccess("Muafiyet belgesi başarıyla indirildi"),
        type: "success",
      });
    } catch (error) {
      const err = error as Error;
      setNotification({
        message: translateError(err.message || "Muafiyet belgesi indirilemedi"),
        type: "error",
      });
    }
  };


  // Helper to translate status enum for main list
  const getStatusStyle = (status: StajBasvurusu["onayDurumu"]) => {
    switch (status) {
      case "ONAYLANDI":
        return "bg-accent-green-100 text-accent-green-800";
      case "REDDEDILDI":
        return "bg-primary-100 text-primary-800";
      case "IPTAL_EDILDI":
        return "bg-gray-200 text-gray-800";
      default:
        return "bg-accent-orange-100 text-accent-orange-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ONAYLANDI":
        return t("pages.basvuruTakip.statuses.approved");
      case "REDDEDILDI":
        return t("pages.basvuruTakip.statuses.rejected");
      case "IPTAL_EDILDI":
        return t("pages.basvuruTakip.statuses.cancelled");
      case "HOCA_ONAYI_BEKLIYOR":
        return t("pages.basvuruTakip.statuses.advisorApproval");
      case "KARIYER_MERKEZI_ONAYI_BEKLIYOR":
        return t("pages.basvuruTakip.statuses.careerCenterApproval");
      case "SIRKET_ONAYI_BEKLIYOR":
        return t("pages.basvuruTakip.statuses.companyApproval");
      default:
        return t("status.unknown");
    }
  };

  const getMuafiyetStatusStyle = (status: string) => {
    switch (status) {
      case "ONAYLANDI":
        return "bg-accent-green-100 text-accent-green-800";
      case "REDDEDILDI":
        return "bg-primary-100 text-primary-800";
      default:
        return "bg-accent-orange-100 text-accent-orange-800";
    }
  };

  const getMuafiyetStatusLabel = (status: string) => {
    switch (status) {
      case "ONAYLANDI":
        return "Onaylandı";
      case "REDDEDILDI":
        return "Reddedildi";
      case "BEKLEMEDE":
      default:
        return "Danışman Onayı Bekliyor";
    }
  };

  if (isLoading || !user) {
    return <div>{t("common.loading")}</div>;
  }

  return (
    <div className="min-h-screen bg-block-grid flex flex-col">
      {notification && (
        <AppNotification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      <Navbar user={user} onLogout={logout} />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 w-full flex-grow">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-dark">
            {t("pages.basvuruTakip.title")}
          </h1>
          <p className="mt-2 text-text-light">
            {t("pages.basvuruTakip.subtitle")} 
          </p>
        </div>

        <div className="space-y-6">
          {/* Regular Internship Applications */}
          {basvurular.length > 0 && (
            <>
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-text-dark mb-2">Staj Başvuruları</h2>
                <div className="h-1 w-16 bg-accent-blue-500 rounded"></div>
              </div>
              
              {basvurular.map((app) => (
                <div
                  key={`staj-${app.id}`}
                  className="bg-background-50 shadow-md rounded-lg p-6 border-l-4 border-l-accent-blue-500"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4">
                    <h3 className="text-xl font-bold text-primary-700 break-words">
                      {app.kurumAdi}
                    </h3>
                    <span
                      className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusStyle(app.onayDurumu)}`}
                    >
                      {getStatusLabel(app.onayDurumu)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    <div>
                      <p className="font-semibold text-text-dark">
                        {t("application.type")}:
                      </p>
                      <p className="text-text-light">{t(`internshipTypes.${app.stajTipi}`) || app.stajTipi}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-text-dark">
                        {t("application.internshipDates")}:
                      </p>
                      <p className="text-text-light">
                        {new Date(app.baslangicTarihi).toLocaleDateString()} -{" "}
                        {new Date(app.bitisTarihi).toLocaleDateString()} (
                        {app.toplamGun} {t("common.day")})
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="font-semibold text-text-dark">
                        {t("internshipForm.companyAddress")}:
                      </p>
                      <p className="text-text-light break-words">{app.kurumAdresi}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-text-dark">
                        {t("internshipForm.supervisorName")}:
                      </p>
                      <p className="text-text-light break-words">{app.yetkiliAdi}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-text-dark">
                        {t("internshipForm.advisorEmail")}:
                      </p>
                      <p className="text-text-light break-words">{app.danismanMail}</p>
                    </div>
                  </div>

                  <div className="border-t border-background-200 mt-6 pt-4 flex flex-wrap justify-end gap-3">
                    <button
                      onClick={() => handleDetailClick(app)}
                      className="bg-accent-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-accent-purple-700 transition-colors text-sm"
                    >
                      {t("common.details")}
                    </button>
                    {/* Update action removed - students can no longer update applications */}
                    <button
                      onClick={() => openCancelModal(app.id)}
                      disabled={app.onayDurumu !== "HOCA_ONAYI_BEKLIYOR"}
                      className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {t("application.cancel")}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Muafiyet Applications */}
          {muafiyetBasvurular.length > 0 && (
            <>
              <div className="mb-4 mt-8">
                <h2 className="text-2xl font-bold text-text-dark mb-2">Muafiyet Başvuruları</h2>
                <div className="h-1 w-16 bg-accent-green-500 rounded"></div>
              </div>
              
              {muafiyetBasvurular.map((app) => (
                <div
                  key={`muafiyet-${app.id}`}
                  className="bg-background-50 shadow-md rounded-lg p-6 border-l-4 border-l-accent-green-500"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4">
                    <h3 className="text-xl font-bold text-accent-green-700 break-words flex items-center gap-2">
                      <span className="text-2xl">📋</span>
                      Muafiyet Başvurusu #{app.id}
                    </h3>
                    <span
                      className={`px-3 py-1 text-sm font-medium rounded-full ${getMuafiyetStatusStyle(app.onayDurumu)}`}
                    >
                      {getMuafiyetStatusLabel(app.onayDurumu)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    <div>
                      <p className="font-semibold text-text-dark">
                        Başvuru Türü:
                      </p>
                      <p className="text-text-light">SGK 4A Muafiyet Başvurusu</p>
                    </div>
                    <div>
                      <p className="font-semibold text-text-dark">
                        Başvuru Tarihi:
                      </p>
                      <p className="text-text-light">
                        {new Date(app.createdAt).toLocaleString("tr-TR")}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-text-dark">
                        {t("internshipForm.advisorEmail")}:
                      </p>
                      <p className="text-text-light break-words">{app.danismanMail}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-text-dark">
                        SGK 4A Belgesi:
                      </p>
                      <p className="text-text-light">
                        <span className="inline-flex items-center gap-1">
                          📄 Yüklendi
                        </span>
                      </p>
                    </div>
                    {/* CAP Bilgileri */}
                    {app.isCapBasvuru && (
                      <div className="md:col-span-2">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">🎓</span>
                            <span className="font-semibold text-amber-800">CAP (Çift Anadal) Başvurusu</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            {app.capFakulte && (
                              <div>
                                <p className="font-semibold text-amber-700">CAP Fakülte:</p>
                                <p className="text-amber-800">{app.capFakulte}</p>
                              </div>
                            )}
                            {app.capBolum && (
                              <div>
                                <p className="font-semibold text-amber-700">CAP-YAP Bölüm:</p>
                                <p className="text-amber-800">{app.capBolum}</p>
                              </div>
                            )}
                            {app.capDepartman && (
                              <div>
                                <p className="font-semibold text-amber-700">CAP Departman:</p>
                                <p className="text-amber-800">{app.capDepartman}</p>
                              </div>
                            )}
                          </div>
                          <p className="text-amber-700 text-xs mt-2">
                            Bu muafiyet başvurusu ÇAP-YAP kapsamında yapılmıştır
                          </p>
                        </div>
                      </div>
                    )}
                    {app.danismanAciklama && (
                      <div className="md:col-span-2">
                        <p className="font-semibold text-text-dark">
                          Danışman Açıklaması:
                        </p>
                        <p className="text-text-light break-words bg-gray-100 p-3 rounded-lg mt-1">
                          {app.danismanAciklama}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-background-200 mt-6 pt-4 flex flex-wrap justify-end gap-3">
                    <button
                      onClick={() => {
                        // Download SGK 4A document using the download function
                        handleMuafiyetPdfDownload(app.id, `sgk4a-belgesi-${app.id}.pdf`);
                      }}
                      className="bg-accent-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-accent-green-700 transition-colors text-sm"
                    >
                      SGK 4A'yı İndir
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* No Applications Message */}
          {basvurular.length === 0 && muafiyetBasvurular.length === 0 && (
            <div className="bg-background-50 shadow-md rounded-lg p-6 text-center">
              <p className="text-text-light">
                {t("application.noApplications")}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => navigate("/staj-basvurusu")}
                  className="bg-accent-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-accent-green-700 transition-colors"
                >
                  {t("application.new")}
                </button>
                <button
                  onClick={() => navigate("/muafiyet-basvuru")}
                  className="bg-accent-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-accent-blue-700 transition-colors"
                >
                  {t("pages.muafiyetBasvuru.title")}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Detail Modal */}
      <DetailModal
        basvuru={selectedBasvuru}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        freshUserData={freshUserData}
        normalRecord={normalRecord}
      />

      {/* Iptal Modal */}
      <IptalModal
        isOpen={isIptalModalOpen}
        onClose={() => setIsIptalModalOpen(false)}
        onConfirm={handleCancelConfirm}
        isLoading={isCancelling}
      />
    </div>
  );
}

export default BasvuruTakip;