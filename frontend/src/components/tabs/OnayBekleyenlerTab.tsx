import { useTranslation } from "../../hooks/useTranslation";
import {} from '../../hooks/useTranslation'
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
  ogrenci: User;
}

interface OnayBekleyenlerTabProps {
  onayBekleyenler: Basvuru[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onOpenOgrenciModal: (id: number) => void;
  onOnaylaBasvuru: (id: number) => void;
  onReddetBasvuru: (id: number) => void;
  onBasvuruDetayClick?: (id: number) => void;
}

export default function OnayBekleyenlerTab({
  onayBekleyenler,
  searchTerm,
  setSearchTerm,
  onOpenOgrenciModal,
  onOnaylaBasvuru,
  onReddetBasvuru,
  onBasvuruDetayClick,
}: OnayBekleyenlerTabProps) {
  const { t } = useTranslation();
  return (
    <div className="p-3 sm:p-4 lg:p-6">
      {/* Header Section */}
      <div className="flex flex-col gap-3 mb-6">
        <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 break-words flex items-center gap-2">
          <span className="text-yellow-500">⏳</span>
          {t("pages.kariyerPanel.tabs.pendingApprovals")}
          <br className="sm:hidden" />
          <span className="text-sm sm:text-base text-gray-600 font-normal">
            ({onayBekleyenler.length} bekleyen)
          </span>
        </h2>
        
        {/* Search Section */}
        <div className="w-full">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            🔍 Bekleyen Başvuru Arama
            <br className="sm:hidden" />
            <span className="text-xs opacity-75 sm:hidden">Öğrenci/şirket/bilgi</span>
          </label>
          <input
            type="text"
            placeholder="Öğrenci adı, şirket adı, email, TC kimlik..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
          />
        </div>
      </div>

      {onayBekleyenler.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <div className="text-4xl sm:text-6xl mb-4">🎉</div>
          <div className="text-gray-500 text-base sm:text-lg font-medium">
            {t("pages.kariyerPanel.noPendingApplications")}
            <br className="sm:hidden" />
            <span className="sm:hidden text-sm font-normal">✨</span>
          </div>
          <div className="text-gray-400 text-xs sm:text-sm mt-2 max-w-xs mx-auto break-words">
            Tüm başvurular işlenmiş
            <br />
            <span className="text-xs">Harika iş! 👏</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {onayBekleyenler.map((basvuru) => (
            <div key={basvuru.id} className="border-2 border-yellow-200 bg-yellow-50 rounded-lg p-3 hover:shadow-md transition-all">
              {/* Header Section */}
              <div className="flex justify-between items-start mb-3 pb-2 border-b border-yellow-200">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      onClick={() => onOpenOgrenciModal(basvuru.ogrenci.id)}
                      className="text-base font-semibold text-blue-600 hover:text-blue-800 transition-colors break-words"
                    >
                      {basvuru.ogrenci?.name}
                    </button>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 whitespace-nowrap">
                      ⏳ Bekleyen
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 break-words">
                    📧 {basvuru.ogrenci.email}
                  </div>
                </div>
              </div>
              
              {/* Content Section */}
              <div className="space-y-2.5 mb-4">
                <div className="bg-blue-50 p-2 rounded">
                  <div className="text-xs text-blue-600 mb-1">🏢 Şirket</div>
                  <div className="text-sm font-medium text-blue-900 break-words leading-tight">
                    {basvuru.kurumAdi}
                  </div>
                </div>
                
                <div className="bg-green-50 p-2 rounded">
                  <div className="text-xs text-green-600 mb-1">📅 Staj Tarihleri</div>
                  <div className="text-xs text-green-900">
                    <div className="font-medium">
                      � {new Date(basvuru.baslangicTarihi).toLocaleDateString('tr-TR')}
                    </div>
                    <div className="font-medium mt-0.5">
                      🏁 {new Date(basvuru.bitisTarihi).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="grid grid-cols-1 gap-2 pt-3 border-t border-yellow-200">
                {onBasvuruDetayClick && (
                  <button
                    onClick={() => onBasvuruDetayClick(basvuru.id)}
                    className="w-full px-3 py-2.5 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    🔍 Başvuru Detayını Görüntüle
                  </button>
                )}
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onOnaylaBasvuru(basvuru.id)}
                    className="px-3 py-2.5 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-1 text-sm"
                  >
                    ✅ Onayla
                  </button>
                  <button
                    onClick={() => onReddetBasvuru(basvuru.id)}
                    className="px-3 py-2.5 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors flex items-center justify-center gap-1 text-sm"
                  >
                    ❌ Reddet
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
