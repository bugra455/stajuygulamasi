import { getOnayDurumuLabel, getOnayDurumuColor } from '../../utils/enumUtils';
import { useTranslation } from "../../hooks/useTranslation";

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
  transkriptDosyasi?: string;
  sigortaDosyasi?: string;
  hizmetDokumu?: string;
  // Explanation fields for approval/rejection tracking
  danismanAciklama?: string;
  kariyerMerkeziAciklama?: string;
  sirketAciklama?: string;
  danismanOnayDurumu?: number; // 1: approved, -1: rejected, 0: pending
  kariyerMerkeziOnayDurumu?: number;
  sirketOnayDurumu?: number;
  ogrenci: User;
}

interface BasvurularTabProps {
  basvurular: Basvuru[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  onayDurumList: string[];
  onOpenOgrenciModal: (id: number) => void;
  onBasvuruClick?: (basvuru: Basvuru) => void;
  totalCount?: number;
}

export default function BasvurularTab({
  basvurular,
  searchTerm,
  setSearchTerm,
  onOpenOgrenciModal,
  onBasvuruClick,
  totalCount,
}: BasvurularTabProps) {
  const { t } = useTranslation();
  return (
    <div className="p-3 sm:p-4 lg:p-6">
      {/* Header Section */}
      <div className="flex flex-col gap-3 mb-6">
        <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 break-words">
          {t("pages.kariyerPanel.tabs.applications")}
          <br className="sm:hidden" />
          <span className="text-sm sm:text-base text-gray-600 font-normal">
            ({totalCount ?? basvurular.length} adet)
          </span>
        </h2>
        
        {/* Search Section */}
        <div className="w-full">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            🔍 Arama Yapın
            <br className="sm:hidden" />
            <span className="text-xs opacity-75 sm:hidden">Öğrenci/şirket/durum</span>
          </label>
          <input
            type="text"
            placeholder="Öğrenci adı, şirket adı, onay durumu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("common.user")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("pages.kariyerPanel.companyName")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("pages.kariyerPanel.startDate")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("pages.kariyerPanel.endDate")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("pages.kariyerPanel.status")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("pages.kariyerPanel.documents")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("common.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {basvurular.map((basvuru) => (
              <tr 
                key={basvuru.id} 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onBasvuruClick?.(basvuru)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {basvuru.ogrenci?.name || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {basvuru.kurumAdi}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(basvuru.baslangicTarihi).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(basvuru.bitisTarihi).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${getOnayDurumuColor(basvuru.onayDurumu)}`}>
                    {getOnayDurumuLabel(basvuru.onayDurumu)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-1">
                    <span className={`px-2 py-1 text-xs rounded ${
                      basvuru.transkriptDosyasi ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`} title="Transkript">
                      T
                    </span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      basvuru.sigortaDosyasi ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`} title="Sigorta">
                      S
                    </span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      basvuru.hizmetDokumu ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`} title="Hizmet Dökümü">
                      H
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Öğrenci bilgisi:', basvuru.ogrenci);
                        console.log('Öğrenci ID:', basvuru.ogrenci?.id);
                        if (basvuru.ogrenci?.id) {
                          onOpenOgrenciModal(basvuru.ogrenci.id);
                        } else {
                          console.error('Öğrenci ID bulunamadı:', basvuru);
                        }
                      }}
                      className="text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      {t("common.details")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet Cards */}
      <div className="lg:hidden space-y-3">
        {basvurular.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="text-4xl sm:text-6xl mb-4">📋</div>
            <div className="text-gray-500 text-base sm:text-lg font-medium">
              Başvuru bulunamadı
              <br className="sm:hidden" />
              <span className="sm:hidden text-sm font-normal">😔</span>
            </div>
            <div className="text-gray-400 text-xs sm:text-sm mt-2 max-w-xs mx-auto break-words">
              Arama kriterlerinizi değiştirmeyi deneyin
              <br />
              <span className="text-xs">Farklı kelimeler deneyin</span>
            </div>
          </div>
        ) : (
          basvurular.map((basvuru) => (
            <div 
              key={basvuru.id} 
              className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => onBasvuruClick && onBasvuruClick(basvuru)}
            >
              {/* Header Section */}
              <div className="flex justify-between items-start mb-3 pb-2 border-b border-gray-100">
                <div className="flex-1 min-w-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Mobile - Öğrenci bilgisi:', basvuru.ogrenci);
                      console.log('Mobile - Öğrenci ID:', basvuru.ogrenci?.id);
                      if (basvuru.ogrenci?.id) {
                        onOpenOgrenciModal(basvuru.ogrenci.id);
                      } else {
                        console.error('Mobile - Öğrenci ID bulunamadı:', basvuru);
                      }
                    }}
                    className="text-base font-semibold text-blue-600 hover:text-blue-800 transition-colors break-words"
                  >
                    {basvuru.ogrenci?.name || "N/A"}
                    <br />
                    <span className="text-xs text-gray-500 font-normal break-words">
                      {basvuru.ogrenci?.email}
                    </span>
                  </button>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ml-2 ${getOnayDurumuColor(basvuru.onayDurumu)}`}>
                  {getOnayDurumuLabel(basvuru.onayDurumu)}
                </span>
              </div>
              
              {/* Content Section */}
              <div className="space-y-2.5">
                <div className="bg-gray-50 p-2 rounded">
                  <div className="text-xs text-gray-600 mb-1">🏢 Şirket Adı</div>
                  <div className="text-sm font-medium text-gray-900 break-words leading-tight">
                    {basvuru.kurumAdi}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="text-xs text-blue-600 mb-1">📅 Staj Tarihleri</div>
                    <div className="text-xs text-blue-900">
                      <div className="font-medium">
                        🚀 Başlangıç: {new Date(basvuru.baslangicTarihi).toLocaleDateString('tr-TR')}
                      </div>
                      <div className="font-medium mt-0.5">
                        🏁 Bitiş: {new Date(basvuru.bitisTarihi).toLocaleDateString('tr-TR')}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-50 p-2 rounded">
                  <div className="text-xs text-purple-600 mb-1">📄 Belge Durumu</div>
                  <div className="flex flex-wrap gap-1">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      basvuru.transkriptDosyasi ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      📜 Transkript {basvuru.transkriptDosyasi ? '✅' : '❌'}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      basvuru.sigortaDosyasi ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      🛡️ Sigorta {basvuru.sigortaDosyasi ? '✅' : '❌'}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      basvuru.hizmetDokumu ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      📋 Hizmet {basvuru.hizmetDokumu ? '✅' : '❌'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
