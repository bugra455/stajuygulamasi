import React, { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { useTranslation } from "../../hooks/useTranslation";
import { getDefterDurumuColor, getDefterDurumuLabel } from "../../utils/helpers";

interface DefterDetay {
  id: number;
  defterDurumu: string;
  dosyaYolu?: string;
  originalFileName?: string;
  fileSize?: number;
  uploadDate?: string;
  danismanAciklama?: string;
  sirketAciklama?: string;
  danismanOnayDurumu?: number;
  sirketOnayDurumu?: number;
  stajBasvurusu: {
    id: number;
    kurumAdi: string;
    kurumAdresi?: string;
    sorumluTelefon?: string;
    sorumluMail?: string;
    yetkiliAdi?: string;
    yetkiliUnvani?: string;
    stajTipi: string;
      // CAP metadata
      isCapBasvuru?: boolean;
      capFakulte?: string | null;
      capBolum?: string | null;
    baslangicTarihi: string;
    bitisTarihi: string;
    onayDurumu: string;
    ogrenci: {
      id: number;
      name: string;
      email: string;
      studentId: string;
        faculty?: string;
        class?: string;
        capFakulte?: string | null;
        capBolum?: string | null;
        capDepartman?: string | null;
        capDanisman?: { id: number; name: string; email: string } | null;
    };
    danisman?: {
      id: number;
      name: string;
      email: string;
    };
  };
}

interface DefterDetayModalProps {
  isOpen: boolean;
  onClose: () => void;
  defterId: number | null;
  onDurumGuncelle?: (id: number, durum: string, aciklama?: string) => void;
  onPdfDownload?: (id: number, fileName: string) => void;
  isProcessing?: boolean;
}

// Utility functions
const getStajTipiLabel = (stajTipi: string): string => {
  switch (stajTipi) {
    case "IMU-402":
      return "IMU-402";
    case "IMU-404":
      return "IMU-404";
    case "Mesleki Egitim Uygulamali Ders (SBF-SHMYO)":
      return "Mesleki Eğitim Uygulamalı Ders (SBF-SHMYO)";
    case "Istege Bagli Staj (Fakulte - Yuksekokul)":
      return "İsteğe Bağlı Staj (Fakülte - Yüksekokul)";
    case "Zorunlu Staj (MYO)":
      return "Zorunlu Staj (MYO)";
    default:
      return stajTipi;
  }
};

const DefterDetayModal: React.FC<DefterDetayModalProps> = ({
  isOpen,
  onClose,
  defterId,
  onDurumGuncelle,
  onPdfDownload,
  isProcessing = false,
}) => {
  const { t } = useTranslation();
  const [defter, setDefter] = useState<DefterDetay | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"defter" | "basvuru">("defter");

  useEffect(() => {
    const fetchDefterDetay = async () => {
      if (!defterId) return;
      setLoading(true);
      setError(null);

      try {
        const response = await api.getDanismanDefterDetay(defterId);
        setDefter(response.data || response);
      } catch {
        setError(t("modals.defterDetay.detailsLoadError"));
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && defterId) {
      fetchDefterDetay();
    }
  }, [isOpen, defterId, t]);

  const handleClose = () => {
    setDefter(null);
    setError(null);
    setActiveTab("defter");
    onClose();
  };

  const handlePdfDownload = () => {
    if (defter && onPdfDownload) {
      onPdfDownload(
        defter.id,
        defter.originalFileName || `defter_${defter.id}.pdf`
      );
    }
  };

  const handleOnayla = () => {
    if (defter && onDurumGuncelle) {
      onDurumGuncelle(defter.id, "ONAYLANDI", t("modals.basvuruDetay.approvalNote"));
    }
  };

  const handleReddet = () => {
    if (defter && onDurumGuncelle) {
      const sebep = prompt(t("modals.basvuruDetay.enterReason"));
      if (sebep && sebep.trim()) {
        onDurumGuncelle(defter.id, "REDDEDILDI", sebep.trim());
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {t("modals.defterDetay.title")}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="p-6">
            {loading && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex">
                  <svg
                    className="w-5 h-5 text-red-400 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-red-700">{t("detailModal.detailsLoadError")}</p>
                </div>
              </div>
            )}

            {defter && (
              <>
                {/* Tabs */}
                <div className="mb-6 border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setActiveTab("defter")}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "defter"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {t("modals.defterDetay.diaryStatus")}
                    </button>
                    <button
                      onClick={() => setActiveTab("basvuru")}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "basvuru"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {t("modals.defterDetay.internshipInfo")}
                    </button>
                  </nav>
                </div>

                {/* Tab Content */}
                {activeTab === "defter" && (
                  <div className="space-y-6">
                    {/* Defter Durumu */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-lg font-medium mb-3">
                        {t("modals.defterDetay.diaryStatus")}
                      </h3>
                      <div className="flex items-center gap-3 mb-3">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getDefterDurumuColor(
                            defter.defterDurumu,
                            defter.stajBasvurusu.bitisTarihi,
                            defter.stajBasvurusu.baslangicTarihi
                          )}`}
                        >
                          {getDefterDurumuLabel(defter.defterDurumu, t, defter.stajBasvurusu.bitisTarihi, defter.stajBasvurusu.baslangicTarihi)}
                        </span>
                      </div>

                      {/* Dosya Bilgileri */}
                      {defter.dosyaYolu && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <span className="text-sm text-gray-600">
                              {t("modals.defterDetay.fileName")}:
                            </span>
                            <p className="font-medium">
                              {defter.originalFileName || t("errors.unknown")}
                            </p>
                          </div>
                          {defter.fileSize && (
                            <div>
                              <span className="text-sm text-gray-600">
                                {t("pages.defterim.fileSize")}:
                              </span>
                              <p className="font-medium">
                                {(defter.fileSize / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          )}
                          {defter.uploadDate && (
                            <div>
                              <span className="text-sm text-gray-600">
                                {t("modals.basvuruDetay.uploadedAt")}:
                              </span>
                              <p className="font-medium">
                                {new Date(defter.uploadDate).toLocaleDateString("tr-TR")}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Açıklamalar */}
                      {defter.danismanAciklama && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                          <p className="text-sm text-blue-700">
                            <span className="font-medium">
                              {t("modals.defterDetay.advisorExplanation")}:
                            </span>{" "}
                            {defter.danismanAciklama}
                          </p>
                        </div>
                      )}

                      {defter.sirketAciklama && (
                        <div className="bg-purple-50 border border-purple-200 rounded p-3 mb-3">
                          <p className="text-sm text-purple-700">
                            <span className="font-medium">
                              {t("modals.defterDetay.companyExplanation")}:
                            </span>{" "}
                            {defter.sirketAciklama}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Eylemler */}
                    <div className="flex gap-3">
                      {defter.dosyaYolu && (
                        <button
                          onClick={handlePdfDownload}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          {t("modals.defterDetay.downloadPDF")}
                        </button>
                      )}

                      {defter.defterDurumu === "DANISMAN_ONAYI_BEKLIYOR" && (
                        <>
                          <button
                            onClick={handleOnayla}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isProcessing ? t("common.processing") : t("common.approve")}
                          </button>
                          <button
                            onClick={handleReddet}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isProcessing ? t("common.processing") : t("common.reject")}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "basvuru" && (
                  <div className="space-y-6">
                    {/* Öğrenci Bilgileri */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-lg font-medium mb-3">
                        {t("modals.defterDetay.studentInfo")}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-600">
                            {t("modals.defterDetay.studentName")}:
                          </span>
                          <p className="font-medium">
                            {defter.stajBasvurusu.ogrenci.name}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">
                            {t("modals.defterDetay.studentId")}:
                          </span>
                          <p className="font-medium">
                            {defter.stajBasvurusu.ogrenci.studentId}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">
                            {t("modals.defterDetay.email")}:
                          </span>
                          <p className="font-medium">
                            {defter.stajBasvurusu.ogrenci.email}
                          </p>
                        </div>
                        {/* Prefer CAP values when stajBasvurusu.isCapBasvuru is true */}
                        <div>
                          <span className="text-sm text-gray-600">{t("modals.defterDetay.faculty")}:</span>
                          <p className="font-medium">
                            {defter.stajBasvurusu.isCapBasvuru
                              ? (defter.stajBasvurusu.capFakulte ?? defter.stajBasvurusu.ogrenci.capFakulte ?? defter.stajBasvurusu.ogrenci.capDepartman ?? defter.stajBasvurusu.ogrenci.faculty)
                              : (defter.stajBasvurusu.ogrenci.faculty || "-")}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">{t("modals.defterDetay.class")}:</span>
                          <p className="font-medium">
                            {defter.stajBasvurusu.isCapBasvuru
                              ? (defter.stajBasvurusu.capBolum ?? defter.stajBasvurusu.ogrenci.capBolum ?? defter.stajBasvurusu.ogrenci.class)
                              : (defter.stajBasvurusu.ogrenci.class || "-")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Staj Bilgileri */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-lg font-medium mb-3">
                        {t("modals.defterDetay.tabs.internshipInfo")}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-600">
                            {t("modals.defterDetay.companyName")}:
                          </span>
                          <p className="font-medium">
                            {defter.stajBasvurusu.kurumAdi}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">{t("modals.defterDetay.internshipType")}:</span>
                          <p className="font-medium flex items-center gap-2">
                            <span>{getStajTipiLabel(defter.stajBasvurusu.stajTipi)}</span>
                            {defter.stajBasvurusu.isCapBasvuru && (
                              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">ÇAP-YAP</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">
                            {t("modals.defterDetay.startDate")}:
                          </span>
                          <p className="font-medium">
                            {new Date(
                              defter.stajBasvurusu.baslangicTarihi
                            ).toLocaleDateString("tr-TR")}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">
                            {t("modals.defterDetay.endDate")}:
                          </span>
                          <p className="font-medium">
                            {new Date(
                              defter.stajBasvurusu.bitisTarihi
                            ).toLocaleDateString("tr-TR")}
                          </p>
                        </div>
                        {defter.stajBasvurusu.kurumAdresi && (
                          <div className="md:col-span-2">
                            <span className="text-sm text-gray-600">
                              {t("modals.defterDetay.companyAddress")}:
                            </span>
                            <p className="font-medium">
                              {defter.stajBasvurusu.kurumAdresi}
                            </p>
                          </div>
                        )}
                        {defter.stajBasvurusu.yetkiliAdi && (
                          <div>
                            <span className="text-sm text-gray-600">
                              {t("modals.defterDetay.authorizedName")}:
                            </span>
                            <p className="font-medium">
                              {defter.stajBasvurusu.yetkiliAdi}
                            </p>
                          </div>
                        )}
                        {defter.stajBasvurusu.yetkiliUnvani && (
                          <div>
                            <span className="text-sm text-gray-600">
                              {t("modals.defterDetay.authorizedTitle")}:
                            </span>
                            <p className="font-medium">
                              {defter.stajBasvurusu.yetkiliUnvani}
                            </p>
                          </div>
                        )}
                        {defter.stajBasvurusu.sorumluTelefon && (
                          <div>
                            <span className="text-sm text-gray-600">
                              {t("modals.defterDetay.responsiblePhone")}:
                            </span>
                            <p className="font-medium">
                              {defter.stajBasvurusu.sorumluTelefon}
                            </p>
                          </div>
                        )}
                        {defter.stajBasvurusu.sorumluMail && (
                          <div>
                            <span className="text-sm text-gray-600">
                              {t("modals.defterDetay.responsibleEmail")}:
                            </span>
                            <p className="font-medium">
                              {defter.stajBasvurusu.sorumluMail}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Danışman Bilgileri */}
                    {defter.stajBasvurusu.danisman && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-lg font-medium mb-3">
                          {t("modals.defterDetay.advisorInfo")}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm text-gray-600">
                              {t("modals.defterDetay.advisorName")}:
                            </span>
                            <p className="font-medium">
                              {defter.stajBasvurusu.danisman.name}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">
                              {t("modals.defterDetay.email")}:
                            </span>
                            <p className="font-medium">
                              {defter.stajBasvurusu.danisman.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DefterDetayModal;
