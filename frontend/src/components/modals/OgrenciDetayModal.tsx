import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import { api } from '../../lib/api';
import { getDefterDurumuLabel, getDefterDurumuColor } from '../../utils/helpers';
import { useTranslation } from '../../hooks/useTranslation';

interface OgrenciDetayModalProps {
  isOpen: boolean;
  onClose: () => void;
  ogrenciId: number | null;
  isKariyerMerkezi?: boolean; 
}

interface OgrenciDetay {
  id: number;
  name: string;
  email: string;
  studentId: string;
  faculty: string;
  class: string;
  tcKimlik: string;
  department: string;
  createdAt: string;
  basvuruSayisi: number;
  aktifBasvurular: number;
  tamamlananBasvurular: number;
  // CAP fields for student
  isCapOgrenci?: boolean;
  capFakulte?: string | null;
  capBolum?: string | null;
  capDepartman?: string | null;
  basvurular: Array<{
    id: number;
    kurumAdi: string;
    baslangicTarihi: string;
    bitisTarihi: string;
    onayDurumu: string;
    stajTipi: string;
    transkriptDosyasi?: string;
    sigortaDosyasi?: string;
    hizmetDokumu?: string;
    // CAP fields
    isCapBasvuru?: boolean;
    capFakulte?: string | null;
    capBolum?: string | null;
    capDepartman?: string | null;
    ogrenci?: {
      id: number;
      name: string;
      email: string;
      studentId: string;
      faculty: string;
      class: string;
    };
    defter?: {
      id: number;
      defterDurumu: string;
      originalFileName?: string;
      uploadDate?: string;
    };
    logs?: Array<{
      action: string;
      createdAt: string;
      degisikligiYapan: {
        name: string;
        userType: string;
      };
    }>;
  }>;
}

const OgrenciDetayModal: React.FC<OgrenciDetayModalProps> = ({ isOpen, onClose, ogrenciId, isKariyerMerkezi = false }) => {
  const { t } = useTranslation();
  const [ogrenci, setOgrenci] = useState<OgrenciDetay | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'bilgiler' | 'basvurular' | 'evraklar'>('bilgiler');

  // Fetch both student details and all applications for the student
  const fetchOgrenciDetay = useCallback(async () => {
    if (!ogrenciId) return;
    setLoading(true);
    try {
      // 1. Fetch student details
      const result = await api.getKariyerOgrenciDetay(ogrenciId);
      console.log('Student details response:', result);
      const ogrenciData = result.success ? result.data : result;
      console.log('Processed student data:', ogrenciData);

      // 2. Fetch all applications for this student (regardless of advisor)
      const tumBasvurularResp = await api.getKariyerOgrenciTumBasvurulari(ogrenciId);
      console.log('Applications response:', tumBasvurularResp);
      
      // Handle different response structures
      let tumBasvurular = [];
      if (tumBasvurularResp.success && tumBasvurularResp.data?.basvurular) {
        tumBasvurular = tumBasvurularResp.data.basvurular;
      } else if (tumBasvurularResp.data?.basvurular) {
        tumBasvurular = tumBasvurularResp.data.basvurular;
      } else if (Array.isArray(tumBasvurularResp.data)) {
        tumBasvurular = tumBasvurularResp.data;
      } else if (Array.isArray(tumBasvurularResp)) {
        tumBasvurular = tumBasvurularResp;
      }

      console.log('Processed applications:', tumBasvurular);

      // Ensure logs field exists for each application
      const processedBasvurular = tumBasvurular.map((basvuru: Record<string, unknown>) => {
        return {
          ...basvuru,
          logs: basvuru.logs || [] // Default to empty array if logs don't exist
        };
      });

      console.log('Final processed applications:', processedBasvurular);

      // 3. Merge applications into ogrenciData
      // If ogrenciData is empty or missing, try to get student info from first application
      let finalOgrenciData = ogrenciData;
      if ((!finalOgrenciData || !finalOgrenciData.id) && processedBasvurular.length > 0) {
        const firstApp = processedBasvurular[0] as Record<string, unknown>;
        if (firstApp.ogrenci) {
          const ogrenciFromApp = firstApp.ogrenci as Record<string, unknown>;
          finalOgrenciData = {
            id: ogrenciFromApp.id as number,
            name: ogrenciFromApp.name as string,
            email: ogrenciFromApp.email as string,
            studentId: ogrenciFromApp.studentId as string,
            faculty: ogrenciFromApp.faculty as string,
            class: ogrenciFromApp.class as string,
            tcKimlik: ogrenciFromApp.tcKimlik as string,
            createdAt: ogrenciFromApp.createdAt as string,
            basvuruSayisi: processedBasvurular.length,
            aktifBasvurular: processedBasvurular.filter((b: Record<string, unknown>) => 
              b.onayDurumu !== 'REDDEDILDI' && 
              b.onayDurumu !== 'IPTAL_EDILDI'
            ).length,
            tamamlananBasvurular: processedBasvurular.filter((b: Record<string, unknown>) => 
              b.onayDurumu === 'ONAYLANDI'
            ).length,
            basvurular: processedBasvurular
          };
        }
      } else {
        finalOgrenciData = { ...finalOgrenciData, basvurular: processedBasvurular };
      }

      console.log('Final student data with applications:', finalOgrenciData);
      setOgrenci(finalOgrenciData);
    } catch (error: unknown) {
      console.error(t("studentDetail.errors.loadingStudentDetails"), error instanceof Error ? error.message : t("studentDetail.errors.unknownError"));
    } finally {
      setLoading(false);
    }
  }, [ogrenciId, t]);

  useEffect(() => {
    if (isOpen && ogrenciId) {
      fetchOgrenciDetay();
    }
  }, [isOpen, ogrenciId, fetchOgrenciDetay]);  const handleDownloadFile = async (basvuruId: number, fileType: 'transkript' | 'sigorta' | 'hizmet', fileName: string) => {
    try {
      const blob = await api.kariyerDownloadFile(basvuruId, fileType);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(t("studentDetail.errors.fileDownloadError"), error);
    }
  };

  const getOnayDurumuColor = (durum: string) => {
    switch (durum) {
      case 'ONAYLANDI': return 'text-green-600 bg-green-100';
      case 'REDDEDILDI': return 'text-red-600 bg-red-100';
      case 'IPTAL_EDILDI': return 'text-gray-600 bg-gray-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={t("modal.basvuruDetail.studentDetails")} size="xl">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Modal>
    );
  }

  if (!ogrenci) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${ogrenci.name} - ${t("studentDetail.studentDetails")}`} size="xl">
      <div className="space-y-4 sm:space-y-6">
        {/* Tab Navigation - Responsive */}
        <div className="border-b border-gray-200 -mx-2 sm:mx-0">
          <nav className="-mb-px flex flex-wrap sm:space-x-8 overflow-x-auto">
            {[
              { key: 'bilgiler', label: t("studentDetail.personalInfo"), icon: '👤' },
              { key: 'basvurular', label: t("studentDetail.applications"), icon: '📋' },
              { key: 'evraklar', label: t("studentDetail.documents"), icon: '📄' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as 'bilgiler' | 'basvurular' | 'evraklar')}
                className={`py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center gap-1 ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="sm:hidden">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden text-xs break-words">{tab.label.split(' ')[0]}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'bilgiler' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h4 className="text-base sm:text-lg font-medium break-words">{t("studentDetail.personalInfo")}</h4>

            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  👤 {t("studentDetail.fullName")}
                </label>
                <p className="text-sm bg-gray-50 p-2 rounded border break-words">{ogrenci.name}</p>
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  📧 {t("studentDetail.email")}
                </label>
                <p className="text-sm bg-gray-50 p-2 rounded border break-words">{ogrenci.email}</p>
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  📝 {t("studentDetail.studentNumber")}
                </label>
                <p className="text-sm bg-gray-50 p-2 rounded border">{ogrenci.studentId}</p>
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  🆔 {t("studentDetail.tcId")}
                </label>
                <p className="text-sm bg-gray-50 p-2 rounded border">{ogrenci.tcKimlik}</p>
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  🏫 {t("studentDetail.faculty")}
                </label>
                <p className="text-sm bg-gray-50 p-2 rounded border break-words">{ogrenci.faculty}</p>
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  📚 {t("studentDetail.class")}
                </label>
                <p className="text-sm bg-gray-50 p-2 rounded border">{ogrenci.class}</p>
              </div>
            </div>

            {/* CAP Bilgileri */}
            {ogrenci.isCapOgrenci && (ogrenci.capFakulte || ogrenci.capBolum || ogrenci.capDepartman) && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
                <h5 className="font-medium text-amber-800 mb-3 flex items-center gap-2">
                  <span>🎓</span>
                  <span>CAP (Çift Anadal) Bilgileri</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {ogrenci.capFakulte && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-amber-700 mb-1">
                        🏛️ CAP Fakülte
                      </label>
                      <p className="text-sm bg-white p-2 rounded border break-words">{ogrenci.capFakulte}</p>
                    </div>
                  )}
                  
                  {ogrenci.capBolum && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-amber-700 mb-1">
                        📚 CAP-YAP Bölüm
                      </label>
                      <p className="text-sm bg-white p-2 rounded border break-words">{ogrenci.capBolum}</p>
                    </div>
                  )}
                  
                  {ogrenci.capDepartman && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-amber-700 mb-1">
                        🎯 CAP Departman
                      </label>
                      <p className="text-sm bg-white p-2 rounded border break-words">{ogrenci.capDepartman}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* İstatistikler */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
              <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <span>📊</span>
                <span>{t("studentDetail.applicationStats")}</span>
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">{ogrenci.basvuruSayisi || 0}</div>
                  <div className="text-xs sm:text-sm text-gray-500">{t("studentDetail.totalApplications")}</div>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <div className="text-xl sm:text-2xl font-bold text-green-600">{ogrenci.aktifBasvurular || 0}</div>
                  <div className="text-xs sm:text-sm text-gray-500">{t("studentDetail.activeApplications")}</div>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <div className="text-xl sm:text-2xl font-bold text-purple-600">{ogrenci.tamamlananBasvurular || 0}</div>
                  <div className="text-xs sm:text-sm text-gray-500">{t("studentDetail.completedApplications")}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'basvurular' && (
          <div className="space-y-4">
            <h4 className="text-base sm:text-lg font-medium flex items-center gap-2">
              <span className="text-lg">📋</span>
              <span>{t("studentDetail.applications")} ({ogrenci.basvurular?.length || 0})</span>
            </h4>
            
            {!ogrenci.basvurular || ogrenci.basvurular.length === 0 ? (
              <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                <div className="text-gray-400 mb-4">
                  <div className="text-3xl sm:text-4xl mb-2">📋</div>
                </div>
                <p className="text-gray-500 text-sm sm:text-base">{t("studentDetail.noApplications")}</p>
              </div>
            ) : (
              <>
                {/* Desktop View - Hidden on mobile */}
                <div className="hidden md:block space-y-4">
                  {ogrenci.basvurular.map((basvuru) => (
                    <div key={basvuru.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 mb-1">{basvuru.kurumAdi}</h5>
                          <p className="text-sm text-gray-500 mb-2">
                            {basvuru.stajTipi}
                            {basvuru.isCapBasvuru && (
                              <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                                🎓 CAP
                              </span>
                            )}
                          </p>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getOnayDurumuColor(basvuru.onayDurumu)}`}>
                            {basvuru.onayDurumu}
                          </span>
                        </div>
                      </div>

                      {/* CAP Information */}
                      {basvuru.isCapBasvuru && (
                        <div className="mb-3 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                          <h6 className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-1">
                            <span>🎓</span>
                            <span>CAP (Çift Anadal) Bilgileri</span>
                          </h6>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                            {basvuru.capFakulte && (
                              <div>
                                <span className="text-amber-700 font-medium">Fakülte:</span>
                                <p className="text-amber-900">{basvuru.capFakulte}</p>
                              </div>
                            )}
                            {basvuru.capBolum && (
                              <div>
                                <span className="text-amber-700 font-medium">Bölüm:</span>
                                <p className="text-amber-900">{basvuru.capBolum}</p>
                              </div>
                            )}
                            {basvuru.capDepartman && (
                              <div>
                                <span className="text-amber-700 font-medium">Departman:</span>
                                <p className="text-amber-900">{basvuru.capDepartman}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div className="bg-gray-50 p-2 rounded">
                          <span className="text-gray-500 block">{t("studentDetail.startDate")}:</span>
                          <span className="font-medium">{formatDate(basvuru.baslangicTarihi)}</span>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <span className="text-gray-500 block">{t("studentDetail.endDate")}:</span>
                          <span className="font-medium">{formatDate(basvuru.bitisTarihi)}</span>
                        </div>
                      </div>

                      {/* Show application timeline/logs if available */}
                      {basvuru.logs && basvuru.logs.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <h6 className="text-sm font-medium text-gray-700 mb-2">{t("studentDetail.actionHistory")}:</h6>
                          <div className="space-y-1">
                            {basvuru.logs.slice(-3).map((log, index) => (
                              <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                <span className="font-medium">{formatDate(log.createdAt)}</span>
                                {' - '}
                                <span>{log.action}</span>
                                {log.degisikligiYapan && (
                                  <span className="text-gray-500">
                                    {' '}({log.degisikligiYapan.name} - {log.degisikligiYapan.userType})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {basvuru.defter && (
                        <div className="mt-3 bg-blue-50 p-3 rounded">
                          <span className="text-sm text-blue-700 font-medium">{t("studentDetail.diaryStatus")}:</span>
                          <span className={`ml-2 px-2 py-1 text-xs font-medium rounded ${getDefterDurumuColor(basvuru.defter.defterDurumu, basvuru.bitisTarihi, basvuru.baslangicTarihi)}`}>
                            {getDefterDurumuLabel(basvuru.defter.defterDurumu, t, basvuru.bitisTarihi, basvuru.baslangicTarihi)}
                          </span>
                          {basvuru.defter.originalFileName && (
                            <div className="mt-1 text-xs text-blue-600">
                              {t("studentDetail.file")}: {basvuru.defter.originalFileName}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Mobile Grid View - Visible on mobile/tablet */}
                <div className="md:hidden grid grid-cols-1 gap-3">
                  {ogrenci.basvurular.map((basvuru) => (
                    <div key={basvuru.id} className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-3 hover:shadow-lg transition-all duration-200">
                      {/* Header */}
                      <div className="mb-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h5 className="text-sm font-bold text-gray-900 break-words line-clamp-2">
                              🏢 {basvuru.kurumAdi}
                            </h5>
                          </div>
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getOnayDurumuColor(basvuru.onayDurumu)}`}>
                            {basvuru.onayDurumu}
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded-md inline-block">
                            📋 {basvuru.stajTipi}
                          </p>
                          {basvuru.isCapBasvuru && (
                            <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-md inline-block ml-1">
                              🎓 CAP
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="mb-3 space-y-2">
                        <div className="bg-green-50 p-2 rounded-lg">
                          <div className="text-xs text-green-700 font-medium mb-1">🗓️ Başlangıç</div>
                          <div className="text-xs text-green-900 font-semibold">
                            {formatDate(basvuru.baslangicTarihi)}
                          </div>
                        </div>
                        <div className="bg-red-50 p-2 rounded-lg">
                          <div className="text-xs text-red-700 font-medium mb-1">🏁 Bitiş</div>
                          <div className="text-xs text-red-900 font-semibold">
                            {formatDate(basvuru.bitisTarihi)}
                          </div>
                        </div>
                      </div>

                      {/* CAP Information */}
                      {basvuru.isCapBasvuru && (
                        <div className="mb-3 bg-amber-50 border border-amber-200 p-2 rounded-lg">
                          <div className="text-xs text-amber-700 font-medium mb-2">🎓 CAP Bilgileri</div>
                          <div className="space-y-1">
                            {basvuru.capFakulte && (
                              <div className="text-xs">
                                <span className="text-amber-600 font-medium">Fakülte:</span>
                                <span className="text-amber-900 ml-1">{basvuru.capFakulte}</span>
                              </div>
                            )}
                            {basvuru.capBolum && (
                              <div className="text-xs">
                                <span className="text-amber-600 font-medium">Bölüm:</span>
                                <span className="text-amber-900 ml-1">{basvuru.capBolum}</span>
                              </div>
                            )}
                            {basvuru.capDepartman && (
                              <div className="text-xs">
                                <span className="text-amber-600 font-medium">Departman:</span>
                                <span className="text-amber-900 ml-1">{basvuru.capDepartman}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Diary Status */}
                      {basvuru.defter && (
                        <div className="mb-3 bg-blue-50 p-2 rounded-lg">
                          <div className="text-xs text-blue-700 font-medium mb-1">📚 Defter Durumu</div>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getDefterDurumuColor(basvuru.defter.defterDurumu, basvuru.bitisTarihi, basvuru.baslangicTarihi)}`}>
                            {getDefterDurumuLabel(basvuru.defter.defterDurumu, t, basvuru.bitisTarihi, basvuru.baslangicTarihi)}
                          </span>
                          {basvuru.defter.originalFileName && (
                            <div className="text-xs text-blue-600 mt-1 break-words">
                              📄 {basvuru.defter.originalFileName}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action History */}
                      {basvuru.logs && basvuru.logs.length > 0 && (
                        <div className="bg-orange-50 p-2 rounded-lg">
                          <div className="text-xs text-orange-700 font-medium mb-1">📝 Son İşlemler</div>
                          <div className="space-y-1">
                            {basvuru.logs.slice(-2).map((log, index) => (
                              <div key={index} className="text-xs text-orange-800">
                                <div className="font-medium">{formatDate(log.createdAt)}</div>
                                <div className="break-words">{log.action}</div>
                                {log.degisikligiYapan && (
                                  <div className="text-orange-600 text-xs">
                                    {log.degisikligiYapan.name} ({log.degisikligiYapan.userType})
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'evraklar' && (
          <div className="space-y-4">
            <h4 className="text-base sm:text-lg font-medium flex items-center gap-2">
              <span className="text-lg">📄</span>
              <span>{t("studentDetail.uploadedDocuments")}</span>
            </h4>
            
            {ogrenci.basvurular.length === 0 ? (
              <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                <div className="text-gray-400 mb-4">
                  <div className="text-3xl sm:text-4xl mb-2">📄</div>
                </div>
                <p className="text-gray-500 text-sm sm:text-base">{t("studentDetail.noApplicationsYet")}</p>
              </div>
            ) : (
              <>
                {/* Desktop View - Hidden on mobile */}
                <div className="hidden md:block space-y-4">
                  {ogrenci.basvurular.map((basvuru) => (
                    <div key={basvuru.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="mb-3">
                        <h5 className="font-medium text-gray-900">{basvuru.kurumAdi}</h5>
                        <p className="text-sm text-gray-500">{t("studentDetail.applicationId")}: {basvuru.id}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* Transkript Dosyası */}
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-sm font-medium">{t("studentDetail.transcriptFile")}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {basvuru.transkriptDosyasi ? (
                                <>
                                  <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                                    {t("studentDetail.uploaded")}
                                  </span>
                                  <button 
                                    onClick={() => handleDownloadFile(basvuru.id, 'transkript', 'transkript.pdf')}
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                  >
                                    {t("studentDetail.download")}
                                  </button>
                                </>
                              ) : (
                                <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
                                  {t("studentDetail.missing")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Sigorta Dosyası */}
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-sm font-medium">{t("studentDetail.insuranceFile")}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {basvuru.sigortaDosyasi ? (
                                <>
                                  <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                                    {t("studentDetail.uploaded")}
                                  </span>
                                  <button 
                                    onClick={() => handleDownloadFile(basvuru.id, 'sigorta', 'sigorta.pdf')}
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                  >
                                    {t("studentDetail.download")}
                                  </button>
                                </>
                              ) : (
                                <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
                                  {t("studentDetail.missing")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Hizmet Dökümü */}
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-sm font-medium">{t("studentDetail.serviceFile")}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {basvuru.hizmetDokumu ? (
                                <>
                                  <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                                    {t("studentDetail.uploaded")}
                                  </span>
                                  <button 
                                    onClick={() => handleDownloadFile(basvuru.id, 'hizmet', 'hizmet-dokumu.pdf')}
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                  >
                                    {t("studentDetail.download")}
                                  </button>
                                </>
                              ) : (
                                <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
                                  {t("studentDetail.missing")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Staj Defteri - Sadece Kariyer Merkezi değilse göster */}
                        {!isKariyerMerkezi && basvuru.defter && (
                          <div className="bg-blue-50 p-3 rounded-lg col-span-full">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="text-sm font-medium">{t("studentDetail.internshipDiary")}</span>
                                {basvuru.defter?.originalFileName && (
                                  <p className="text-xs text-gray-500">{basvuru.defter.originalFileName}</p>
                                )}
                                {basvuru.defter?.uploadDate && (
                                  <p className="text-xs text-gray-400">
                                    {t("studentDetail.uploadDate")}: {formatDate(basvuru.defter.uploadDate)}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                {basvuru.defter?.originalFileName ? (
                                  <>
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${getDefterDurumuColor(basvuru.defter?.defterDurumu || '', basvuru.bitisTarihi, basvuru.baslangicTarihi)}`}>
                                      {getDefterDurumuLabel(basvuru.defter?.defterDurumu || '', t, basvuru.bitisTarihi, basvuru.baslangicTarihi)}
                                    </span>
                                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                                      {t("studentDetail.download")}
                                    </button>
                                  </>
                                ) : (
                                  <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
                                    {t("studentDetail.missing")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mobile Grid View - Visible on mobile/tablet */}
                <div className="md:hidden space-y-4">
                  {ogrenci.basvurular.map((basvuru) => (
                    <div key={basvuru.id} className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-3">
                      <div className="mb-3">
                        <h5 className="text-sm font-bold text-gray-900 break-words">🏢 {basvuru.kurumAdi}</h5>
                        <p className="text-xs text-gray-500">{t("studentDetail.applicationId")}: {basvuru.id}</p>
                      </div>
                      
                      <div className="space-y-3">
                        {/* Transkript Dosyası */}
                        <div className="bg-green-50 p-2 rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-xs text-green-700 font-medium">📄 Transkript</div>
                            </div>
                            <div className="flex items-center space-x-1">
                              {basvuru.transkriptDosyasi ? (
                                <>
                                  <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800">
                                    ✅
                                  </span>
                                  <button 
                                    onClick={() => handleDownloadFile(basvuru.id, 'transkript', 'transkript.pdf')}
                                    className="text-green-600 hover:text-green-800 text-xs font-medium"
                                  >
                                    📥
                                  </button>
                                </>
                              ) : (
                                <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800">
                                  ❌
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Sigorta Dosyası */}
                        <div className="bg-blue-50 p-2 rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-xs text-blue-700 font-medium">🛡️ Sigorta</div>
                            </div>
                            <div className="flex items-center space-x-1">
                              {basvuru.sigortaDosyasi ? (
                                <>
                                  <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800">
                                    ✅
                                  </span>
                                  <button 
                                    onClick={() => handleDownloadFile(basvuru.id, 'sigorta', 'sigorta.pdf')}
                                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                  >
                                    📥
                                  </button>
                                </>
                              ) : (
                                <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800">
                                  ❌
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Hizmet Dökümü */}
                        <div className="bg-purple-50 p-2 rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-xs text-purple-700 font-medium">📋 Hizmet Dökümü</div>
                            </div>
                            <div className="flex items-center space-x-1">
                              {basvuru.hizmetDokumu ? (
                                <>
                                  <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800">
                                    ✅
                                  </span>
                                  <button 
                                    onClick={() => handleDownloadFile(basvuru.id, 'hizmet', 'hizmet-dokumu.pdf')}
                                    className="text-purple-600 hover:text-purple-800 text-xs font-medium"
                                  >
                                    📥
                                  </button>
                                </>
                              ) : (
                                <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800">
                                  ❌
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Staj Defteri - Sadece Kariyer Merkezi değilse göster */}
                        {!isKariyerMerkezi && basvuru.defter && (
                          <div className="bg-yellow-50 p-2 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="text-xs text-yellow-700 font-medium mb-1">📚 Staj Defteri</div>
                                {basvuru.defter?.originalFileName && (
                                  <p className="text-xs text-yellow-600 break-words">{basvuru.defter.originalFileName}</p>
                                )}
                                {basvuru.defter?.uploadDate && (
                                  <p className="text-xs text-yellow-500">
                                    {formatDate(basvuru.defter.uploadDate)}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center space-x-1">
                                {basvuru.defter?.originalFileName ? (
                                  <>
                                    <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${getDefterDurumuColor(basvuru.defter?.defterDurumu || '', basvuru.bitisTarihi, basvuru.baslangicTarihi)}`}>
                                      {getDefterDurumuLabel(basvuru.defter?.defterDurumu || '', t, basvuru.bitisTarihi, basvuru.baslangicTarihi)}
                                    </span>
                                    <button className="text-yellow-600 hover:text-yellow-800 text-xs font-medium">
                                      📥
                                    </button>
                                  </>
                                ) : (
                                  <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800">
                                    ❌
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default OgrenciDetayModal;
