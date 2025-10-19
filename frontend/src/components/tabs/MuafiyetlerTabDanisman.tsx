import { useTranslation } from '../../hooks/useTranslation';

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
  // CAP başvuru bilgileri
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

interface MuafiyetlerTabDanismanProps {
  muafiyetler: MuafiyetBasvuru[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onOnayla: (id: number) => void;
  onReddet: (id: number) => void;
  onSgk4aDownload: (id: number, fileName: string) => void;
  onOpenOgrenciModal?: (ogrenciId: number) => void;
}

export default function MuafiyetlerTabDanisman({
  muafiyetler,
  searchTerm,
  onSearchChange,
  currentPage,
  totalPages,
  onPageChange,
  onOnayla,
  onReddet,
  onSgk4aDownload,
  onOpenOgrenciModal,
}: MuafiyetlerTabDanismanProps) {
  const { t } = useTranslation();
  // Local modal state removed. Parent (`DanismanPanel`) manages modals to avoid duplicate openings.

  // Utility functions
  const getStatusColor = (onayDurumu: string, danismanOnayDurumu: number): string => {
    if (danismanOnayDurumu === 1) return 'bg-green-100 text-green-800 border border-green-200';
    if (danismanOnayDurumu === -1) return 'bg-red-100 text-red-800 border border-red-200';
    if (onayDurumu === "HOCA_ONAYI_BEKLIYOR") return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    return 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  const getStatusText = (onayDurumu: string, danismanOnayDurumu: number): string => {
    if (danismanOnayDurumu === 1) return "Onaylandı";
    if (danismanOnayDurumu === -1) return "Reddedildi";
    if (onayDurumu === "HOCA_ONAYI_BEKLIYOR") return "Onay Bekliyor";
    return onayDurumu;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // We delegate modal opening to parent via onOnayla/onReddet handlers.
  const handleOnayClick = (muafiyet: MuafiyetBasvuru) => {
    onOnayla(muafiyet.id);
  };

  const handleRedClick = (muafiyet: MuafiyetBasvuru) => {
    onReddet(muafiyet.id);
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-text-dark flex items-center gap-2">
          <span className="text-2xl">✋</span>
          <span className="break-words">
            Muafiyet Başvuruları ({muafiyetler.length})
          </span>
        </h2>
      </div>

      {/* Search Bar */}
      <div className="mb-4 sm:mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 sm:p-4 rounded-lg border border-blue-200">
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="🔍 Öğrenci adı, soyad, numara ile arama yapın..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue-500 focus:border-accent-blue-500 transition-colors text-sm sm:text-base"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {muafiyetler.length > 0 ? (
        <>
          {/* Desktop Table View - Hidden on mobile */}
          <div className="hidden lg:block space-y-4 mb-6">
            {muafiyetler.map((muafiyet) => (
              <div
                key={muafiyet.id}
                onClick={() => onOpenOgrenciModal && onOpenOgrenciModal(muafiyet.ogrenci.id)}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-text-dark mb-2">
                      Muafiyet Başvurusu #{muafiyet.id}
                    </h3>
                    <p className="text-sm text-text-light">
                      Öğrenci: <span className="font-medium">{muafiyet.ogrenci.name}</span> 
                      <span className="ml-2">({muafiyet.ogrenci.studentId})</span>
                    </p>
                    <p className="text-sm text-text-light">
                      Email: <span className="font-medium">{muafiyet.ogrenci.email}</span>
                    </p>
                    <p className="text-sm text-text-light">
                      Fakülte: <span className="font-medium">{muafiyet.ogrenci.faculty}</span>
                    </p>
                    <p className="text-sm text-text-light">
                      Sınıf: <span className="font-medium">{muafiyet.ogrenci.class}</span>
                    </p>
                    {/* CAP Bilgileri */}
                    {muafiyet.isCapBasvuru && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                        <p className="text-xs font-semibold text-amber-800 mb-1">🎓 CAP (Çift Anadal) Başvurusu</p>
                        {muafiyet.capFakulte && (
                          <p className="text-xs text-amber-700">
                            CAP Fakülte: <span className="font-medium">{muafiyet.capFakulte}</span>
                          </p>
                        )}
                        {muafiyet.capBolum && (
                          <p className="text-xs text-amber-700">
                            CAP-YAP Bölüm: <span className="font-medium">{muafiyet.capBolum}</span>
                          </p>
                        )}
                        {muafiyet.capDepartman && (
                          <p className="text-xs text-amber-700">
                            CAP Departman: <span className="font-medium">{muafiyet.capDepartman}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(muafiyet.onayDurumu, muafiyet.danismanOnayDurumu)}`}>
                    {getStatusText(muafiyet.onayDurumu, muafiyet.danismanOnayDurumu)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="text-text-light block">Başvuru Tarihi:</span>
                    <span className="font-medium">{formatDate(muafiyet.createdAt)}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="text-text-light block">Son Güncelleme:</span>
                    <span className="font-medium">{formatDate(muafiyet.updatedAt)}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="text-text-light block">Danışman Email:</span>
                    <span className="font-medium break-all">{muafiyet.danismanMail}</span>
                  </div>
                </div>

                {muafiyet.danismanAciklama && (
                  <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                    <h4 className="font-semibold text-blue-800 mb-1">Danışman Açıklaması:</h4>
                    <p className="text-blue-700 text-sm">{muafiyet.danismanAciklama}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const sanitizedName = muafiyet.ogrenci.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                      onSgk4aDownload(muafiyet.id, `sgk4a-${sanitizedName}-${muafiyet.id}.pdf`);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <span>⬇️</span>
                    SGK 4A İndir
                  </button>
                  
                  {muafiyet.danismanOnayDurumu === 0 && (
                    <>
                      <button
                        onClick={() => handleOnayClick(muafiyet)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <span>✅</span>
                        Onayla
                      </button>
                      <button
                        onClick={() => handleRedClick(muafiyet)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <span>❌</span>
                        Reddet
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Card View - Hidden on desktop */}
          <div className="lg:hidden space-y-4 mb-6">
            {muafiyetler.map((muafiyet) => (
              <div
                key={muafiyet.id}
                onClick={() => onOpenOgrenciModal && onOpenOgrenciModal(muafiyet.ogrenci.id)}
                className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-text-dark">
                      Muafiyet #{muafiyet.id}
                    </h3>
                    <p className="text-sm text-text-light">{muafiyet.ogrenci.name}</p>
                    <p className="text-xs text-text-light">({muafiyet.ogrenci.studentId})</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(muafiyet.onayDurumu, muafiyet.danismanOnayDurumu)}`}>
                    {getStatusText(muafiyet.onayDurumu, muafiyet.danismanOnayDurumu)}
                  </span>
                </div>

                <div className="space-y-2 text-xs mb-3">
                  <div className="flex justify-between">
                    <span className="text-text-light">Başvuru:</span>
                    <span className="font-medium">{formatDate(muafiyet.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-light">Fakülte:</span>
                    <span className="font-medium">{muafiyet.ogrenci.faculty}</span>
                  </div>
                  {/* CAP Bilgileri - Mobile */}
                  {muafiyet.isCapBasvuru && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                      <div className="text-xs font-semibold text-amber-800 mb-1">🎓 CAP Başvurusu</div>
                      {muafiyet.capFakulte && (
                        <div className="flex justify-between text-xs">
                          <span className="text-amber-700">CAP Fakülte:</span>
                          <span className="font-medium text-amber-800">{muafiyet.capFakulte}</span>
                        </div>
                      )}
                      {muafiyet.capBolum && (
                        <div className="flex justify-between text-xs">
                          <span className="text-amber-700">CAP-YAP Bölüm:</span>
                          <span className="font-medium text-amber-800">{muafiyet.capBolum}</span>
                        </div>
                      )}
                      {muafiyet.capDepartman && (
                        <div className="flex justify-between text-xs">
                          <span className="text-amber-700">CAP-YAP Departman:</span>
                          <span className="font-medium text-amber-800">{muafiyet.capDepartman}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {muafiyet.danismanAciklama && (
                  <div className="mb-3 p-2 bg-blue-50 rounded text-xs">
                    <span className="font-semibold text-blue-800">Açıklama: </span>
                    <span className="text-blue-700">{muafiyet.danismanAciklama}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const sanitizedName = muafiyet.ogrenci.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                      onSgk4aDownload(muafiyet.id, `sgk4a-${sanitizedName}-${muafiyet.id}.pdf`);
                    }}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-xs font-medium"
                  >
                    SGK 4A
                  </button>
                  
                  {muafiyet.danismanOnayDurumu === 0 && (
                    <>
                      <button
                        onClick={() => handleOnayClick(muafiyet)}
                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-xs font-medium"
                      >
                        Onayla
                      </button>
                      <button
                        onClick={() => handleRedClick(muafiyet)}
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-xs font-medium"
                      >
                        Reddet
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-200">
              <div className="text-sm text-text-light font-medium">
                {t("common.page")} {currentPage} / {totalPages}
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto">
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
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 sm:py-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border border-gray-200">
          <div className="text-gray-400 mb-4">
            <div className="text-4xl sm:text-6xl mb-2">✋</div>
            <svg className="hidden sm:block w-12 h-12 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-text-light text-base sm:text-lg font-medium">Muafiyet başvurusu bulunamadı</p>
          <p className="text-text-light text-xs sm:text-sm mt-2 max-w-md mx-auto">Henüz değerlendirmeniz gereken muafiyet başvurusu bulunmuyor.</p>
        </div>
      )}

  {/* Modals are managed by parent (`DanismanPanel`) to prevent double rendering. */}
    </div>
  );
}
