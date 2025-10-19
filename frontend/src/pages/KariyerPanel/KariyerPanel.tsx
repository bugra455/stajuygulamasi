import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import OgrenciDetayModal from "../../components/modals/OgrenciDetayModal";
import DanismanDetayModal from "../../components/modals/DanismanDetayModal";
import SirketDetayModal from "../../components/modals/SirketDetayModal";
import OnayBekleyenlerTab from "../../components/tabs/OnayBekleyenlerTab";
import OgrencilerTab from "../../components/tabs/OgrencilerTab";
import DanismanlarTab from "../../components/tabs/DanismanlarTab";
import SirketlerTab from "../../components/tabs/SirketlerTab";
import BasvurularTab from "../../components/tabs/BasvurularTab";
import OnaylanmisBasvurularTab from "../../components/tabs/OnaylanmisBasvurularTab";
import KariyerMerkeziOnayModal from "../../components/modals/KariyerMerkeziOnayModal";
import KariyerBasvuruDetayModal from "../../components/modals/KariyerBasvuruDetayModal";
import BasvuruDetayModal from "../../components/modals/BasvuruDetayModal";
import { useTranslation } from "../../hooks/useTranslation";
import AppNotification from "../../components/common/AppNotification";
import i18n from '../../i18n';

interface User {
  id: number;
  name: string;
  email: string;
  userType: string;
  studentId?: string;
  tcKimlik?: string;
  faculty?: string;
  class?: string;
}

interface Basvuru {
  id: number;
  kurumAdi: string;
  baslangicTarihi: string;
  bitisTarihi: string;
  onayDurumu: string;
  stajTipi: string;
  toplamGun: number;
  createdAt: string;
  transkriptDosyasi?: string;
  sigortaDosyasi?: string;
  hizmetDokumu?: string;
  defter?: {
    id: number;
    defterDurumu: string;
    dosyaYolu?: string;
    originalFileName?: string;
    uploadDate?: string;
  };
  ogrenci: User;
}

interface Sirket {
  kurumAdi: string;
  kurumAdresi: string;
  yetkiliAdi: string;
  yetkiliUnvani: string;
  sorumluMail: string;
  sorumluTelefon: string;
}

export default function KariyerPanel() {
  const { user, isAuthenticated, logout, isKariyer } = useAuth();
  const navigate = useNavigate();
  const { t, translateError } = useTranslation();
  // Force Turkish locale for Kariyer panel pages only, restore on unmount
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    | "onay-bekleyenler"
    | "ogrenciler"
    | "danismanlar"
    | "sirketler"
    | "basvurular"
    | "onaylanmis-basvurular"
  >("onay-bekleyenler");

  // Data states
  const [onayBekleyenler, setOnayBekleyenler] = useState<Basvuru[]>([]);
  const [ogrenciler, setOgrenciler] = useState<User[]>([]);
  const [danismanlar, setDanismanlar] = useState<User[]>([]);
  const [danismanTotalCount, setDanismanTotalCount] = useState<number>(0);
  const [sirketler, setSirketler] = useState<Sirket[]>([]);
  const [basvurular, setBasvurular] = useState<Basvuru[]>([]);
  const [onaylanmisBasvurular, setOnaylanmisBasvurular] = useState<Basvuru[]>([]);

  // Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [facultyFilter, setFacultyFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Approved applications specific filters
  const [stajTipiFilter, setStajTipiFilter] = useState("");
  const [baslangicTarihiFrom, setBaslangicTarihiFrom] = useState("");
  const [baslangicTarihiTo, setBaslangicTarihiTo] = useState("");
  const [bitisTarihiFrom, setBitisTarihiFrom] = useState("");
  const [bitisTarihiTo, setBitisTarihiTo] = useState("");

  // Filter lists
  const [facultyList, setFacultyList] = useState<string[]>([]);
  const [stajTipleri, setStajTipleri] = useState<string[]>([]);

  // Modal states
  const [selectedOgrenciId, setSelectedOgrenciId] = useState<number | null>(
    null,
  );
  const [selectedDanismanId, setSelectedDanismanId] = useState<number | null>(
    null,
  );
  const [selectedSirketAdi, setSelectedSirketAdi] = useState<string | null>(
    null,
  );
  const [isOgrenciModalOpen, setIsOgrenciModalOpen] = useState(false);
  const [isDanismanModalOpen, setIsDanismanModalOpen] = useState(false);
  const [isSirketModalOpen, setIsSirketModalOpen] = useState(false);

  // Approval modal states
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<
    "ONAYLANDI" | "REDDEDILDI" | null
  >(null);
  const [selectedBasvuruId, setSelectedBasvuruId] = useState<number | null>(
    null,
  );

  // Detay modal states
  const [isBasvuruDetayModalOpen, setIsBasvuruDetayModalOpen] = useState(false);
  const [selectedBasvuruDetayId, setSelectedBasvuruDetayId] = useState<
    number | null
  >(null);

  // Onay bekleyenler için ayrı detay modal
  const [isOnayBekleyenDetayModalOpen, setIsOnayBekleyenDetayModalOpen] =
    useState(false);
  const [selectedOnayBekleyenDetayId, setSelectedOnayBekleyenDetayId] =
    useState<number | null>(null);

  // Pagination states - separate for each tab like DanismanPanel
  const pageSize = 10;
  const [totalCount, setTotalCount] = useState(0);
  
  // Tab-specific page states
  const [onayBekleyenlerPage, setOnayBekleyenlerPage] = useState(1);
  const [ogrencilerPage, setOgrencilerPage] = useState(1);
  const [danismanlarPage, setDanismanlarPage] = useState(1);
  const [sirketlerPage, setSirketlerPage] = useState(1);
  const [basvurularPage, setBasvurularPage] = useState(1);
  const [onaylanmisBasvurularPage, setOnaylanmisBasvurularPage] = useState(1);

  // Tab-specific scroll positions
  const [scrollPositions, setScrollPositions] = useState<Record<string, number>>({});

  const fetchData = useCallback(
    async (showLoading = true, searchParams?: {
      searchTerm?: string;
      statusFilter?: string;
      facultyFilter?: string;
      stajTipiFilter?: string;
      baslangicTarihiFrom?: string;
      baslangicTarihiTo?: string;
      bitisTarihiFrom?: string;
      bitisTarihiTo?: string;
    }) => {
      if (!isAuthenticated || !isKariyer()) {
        return;
      }
      if (showLoading) {
        setLoading(true);
      }
      try {
        let data, pagination;
        const currentSearchTerm = searchParams?.searchTerm ?? searchTerm;
        const currentStatusFilter = searchParams?.statusFilter ?? statusFilter;
        const currentFacultyFilter = searchParams?.facultyFilter ?? facultyFilter;
        const currentStajTipiFilter = searchParams?.stajTipiFilter ?? stajTipiFilter;
        const currentBaslangicTarihiFrom = searchParams?.baslangicTarihiFrom ?? baslangicTarihiFrom;
        const currentBaslangicTarihiTo = searchParams?.baslangicTarihiTo ?? baslangicTarihiTo;
        const currentBitisTarihiFrom = searchParams?.bitisTarihiFrom ?? bitisTarihiFrom;
        const currentBitisTarihiTo = searchParams?.bitisTarihiTo ?? bitisTarihiTo;

        if (activeTab === "onay-bekleyenler") {
          const res = await api.searchKariyerBasvurular({
            search: currentSearchTerm,
            onayDurumu: "KARIYER_MERKEZI_ONAYI_BEKLIYOR",
            page: onayBekleyenlerPage,
            limit: pageSize,
          });
          data = res.data || [];
          pagination = res.pagination;
          setOnayBekleyenler(data);
        } else if (activeTab === "ogrenciler") {
          const res = await api.searchKariyerOgrenciler({
            search: currentSearchTerm,
            page: ogrencilerPage,
            limit: pageSize,
          });
          data = res.data || [];
          pagination = res.pagination;
          setOgrenciler(data);
          setTotalCount(pagination?.total || data.length);
        } else if (activeTab === "danismanlar") {
          const res = await api.searchKariyerDanismanlar({
            search: currentSearchTerm,
            page: danismanlarPage,
            limit: pageSize,
          });
          data = res.data || [];
          pagination = res.pagination;
          setDanismanlar(data);
          setDanismanTotalCount(pagination?.total || data.length);
        } else if (activeTab === "sirketler") {
          const res = await api.searchKariyerSirketler({
            search: currentSearchTerm,
            page: sirketlerPage,
            limit: pageSize,
          });
          data = res.data || [];
          pagination = res.pagination;
          setSirketler(data);
          setTotalCount(pagination?.total || data.length);
        } else if (activeTab === "basvurular") {
          const res = await api.searchKariyerBasvurular({
            search: currentSearchTerm,
            onayDurumu: currentStatusFilter,
            page: basvurularPage,
            limit: pageSize,
          });
          data = res.data || [];
          pagination = res.pagination;
          setTotalCount(pagination?.total || data.length);
          setBasvurular(data);
        } else if (activeTab === "onaylanmis-basvurular") {
          const res = await api.searchOnaylanmisBasvurular({
            search: currentSearchTerm,
            faculty: currentFacultyFilter,
            stajTipi: currentStajTipiFilter,
            baslangicTarihiFrom: currentBaslangicTarihiFrom,
            baslangicTarihiTo: currentBaslangicTarihiTo,
            bitisTarihiFrom: currentBitisTarihiFrom,
            bitisTarihiTo: currentBitisTarihiTo,
            page: onaylanmisBasvurularPage,
            limit: pageSize,
          });
          data = res.data || [];
          pagination = res.pagination;
          setOnaylanmisBasvurular(data);
        }
        setTotalCount(pagination?.total || 0);
        setError(null);
      } catch (err) {
        const error = err as { message?: string };
        setError(error.message || "Veri alınırken bir hata oluştu.");
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [
      activeTab,
      onayBekleyenlerPage,
      ogrencilerPage,
      danismanlarPage,
      sirketlerPage,
      basvurularPage,
      onaylanmisBasvurularPage,
      searchTerm,
      statusFilter,
      facultyFilter,
      stajTipiFilter,
      baslangicTarihiFrom,
      baslangicTarihiTo,
      bitisTarihiFrom,
      bitisTarihiTo,
      isAuthenticated,
      isKariyer,
      pageSize,
    ],
  );

  // Initial load and tab/page changes
  useEffect(() => {
    if (!isAuthenticated || !isKariyer()) {
      navigate("/");
      return;
    }
    fetchData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, onayBekleyenlerPage, ogrencilerPage, danismanlarPage, sirketlerPage, basvurularPage, onaylanmisBasvurularPage]);

  // Load filter data
  useEffect(() => {
    const loadFilterData = async () => {
      if (!isAuthenticated || !isKariyer()) {
        return;
      }
      try {
        const [facultiesRes, stajTipleriRes] = await Promise.all([
          api.getKariyerBolumler(),
          api.getKariyerStajTipleri()
        ]);
        
        if (facultiesRes.success) {
          setFacultyList(facultiesRes.data);
        }
        
        if (stajTipleriRes.success) {
          setStajTipleri(stajTipleriRes.data);
        }
      } catch (error) {
        console.error('Filter data yüklenirken hata:', error);
      }
    };

    loadFilterData();
  }, [isAuthenticated, isKariyer]);

  // Restore scroll position after tab change and data load
  useEffect(() => {
    if (!loading && scrollPositions[activeTab] !== undefined) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        window.scrollTo(0, scrollPositions[activeTab]);
      }, 100);
    }
  }, [activeTab, loading, scrollPositions]);

  // Helper functions to get current page and setter for active tab
  const getCurrentPageForTab = useCallback((tab: typeof activeTab) => {
    switch (tab) {
      case "onay-bekleyenler": return onayBekleyenlerPage;
      case "ogrenciler": return ogrencilerPage;
      case "danismanlar": return danismanlarPage;
      case "sirketler": return sirketlerPage;
      case "basvurular": return basvurularPage;
      case "onaylanmis-basvurular": return onaylanmisBasvurularPage;
      default: return 1;
    }
  }, [onayBekleyenlerPage, ogrencilerPage, danismanlarPage, sirketlerPage, basvurularPage, onaylanmisBasvurularPage]);

  const getSetterForTab = useCallback((tab: typeof activeTab) => {
    switch (tab) {
      case "onay-bekleyenler": return setOnayBekleyenlerPage;
      case "ogrenciler": return setOgrencilerPage;
      case "danismanlar": return setDanismanlarPage;
      case "sirketler": return setSirketlerPage;
      case "basvurular": return setBasvurularPage;
      case "onaylanmis-basvurular": return setOnaylanmisBasvurularPage;
      default: return setOnayBekleyenlerPage;
    }
  }, [setOnayBekleyenlerPage, setOgrencilerPage, setDanismanlarPage, setSirketlerPage, setBasvurularPage, setOnaylanmisBasvurularPage]);

  // Manual search function for approved applications
  const handleManualSearch = useCallback(() => {
    const currentPage = getCurrentPageForTab(activeTab);
    const setCurrentPage = getSetterForTab(activeTab);
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      fetchData(false);
    }
  }, [activeTab, getCurrentPageForTab, getSetterForTab, fetchData]);

  // Automatic search for all tabs except approved applications
  useEffect(() => {
    if (!isAuthenticated || !isKariyer()) {
      return;
    }

    // Skip automatic search for approved applications tab
    if (activeTab === "onaylanmis-basvurular") {
      return;
    }

    const timeoutId = setTimeout(() => {
      // We call fetchData(false) to avoid the loading spinner on search.
      // We also reset to page 1 for new searches.
      const currentPage = getCurrentPageForTab(activeTab);
      const setCurrentPage = getSetterForTab(activeTab);
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchData(false);
      }
    }, 300); // Debounce search for 300ms

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, facultyFilter, stajTipiFilter]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const onaylaBasvuru = (basvuruId: number) => {
    setSelectedBasvuruId(basvuruId);
    setApprovalAction("ONAYLANDI");
    setIsApprovalModalOpen(true);
  };

  const reddetBasvuru = (basvuruId: number) => {
    setSelectedBasvuruId(basvuruId);
    setApprovalAction("REDDEDILDI");
    setIsApprovalModalOpen(true);
  };

  const handleApprovalConfirm = async (
    basvuruId: number,
    actionType: "ONAYLANDI" | "REDDEDILDI",
    aciklama?: string,
  ) => {
    try {
      if (actionType === "ONAYLANDI") {
        await api.onaylaKariyerBasvuru(
          basvuruId,
          aciklama || t("modals.basvuruDetay.careerCenterApprovalNote"),
        );
      } else {
        await api.reddetKariyerBasvuru(
          basvuruId,
          aciklama || t("modals.basvuruDetay.careerCenterRejectionNote"),
        );
      }

      setOnayBekleyenler((prev) => prev.filter((b) => b.id !== basvuruId));
      setBasvurular((prev) => prev.filter((b) => b.id !== basvuruId));
      setError(null);
      fetchData(false); // Re-fetch data to update the list without showing loader
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || "İşlem sırasında hata oluştu");
    }
  };

  // Onay bekleyenler için detay handler - BasvuruDetayModal açar
  const handleOnayBekleyenDetayClick = (basvuruId: number) => {
    setSelectedOnayBekleyenDetayId(basvuruId);
    setIsOnayBekleyenDetayModalOpen(true);
  };

  // Modal handlers
  const openOgrenciModal = (ogrenciId: number) => {
    setSelectedOgrenciId(ogrenciId);
    setIsOgrenciModalOpen(true);
  };

  const openDanismanModal = (danismanId: number) => {
    setSelectedDanismanId(danismanId);
    setIsDanismanModalOpen(true);
  };

  const openSirketModal = (kurumAdi: string) => {
    setSelectedSirketAdi(kurumAdi);
    setIsSirketModalOpen(true);
  };

  const handleTabChange = (tab: typeof activeTab) => {
    // Store current scroll position before switching
    if (typeof window !== 'undefined') {
      setScrollPositions(prev => ({
        ...prev,
        [activeTab]: window.scrollY
      }));
    }

    // Switch to new tab
    setActiveTab(tab);
    
    // Reset filters (pages are maintained separately per tab)
    setSearchTerm("");
    setFacultyFilter("");
    setClassFilter("");
    setStatusFilter("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {error && (
        <AppNotification
          message={translateError(error)}
          type="error"
          onClose={() => setError(null)}
        />
      )}
      <Navbar user={user!} onLogout={handleLogout} />

      <main className="flex-1 max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 w-full">

        {/* Tabs */}
        <div className="overflow-x-auto overflow-y-hidden mb-6">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max">
            {[
              {
                key: "onay-bekleyenler",
                label: t("pages.kariyerPanel.tableHeaders.pendingApprovals"),
                icon: "⏳",
              },
              {
                key: "ogrenciler",
                label: t("pages.kariyerPanel.tableHeaders.students"),
                icon: "👨‍🎓",
              },
              {
                key: "danismanlar",
                label: t("pages.kariyerPanel.tableHeaders.advisors"),
                icon: "👨‍🏫",
              },
              {
                key: "sirketler",
                label: t("pages.kariyerPanel.tableHeaders.companies"),
                icon: "🏢",
              },
              {
                key: "basvurular",
                label: t("pages.kariyerPanel.tableHeaders.application"),
                icon: "📋",
              },
              {
                key: "onaylanmis-basvurular",
                label: "Onaylanmış Başvurular",
                icon: "✅",
              },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key as typeof activeTab)}
                className={`py-3 px-4 sm:px-6 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.key
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className="text-sm sm:text-base">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden text-xs">{tab.label.split(' ')[0]}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {activeTab === "onay-bekleyenler" && (
            <OnayBekleyenlerTab
              onayBekleyenler={onayBekleyenler}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onOpenOgrenciModal={openOgrenciModal}
              onOnaylaBasvuru={onaylaBasvuru}
              onReddetBasvuru={reddetBasvuru}
              onBasvuruDetayClick={handleOnayBekleyenDetayClick}
            />
          )}

          {activeTab === "ogrenciler" && (
            <OgrencilerTab
              ogrenciler={ogrenciler}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              facultyFilter={facultyFilter}
              setFacultyFilter={setFacultyFilter}
              classFilter={classFilter}
              setClassFilter={setClassFilter}
              facultyList={[]}
              classList={[]}
              currentPage={ogrencilerPage}
              totalPages={Math.ceil(totalCount / pageSize)}
              totalCount={totalCount}
              onPageChange={setOgrencilerPage}
              onOpenOgrenciModal={openOgrenciModal}
            />
          )}

          {activeTab === "danismanlar" && (
            <DanismanlarTab
              danismanlar={danismanlar}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onOpenDanismanModal={openDanismanModal}
              totalCount={danismanTotalCount}
            />
          )}

          {activeTab === "sirketler" && (
            <SirketlerTab
              sirketler={sirketler}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onOpenSirketModal={openSirketModal}
              totalCount={totalCount}
            />
          )}

          {activeTab === "basvurular" && (
            <BasvurularTab
              basvurular={basvurular}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              onayDurumList={[]}
              onOpenOgrenciModal={openOgrenciModal}
              totalCount={totalCount}
            />
          )}

          {activeTab === "onaylanmis-basvurular" && (
            <OnaylanmisBasvurularTab
              basvurular={onaylanmisBasvurular}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              facultyFilter={facultyFilter}
              setFacultyFilter={setFacultyFilter}
              stajTipiFilter={stajTipiFilter}
              setStajTipiFilter={setStajTipiFilter}
              baslangicTarihiFrom={baslangicTarihiFrom}
              setBaslangicTarihiFrom={setBaslangicTarihiFrom}
              baslangicTarihiTo={baslangicTarihiTo}
              setBaslangicTarihiTo={setBaslangicTarihiTo}
              bitisTarihiFrom={bitisTarihiFrom}
              setBitisTarihiFrom={setBitisTarihiFrom}
              bitisTarihiTo={bitisTarihiTo}
              setBitisTarihiTo={setBitisTarihiTo}
              onOpenOgrenciModal={openOgrenciModal}
              currentPage={onaylanmisBasvurularPage}
              totalPages={Math.ceil(totalCount / pageSize)}
              onPageChange={setOnaylanmisBasvurularPage}
              facultyList={facultyList}
              stajTipleri={stajTipleri}
              onManualSearch={handleManualSearch}
              fetchData={fetchData}
            />
          )}

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 p-4 border-t border-gray-200">
            <button
              onClick={() => {
                const setCurrentPage = getSetterForTab(activeTab);
                setCurrentPage((p: number) => Math.max(p - 1, 1));
              }}
              disabled={getCurrentPageForTab(activeTab) === 1}
              className="w-full sm:w-auto px-4 py-2 bg-gray-200 rounded disabled:opacity-50 text-sm"
            >
              {t("common.previous")}
            </button>
            <span className="text-sm text-gray-600">
              {t("common.page")} {getCurrentPageForTab(activeTab)} / {Math.ceil(totalCount / pageSize) || 1}
            </span>
            <button
              onClick={() => {
                const setCurrentPage = getSetterForTab(activeTab);
                setCurrentPage((p: number) => p + 1);
              }}
              disabled={getCurrentPageForTab(activeTab) >= Math.ceil(totalCount / pageSize)}
              className="w-full sm:w-auto px-4 py-2 bg-gray-200 rounded disabled:opacity-50 text-sm"
            >
              {t("common.next")}
            </button>
          </div>
        </div>
      </main>

      {/* Modals */}
      {isOgrenciModalOpen && selectedOgrenciId && (
        <OgrenciDetayModal
          ogrenciId={selectedOgrenciId}
          isOpen={isOgrenciModalOpen}
          isKariyerMerkezi={true}
          onClose={() => {
            setIsOgrenciModalOpen(false);
            setSelectedOgrenciId(null);
          }}
        />
      )}

      {isDanismanModalOpen && selectedDanismanId && (
        <DanismanDetayModal
          danismanId={selectedDanismanId}
          isOpen={isDanismanModalOpen}
          onClose={() => {
            setIsDanismanModalOpen(false);
            setSelectedDanismanId(null);
          }}
        />
      )}

      {isSirketModalOpen && selectedSirketAdi && (
        <SirketDetayModal
          kurumAdi={selectedSirketAdi}
          isOpen={isSirketModalOpen}
          onClose={() => {
            setIsSirketModalOpen(false);
            setSelectedSirketAdi(null);
          }}
        />
      )}

      {/* Approval Modal */}
      {isApprovalModalOpen && selectedBasvuruId && approvalAction && (
        <KariyerMerkeziOnayModal
          isOpen={isApprovalModalOpen}
          onClose={() => {
            setIsApprovalModalOpen(false);
            setSelectedBasvuruId(null);
            setApprovalAction(null);
          }}
          basvuruId={selectedBasvuruId}
          actionType={approvalAction}
          onConfirm={handleApprovalConfirm}
        />
      )}

      {/* Başvuru Detay Modal */}
      {isBasvuruDetayModalOpen && selectedBasvuruDetayId && (
        <KariyerBasvuruDetayModal
          isOpen={isBasvuruDetayModalOpen}
          onClose={() => {
            setIsBasvuruDetayModalOpen(false);
            setSelectedBasvuruDetayId(null);
          }}
          basvuruId={selectedBasvuruDetayId}
          onOnayla={(id: number) => {
            setIsBasvuruDetayModalOpen(false);
            setSelectedBasvuruDetayId(null);
            onaylaBasvuru(id);
          }}
          onReddet={(id: number) => {
            setIsBasvuruDetayModalOpen(false);
            setSelectedBasvuruDetayId(null);
            reddetBasvuru(id);
          }}
          isProcessing={false}
        />
      )}

      {/* Onay Bekleyenler için Staj Detay Modal (Danışman stilinde) */}
      {isOnayBekleyenDetayModalOpen && selectedOnayBekleyenDetayId && (
        <BasvuruDetayModal
          isOpen={isOnayBekleyenDetayModalOpen}
          onClose={() => {
            setIsOnayBekleyenDetayModalOpen(false);
            setSelectedOnayBekleyenDetayId(null);
          }}
          basvuruId={selectedOnayBekleyenDetayId}
          userType="KARIYER_MERKEZI"
          onOnayla={(id: number) => {
            setIsOnayBekleyenDetayModalOpen(false);
            setSelectedOnayBekleyenDetayId(null);
            onaylaBasvuru(id);
          }}
          onReddet={(id: number) => {
            setIsOnayBekleyenDetayModalOpen(false);
            setSelectedOnayBekleyenDetayId(null);
            reddetBasvuru(id);
          }}
          isProcessing={false}
        />
      )}

      <Footer />
    </div>
  );
}
