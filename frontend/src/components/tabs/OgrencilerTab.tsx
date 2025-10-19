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

interface OgrencilerTabProps {
  ogrenciler: User[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  facultyFilter: string;
  setFacultyFilter: (faculty: string) => void;
  classFilter: string;
  setClassFilter: (classValue: string) => void;
  facultyList: string[];
  classList: string[];
  currentPage: number;
  totalPages: number;
  totalCount?: number;
  onPageChange: (page: number) => void;
  onOpenOgrenciModal: (id: number) => void;
}

export default function OgrencilerTab({
  ogrenciler,
  searchTerm,
  setSearchTerm,
  totalCount,
  onOpenOgrenciModal,
}: OgrencilerTabProps) {
  const { t } = useTranslation();
  
  return (
    <div className="p-3 sm:p-4 lg:p-6">
      {/* Header Section */}
      <div className="flex flex-col gap-3 mb-6">
        <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 break-words">
          {t("pages.kariyerPanel.tabs.students")}
          <br className="sm:hidden" />
          <span className="text-sm sm:text-base text-gray-600 font-normal">
            ({totalCount ?? ogrenciler.length} öğrenci)
          </span>
        </h2>
      </div>

      {/* Search Section */}
      <div className="mb-6">
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
          🔍 Öğrenci Arama
          <br className="sm:hidden" />
          <span className="text-xs opacity-75 sm:hidden">Ad/numara/email/bölüm</span>
        </label>
        <input
          type="text"
          placeholder="Öğrenci adı, numara, email, bölüm, sınıf..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
        />
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
                {t("common.email")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("common.studentNumber")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("common.tcKimlik")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("modals.basvuruDetay.faculty")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("modals.basvuruDetay.class")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("common.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {ogrenciler.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <div className="text-4xl mb-2">👥</div>
                    <h3 className="text-lg font-medium mb-2">{t("careerCenter.noStudents")}</h3>
                    <p className="text-sm">{t("careerCenter.noResults")}</p>
                  </div>
                </td>
              </tr>
            ) : (
              ogrenciler.map((ogrenci) => (
                <tr key={ogrenci.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs break-words">
                    {ogrenci.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs break-words">
                    {ogrenci.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ogrenci.studentId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ogrenci.tcKimlik}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs break-words">
                    {ogrenci.faculty}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ogrenci.class}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => onOpenOgrenciModal(ogrenci.id)}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      {t("common.details")}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet Cards */}
      <div className="md:hidden space-y-3">
        {ogrenciler.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="text-4xl sm:text-6xl mb-4">👥</div>
            <div className="text-gray-500 text-base sm:text-lg font-medium">
              {t("careerCenter.noStudents")}
              <br className="sm:hidden" />
              <span className="sm:hidden text-sm font-normal">😔</span>
            </div>
            <div className="text-gray-400 text-xs sm:text-sm mt-2 max-w-xs mx-auto break-words">
              {t("careerCenter.noResults")}
              <br />
              <span className="text-xs">Farklı kelimeler deneyin</span>
            </div>
          </div>
        ) : (
          ogrenciler.map((ogrenci) => (
            <div key={ogrenci.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-all">
              {/* Header Section */}
              <div className="flex justify-between items-start mb-3 pb-2 border-b border-gray-100">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 break-words">
                    {ogrenci.name}
                    <br />
                    <span className="text-xs text-gray-500 font-normal break-words">
                      {ogrenci.email}
                    </span>
                  </h3>
                </div>
                <button
                  onClick={() => onOpenOgrenciModal(ogrenci.id)}
                  className="px-2 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 whitespace-nowrap ml-2 transition-colors"
                >
                  👁️ Detay
                  <br className="sm:hidden" />
                  <span className="sm:hidden text-xs">Görüntüle</span>
                </button>
              </div>
              
              {/* Content Section */}
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="text-xs text-blue-600 mb-1">📝 Öğrenci No</div>
                    <div className="text-xs font-medium text-blue-900 break-words">
                      {ogrenci.studentId || '-'}
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-2 rounded">
                    <div className="text-xs text-purple-600 mb-1">🆔 TC Kimlik</div>
                    <div className="text-xs font-medium text-purple-900 break-words">
                      {ogrenci.tcKimlik || '-'}
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 p-2 rounded">
                  <div className="text-xs text-green-600 mb-1">🎓 Bölüm</div>
                  <div className="text-xs font-medium text-green-900 break-words leading-tight">
                    {ogrenci.faculty || 'Belirtilmemiş'}
                  </div>
                </div>
                
                <div className="bg-yellow-50 p-2 rounded">
                  <div className="text-xs text-yellow-600 mb-1">📚 Sınıf</div>
                  <div className="text-xs font-medium text-yellow-900">
                    {ogrenci.class || 'Belirtilmemiş'}
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
