import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import {
  getDefterDurumuLabel,
  getDefterDurumuColor,
} from "../../utils/helpers";
import {
  canReuploadDefter,
} from "../../utils/enumUtils";
import AppNotification from "../../components/common/AppNotification";
import { useTranslation } from "../../hooks/useTranslation";

import { StajTipiEnum } from "../../types/common";
import { getStajTipiLabel } from "../../utils/helpers";

interface StajDefteri {
  id: number;
  stajBasvurusuId: number;
  dosyaYolu?: string;
  originalFileName?: string;
  fileSize?: number;
  uploadDate?: string;
  defterDurumu: string;
  createdAt: string;
  redSebebi?: string;
}

interface StajBasvurusu {
  id: number;
  kurumAdi: string;
  stajTipi: StajTipiEnum;
  baslangicTarihi: string;
  bitisTarihi: string;
  toplamGun: number;
  onayDurumu: string;
}

function Defterim() {
  const {
    user,
    token,
    logout,
    isAuthenticated,
    isLoading: authLoading,
    isStudent,
  } = useAuth();
  const navigate = useNavigate();
  const { t, translateError, translateSuccess } = useTranslation();
  const [defterler, setDefterler] = useState<StajDefteri[]>([]);
  const [stajBasvurulari, setStajBasvurulari] = useState<Map<number, StajBasvurusu>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [uploadingDefters, setUploadingDefters] = useState<Set<number>>(
    new Set(),
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/");
      return;
    }

    // Sadece öğrenci kontrolü yap, öğrenci değilse ana ekrana yönlendir
    if (!authLoading && !isStudent()) {
      navigate("/");
      return;
    }
  }, [authLoading, isAuthenticated, isStudent, navigate]);

  useEffect(() => {
    const fetchDefterler = async () => {
      if (authLoading) return;

      if (isAuthenticated && token) {
        setIsLoading(true);
        try {
          const responseData = await api.getDefterler();

          if (Array.isArray(responseData)) {
            setDefterler(responseData);
            
            // Fetch StajBasvurusu data for each defter
            const basvuruMap = new Map<number, StajBasvurusu>();
            for (const defter of responseData) {
              try {
                const basvuruData = await api.getBasvuru(defter.stajBasvurusuId);
                basvuruMap.set(defter.stajBasvurusuId, {
                  id: basvuruData.id,
                  kurumAdi: basvuruData.kurumAdi,
                  stajTipi: basvuruData.stajTipi,
                  baslangicTarihi: basvuruData.baslangicTarihi,
                  bitisTarihi: basvuruData.bitisTarihi,
                  toplamGun: basvuruData.toplamGun,
                  onayDurumu: basvuruData.onayDurumu,
                });
              } catch (error) {
                console.error(`Failed to fetch basvuru ${defter.stajBasvurusuId}:`, error);
              }
            }
            setStajBasvurulari(basvuruMap);
          } else {
            setDefterler([]);
          }
        } catch (error: unknown) {
          setNotification({
            message: translateError(
              (error as Error).message || t("errors.diaryUploadError"),
            ),
            type: "error",
          });
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    fetchDefterler();
  }, [authLoading, isAuthenticated, token]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Helper function to get StajBasvurusu data for a defter
  const getBasvuruForDefter = (defter: StajDefteri): StajBasvurusu | undefined => {
    return stajBasvurulari.get(defter.stajBasvurusuId);
  };

  const handlePdfUpload = async (basvuruId: number, file: File) => {
    console.log(`📁 Frontend file upload debug - Name: ${file.name}, Size: ${file.size} bytes (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    
    if (!file.type.includes("pdf")) {
      setNotification({
        message: t("files.onlyPDF"),
        type: "error",
      });
      return;
    }

    // Dosya boyutu kontrolü (50MB = 52,428,800 bytes)
    const maxSizeInBytes = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSizeInBytes) {
      const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);
      setNotification({
        message: `${t("errors.fileSizeError")} (${fileSizeInMB}MB > 50MB)`,
        type: "error",
      });
      return;
    }

    setUploadingDefters((prev) => new Set(prev.add(basvuruId)));

    try {
      const formData = new FormData();
      formData.append("file", file);
      // Remove basvuruId from form data since it's in URL params

      // Use the API client instead of direct fetch
      await api.uploadDefterPdf(basvuruId, formData);

      setNotification({
        message: translateSuccess("Defter başarıyla yüklendi!"),
        type: "success",
      });

      // Defterler listesini yenile
      const responseData = await api.getDefterler();
      const rawData = Array.isArray(responseData)
        ? responseData
        : responseData.defterler || [];
      setDefterler(rawData);
    } catch (error) {
      const err = error as Error;
      console.error('📁 Frontend upload error:', {
        error: err.message,
        stack: err.stack,
        fileName: file.name,
        fileSize: file.size,
        basvuruId
      });
      
      setNotification({
        message: err.message || t("errors.diaryUploadError"),
        type: "error",
      });
    } finally {
      setUploadingDefters((prev) => {
        const newSet = new Set(prev);
        newSet.delete(basvuruId);
        return newSet;
      });
    }
  };

  const handlePdfDownload = async (defterId: number, fileName: string) => {
    try {
      const blob = await api.downloadDefterPdf(defterId);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = fileName || `staj-defteri-${defterId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setNotification({
        message: t("pages.defterim.downloadSuccess"),
        type: "success",
      });
    } catch (error) {
      const err = error as Error;
      setNotification({
        message: err.message || t("errors.pdfDownloadError"),
        type: "error",
      });
    }
  };

  const handlePdfDelete = async (defterId: number) => {
    if (!confirm(t("pages.defterim.deleteConfirm"))) {
      return;
    }

    try {
      await api.deleteDefterPdf(defterId);

      setNotification({
        message: t("pages.defterim.deleteSuccess"),
        type: "success",
      });

      // Defterler listesini yenile
      const responseData = await api.getDefterler();
      const rawData = Array.isArray(responseData)
        ? responseData
        : responseData.defterler || [];
      setDefterler(rawData);
    } catch (error) {
      const err = error as Error;
      setNotification({
        message: err.message || t("errors.deleteError"),
        type: "error",
      });
    }
  };

  const getStatusColor = (durum: string, bitisTarihi?: string, baslangicTarihi?: string) => {
    return getDefterDurumuColor(durum, bitisTarihi, baslangicTarihi);
  };

  const getStatusText = (durum: string, bitisTarihi?: string, baslangicTarihi?: string) => {
    return getDefterDurumuLabel(durum, t, bitisTarihi, baslangicTarihi);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "-";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("tr-TR");
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background-50">
        {user && <Navbar user={user} onLogout={logout} />}
        <div className="container mx-auto px-4 py-8">
          <div className="bg-background-50 shadow-md rounded-lg p-8 text-center">
            <div className="animate-pulse">
              <div className="h-4 bg-background-300 rounded w-1/2 mx-auto mb-4"></div>
              <div className="h-4 bg-background-300 rounded w-1/3 mx-auto"></div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-50">
      {user && <Navbar user={user} onLogout={logout} />}

      <div className="container mx-auto px-4 py-8">
        {notification && (
          <AppNotification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-dark">
            {t("diary.myDiary")}
          </h1>
          <p className="mt-2 text-text-light">
            {t("diary.diaryShortText")}
          </p>
        </div>

        {defterler.length > 0 ? (
          <div className="space-y-6">
            {defterler.map((defter) => {
              const basvuru = getBasvuruForDefter(defter);
              return (
              <div
                key={defter.id}
                className="bg-white shadow-lg rounded-xl p-6 border border-background-200 hover:shadow-xl transition-all duration-300"
              >
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-6">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl lg:text-2xl font-bold text-text-dark break-words">
                      {basvuru?.kurumAdi || t("modals.basvuruDetay.notSpecified")}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {basvuru?.stajTipi
                ? getStajTipiLabel(basvuru.stajTipi as StajTipiEnum, t)
                : t("modals.basvuruDetay.notSpecified")}
                      </span>
                      <span className="text-sm text-gray-500">
                        Defter ID: #{defter.id}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-start lg:items-end gap-2">
                    <span
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${getStatusColor(defter.defterDurumu, basvuru?.bitisTarihi, basvuru?.baslangicTarihi)}`}
                    >
                      {getStatusText(defter.defterDurumu, basvuru?.bitisTarihi, basvuru?.baslangicTarihi)}
                    </span>
                    <span className="text-xs text-gray-500">
                      Son Güncelleme: {formatDate(defter.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Staj Bilgileri Grid - Mobile Responsive */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 lg:p-6 rounded-xl border-l-4 border-l-blue-500 mb-6">
                  <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    <span>Staj Bilgileri</span>
                  </h3>
                  
                  {/* Mobile Layout */}
                  <div className="lg:hidden space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-lg border-l-4 border-l-green-500 shadow-sm">
                        <div className="text-xs text-green-700 font-bold uppercase tracking-wide">🚀 Başlangıç</div>
                        <div className="text-sm text-green-900 font-bold mt-1">
                          {basvuru?.baslangicTarihi ? formatDate(basvuru.baslangicTarihi) : "-"}
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border-l-4 border-l-red-500 shadow-sm">
                        <div className="text-xs text-red-700 font-bold uppercase tracking-wide">🏁 Bitiş</div>
                        <div className="text-sm text-red-900 font-bold mt-1">
                          {basvuru?.bitisTarihi ? formatDate(basvuru.bitisTarihi) : "-"}
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border-l-4 border-l-purple-500 shadow-sm">
                      <div className="text-xs text-purple-700 font-bold uppercase tracking-wide">⏰ Toplam Süre</div>
                      <div className="text-sm text-purple-900 font-bold mt-1">
                          {`${basvuru?.toplamGun} gün`}
                      </div>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden lg:grid lg:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg border-l-4 border-l-green-500 shadow-sm">
                      <span className="text-sm text-green-700 font-medium">Başlangıç Tarihi:</span>
                      <p className="text-lg font-bold text-green-900 mt-1">
                        {basvuru?.baslangicTarihi ? formatDate(basvuru.baslangicTarihi) : "-"}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border-l-4 border-l-red-500 shadow-sm">
                      <span className="text-sm text-red-700 font-medium">Bitiş Tarihi:</span>
                      <p className="text-lg font-bold text-red-900 mt-1">
                        {basvuru?.bitisTarihi ? formatDate(basvuru.bitisTarihi) : "-"}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border-l-4 border-l-purple-500 shadow-sm">
                      <span className="text-sm text-purple-700 font-medium">Toplam Süre:</span>
                      <p className="text-lg font-bold text-purple-900 mt-1">
                        {`${basvuru?.toplamGun} gün`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* PDF Defter Bilgileri - Enhanced */}
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 lg:p-6 rounded-xl border border-gray-200 mb-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-lg">📄</span>
                    <span>PDF Defter Bilgileri</span>
                  </h3>
                  
                  {/* Mobile Layout */}
                  <div className="lg:hidden space-y-3">
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <div className="text-xs text-gray-600 font-medium uppercase tracking-wide">📁 Dosya Adı</div>
                      <p className="text-sm font-bold text-gray-900 mt-1 break-words">
                        {defter.originalFileName || t("pages.defterim.notUploaded")}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <div className="text-xs text-gray-600 font-medium uppercase tracking-wide">💾 Boyut</div>
                        <p className="text-sm font-bold text-gray-900 mt-1">
                          {formatFileSize(defter.fileSize)}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <div className="text-xs text-gray-600 font-medium uppercase tracking-wide">📅 Yüklenme</div>
                        <p className="text-sm font-bold text-gray-900 mt-1">
                          {formatDate(defter.uploadDate)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden lg:grid lg:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <span className="text-sm text-gray-600 font-medium">Dosya Adı:</span>
                      <p className="text-base font-bold text-gray-900 mt-1 break-words">
                        {defter.originalFileName || t("pages.defterim.notUploaded")}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <span className="text-sm text-gray-600 font-medium">Dosya Boyutu:</span>
                      <p className="text-base font-bold text-gray-900 mt-1">
                        {formatFileSize(defter.fileSize)}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <span className="text-sm text-gray-600 font-medium">Yüklenme Tarihi:</span>
                      <p className="text-base font-bold text-gray-900 mt-1">
                        {formatDate(defter.uploadDate)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Red Sebebi - Enhanced display */}
                {defter.redSebebi && (
                  <div className="bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-l-red-500 p-4 lg:p-6 rounded-xl mb-6 shadow-sm">
                    <h4 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                      <span className="text-lg">⚠️</span>
                      <span>Red Sebebi</span>
                    </h4>
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-red-700 leading-relaxed">{defter.redSebebi}</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons - Enhanced with better mobile/desktop layout */}
                <div className="bg-gradient-to-r from-gray-50 to-white p-4 lg:p-6 rounded-xl border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-lg"></span>
                    <span>İşlemler</span>
                  </h3>
                  
                  <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                    {!defter.dosyaYolu ||
                    canReuploadDefter(defter.defterDurumu) ? (
                      // PDF yükleme veya yeniden yükleme
                      <div className="flex items-center">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && basvuru?.id) {
                              handlePdfUpload(defter.stajBasvurusuId, file);
                            }
                          }}
                          className="hidden"
                          id={`pdf-upload-${defter.id}`}
                          disabled={uploadingDefters.has(defter.stajBasvurusuId)}
                        />
                        <label
                          htmlFor={`pdf-upload-${defter.id}`}
                          className={`px-4 py-2 bg-accent-blue-500 text-white rounded-lg hover:bg-accent-blue-600 transition cursor-pointer inline-flex items-center ${
                            uploadingDefters.has(defter.stajBasvurusuId)
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          {uploadingDefters.has(defter.stajBasvurusuId) ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              {t("common.loading")}
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-5 h-5 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                />
                              </svg>
                              {canReuploadDefter(defter.defterDurumu)
                                ? t("pages.defterim.reupload")
                                : t("pages.defterim.upload")}
                            </>
                          )}
                        </label>
                      </div>
                    ) : null}

                    {defter.dosyaYolu &&
                      !canReuploadDefter(defter.defterDurumu) && 
                      defter.defterDurumu !== 'ONAYLANDI' &&
                      defter.defterDurumu !== 'DANISMAN_REDDETTI' &&
                      defter.defterDurumu !== 'SIRKET_REDDETTI' &&
                      defter.defterDurumu !== 'SIRKET_ONAYLADI' && (
                        // PDF yönetimi (sadece onaylanmamış ve reddedilmemiş durumlar)
                        <>
                          <button
                            onClick={() =>
                              handlePdfDownload(
                                defter.id,
                                defter.originalFileName || "staj-defteri.pdf",
                              )
                            }
                            className="px-4 py-2 bg-accent-green-500 text-white rounded-lg hover:bg-accent-green-600 transition inline-flex items-center"
                          >
                            <svg
                              className="w-5 h-5 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            PDF İndir
                          </button>
                          <button
                            onClick={() => handlePdfDelete(defter.id)}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition inline-flex items-center"
                          >
                            <svg
                              className="w-5 h-5 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            PDF Sil
                          </button>
                        </>
                      )}

                    {defter.dosyaYolu && 
                      (defter.defterDurumu === 'ONAYLANDI' ||
                       defter.defterDurumu === 'DANISMAN_REDDETTI' ||
                       defter.defterDurumu === 'SIRKET_REDDETTI' ||
                       defter.defterDurumu === 'SIRKET_ONAYLADI') && (
                      // Sadece PDF indirme (onaylanmış veya reddedilmiş defterler için)
                      <button
                        onClick={() =>
                          handlePdfDownload(
                            defter.id,
                            defter.originalFileName || "staj-defteri.pdf",
                          )
                        }
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition inline-flex items-center"
                      >
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        PDF İndir
                      </button>
                    )}

                    {defter.dosyaYolu &&
                      canReuploadDefter(defter.defterDurumu) && (
                        <button
                          onClick={() =>
                            handlePdfDownload(
                              defter.id,
                              defter.originalFileName || "staj-defteri.pdf",
                            )
                          }
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition inline-flex items-center"
                        >
                          <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Eski PDF'i İndir
                        </button>
                      )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white shadow-md rounded-lg p-8 text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-16 w-16 text-background-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-text-dark mb-2">
              {t("diary.noDiariesFound")}
            </h3>
            <p className="text-text-light">
              {t("diary.noDiariesDescription")}
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default Defterim;
