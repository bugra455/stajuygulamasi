import { useState } from 'react';
import { api } from "../../lib/api";

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
  stajTipi: string;
  toplamGun: number;
  createdAt: string;
  transkriptDosyasi?: string;
  sigortaDosyasi?: string;
  hizmetDokumu?: string;
  ogrenci: User;
}

interface SearchParams {
  search?: string;
  faculty?: string;
  stajTipi?: string;
  baslangicTarihiFrom?: string;
  baslangicTarihiTo?: string;
  bitisTarihiFrom?: string;
  bitisTarihiTo?: string;
  export?: boolean;
}

interface OnaylanmisBasvurularTabProps {
  basvurular: Basvuru[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  facultyFilter: string;
  setFacultyFilter: (faculty: string) => void;
  stajTipiFilter: string;
  setStajTipiFilter: (stajTipi: string) => void;
  baslangicTarihiFrom: string;
  setBaslangicTarihiFrom: (date: string) => void;
  baslangicTarihiTo: string;
  setBaslangicTarihiTo: (date: string) => void;
  bitisTarihiFrom: string;
  setBitisTarihiFrom: (date: string) => void;
  bitisTarihiTo: string;
  setBitisTarihiTo: (date: string) => void;
  onOpenOgrenciModal: (id: number) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  facultyList: string[];
  stajTipleri: string[];
  onManualSearch: () => void;
  fetchData: (showLoading?: boolean, searchParams?: SearchParams) => Promise<void>; 

}

export default function OnaylanmisBasvurularTab({
  basvurular,
  searchTerm,
  setSearchTerm,
  facultyFilter,
  setFacultyFilter,
  stajTipiFilter,
  setStajTipiFilter,
  baslangicTarihiFrom,
  setBaslangicTarihiFrom,
  baslangicTarihiTo,
  setBaslangicTarihiTo,
  bitisTarihiFrom,
  setBitisTarihiFrom,
  bitisTarihiTo,
  setBitisTarihiTo,
  onOpenOgrenciModal,
  facultyList,
  stajTipleri,
  onManualSearch,
  fetchData, // <-- add this line
}: OnaylanmisBasvurularTabProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      
      const blob = await api.searchOnaylanmisBasvurular({
        search: searchTerm || undefined,
        faculty: facultyFilter || undefined,
        stajTipi: stajTipiFilter || undefined,
        baslangicTarihiFrom: baslangicTarihiFrom || undefined,
        baslangicTarihiTo: baslangicTarihiTo || undefined,
        bitisTarihiFrom: bitisTarihiFrom || undefined,
        bitisTarihiTo: bitisTarihiTo || undefined,
        export: true,
      }) as Blob;

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `onaylanmis-basvurular-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Excel dosyası oluşturulurken bir hata oluştu.');
    } finally {
      setIsExporting(false);
    }
  };

const clearFilters = () => {
  setSearchTerm('');
  setFacultyFilter('');
  setStajTipiFilter('');
  setBaslangicTarihiFrom('');
  setBaslangicTarihiTo('');
  setBitisTarihiFrom('');
  setBitisTarihiTo('');
  fetchData(true);
};

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-6">
        <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 break-words">
          Onaylanmış Başvurular 
          <br className="sm:hidden" />
          <span className="text-sm sm:text-base text-gray-600 font-normal">
            ({basvurular.length} adet)
          </span>
        </h2>
        <button
          onClick={handleExportExcel}
          disabled={isExporting}
          className="w-full px-3 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium transition-colors"
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span className="text-xs sm:text-sm">
                Excel Hazırlanıyor...
                <br className="sm:hidden" />
                <span className="sm:hidden text-xs opacity-75">Lütfen bekleyin</span>
              </span>
            </>
          ) : (
            <>
              <span className="text-base">📊</span> 
              <span className="text-xs sm:text-sm font-medium">
                Excel Olarak İndir
              </span>
            </>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-6 border">
        {/* Search and Basic Filters */}
        <div className="grid grid-cols-1 gap-3 mb-4">
          {/* Search */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
              🔍 Arama Yapın
              <br className="sm:hidden" />
              <span className="text-xs opacity-75 sm:hidden">Öğrenci/şirket adı</span>
            </label>
            <input
              type="text"
              placeholder="Öğrenci adı, şirket adı..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
            />
          </div>

          {/* Faculty and Type Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                🎓 Bölüm Seçin
                <br className="sm:hidden" />
                <span className="text-xs opacity-75 sm:hidden">Fakülte filtreleme</span>
              </label>
              <select
                value={facultyFilter}
                onChange={(e) => setFacultyFilter(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
              >
                <option value="">Tüm Bölümler</option>
                {facultyList.map((faculty) => (
                  <option key={faculty} value={faculty}>
                    {faculty}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                📋 Staj Tipi
                <br className="sm:hidden" />
                <span className="text-xs opacity-75 sm:hidden">Zorunlu/isteğe bağlı</span>
              </label>
              <select
                value={stajTipiFilter}
                onChange={(e) => setStajTipiFilter(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
              >
                <option value="">Tüm Staj Tipleri</option>
                {stajTipleri.map((tip) => (
                  <option key={tip} value={tip}>
                    {tip.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={clearFilters}
              className="px-3 py-2.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm font-medium transition-colors"
            >
              🗑️ Temizle
            </button>
            <button
              onClick={onManualSearch}
              className="px-3 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              🔍 Ara
            </button>
          </div>
        </div>

        {/* Date Filters - Collapsible on Mobile */}
        <div className="border-t pt-4">
          <div className="mb-3">
            <h4 className="text-xs sm:text-sm font-medium text-gray-700">
              📅 Tarih Aralığı
            </h4>
          </div>
          
          <div className="space-y-3">
            {/* Başlangıç Tarihi */}
            <div>
              <div className="text-xs font-medium text-gray-600 mb-2">
                🚀 Staj Başlangıç Tarihi
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    En Erken Tarih
                  </label>
                  <input
                    type="date"
                    value={baslangicTarihiFrom}
                    onChange={(e) => setBaslangicTarihiFrom(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    En Geç Tarih
                  </label>
                  <input
                    type="date"
                    value={baslangicTarihiTo}
                    onChange={(e) => setBaslangicTarihiTo(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Bitiş Tarihi */}
            <div>
              <div className="text-xs font-medium text-gray-600 mb-2">
                🏁 Staj Bitiş Tarihi
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    En Erken Tarih
                  </label>
                  <input
                    type="date"
                    value={bitisTarihiFrom}
                    onChange={(e) => setBitisTarihiFrom(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    En Geç Tarih
                  </label>
                  <input
                    type="date"
                    value={bitisTarihiTo}
                    onChange={(e) => setBitisTarihiTo(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table - Desktop / Cards - Mobile */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Öğrenci
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Şirket
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Staj Tipi
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Başlangıç
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bitiş
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gün
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Başvuru Tarihi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {basvurular.map((basvuru) => (
              <tr key={basvuru.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      <button
                        onClick={() => onOpenOgrenciModal(basvuru.ogrenci.id)}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {basvuru.ogrenci.name}
                      </button>
                    </div>
                    <div className="text-sm text-gray-500">
                      {basvuru.ogrenci.studentId} • {basvuru.ogrenci.faculty}
                    </div>
                    {basvuru.ogrenci.class && (
                      <div className="text-xs text-gray-400">
                        {basvuru.ogrenci.class}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{basvuru.kurumAdi}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {basvuru.stajTipi.replace(/_/g, ' ')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {new Date(basvuru.baslangicTarihi).toLocaleDateString('tr-TR')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {new Date(basvuru.bitisTarihi).toLocaleDateString('tr-TR')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{basvuru.toplamGun}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {new Date(basvuru.createdAt).toLocaleDateString('tr-TR')}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards - Mobile/Tablet */}
      <div className="md:hidden space-y-3">
        {basvurular.map((basvuru) => (
          <div key={basvuru.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-all">
            {/* Header Section */}
            <div className="flex justify-between items-start mb-3 pb-2 border-b border-gray-100">
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => onOpenOgrenciModal(basvuru.ogrenci.id)}
                  className="text-base font-semibold text-blue-600 hover:text-blue-800 transition-colors break-words"
                >
                  {basvuru.ogrenci.name}
                  <br />
                  <span className="text-xs text-gray-500 font-normal">
                    {basvuru.ogrenci.studentId}
                  </span>
                </button>
                <div className="text-xs text-gray-500 mt-1 break-words">
                  🎓 {basvuru.ogrenci.faculty}
                  <br />
                  {basvuru.ogrenci.class && (
                    <span className="text-xs text-gray-400">
                      📚 {basvuru.ogrenci.class}
                    </span>
                  )}
                </div>
              </div>
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 whitespace-nowrap ml-2">
                ✅ Onaylandı
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
              
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 p-2 rounded">
                  <div className="text-xs text-blue-600 mb-1">📋 Staj Tipi</div>
                  <div className="text-xs font-medium text-blue-900 break-words">
                    {basvuru.stajTipi.replace(/_/g, ' ')}
                  </div>
                </div>
                
                <div className="bg-purple-50 p-2 rounded">
                  <div className="text-xs text-purple-600 mb-1">⏰ Toplam Süre</div>
                  <div className="text-xs font-bold text-purple-900">
                    {basvuru.toplamGun} gün
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <div className="bg-green-50 p-2 rounded">
                  <div className="text-xs text-green-600 mb-1">📅 Staj Tarihleri</div>
                  <div className="text-xs text-green-900">
                    <div className="font-medium">
                      🚀 Başlangıç: {new Date(basvuru.baslangicTarihi).toLocaleDateString('tr-TR')}
                    </div>
                    <div className="font-medium mt-0.5">
                      🏁 Bitiş: {new Date(basvuru.bitisTarihi).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-xs text-gray-600 mb-1">📝 Başvuru Tarihi</div>
                <div className="text-xs text-gray-900">
                  {new Date(basvuru.createdAt).toLocaleDateString('tr-TR')}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {basvurular.length === 0 && (
        <div className="text-center py-8 sm:py-12">
          <div className="text-4xl sm:text-6xl mb-4">📋</div>
          <div className="text-gray-500 text-base sm:text-lg font-medium">
            Onaylanmış başvuru bulunamadı
            <br className="sm:hidden" />
            <span className="sm:hidden text-sm font-normal">😔</span>
          </div>
          <div className="text-gray-400 text-xs sm:text-sm mt-2 max-w-xs mx-auto break-words">
            Filtrelerinizi değiştirmeyi deneyin
            <br />
            <span className="text-xs">veya farklı tarih aralığı seçin</span>
          </div>
          <div className="mt-4">
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm transition-colors"
            >
              🔄 Filtreleri Temizle
              <br className="sm:hidden" />
              <span className="sm:hidden text-xs">Yeniden dene</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
