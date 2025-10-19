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

interface BasvurularTabProps {
  basvurular: Basvuru[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onBasvuruClick?: (basvuruId: number) => void;
  onOnayla: (id: number, aciklama?: string) => void;
  onReddet: (id: number, sebep: string) => void;
  isProcessing: boolean;
}

// Utility functions
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
    case 'IPTAL_EDILDI':
      return 'bg-gray-100 text-gray-800 border border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
};

const getStatusText = (durum: string, t: (key: string) => string): string => {
  switch (durum) {
    case 'HOCA_ONAYI_BEKLIYOR':
      return t("pages.danismanPanel.statusAdvisorApproval");
    case 'KARIYER_MERKEZI_ONAYI_BEKLIYOR':
      return t("pages.danismanPanel.statusCareerApproval");
    case 'SIRKET_ONAYI_BEKLIYOR':
      return t("pages.danismanPanel.statusCompanyApproval");
    case 'ONAYLANDI':
      return t("common.approved");
    case 'REDDEDILDI':
      return t("common.rejected");
    case 'IPTAL_EDILDI':
      return t("common.cancelled");
    default:
      return durum;
  }
};

export default function BasvurularTabDanisman({
  basvurular,
  searchTerm,
  onSearchChange,
  currentPage,
  totalPages,
  onPageChange,
  onBasvuruClick,
}: BasvurularTabProps) {
  const { t } = useTranslation();

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-text-dark flex items-center gap-2">
          <span className="text-2xl">📋</span>
          <span className="break-words">{t("advisor.allApplications")} ({basvurular.length})</span>
        </h2>
      </div>

      {/* Search Bar */}
      <div className="mb-4 sm:mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 sm:p-4 rounded-lg border border-blue-200">
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="🔍 Öğrenci adı, soyad, numara ile arama yapın... (şirket adı, staj türü de aranabilir)"
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
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer truncate"
                onClick={() => onBasvuruClick?.(basvuru.id)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-text-dark mb-2">
                      {basvuru.kurumAdi}
                    </h3>
                    <p className="text-text-light mb-1">{basvuru.stajTipi}</p>
                    <p className="text-sm text-text-light">
                      {t("pages.danismanPanel.student")}: <span className="font-medium">{basvuru.ogrenci.name}</span> 
                      <span className="ml-2">({basvuru.ogrenci.studentId})</span>
                    </p>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(basvuru.onayDurumu)}`}>
                    {getStatusText(basvuru.onayDurumu, t)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="text-text-light block">{t("pages.danismanPanel.startDate")}:</span>
                    <span className="font-medium">
                      {new Date(basvuru.baslangicTarihi).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="text-text-light block">{t("pages.danismanPanel.endDate")}:</span>
                    <span className="font-medium">
                      {new Date(basvuru.bitisTarihi).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onBasvuruClick?.(basvuru.id);
                    }}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    {t("common.details")}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Grid View - Visible on mobile/tablet */}
          <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
            {basvurular.map((basvuru) => (
              <div
                key={basvuru.id}
                className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                onClick={() => onBasvuruClick?.(basvuru.id)}
              >
                {/* Header */}
                <div className="mb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-gray-900 break-words line-clamp-2">
                        🏢 {basvuru.kurumAdi}
                      </h3>
                    </div>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(basvuru.onayDurumu)}`}>
                      {getStatusText(basvuru.onayDurumu, t)}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded-md inline-block">
                      📋 {basvuru.stajTipi}
                    </p>
                  </div>
                </div>

                {/* Student Info */}
                <div className="mb-3 bg-blue-50 p-2 rounded-lg">
                  <div className="text-xs text-blue-700 font-medium mb-1">👤 Öğrenci</div>
                  <div className="text-xs text-blue-900 font-semibold break-words">
                    {basvuru.ogrenci.name}
                  </div>
                  <div className="text-xs text-blue-700 font-mono">
                    {basvuru.ogrenci.studentId}
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

                {/* Action Buttons */}
                <div className="flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onBasvuruClick?.(basvuru.id);
                    }}
                    className="w-full px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-xs font-medium flex items-center justify-center gap-1"
                  >
                    <span>📄</span>
                    <span>Detayları Görüntüle</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 bg-gray-50 p-3 sm:p-4 rounded-lg">
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
        <div className="text-center py-8 sm:py-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border border-gray-200">
          <div className="text-gray-400 mb-4">
            <div className="text-4xl sm:text-6xl mb-2">📋</div>
            <svg className="hidden sm:block w-12 h-12 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-text-light text-base sm:text-lg font-medium">{t("common.noApplications")}</p>
          <p className="text-text-light text-xs sm:text-sm mt-2 max-w-md mx-auto">{t("common.noApplicationsDescription")}</p>
        </div>
      )}
    </div>
  );
}
