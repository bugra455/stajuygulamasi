import { useTranslation } from "../../hooks/useTranslation";

interface Sirket {
  kurumAdi: string;
  kurumAdresi: string;
  yetkiliAdi: string;
  yetkiliUnvani: string;
  sorumluMail: string;
  sorumluTelefon: string;
}

interface SirketlerTabProps {
  sirketler: Sirket[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onOpenSirketModal: (kurumAdi: string) => void;
  totalCount?: number;
}

export default function SirketlerTab({
  sirketler,
  searchTerm,
  setSearchTerm,
  onOpenSirketModal,
  totalCount,
}: SirketlerTabProps) {
  const { t } = useTranslation();
  
  return (
    <div className="p-3 sm:p-4 lg:p-6">
      {/* Header Section */}
      <div className="flex flex-col gap-3 mb-6">
        <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 break-words">
          {t("pages.kariyerPanel.tabs.companies")}
          <br className="sm:hidden" />
          <span className="text-sm sm:text-base text-gray-600 font-normal">
            ({totalCount ?? sirketler.length} şirket)
          </span>
        </h2>
        
        {/* Search Section */}
        <div className="w-full">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            🔍 Şirket Arama
            <br className="sm:hidden" />
            <span className="text-xs opacity-75 sm:hidden">Ad/adres/yetkili/iletişim</span>
          </label>
          <input
            type="text"
            placeholder="Şirket adı, adres, yetkili kişi, email..."
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
                {t("pages.kariyerPanel.companyName")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("pages.kariyerPanel.companyAddress")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("pages.kariyerPanel.contactPerson")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("pages.kariyerPanel.contactTitle")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("pages.kariyerPanel.contactEmail")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("pages.kariyerPanel.contactPhone")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("common.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sirketler.map((sirket, index) => (
              <tr key={`${sirket.kurumAdi}-${index}`} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {sirket.kurumAdi}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {sirket.kurumAdresi}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {sirket.yetkiliAdi}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {sirket.yetkiliUnvani}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {sirket.sorumluMail}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {sirket.sorumluTelefon}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={() => onOpenSirketModal(sirket.kurumAdi)}
                    className="text-blue-600 hover:text-blue-900 font-medium"
                  >
                    {t("common.details")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet Cards */}
      <div className="lg:hidden space-y-3">
        {sirketler.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="text-4xl sm:text-6xl mb-4">🏢</div>
            <div className="text-gray-500 text-base sm:text-lg font-medium">
              Şirket bulunamadı
              <br className="sm:hidden" />
              <span className="sm:hidden text-sm font-normal">😔</span>
            </div>
            <div className="text-gray-400 text-xs sm:text-sm mt-2 max-w-xs mx-auto break-words">
              Arama kriterlerinizi değiştirmeyi deneyin
              <br />
              <span className="text-xs">Farklı şirket adı deneyin</span>
            </div>
          </div>
        ) : (
          sirketler.map((sirket, index) => (
            <div key={`${sirket.kurumAdi}-${index}`} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-all">
              {/* Header Section */}
              <div className="flex justify-between items-start mb-3 pb-2 border-b border-gray-100">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 break-words leading-tight">
                    {sirket.kurumAdi}
                    <br />
                    <span className="text-xs text-gray-500 font-normal break-words">
                      📍 {sirket.kurumAdresi}
                    </span>
                  </h3>
                </div>
                <button
                  onClick={() => onOpenSirketModal(sirket.kurumAdi)}
                  className="px-2 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 whitespace-nowrap ml-2 transition-colors"
                >
                  👁️ Detay
                  <br className="sm:hidden" />
                  <span className="sm:hidden text-xs">Görüntüle</span>
                </button>
              </div>
              
              {/* Content Section */}
              <div className="space-y-2.5">
                <div className="bg-blue-50 p-2 rounded">
                  <div className="text-xs text-blue-600 mb-1">👤 Yetkili Kişi</div>
                  <div className="text-sm font-medium text-blue-900 break-words leading-tight">
                    {sirket.yetkiliAdi || 'Belirtilmemiş'}
                    <br />
                    {sirket.yetkiliUnvani && (
                      <span className="text-xs text-blue-700">
                        💼 {sirket.yetkiliUnvani}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  <div className="bg-green-50 p-2 rounded">
                    <div className="text-xs text-green-600 mb-1">📧 Email Adresi</div>
                    <div className="text-xs font-medium text-green-900 break-words">
                      {sirket.sorumluMail || 'Belirtilmemiş'}
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-2 rounded">
                    <div className="text-xs text-purple-600 mb-1">📞 Telefon Numarası</div>
                    <div className="text-xs font-medium text-purple-900">
                      {sirket.sorumluTelefon || 'Belirtilmemiş'}
                    </div>
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
