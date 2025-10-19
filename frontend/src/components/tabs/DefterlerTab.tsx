import { getDefterDurumuLabel, getDefterDurumuColor } from '../../utils/helpers';
import { useTranslation } from '../../hooks/useTranslation';

interface Defter {
  id: number;
  defterDurumu: string;
  dosyaYolu?: string;
  originalFileName?: string;
  fileSize?: number;
  uploadDate?: string;
  redSebebi?: string;
  danismanAciklama?: string;
  sirketAciklama?: string;
  danismanOnayDurumu?: number;
  sirketOnayDurumu?: number;
  stajBasvurusu: {
    id: number;
    kurumAdi: string;
    stajTipi: string;
    baslangicTarihi?: string;
    bitisTarihi?: string;
    ogrenci: {
      id: number;
      name: string;
      email: string;
      studentId: string;
    };
  };
}

interface DefterlerTabProps {
  defterler: Defter[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onDurumGuncelle: (id: number, durum: string, sebep?: string) => void;
  onPdfDownload: (id: number, fileName: string) => void;
  onDefterClick?: (defterId: number) => void; 
  isOnayBekleyenler?: boolean;
  onDefterOnay: (defterId: number) => void;
  onDefterRed: (defterId: number) => void;
}

export default function DefterlerTab({
  defterler,
  searchTerm,
  onSearchChange,
  // onSearch,
  // onClearSearch,
  currentPage,
  totalPages,
  onPageChange,
  // onDurumGuncelle,
  onPdfDownload,
  isOnayBekleyenler = false,
  onDefterClick,
  onDefterOnay,
  onDefterRed,
}: DefterlerTabProps) {
  const { t } = useTranslation();

  const handleOnayClick = (defterId: number) => {
    onDefterOnay(defterId);
  };

  const handleRedClick = (defterId: number) => {
    onDefterRed(defterId);
  };

  // Helper function to get the appropriate explanation to display
  const getDisplayExplanation = (defter: Defter) => {
    // If approved, show company explanation if available, otherwise advisor explanation
    if (defter.defterDurumu === 'ONAYLANDI') {
      if (defter.sirketOnayDurumu === 1 && defter.sirketAciklama) {
        return { type: 'approval', source: t("diary.company"), text: defter.sirketAciklama };
      }
      if (defter.danismanOnayDurumu === 1 && defter.danismanAciklama) {
        return { type: 'approval', source: t("diary.advisor"), text: defter.danismanAciklama };
      }
    }
    
    // If rejected, show the rejection reason from the appropriate source
    if (defter.defterDurumu === 'DANISMAN_REDDETTI' && defter.danismanAciklama) {
      return { type: 'rejection', source: t("diary.advisor"), text: defter.danismanAciklama };
    }
    if (defter.defterDurumu === 'SIRKET_REDDETTI' && defter.sirketAciklama) {
      return { type: 'rejection', source: t("diary.company"), text: defter.sirketAciklama };
    }
    
    // Fallback to legacy redSebebi field
    if (defter.redSebebi) {
      return { type: 'rejection', source: t("diary.system"), text: defter.redSebebi };
    }
    
    return null;
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6">{/* Fixed the duplicate return statement */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-text-dark flex items-center gap-2">
          <span className="text-2xl">📚</span>
          <span className="break-words">
            {isOnayBekleyenler ? t("pages.danismanPanel.tabs.diaryApprovals") : t("pages.danismanPanel.tabs.diaries")} ({defterler.length})
          </span>
        </h2>
      </div>

      {/* Search Bar */}
      <div className="mb-4 sm:mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 sm:p-4 rounded-lg border border-blue-200">
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="🔍 Öğrenci adı, soyad, numara ile arama yapın... (şirket adı de aranabilir)"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue-500 focus:border-accent-blue-500 transition-colors text-sm sm:text-base"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {defterler.length > 0 ? (
        <>
          {/* Desktop Table View - Hidden on mobile */}
          <div className="hidden lg:block space-y-4 mb-6">
            {defterler.map((defter) => (
              <div
                key={defter.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onDefterClick && onDefterClick(defter.id)}
              >
                {/* Clickable indicator */}
                {onDefterClick && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-accent-blue-600 bg-accent-blue-50 px-2 py-1 rounded-full">
                      {t("diary.viewDetails")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-text-dark mb-2">
                      {defter.stajBasvurusu.kurumAdi}
                    </h3>
                    <p className="text-text-light mb-1">{defter.stajBasvurusu.stajTipi}</p>
                    <p className="text-sm text-text-light">
                      {t("diary.student")}: <span className="font-medium">{defter.stajBasvurusu.ogrenci.name}</span> 
                      <span className="ml-2">({defter.stajBasvurusu.ogrenci.studentId})</span>
                    </p>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${getDefterDurumuColor(defter.defterDurumu, defter.stajBasvurusu.bitisTarihi, defter.stajBasvurusu.baslangicTarihi)}`}>
                    {getDefterDurumuLabel(defter.defterDurumu, t, defter.stajBasvurusu.bitisTarihi, defter.stajBasvurusu.baslangicTarihi)}
                  </span>
                </div>

                {defter.dosyaYolu && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <span className="text-text-light block">{t("diary.file")}:</span>
                      <span className="font-medium break-words">{defter.originalFileName}</span>
                    </div>
                    {defter.fileSize && (
                      <div className="bg-gray-50 p-3 rounded">
                        <span className="text-text-light block">{t("diary.size")}:</span>
                        <span className="font-medium">{(defter.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    )}
                    {defter.uploadDate && (
                      <div className="bg-gray-50 p-3 rounded">
                        <span className="text-text-light block">{t("diary.uploadedAt")}:</span>
                        <span className="font-medium">{new Date(defter.uploadDate).toLocaleDateString("tr-TR")}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Açıklama/Sebep */}
                {(() => {
                  const explanation = getDisplayExplanation(defter);
                  if (!explanation) return null;
                  
                  const isApproval = explanation.type === 'approval';
                  const bgColor = isApproval ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
                  const textColor = isApproval ? 'text-green-700' : 'text-red-700';
                  const labelColor = isApproval ? 'text-green-600' : 'text-red-600';
                  
                  return (
                    <div className={`mb-4 p-3 ${bgColor} border rounded`}>
                      <p className="text-sm">
                        <span className={`${textColor} font-medium`}>
                          {isApproval ? t("diary.approvalExplanation") : t("diary.rejectionText")} ({explanation.source}):
                        </span>{" "}
                        <span className={labelColor}>{explanation.text}</span>
                      </p>
                    </div>
                  );
                })()}

                <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                  {defter.dosyaYolu && (
                    <button
                      onClick={() => onPdfDownload(defter.id, defter.originalFileName || `defter_${defter.id}.pdf`)}
                      className="px-6 py-2 bg-accent-blue-500 text-white rounded-lg hover:bg-accent-blue-600 transition-colors font-medium"
                    >
                      {t("diary.downloadPDF")}
                    </button>
                  )}

                  {defter.defterDurumu === "DANISMAN_ONAYI_BEKLIYOR" && (
                    <>
                      <button
                        onClick={() => handleOnayClick(defter.id)}
                        className="px-6 py-2 bg-accent-green-500 text-white rounded-lg hover:bg-accent-green-600 transition-colors font-medium"
                      >
                        {t("diary.approve")}
                      </button>
                      <button
                        onClick={() => handleRedClick(defter.id)}
                        className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-accent-red-600 transition-colors font-medium"
                      >
                        {t("diary.reject")}
                      </button>
                    </>
                  )}
                  
                  {onDefterClick && (
                    <button
                      onClick={() => onDefterClick(defter.id)}
                      className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                      {t("common.details")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Grid View - Visible on mobile/tablet */}
          <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
            {defterler.map((defter) => (
              <div
                key={defter.id}
                className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                onClick={() => onDefterClick && onDefterClick(defter.id)}
              >
                {/* Header */}
                <div className="mb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-gray-900 break-words line-clamp-2">
                        🏢 {defter.stajBasvurusu.kurumAdi}
                      </h3>
                    </div>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getDefterDurumuColor(defter.defterDurumu, defter.stajBasvurusu.bitisTarihi, defter.stajBasvurusu.baslangicTarihi)}`}>
                      {getDefterDurumuLabel(defter.defterDurumu, t, defter.stajBasvurusu.bitisTarihi, defter.stajBasvurusu.baslangicTarihi)}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded-md inline-block">
                      📋 {defter.stajBasvurusu.stajTipi}
                    </p>
                  </div>
                </div>

                {/* Student Info */}
                <div className="mb-3 bg-blue-50 p-2 rounded-lg">
                  <div className="text-xs text-blue-700 font-medium mb-1">👤 Öğrenci</div>
                  <div className="text-xs text-blue-900 font-semibold break-words">
                    {defter.stajBasvurusu.ogrenci.name}
                  </div>
                  <div className="text-xs text-blue-700 font-mono">
                    {defter.stajBasvurusu.ogrenci.studentId}
                  </div>
                </div>

                {/* File Info */}
                {defter.dosyaYolu && (
                  <div className="mb-3 bg-orange-50 p-2 rounded-lg">
                    <div className="text-xs text-orange-700 font-medium mb-1">📄 Dosya</div>
                    <div className="text-xs text-orange-900 font-semibold break-words">
                      {defter.originalFileName}
                    </div>
                    {defter.fileSize && (
                      <div className="text-xs text-orange-700 mt-1">
                        Boyut: {(defter.fileSize / 1024 / 1024).toFixed(2)} MB
                      </div>
                    )}
                    {defter.uploadDate && (
                      <div className="text-xs text-orange-700 mt-1">
                        Yükleme: {new Date(defter.uploadDate).toLocaleDateString("tr-TR")}
                      </div>
                    )}
                  </div>
                )}

                {/* Explanation */}
                {(() => {
                  const explanation = getDisplayExplanation(defter);
                  if (!explanation) return null;
                  
                  const isApproval = explanation.type === 'approval';
                  const bgColor = isApproval ? 'bg-green-50' : 'bg-red-50';
                  const textColor = isApproval ? 'text-green-700' : 'text-red-700';
                  
                  return (
                    <div className={`mb-3 ${bgColor} p-2 rounded-lg`}>
                      <div className={`text-xs ${textColor} font-medium mb-1`}>
                        {isApproval ? '✅ Onay' : '❌ Red'} ({explanation.source})
                      </div>
                      <div className={`text-xs ${textColor} break-words`}>
                        {explanation.text}
                      </div>
                    </div>
                  );
                })()}

                {/* Action Buttons */}
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  {defter.dosyaYolu && (
                    <button
                      onClick={() => onPdfDownload(defter.id, defter.originalFileName || `defter_${defter.id}.pdf`)}
                      className="flex-1 px-2 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-xs font-medium flex items-center justify-center gap-1"
                    >
                      <span>📥</span>
                      <span className="hidden sm:inline">İndir</span>
                    </button>
                  )}

                  {defter.defterDurumu === "DANISMAN_ONAYI_BEKLIYOR" && (
                    <>
                      <button
                        onClick={() => handleOnayClick(defter.id)}
                        className="flex-1 px-2 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 text-xs font-medium flex items-center justify-center gap-1"
                      >
                        <span>✅</span>
                        <span className="hidden sm:inline">Onayla</span>
                      </button>
                      <button
                        onClick={() => handleRedClick(defter.id)}
                        className="flex-1 px-2 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 text-xs font-medium flex items-center justify-center gap-1"
                      >
                        <span>❌</span>
                        <span className="hidden sm:inline">Reddet</span>
                      </button>
                    </>
                  )}
                  
                  {onDefterClick && (
                    <button
                      onClick={() => onDefterClick(defter.id)}
                      className="flex-1 px-2 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-xs font-medium flex items-center justify-center gap-1"
                    >
                      <span>📄</span>
                      <span className="hidden sm:inline">Detay</span>
                    </button>
                  )}
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
            <div className="text-4xl sm:text-6xl mb-2">📚</div>
            <svg className="hidden sm:block w-12 h-12 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-text-light text-base sm:text-lg font-medium">{t("diary.noDiariesFound")}</p>
          <p className="text-text-light text-xs sm:text-sm mt-2 max-w-md mx-auto">{t("diary.diariesWillAppearHere")}</p>
        </div>
      )}

      {/* Modals removed - using parent's shared modals */}
    </div>
  );
}
