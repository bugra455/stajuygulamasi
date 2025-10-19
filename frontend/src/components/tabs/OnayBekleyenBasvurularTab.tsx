import { useTranslation } from "../../hooks/useTranslation";

interface Basvuru {
  id: number;
  kurumAdi: string;
  stajTipi: string;
  baslangicTarihi: string;
  bitisTarihi: string;
  onayDurumu: string;
  createdAt: string;
  ogrenci: {
    id: number;
    name: string;
    email: string;
    studentId: string;
  };
}

interface OnayBekleyenBasvurularTabProps {
  basvurular: Basvuru[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onOnayla: (id: number, aciklama?: string) => void;
  onReddet: (id: number, sebep: string) => void;
  isProcessing: boolean;
  onBasvuruClick?: (basvuruId: number) => void;
}

// Utility functions
const getStatusColor = (durum: string): string => {
  switch (durum) {
    case "HOCA_ONAYI_BEKLIYOR":
      return "bg-yellow-100 text-yellow-800 border border-yellow-200";
    case "KARIYER_MERKEZI_ONAYI_BEKLIYOR":
      return "bg-blue-100 text-blue-800 border border-blue-200";
    case "SIRKET_ONAYI_BEKLIYOR":
      return "bg-purple-100 text-purple-800 border border-purple-200";
    case "ONAYLANDI":
      return "bg-green-100 text-green-800 border border-green-200";
    case "REDDEDILDI":
      return "bg-red-100 text-red-800 border border-red-200";
    case "IPTAL_EDILDI":
      return "bg-gray-100 text-gray-800 border border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border border-gray-200";
  }
};

const getStatusText = (durum: string, t: (key: string) => string): string => {
  switch (durum) {
    case "HOCA_ONAYI_BEKLIYOR":
      return t("pages.danismanPanel.statusAdvisorApproval");
    case "KARIYER_MERKEZI_ONAYI_BEKLIYOR":
      return t("pages.danismanPanel.statusCareerApproval");
    case "SIRKET_ONAYI_BEKLIYOR":
      return t("pages.danismanPanel.statusCompanyApproval");
    case "ONAYLANDI":
      return t("common.approved");
    case "REDDEDILDI":
      return t("common.rejected");
    case "IPTAL_EDILDI":
      return t("common.cancelled");
    default:
      return t("common.unknown");
  }
};

export default function OnayBekleyenBasvurularTab({
  basvurular,
  searchTerm,
  onSearchChange,
  currentPage,
  totalPages,
  onPageChange,
  onBasvuruClick,
}: OnayBekleyenBasvurularTabProps) {


  const { t } = useTranslation();
  return (
    <>
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-text-dark flex items-center gap-2">
            <span className="text-2xl animate-pulse">⏳</span>
            <span className="break-words">{t("pages.kariyerPanel.tabs.pendingApprovals")} ({basvurular.length})</span>
          </h2>
        </div>

        {/* Search Bar */}
        <div className="mb-4 sm:mb-6">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 sm:p-4 rounded-lg border border-yellow-200">
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="⏳ Öğrenci adı, soyad, numara ile arama yapın... (şirket adı, staj türü de aranabilir)"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue-500 focus:border-accent-blue-500 transition-colors text-sm sm:text-base"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        {basvurular.length > 0 ? (
          <>
            {/* Desktop Table View - Hidden on mobile */}
            <div className="hidden lg:block space-y-4 mb-6">
              {basvurular.map((basvuru) => (
                <div
                  key={basvuru.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-accent-blue-300 transition-all cursor-pointer relative group"
                  onClick={() => onBasvuruClick && onBasvuruClick(basvuru.id)}
                >
                  {/* Clickable indicator */}
                  {onBasvuruClick && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-accent-blue-600 bg-accent-blue-50 px-2 py-1 rounded-full">
                        📋 {t("pages.kariyerPanel.viewDetails")}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-text-dark mb-2">
                        {basvuru.ogrenci.name} - {basvuru.ogrenci.studentId}
                      </h3>
                      <p className="text-text-light mb-1">{basvuru.stajTipi}</p>
                      <p className="text-sm text-text-light">
                        {t("pages.kariyerPanel.companyName")}:{" "}
                        <span className="font-medium ml-1 text-accent-blue-600">
                          {basvuru.kurumAdi}
                        </span>
                      </p>
                    </div>
                    <span
                      className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                        basvuru.onayDurumu
                      )}`}
                    >
                      {getStatusText(basvuru.onayDurumu, t)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <span className="text-text-light block">
                        {t("pages.stajBasvuru.internshipDates.startDate")}
                      </span>
                      <span className="font-medium">
                        {new Date(basvuru.baslangicTarihi).toLocaleDateString(
                          "tr-TR"
                        )}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <span className="text-text-light block">
                        {t("pages.stajBasvuru.internshipDates.endDate")}
                      </span>
                      <span className="font-medium">
                        {new Date(basvuru.bitisTarihi).toLocaleDateString(
                          "tr-TR"
                        )}
                      </span>
                    </div>
                  </div>

                  {basvuru.onayDurumu === "HOCA_ONAYI_BEKLIYOR" && (
                    <div
                      className="flex gap-3"
                      onClick={(e) => e.stopPropagation()}
                    >

                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile Grid View - Visible on mobile/tablet */}
            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
              {basvurular.map((basvuru) => (
                <div
                  key={basvuru.id}
                  className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                  onClick={() => onBasvuruClick && onBasvuruClick(basvuru.id)}
                >
                  {/* Header */}
                  <div className="mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-gray-900 break-words line-clamp-2">
                          👤 {basvuru.ogrenci.name}
                        </h3>
                        <p className="text-xs text-gray-600 font-mono mt-1">
                          🆔 {basvuru.ogrenci.studentId}
                        </p>
                      </div>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(basvuru.onayDurumu)}`}>
                        ⏳ Onay Bekliyor
                      </span>
                    </div>
                  </div>

                  {/* Company Info */}
                  <div className="mb-3 bg-blue-50 p-2 rounded-lg">
                    <div className="text-xs text-blue-700 font-medium mb-1">🏢 Şirket</div>
                    <div className="text-xs text-blue-900 font-semibold break-words">
                      {basvuru.kurumAdi}
                    </div>
                  </div>

                  {/* Internship Type */}
                  <div className="mb-3 bg-purple-50 p-2 rounded-lg">
                    <div className="text-xs text-purple-700 font-medium mb-1">📋 Staj Türü</div>
                    <div className="text-xs text-purple-900 font-semibold">
                      {basvuru.stajTipi}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-green-50 p-2 rounded-lg">
                      <div className="text-xs text-green-700 font-medium mb-1">🚀 Başlangıç</div>
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
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 bg-yellow-50 p-3 sm:p-4 rounded-lg border border-yellow-200">
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="w-full sm:w-auto px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                >
                  <span>⬅️</span>
                  <span>{t("common.previous")}</span>
                </button>

                <span className="px-4 py-2 text-sm text-text-light font-medium bg-white rounded-lg border">
                  {t("common.page")} {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="w-full sm:w-auto px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                >
                  <span>{t("common.next")}</span>
                  <span>➡️</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 sm:py-12 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
            <div className="text-gray-400 mb-4">
              <div className="text-4xl sm:text-6xl mb-2">⏳</div>
              <svg className="hidden sm:block w-12 h-12 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-text-light text-base sm:text-lg font-medium">Onay Bekleyen Başvuru Yok</p>
            <p className="text-text-light text-xs sm:text-sm mt-2 max-w-md mx-auto">Şu anda onayınızı bekleyen herhangi bir staj başvurusu bulunmamaktadır.</p>
          </div>
        )}
      </div>
    </>
  );
}
