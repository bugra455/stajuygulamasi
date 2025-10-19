import { useTranslation } from "../../hooks/useTranslation";
interface Ogrenci {
  id: number;
  name: string;
  email: string;
  studentId: string;
  faculty: string;
  department?: string;
  class: string;
  toplamBasvuru: number;
  sonBasvuruTarihi: string;
}

interface OgrencilerTabProps {
  ogrenciler: Ogrenci[];
  totalCount?: number;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onOgrenciDetay: (ogrenci: Ogrenci) => void | Promise<void>;
}

export default function OgrencilerTabDanisman({
  ogrenciler,
  totalCount,
  searchTerm,
  onSearchChange,
  currentPage,
  totalPages,
  onPageChange,
  onOgrenciDetay
}: OgrencilerTabProps) {
  const { t } = useTranslation();
  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-text-dark flex items-center gap-2">
          <span className="text-2xl">👥</span>
          <span className="break-words">{t("pages.danismanPanel.tabs.students")} ({totalCount ?? ogrenciler.length})</span>
        </h2>
      </div>

      {/* Search Bar */}
      <div className="mb-4 sm:mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 sm:p-4 rounded-lg border border-blue-200">
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="🔍 Öğrenci adı, soyad, numara, email ile arama yapın..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue-500 focus:border-accent-blue-500 transition-colors text-sm sm:text-base"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {ogrenciler.length > 0 ? (
        <>
          {/* Desktop Table View - Hidden on mobile */}
          <div className="hidden lg:block space-y-4 mb-6">
            {ogrenciler.map((ogrenci) => (
              <div
                key={ogrenci.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onOgrenciDetay(ogrenci)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-text-dark mb-2">
                      {ogrenci.name}
                    </h3>
                    <p className="text-text-light mb-1">{ogrenci.email}</p>
                    <p className="text-sm text-text-light">
                      {t("student.id")}: <span className="font-medium">{ogrenci.studentId}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-4 py-2 bg-blue-100 text-blue-800 border border-blue-200 rounded-full text-sm font-medium">
                      {ogrenci.toplamBasvuru} Başvuru
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="text-text-light block">{t("student.faculty")}:</span>
                    <span className="font-medium">{ogrenci.faculty}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="text-text-light block">{t("student.class")}:</span>
                    <span className="font-medium">{ogrenci.class || "Belirtilmemiş"}</span>
                  </div>
                </div>

                {ogrenci.sonBasvuruTarihi && (
                  <div className="bg-green-50 p-3 rounded mb-4">
                    <span className="text-green-700 text-sm font-medium">
                      {t("student.lastApplication")}: {new Date(ogrenci.sonBasvuruTarihi).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOgrenciDetay(ogrenci);
                    }}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    {t("student.viewDetails")}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Grid View - Visible on mobile/tablet */}
          <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
            {ogrenciler.map((ogrenci) => (
              <div
                key={ogrenci.id}
                className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                onClick={() => onOgrenciDetay(ogrenci)}
              >
                {/* Header */}
                <div className="mb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-gray-900 break-words line-clamp-2">
                        👤 {ogrenci.name}
                      </h3>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded-md inline-block">
                      🆔 {ogrenci.studentId}
                    </p>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="mb-3 bg-green-50 p-2 rounded-lg">
                  <div className="text-xs text-green-700 font-medium mb-1">📧 İletişim</div>
                  <div className="text-xs text-green-900 font-semibold break-all">
                    {ogrenci.email}
                  </div>
                </div>

                {/* Academic Info */}
                <div className="grid grid-cols-1 gap-2 mb-3">
                  <div className="bg-orange-50 p-2 rounded-lg">
                    <div className="text-xs text-orange-700 font-medium mb-1">🏛️ Fakülte</div>
                    <div className="text-xs text-orange-900 font-semibold break-words">
                      {ogrenci.faculty}
                    </div>
                  </div>
                  {ogrenci.class && (
                    <div className="bg-indigo-50 p-2 rounded-lg">
                      <div className="text-xs text-indigo-700 font-medium mb-1">📚 Sınıf</div>
                      <div className="text-xs text-indigo-900 font-semibold">
                        {ogrenci.class}
                      </div>
                    </div>
                  )}
                  {ogrenci.sonBasvuruTarihi && (
                    <div className="bg-cyan-50 p-2 rounded-lg">
                      <div className="text-xs text-cyan-700 font-medium mb-1">📅 Son Başvuru</div>
                      <div className="text-xs text-cyan-900 font-semibold">
                        {new Date(ogrenci.sonBasvuruTarihi).toLocaleDateString("tr-TR")}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOgrenciDetay(ogrenci);
                  }}
                  className="w-full px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-xs font-medium flex items-center justify-center gap-1"
                >
                  <span>📄</span>
                  <span>Detayları Görüntüle</span>
                </button>
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
                <span>{t("pagination.previous")}</span>
              </button>
              
              <span className="px-4 py-2 text-sm text-text-light font-medium bg-white rounded-lg border">
                {t("pagination.page")} {currentPage} / {totalPages}
              </span>
              
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-full sm:w-auto px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
              >
                <span>{t("pagination.next")}</span>
                <span>➡️</span>
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 sm:py-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border border-gray-200">
          <div className="text-gray-400 mb-4">
            <div className="text-4xl sm:text-6xl mb-2">👥</div>
            <svg className="hidden sm:block w-12 h-12 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-text-light text-base sm:text-lg font-medium">{t("student.noStudents")}</p>
          <p className="text-text-light text-xs sm:text-sm mt-2 max-w-md mx-auto">{t("student.assignedStudents")}</p>
        </div>
      )}
    </div>
  );
}
