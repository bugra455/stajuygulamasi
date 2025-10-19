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

interface DanismanlarTabProps {
  danismanlar: User[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onOpenDanismanModal: (id: number) => void;
  totalCount?: number;
}

export default function DanismanlarTab({
  danismanlar,
  searchTerm,
  setSearchTerm,
  onOpenDanismanModal,
  totalCount,
}: DanismanlarTabProps) {
  const { t } = useTranslation();
  
  return (
    <div className="p-3 sm:p-4 lg:p-6">
      {/* Header Section */}
      <div className="flex flex-col gap-3 mb-6">
        <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 break-words">
          {t("careerCenter.advisors")}
          <br className="sm:hidden" />
          <span className="text-sm sm:text-base text-gray-600 font-normal">
            ({totalCount ?? danismanlar.length} danışman)
          </span>
        </h2>
        
        {/* Search Section */}
        <div className="w-full">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            🔍 Danışman Arama
            <br className="sm:hidden" />
            <span className="text-xs opacity-75 sm:hidden">Ad/email/TC kimlik</span>
          </label>
          <input
            type="text"
            placeholder="Danışman adı, email, TC kimlik..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("common.user")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("careerCenter.email")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("common.tcId")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("common.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {danismanlar.map((danisman) => (
              <tr key={danisman.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {danisman.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {danisman.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {danisman.tcKimlik}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={() => onOpenDanismanModal(danisman.id)}
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
      <div className="md:hidden space-y-3">
        {danismanlar.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="text-4xl sm:text-6xl mb-4">👨‍🏫</div>
            <div className="text-gray-500 text-base sm:text-lg font-medium">
              Danışman bulunamadı
              <br className="sm:hidden" />
              <span className="sm:hidden text-sm font-normal">😔</span>
            </div>
            <div className="text-gray-400 text-xs sm:text-sm mt-2 max-w-xs mx-auto break-words">
              Arama kriterlerinizi değiştirmeyi deneyin
              <br />
              <span className="text-xs">Farklı danışman adı deneyin</span>
            </div>
          </div>
        ) : (
          danismanlar.map((danisman) => (
            <div key={danisman.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-all">
              {/* Header Section */}
              <div className="flex justify-between items-start mb-3 pb-2 border-b border-gray-100">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 break-words">
                    👨‍🏫 {danisman.name}
                    <br />
                    <span className="text-xs text-gray-500 font-normal break-words">
                      📧 {danisman.email}
                    </span>
                  </h3>
                </div>
                <button
                  onClick={() => onOpenDanismanModal(danisman.id)}
                  className="px-2 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 whitespace-nowrap ml-2 transition-colors"
                >
                  👁️ Detay
                  <br className="sm:hidden" />
                  <span className="sm:hidden text-xs">Görüntüle</span>
                </button>
              </div>
              
              {/* Content Section */}
              <div className="space-y-2.5">
                <div className="bg-purple-50 p-2 rounded">
                  <div className="text-xs text-purple-600 mb-1">🆔 TC Kimlik Numarası</div>
                  <div className="text-sm font-medium text-purple-900 break-words">
                    {danisman.tcKimlik || 'Belirtilmemiş'}
                  </div>
                </div>
                
                {danisman.faculty && (
                  <div className="bg-green-50 p-2 rounded">
                    <div className="text-xs text-green-600 mb-1">🎓 Bölüm</div>
                    <div className="text-xs font-medium text-green-900 break-words">
                      {danisman.faculty}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
