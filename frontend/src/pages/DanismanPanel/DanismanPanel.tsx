import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { StajTipiEnum } from "../../types/staj.types";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import OnayModal from "../../components/modals/OnayModal";
import RedModal from "../../components/modals/RedModal";
import OgrenciModal from "../../components/modals/OgrenciModal";
// Defter-specific red modal replaced by shared RedModal
import BasvuruDetayModal from "../../components/modals/BasvuruDetayModal";
import OnayBekleyenBasvurularTab from "../../components/tabs/OnayBekleyenBasvurularTab";
import BasvurularTabDanisman from "../../components/tabs/BasvurularTabDanisman";
import DefterlerTab from "../../components/tabs/DefterlerTab";
import OgrencilerTabDanisman from "../../components/tabs/OgrencilerTabDanisman";
import MuafiyetlerTabDanisman from "../../components/tabs/MuafiyetlerTabDanisman";
import DefterDetayModal from "../../components/modals/DefterDetayModal";
import SecureButton from "../../components/security/SecureButton";
import { useTranslation } from "../../hooks/useTranslation";
import AppNotification from "../../components/common/AppNotification";
import i18n from '../../i18n';

interface Ogrenci {
  id: number;
  name: string;
  email: string;
  studentId: string;
  faculty: string;
  class: string;
  toplamBasvuru: number;
  sonBasvuruTarihi: string;
  department?: string;
}

interface MuafiyetBasvuru {
  id: number;
  ogrenciId: number;
  sgk4a: string;
  danismanMail: string;
  onayDurumu: string;
  danismanOnayDurumu: number;
  danismanAciklama: string | null;
  createdAt: string;
  updatedAt: string;
  type: 'MUAFIYET';
  isCapBasvuru: boolean;
  capFakulte: string | null;
  capBolum: string | null;
  capDepartman: string | null;
  ogrenci: {
    id: number;
    name: string;
    email: string;
    studentId: string;
    faculty: string;
    class: string;
  };
}

interface Basvuru {
  id: number;
  kurumAdi: string;
  stajTipi: StajTipiEnum;
  baslangicTarihi: string;
  bitisTarihi: string;
  onayDurumu:
    | "HOCA_ONAYI_BEKLIYOR"
    | "KARIYER_MERKEZI_ONAYI_BEKLIYOR"
    | "SIRKET_ONAYI_BEKLIYOR"
    | "ONAYLANDI"
    | "REDDEDILDI"
    | "IPTAL_EDILDI";
  createdAt: string;
  ogrenci: {
    id: number;
    name: string;
    email: string;
    studentId: string;
  };
}

interface Defter {
  id: number;
  defterDurumu: string;
  dosyaYolu?: string;
  originalFileName?: string;
  fileSize?: number;
  uploadDate?: string;
  redSebebi?: string;
  stajBasvurusu: {
    id: number;
    kurumAdi: string;
    stajTipi: StajTipiEnum;
    ogrenci: {
      id: number;
      name: string;
      email: string;
      studentId: string;
    };
  };
}

export function DanismanPanel() {
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, translateError, translateSuccess } = useTranslation();

  // Force Turkish locale for Danisman panel pages only, restore on unmount
  useEffect(() => {
    const prev = i18n.language;
    if (prev !== 'tr') {
      i18n.changeLanguage('tr');
    }
    return () => {
      if (prev && prev !== i18n.language) {
        i18n.changeLanguage(prev);
      }
    };
  }, []);

  // Token expiration handling
  useEffect(() => {
    const handleTokenExpired = () => {
      logout();
      navigate("/");
    };
    window.addEventListener("tokenExpired", handleTokenExpired);
    return () => window.removeEventListener("tokenExpired", handleTokenExpired);
  }, [logout, navigate]);

  const [activeTab, setActiveTab] = useState<
    | "onay-bekleyenler"
    | "muafiyet-onayi-bekleyenler"
    | "basvurular"
    | "defterler"
    | "defter-onay-bekleyenler"
    | "ogrenciler"
  >("onay-bekleyenler");
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>([]);
  const [ogrencilerTotalCount, setOgrencilerTotalCount] = useState<number>(0);
  const [basvurular, setBasvurular] = useState<Basvuru[]>([]);
  const [defterler, setDefterler] = useState<Defter[]>([]);
  const [defterOnayBekleyenler, setDefterOnayBekleyenler] = useState<Defter[]>(
    []
  );
  const [onayBekleyenBasvurular, setOnayBekleyenBasvurular] = useState<
    Basvuru[]
  >([]);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [isOnayModalOpen, setIsOnayModalOpen] = useState(false);
  const [isRedModalOpen, setIsRedModalOpen] = useState(false);
  const [selectedBasvuruId, setSelectedBasvuruId] = useState<number | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);

  // Öğrenci modal state'leri
  const [selectedOgrenci, setSelectedOgrenci] = useState<Ogrenci | null>(null);
  const [isOgrenciModalOpen, setIsOgrenciModalOpen] = useState(false);
  const [ogrenciBasvurular, setOgrenciBasvurular] = useState<Basvuru[]>([]);
  const [isOgrenciLoading, setIsOgrenciLoading] = useState(false);

  // Defter için state'ler
  const [selectedDefterId, setSelectedDefterId] = useState<number | null>(null);
  const [isDefterOnayModalOpen, setIsDefterOnayModalOpen] = useState(false);
  const [isDefterRedModalOpen, setIsDefterRedModalOpen] = useState(false);
  const [isDefterDetayModalOpen, setIsDefterDetayModalOpen] = useState(false);

  // Başvuru detay modal state'leri
  const [selectedBasvuruDetayId, setSelectedBasvuruDetayId] = useState<
    number | null
  >(null);
  const [isBasvuruDetayModalOpen, setIsBasvuruDetayModalOpen] = useState(false);

  // Arama state'leri
  const [searchBasvuru, setSearchBasvuru] = useState("");
  const [searchDefter, setSearchDefter] = useState("");
  const [searchOgrenci, setSearchOgrenci] = useState("");

  // Pagination state'leri
  const [currentBasvuruPage, setCurrentBasvuruPage] = useState(1);
  const [totalBasvuruPages, setTotalBasvuruPages] = useState(1);
  const [currentDefterPage, setCurrentDefterPage] = useState(1);
  const [totalDefterPages, setTotalDefterPages] = useState(1);
  const [currentOgrenciPage, setCurrentOgrenciPage] = useState(1);
  const [totalOgrenciPages, setTotalOgrenciPages] = useState(1);

  // Track if initial load is complete to avoid duplicate loading
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Muafiyet states
  const [muafiyetBasvurular, setMuafiyetBasvurular] = useState<MuafiyetBasvuru[]>([]);
  const [searchMuafiyet, setSearchMuafiyet] = useState("");
  const [currentMuafiyetPage, setCurrentMuafiyetPage] = useState(1);
  const [totalMuafiyetPages] = useState(1); // Remove unused setter
  const [selectedMuafiyetId, setSelectedMuafiyetId] = useState<number | null>(null);
  const [isMuafiyetOnayModalOpen, setIsMuafiyetOnayModalOpen] = useState(false);
  const [isMuafiyetRedModalOpen, setIsMuafiyetRedModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.userType !== "DANISMAN")) {
      navigate("/");
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  // Load initial data for first tab on page load
  const loadAllCounters = useCallback(async () => {
    if (authLoading || !isAuthenticated || user?.userType !== "DANISMAN") {
      return;
    }

    try {
      // Load only the first tab data on initial load
      const onayBekleyenResponse = await api.searchDanismanBasvurular({
        search: "",
        page: 1,
        limit: 10,
        onayDurumu: "HOCA_ONAYI_BEKLIYOR",
      });

      // Set actual data for the first tab (onay-bekleyenler)
      setOnayBekleyenBasvurular(onayBekleyenResponse.data?.basvurular || []);
      setTotalBasvuruPages(
        onayBekleyenResponse.data?.pagination?.totalPages || 1
      );
    } catch (err) {
      console.error("Counter loading error:", err);
      // Silent fail for counters - don't show error to user
    }
  }, [authLoading, isAuthenticated, user]);

  // Load counters on component mount
  useEffect(() => {
    loadAllCounters().then(() => {
      setInitialLoadComplete(true);
    });
  }, [loadAllCounters]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchData = useCallback(async () => {
    // Skip initial load for onay-bekleyenler since it's already loaded in loadAllCounters
    if (!initialLoadComplete && activeTab === "onay-bekleyenler") {
      return;
    }

    try {
      if (activeTab === "onay-bekleyenler") {
        const response = await api.searchDanismanBasvurular({
          search: searchBasvuru,
          page: currentBasvuruPage,
          limit: 10,
          onayDurumu: "HOCA_ONAYI_BEKLIYOR",
        });
        setOnayBekleyenBasvurular(response.data?.basvurular || []);
        setTotalBasvuruPages(response.data?.pagination?.totalPages || 1);
      } else if (activeTab === "basvurular") {
        const response = await api.searchDanismanBasvurular({
          search: searchBasvuru,
          page: currentBasvuruPage,
          limit: 10,
        });
        setBasvurular(response.data?.basvurular || []);
        setTotalBasvuruPages(response.data?.pagination?.totalPages || 1);
      } else if (activeTab === "defterler") {
        const response = await api.searchDanismanDefterler({
          search: searchDefter,
          page: currentDefterPage,
          limit: 10,
        });
        setDefterler(response.data?.defterler || []);
        setTotalDefterPages(response.data?.pagination?.totalPages || 1);
      } else if (activeTab === "defter-onay-bekleyenler") {
        const response = await api.searchDanismanDefterler({
          search: searchDefter,
          page: currentDefterPage,
          limit: 10,
          defterDurumu: "DANISMAN_ONAYI_BEKLIYOR",
        });
        setDefterOnayBekleyenler(response.data?.defterler || []);
        setTotalDefterPages(response.data?.pagination?.totalPages || 1);
      } else if (activeTab === "ogrenciler") {
        const response = await api.searchDanismanOgrenciler({
          search: searchOgrenci,
          page: currentOgrenciPage,
          limit: 10,
        });
  setOgrenciler(response.data?.ogrenciler || []);
  setTotalOgrenciPages(response.data?.pagination?.totalPages || 1);
  setOgrencilerTotalCount(response.data?.pagination?.total || (response.data?.ogrenciler || []).length);
      }
    } catch (err) {
      setNotification({
        message: translateError(
          `Veri yüklenirken hata oluştu: ${
            err instanceof Error ? err.message : String(err)
          }`
        ),
        type: "error",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    currentBasvuruPage,
    currentDefterPage,
    currentOgrenciPage,
    searchBasvuru,
    searchDefter,
    searchOgrenci,
    initialLoadComplete,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Manual search functions
  const handleSearchBasvuru = () => {
    setCurrentBasvuruPage(1);
  };

  const handleClearSearchBasvuru = () => {
    setSearchBasvuru("");
    setCurrentBasvuruPage(1);
  };

  const handleSearchDefter = () => {
    setCurrentDefterPage(1);
  };

  const handleClearSearchDefter = () => {
    setSearchDefter("");
    setCurrentDefterPage(1);
  };

  const handleSearchOgrenci = () => {
    setCurrentOgrenciPage(1);
  };

  const handleClearSearchOgrenci = () => {
    setSearchOgrenci("");
    setCurrentOgrenciPage(1);
  };

  const handleBasvuruOnayla = async (basvuruId: number, aciklama?: string) => {
    setIsProcessing(true);
    try {
      await api.onaylaBasvuru(basvuruId, aciklama);
      setNotification({
        message: translateSuccess("Başvuru başarıyla onaylandı."),
        type: "success",
      });
      fetchData();
      // Reload counters after successful operation
      loadAllCounters();
      setIsOnayModalOpen(false);
      setSelectedBasvuruId(null);
    } catch (error) {
      setNotification({
        message: translateError(
          error instanceof Error
            ? error.message
            : "Başvuru onaylanırken hata oluştu."
        ),
        type: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBasvuruReddet = async (basvuruId: number, sebep: string) => {
    setIsProcessing(true);
    try {
      await api.reddetBasvuru(basvuruId, sebep);
      setNotification({
        message: translateSuccess("Başvuru başarıyla reddedildi."),
        type: "success",
      });
      fetchData();
      // Reload counters after successful operation
      loadAllCounters();
      setIsRedModalOpen(false);
      setSelectedBasvuruId(null);
    } catch (error) {
      const err = error as { message?: string };
      setNotification({
        message: translateError(
          err.message || "Başvuru reddedilirken hata oluştu."
        ),
        type: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDefterDurumGuncelle = async (
    defterId: number,
    yeniDurum: string,
    aciklama?: string
  ) => {
    try {
      // Use the new defter approval API
      if (yeniDurum === "ONAYLANDI") {
        await api.onaylaDefteri(defterId, "ONAYLANDI", aciklama);
      } else if (yeniDurum === "REDDEDILDI") {
        await api.onaylaDefteri(defterId, "REDDEDILDI", aciklama);
      } else {
        // Fallback to old method for other statuses
        await api.updateDefterDurumu(
          defterId,
          yeniDurum as "BEKLEMEDE" | "YUKLENDI" | "ONAYLANDI" | "REDDEDILDI",
          aciklama
        );
      }

      setNotification({
        message: translateSuccess(
          yeniDurum === "ONAYLANDI"
            ? "Defter başarıyla onaylandı."
            : "Defter başarıyla reddedildi."
        ),
        type: "success",
      });
      fetchData();
      // Reload counters after successful operation
      loadAllCounters();
    } catch (error) {
      const err = error as { message?: string };
      setNotification({
        message: translateError(
          err.message || "Defter durumu güncellenirken hata oluştu."
        ),
        type: "error",
      });
    }
  };

  const handleBasvuruClick = (basvuruId: number) => {
    setSelectedBasvuruDetayId(basvuruId);
    setIsBasvuruDetayModalOpen(true);
  };

  const handleDefterClick = (defterId: number) => {
    setSelectedDefterId(defterId);
    setIsDefterDetayModalOpen(true);
  };

  const handleDefterPdfDownload = async (
    defterId: number,
    fileName: string
  ) => {
    try {
      // Use the correct API function for advisor defter download
      const blob = await api.getDanismanDefter(defterId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = fileName || `defter_${defterId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      const err = error as { message?: string };
      setNotification({
        message: translateError(err.message || "PDF indirilemedi."),
        type: "error",
      });
    }
  };

  // MUAFIYET HANDLERS
  
  const fetchMuafiyetBasvurular = async () => {
    try {
      const response = await api.getDanismanMuafiyetBasvurular();
      const muafiyetData = response.data?.muafiyetBasvurular || response.data || [];
      setMuafiyetBasvurular(muafiyetData);
    } catch (error) {
      console.error("Muafiyet başvuruları getirilemedi:", error);
      setMuafiyetBasvurular([]);
      setNotification({
        message: translateError("Muafiyet başvuruları getirilemedi."),
        type: "error",
      });
    }
  };

  const handleMuafiyetOnayla = async (muafiyetId: number, aciklama?: string) => {
    setIsProcessing(true);
    try {
      await api.onaylaMuafiyetBasvuru(muafiyetId, aciklama);
      setNotification({
        message: translateSuccess("Muafiyet başvurusu başarıyla onaylandı."),
        type: "success",
      });
      fetchMuafiyetBasvurular();
      setIsMuafiyetOnayModalOpen(false);
      setSelectedMuafiyetId(null);
    } catch (error) {
      setNotification({
        message: translateError(
          error instanceof Error
            ? error.message
            : "Muafiyet başvurusu onaylanırken hata oluştu."
        ),
        type: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMuafiyetReddet = async (muafiyetId: number, redSebebi: string) => {
    setIsProcessing(true);
    try {
      await api.reddetMuafiyetBasvuru(muafiyetId, redSebebi);
      setNotification({
        message: translateSuccess("Muafiyet başvurusu başarıyla reddedildi."),
        type: "success",
      });
      fetchMuafiyetBasvurular();
      setIsMuafiyetRedModalOpen(false);
      setSelectedMuafiyetId(null);
    } catch (error) {
      setNotification({
        message: translateError(
          error instanceof Error
            ? error.message
            : "Muafiyet başvurusu reddedilirken hata oluştu."
        ),
        type: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMuafiyetSgk4aDownload = async (muafiyetId: number, fileName: string) => {
    try {
      const blob = await api.downloadMuafiyetSgk4aByDanisman(muafiyetId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setNotification({
        message: translateError(
          error instanceof Error
            ? error.message
            : "SGK 4A dosyası indirilemedi."
        ),
        type: "error",
      });
    }
  };

  const handleSearchMuafiyet = () => {
    // Basit arama implementasyonu
    fetchMuafiyetBasvurular();
  };

  const handleClearSearchMuafiyet = () => {
    setSearchMuafiyet("");
    setCurrentMuafiyetPage(1);
    fetchMuafiyetBasvurular();
  };

  // Load muafiyet data when tab is selected
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === "muafiyet-onayi-bekleyenler" && muafiyetBasvurular.length === 0) {
      fetchMuafiyetBasvurular();
    }
  };

  const handleOgrenciClick = async (ogrenci: Ogrenci) => {
    setSelectedOgrenci(ogrenci);
    setIsOgrenciModalOpen(true);
    setIsOgrenciLoading(true);

    try {
      const response = await api.getOgrenciTumBasvurulariModal(ogrenci.id);

      // Backend response yapısına göre parse et
      const ogrenciBasvuruları =
        response.data?.basvurular || response.data || [];
      setOgrenciBasvurular(ogrenciBasvuruları);
    } catch {
      setOgrenciBasvurular([]);
      setNotification({
        message: translateError("Öğrenci başvuruları getirilemedi."),
        type: "error",
      });
    } finally {
      setIsOgrenciLoading(false);
    }
  };

  const handleDefterOnay = (defterId: number) => {
    setSelectedDefterId(defterId);
    setIsDefterOnayModalOpen(true);
  };

  const handleDefterRed = (defterId: number) => {
    setSelectedDefterId(defterId);
    setIsDefterRedModalOpen(true);
  };

  if (authLoading || !isAuthenticated || user?.userType !== "DANISMAN") {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent-blue-600 mx-auto"></div>
          <p className="mt-4 text-text-light">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-50">
      {user && <Navbar user={user} onLogout={logout} />}

      <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Notification */}
        {notification && (
          <AppNotification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}

        {/* Tabs */}
        <div className="mb-4 sm:mb-6">
          <div className="bg-white/50 backdrop-blur-sm border-b border-background-200 rounded-t-lg">
            <div className="overflow-x-auto overflow-y-hidden">
              <nav className="-mb-px flex space-x-1 sm:space-x-2 lg:space-x-4 lg:justify-center min-w-max px-2 sm:px-4">
                <SecureButton
                  onClick={() => setActiveTab("onay-bekleyenler")}
                  requiredRoles={["DANISMAN"]}
                  className={`group relative py-3 sm:py-4 px-3 sm:px-5 lg:px-6 border-b-3 font-semibold text-xs sm:text-sm transition-all duration-200 whitespace-nowrap ${
                    activeTab === "onay-bekleyenler"
                      ? "border-accent-blue-500 text-accent-blue-600 bg-accent-blue-50/50"
                      : "border-transparent text-text-light hover:text-text-dark hover:border-accent-blue-300 hover:bg-accent-blue-50/30"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`text-lg transition-transform group-hover:scale-110 ${
                        activeTab === "onay-bekleyenler" ? "animate-pulse" : ""
                      }`}
                    >
                      ⏳
                    </span>
                    <span className="hidden sm:inline">
                      {t("pages.danismanPanel.tabs.pendingApprovals")}
                    </span>
                    <span className="sm:hidden font-medium">Onay</span>
                  </span>
                </SecureButton>
                <SecureButton
                  onClick={() => handleTabChange("muafiyet-onayi-bekleyenler")}
                  requiredRoles={["DANISMAN"]}
                  className={`group relative py-3 sm:py-4 px-3 sm:px-5 lg:px-6 border-b-3 font-semibold text-xs sm:text-sm transition-all duration-200 whitespace-nowrap ${
                    activeTab === "muafiyet-onayi-bekleyenler"
                      ? "border-accent-blue-500 text-accent-blue-600 bg-accent-blue-50/50"
                      : "border-transparent text-text-light hover:text-text-dark hover:border-accent-blue-300 hover:bg-accent-blue-50/30"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`text-lg transition-transform group-hover:scale-110 ${
                        activeTab === "muafiyet-onayi-bekleyenler" ? "animate-pulse" : ""
                      }`}
                    >
                      ✋
                    </span>
                    <span className="hidden sm:inline">
                      Muafiyet Onayları
                    </span>
                    <span className="sm:hidden font-medium">Muafiyet</span>
                  </span>
                </SecureButton>
                <SecureButton
                  onClick={() => setActiveTab("basvurular")}
                  requiredRoles={["DANISMAN"]}
                  className={`group relative py-3 sm:py-4 px-3 sm:px-5 lg:px-6 border-b-3 font-semibold text-xs sm:text-sm transition-all duration-200 whitespace-nowrap ${
                    activeTab === "basvurular"
                      ? "border-accent-blue-500 text-accent-blue-600 bg-accent-blue-50/50"
                      : "border-transparent text-text-light hover:text-text-dark hover:border-accent-blue-300 hover:bg-accent-blue-50/30"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`text-lg transition-transform group-hover:scale-110 ${
                        activeTab === "basvurular" ? "animate-pulse" : ""
                      }`}
                    >
                      📋
                    </span>
                    <span className="hidden sm:inline">
                      {t("pages.danismanPanel.tabs.allApplications")}
                    </span>
                    <span className="sm:hidden font-medium">Başvuru</span>
                  </span>
                </SecureButton>
                <SecureButton
                  onClick={() => setActiveTab("defterler")}
                  requiredRoles={["DANISMAN"]}
                  className={`group relative py-3 sm:py-4 px-3 sm:px-5 lg:px-6 border-b-3 font-semibold text-xs sm:text-sm transition-all duration-200 whitespace-nowrap ${
                    activeTab === "defterler"
                      ? "border-accent-blue-500 text-accent-blue-600 bg-accent-blue-50/50"
                      : "border-transparent text-text-light hover:text-text-dark hover:border-accent-blue-300 hover:bg-accent-blue-50/30"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`text-lg transition-transform group-hover:scale-110 ${
                        activeTab === "defterler" ? "animate-pulse" : ""
                      }`}
                    >
                      📚
                    </span>
                    <span className="hidden sm:inline">
                      {t("pages.danismanPanel.tabs.diaries")}
                    </span>
                    <span className="sm:hidden font-medium">Defter</span>
                  </span>
                </SecureButton>
                <SecureButton
                  onClick={() => setActiveTab("defter-onay-bekleyenler")}
                  requiredRoles={["DANISMAN"]}
                  className={`group relative py-3 sm:py-4 px-3 sm:px-5 lg:px-6 border-b-3 font-semibold text-xs sm:text-sm transition-all duration-200 whitespace-nowrap ${
                    activeTab === "defter-onay-bekleyenler"
                      ? "border-accent-blue-500 text-accent-blue-600 bg-accent-blue-50/50"
                      : "border-transparent text-text-light hover:text-text-dark hover:border-accent-blue-300 hover:bg-accent-blue-50/30"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`text-lg transition-transform group-hover:scale-110 ${
                        activeTab === "defter-onay-bekleyenler"
                          ? "animate-pulse"
                          : ""
                      }`}
                    >
                      📖
                    </span>
                    <span className="hidden sm:inline">
                      {t("pages.danismanPanel.tabs.diaryApprovals")}
                    </span>
                    <span className="sm:hidden font-medium">D.Onay</span>
                  </span>
                </SecureButton>
                <SecureButton
                  onClick={() => setActiveTab("ogrenciler")}
                  requiredRoles={["DANISMAN"]}
                  className={`group relative py-3 sm:py-4 px-3 sm:px-5 lg:px-6 border-b-3 font-semibold text-xs sm:text-sm transition-all duration-200 whitespace-nowrap ${
                    activeTab === "ogrenciler"
                      ? "border-accent-blue-500 text-accent-blue-600 bg-accent-blue-50/50"
                      : "border-transparent text-text-light hover:text-text-dark hover:border-accent-blue-300 hover:bg-accent-blue-50/30"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`text-lg transition-transform group-hover:scale-110 ${
                        activeTab === "ogrenciler" ? "animate-pulse" : ""
                      }`}
                    >
                      👥
                    </span>
                    <span className="hidden sm:inline">Öğrenciler</span>
                    <span className="sm:hidden font-medium">Öğrenci</span>
                  </span>
                </SecureButton>
              </nav>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white/95 backdrop-blur-sm shadow-lg sm:shadow-xl rounded-xl overflow-hidden border border-background-200 ring-1 ring-black/5">
          {activeTab === "onay-bekleyenler" && (
            <OnayBekleyenBasvurularTab
              basvurular={onayBekleyenBasvurular}
              searchTerm={searchBasvuru}
              onSearchChange={setSearchBasvuru}
              onSearch={handleSearchBasvuru}
              onClearSearch={handleClearSearchBasvuru}
              currentPage={currentBasvuruPage}
              totalPages={totalBasvuruPages}
              onPageChange={setCurrentBasvuruPage}
              onOnayla={(id: number, aciklama?: string) =>
                handleBasvuruOnayla(id, aciklama)
              }
              onReddet={(id: number, sebep: string) =>
                handleBasvuruReddet(id, sebep)
              }
              isProcessing={isProcessing}
              onBasvuruClick={handleBasvuruClick}
            />
          )}

          {activeTab === "basvurular" && (
            <BasvurularTabDanisman
              basvurular={basvurular}
              searchTerm={searchBasvuru}
              onSearchChange={setSearchBasvuru}
              onSearch={handleSearchBasvuru}
              onClearSearch={handleClearSearchBasvuru}
              currentPage={currentBasvuruPage}
              totalPages={totalBasvuruPages}
              onPageChange={setCurrentBasvuruPage}
              onOnayla={(id: number, aciklama?: string) =>
                handleBasvuruOnayla(id, aciklama)
              }
              onReddet={(id: number, sebep: string) =>
                handleBasvuruReddet(id, sebep)
              }
              isProcessing={isProcessing}
              onBasvuruClick={handleBasvuruClick}
            />
          )}

          {activeTab === "defterler" && (
            <DefterlerTab
              defterler={defterler}
              searchTerm={searchDefter}
              onSearchChange={setSearchDefter}
              onSearch={handleSearchDefter}
              onClearSearch={handleClearSearchDefter}
              currentPage={currentDefterPage}
              totalPages={totalDefterPages}
              onPageChange={setCurrentDefterPage}
              onDurumGuncelle={handleDefterDurumGuncelle}
              onPdfDownload={handleDefterPdfDownload}
              onDefterClick={handleDefterClick}
              onDefterOnay={handleDefterOnay}
              onDefterRed={handleDefterRed}
            />
          )}

          {activeTab === "defter-onay-bekleyenler" && (
            <DefterlerTab
              defterler={defterOnayBekleyenler}
              searchTerm={searchDefter}
              onSearchChange={setSearchDefter}
              onSearch={handleSearchDefter}
              onClearSearch={handleClearSearchDefter}
              currentPage={currentDefterPage}
              totalPages={totalDefterPages}
              onPageChange={setCurrentDefterPage}
              onDurumGuncelle={handleDefterDurumGuncelle}
              onPdfDownload={handleDefterPdfDownload}
              onDefterClick={handleDefterClick}
              onDefterOnay={handleDefterOnay}
              onDefterRed={handleDefterRed}
              isOnayBekleyenler={true}
            />
          )}

          {activeTab === "muafiyet-onayi-bekleyenler" && (
            <MuafiyetlerTabDanisman
              muafiyetler={muafiyetBasvurular}
              searchTerm={searchMuafiyet}
              onSearchChange={setSearchMuafiyet}
              onSearch={handleSearchMuafiyet}
              onClearSearch={handleClearSearchMuafiyet}
              currentPage={currentMuafiyetPage}
              totalPages={totalMuafiyetPages}
              onPageChange={setCurrentMuafiyetPage}
              onOnayla={(id: number) => {
                setSelectedMuafiyetId(id);
                setIsMuafiyetOnayModalOpen(true);
              }}
              onReddet={(id: number) => {
                setSelectedMuafiyetId(id);
                setIsMuafiyetRedModalOpen(true);
              }}
              onSgk4aDownload={handleMuafiyetSgk4aDownload}
              onOpenOgrenciModal={async (ogrenciId: number) => {
                try {
                  const res = await api.getDanismanOgrenciDetay(ogrenciId);
                  const data = res.data || res;
                  const ogr = {
                    id: data.id,
                    name: data.name || '',
                    email: data.email || '',
                    studentId: data.studentId || '',
                    faculty: data.faculty || '',
                    department: data.department || '',
                    class: data.class || '',
                    toplamBasvuru: 0,
                    sonBasvuruTarihi: '',
                    // CAP fields forwarded to modal
                    isCapOgrenci: !!data.isCapOgrenci,
                    capFakulte: data.capFakulte || null,
                    capBolum: data.capBolum || null,
                    capDepartman: data.capDepartman || null,
                  };
                  handleOgrenciClick(ogr);
                } catch {
                  setNotification({ message: translateError('Öğrenci bilgileri getirilemedi.'), type: 'error' });
                }
              }}
            />
          )}

          {activeTab === "ogrenciler" && (
            <OgrencilerTabDanisman
              ogrenciler={ogrenciler}
              totalCount={ogrencilerTotalCount}
              searchTerm={searchOgrenci}
              onSearchChange={setSearchOgrenci}
              onSearch={handleSearchOgrenci}
              onClearSearch={handleClearSearchOgrenci}
              currentPage={currentOgrenciPage}
              totalPages={totalOgrenciPages}
              onPageChange={setCurrentOgrenciPage}
              onOgrenciDetay={(ogrenci: Ogrenci) => handleOgrenciClick(ogrenci)}
            />
          )}
        </div>

        {/* Modals */}
        <OnayModal
          isOpen={isOnayModalOpen}
          onClose={() => {
            setIsOnayModalOpen(false);
            setSelectedBasvuruId(null);
          }}
          onConfirm={(aciklama) => {
            if (selectedBasvuruId) {
              handleBasvuruOnayla(selectedBasvuruId, aciklama);
            }
          }}
          isLoading={isProcessing}
        />

        <RedModal
          isOpen={isRedModalOpen}
          onClose={() => {
            setIsRedModalOpen(false);
            setSelectedBasvuruId(null);
          }}
          onConfirm={(sebep) => {
            if (selectedBasvuruId) {
              handleBasvuruReddet(selectedBasvuruId, sebep);
            }
          }}
          isLoading={isProcessing}
        />

        {/* Defter Onay Modal */}
        <OnayModal
          isOpen={isDefterOnayModalOpen}
          onClose={() => {
            setIsDefterOnayModalOpen(false);
            setSelectedDefterId(null);
          }}
          onConfirm={(aciklama) => {
            if (selectedDefterId) {
              handleDefterDurumGuncelle(selectedDefterId, "ONAYLANDI", aciklama);
              setIsDefterOnayModalOpen(false);
              setSelectedDefterId(null);
            }
          }}
          isLoading={isProcessing}
        />

        {/* Defter Red Modal */}
        <RedModal
          isOpen={isDefterRedModalOpen}
          onClose={() => {
            setIsDefterRedModalOpen(false);
            setSelectedDefterId(null);
          }}
          onConfirm={(sebep) => {
            if (selectedDefterId) {
              handleDefterDurumGuncelle(selectedDefterId, "REDDEDILDI", sebep);
              setIsDefterRedModalOpen(false);
              setSelectedDefterId(null);
            }
          }}
          isLoading={isProcessing}
        />

        <OgrenciModal
          isOpen={isOgrenciModalOpen}
          onClose={() => {
            setIsOgrenciModalOpen(false);
            setSelectedOgrenci(null);
            setOgrenciBasvurular([]);
          }}
          ogrenci={selectedOgrenci}
          basvurular={ogrenciBasvurular}
          isLoading={isOgrenciLoading}
        />

        <BasvuruDetayModal
          isOpen={isBasvuruDetayModalOpen}
          onClose={() => {
            setIsBasvuruDetayModalOpen(false);
            setSelectedBasvuruDetayId(null);
          }}
          basvuruId={selectedBasvuruDetayId}
          onOnayla={(id: number, aciklama?: string) =>
            handleBasvuruOnayla(id, aciklama)
          }
          onReddet={(id: number, sebep: string) =>
            handleBasvuruReddet(id, sebep)
          }
          isProcessing={isProcessing}
        />

        <DefterDetayModal
          isOpen={isDefterDetayModalOpen}
          onClose={() => {
            setIsDefterDetayModalOpen(false);
            setSelectedDefterId(null);
          }}
          defterId={selectedDefterId}
          onPdfDownload={handleDefterPdfDownload}
        />

        {/* Muafiyet Onay Modal */}
        <OnayModal
          isOpen={isMuafiyetOnayModalOpen}
          onClose={() => {
            setIsMuafiyetOnayModalOpen(false);
            setSelectedMuafiyetId(null);
          }}
          onConfirm={(aciklama) => {
            if (selectedMuafiyetId) {
              handleMuafiyetOnayla(selectedMuafiyetId, aciklama);
            }
          }}
          isLoading={isProcessing}
        />

        {/* Muafiyet Red Modal */}
        <RedModal
          isOpen={isMuafiyetRedModalOpen}
          onClose={() => {
            setIsMuafiyetRedModalOpen(false);
            setSelectedMuafiyetId(null);
          }}
          onConfirm={(redSebebi) => {
            if (selectedMuafiyetId) {
              handleMuafiyetReddet(selectedMuafiyetId, redSebebi);
            }
          }}
          isLoading={isProcessing}
        />
      </div>

      <Footer />
    </div>
  );
}

export default DanismanPanel;
