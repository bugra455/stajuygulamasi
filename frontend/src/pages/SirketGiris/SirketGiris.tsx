import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useTranslation } from "../../hooks/useTranslation";
import { getDefterDurumuColor, getDefterDurumuLabel } from "../../utils/helpers";
import LanguageSwitcher from "../../components/common/LanguageSwitcher";

interface BasvuruDetay {
  id: number;
  kurumAdi: string;
  kurumAdresi: string;
  yetkiliAdi: string;
  yetkiliUnvani: string;
  sorumluTelefon: string;
  sorumluMail: string;
  stajTipi: string;
  isCapBasvuru?: boolean;
  capFakulte?: string | null;
  capBolum?: string | null;
  baslangicTarihi: string;
  bitisTarihi: string;
  toplamGun: number;
  danismanMail: string;
  transkriptDosyasi: string;
  hizmetDokumu?: string;
  sigortaDosyasi?: string;
  onayDurumu: string;
  createdAt: string;
  ogrenci: {
    name: string;
    email: string;
    studentId: string;
    faculty: string;
    class: string;
    capFakulte?: string | null;
    capBolum?: string | null;
  // CAP fields (may be present when backend prefers CAP values)
  capDepartman?: string | null;
  capDanisman?: { id: number; name: string; email: string } | null;
  };
  logs: Array<{
    id: number;
    action: string;
    detaylar?: string;
    createdAt: string;
    degisikligiYapan: {
      name: string;
    };
  }>;
}

interface DefterDetay {
  id: number;
  dosyaYolu: string;
  defterDurumu: string;
  basvuru: {
    id: number;
    kurumAdi: string;
    kurumAdresi: string;
    yetkiliAdi: string;
    yetkiliUnvani: string;
    stajTipi: string;
    isCapBasvuru?: boolean;
    capFakulte?: string | null;
    capBolum?: string | null;
    baslangicTarihi: string;
    bitisTarihi: string;
    sorumluMail: string;
    ogrenci: {
      id: number;
      name: string;
      email: string;
      studentId: string;
      faculty: string;
      class: string;
      capFakulte?: string | null;
      capBolum?: string | null;
      capDepartman?: string | null;
      capDanisman?: { id: number; name: string; email: string } | null;
    };
  };
}

export default function SirketGiris() {
  const { t, translateError } = useTranslation();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [basvuru, setBasvuru] = useState<BasvuruDetay | null>(null);
  const [defter, setDefter] = useState<DefterDetay | null>(null);
  const [loginType, setLoginType] = useState<"basvuru" | "defter" | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Extract email and OTP from URL parameters and auto-fill form
  useEffect(() => {
    const urlEmail = searchParams.get("email");
    const urlOtp = searchParams.get("otp");
    
    if (urlEmail) {
      setEmail(decodeURIComponent(urlEmail));
    }
    if (urlOtp) {
      setOtp(decodeURIComponent(urlOtp));
    }
  }, [searchParams]);

  // Modal states
  const [isOnayModalOpen, setIsOnayModalOpen] = useState(false);
  const [isRedModalOpen, setIsRedModalOpen] = useState(false);
  const [onayAciklama, setOnayAciklama] = useState("");
  const [redSebebi, setRedSebebi] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.sirketGiris({ email, otp });
      if (response.success) {
        // Email ve OTP'yi localStorage'a kaydet (dosya indirme için)
        localStorage.setItem("sirketEmail", email);
        localStorage.setItem("sirketOtp", otp);

        if (response.data.type === "basvuru") {
          setBasvuru(response.data.basvuru);
          setLoginType("basvuru");
        } else if (response.data.type === "defter") {
          setDefter(response.data.defter);
          setLoginType("defter");
        }
      } else {
        setError(translateError(response.message || "Giriş başarısız"));
      }
    } catch (error) {
      const err = error as Error;
      setError(translateError(err.message || "Giriş sırasında hata oluştu"));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (
    onayDurumu: "ONAYLANDI" | "REDDEDILDI",
    aciklama?: string,
  ) => {
    if (!basvuru) {
      return;
    }

    setProcessing(true);
    setError("");

    try {
      // localStorage'dan email ve OTP'yi al
      const storedEmail = localStorage.getItem("sirketEmail");
      const storedOtp = localStorage.getItem("sirketOtp");

      if (!storedEmail || !storedOtp) {
        alert(t("pages.company.messages.sessionNotFound"));
        setProcessing(false);
        return;
      }

      const response = await api.sirketOnay({
        basvuruId: basvuru.id,
        email: storedEmail,
        otp: storedOtp,
        onayDurumu,
        redSebebi: aciklama,
      });

      if (response.success) {
        alert(
          `${t("application.application")} ${onayDurumu === "ONAYLANDI" ? t("pages.company.messages.applicationApproved") : t("pages.company.messages.applicationRejected")}!`,
        );
        setBasvuru(null);
        setLoginType(null);
        setEmail("");
        setOtp("");
        // localStorage'dan temizle
        localStorage.removeItem("sirketEmail");
        localStorage.removeItem("sirketOtp");
      } else {
        setError(response.message || t("pages.company.messages.operationFailed"));
      }
    } catch (error) {
      const err = error as Error;
      setError(err.message || t("pages.company.messages.operationError"));
    } finally {
      setProcessing(false);
    }
  };

  const handleDefterApprove = async (
    onayDurumu: "ONAYLANDI" | "REDDEDILDI",
    aciklama?: string,
  ) => {
    if (!defter) {
      return;
    }

    setProcessing(true);
    setError("");

    try {
      // localStorage'dan email ve OTP'yi al
      const storedEmail = localStorage.getItem("sirketEmail");
      const storedOtp = localStorage.getItem("sirketOtp");

      if (!storedEmail || !storedOtp) {
        alert(t("pages.company.messages.sessionNotFound"));
        setProcessing(false);
        return;
      }

      const response = await api.sirketDefterOnay({
        defterId: defter.id,
        email: storedEmail,
        otp: storedOtp,
        onayDurumu,
        redSebebi: aciklama,
      });

      if (response.success) {
        alert(
          `${t("diary.sirketDefterOnay.diary")} ${onayDurumu === "ONAYLANDI" ? t("pages.company.messages.diaryApprovedAndSent") : t("pages.company.messages.diaryRejected")}!`,
        );
        setDefter(null);
        setLoginType(null);
        setEmail("");
        setOtp("");
        // localStorage'dan temizle
        localStorage.removeItem("sirketEmail");
        localStorage.removeItem("sirketOtp");
        // Modal'ları kapat
        setIsOnayModalOpen(false);
        setIsRedModalOpen(false);
        setOnayAciklama("");
        setRedSebebi("");
      } else {
        setError(response.message || t("pages.company.messages.operationFailed"));
      }
    } catch (error) {
      const err = error as Error;
      setError(err.message || t("pages.company.messages.operationError"));
    } finally {
      setProcessing(false);
    }
  };

  const handleOnayla = () => {
    if (loginType === "basvuru") {
      handleApprove("ONAYLANDI", onayAciklama || t("modals.basvuruDetay.companyApprovalNote"));
      setIsOnayModalOpen(false);
      setOnayAciklama("");
    } else if (loginType === "defter") {
      handleDefterApprove(
        "ONAYLANDI",
        onayAciklama || t("modals.basvuruDetay.companyApprovalNote"),
      );
    }
  };

  const handleReddet = () => {
    if (!redSebebi) {
      alert(t("pages.company.messages.enterRejectionReason"));
      return;
    }
    if (loginType === "basvuru") {
      handleApprove("REDDEDILDI", redSebebi);
      setIsRedModalOpen(false);
      setRedSebebi("");
    } else if (loginType === "defter") {
      handleDefterApprove("REDDEDILDI", redSebebi);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR");
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("tr-TR");
  };

  const downloadFile = async (
    basvuruId: number,
    fileType: "transkript" | "sigorta-dosyasi" | "hizmet-dokumu",
    fileName: string,
  ) => {
    try {
      // localStorage'dan email ve OTP'yi al
      const storedEmail = localStorage.getItem("sirketEmail");
      const storedOtp = localStorage.getItem("sirketOtp");

      if (!storedEmail || !storedOtp) {
        alert(t("pages.company.messages.sessionNotFound"));
        return;
      }

      // Backend endpoint için fileType mapping
      let backendFileType: string = fileType;
      if (fileType === "hizmet-dokumu") backendFileType = "hizmet";
      if (fileType === "sigorta-dosyasi") backendFileType = "sigorta";

      // Şirket dosya indirme endpoint'i: /api/sirket/download/:basvuruId/:fileType?email=...&otp=...
      const url = `/api/sirket/download/${basvuruId}/${backendFileType}?email=${encodeURIComponent(storedEmail)}&otp=${encodeURIComponent(storedOtp)}`;

      const response = await fetch(url, {
        method: "GET",
        cache: "no-cache",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch {
      alert(t("pages.company.messages.fileDownloadError"));
    }
  };

  const downloadDefter = async () => {
    if (!defter) return;

    try {
      // localStorage'dan email ve OTP'yi al
      const storedEmail = localStorage.getItem("sirketEmail");
      const storedOtp = localStorage.getItem("sirketOtp");

      if (!storedEmail || !storedOtp) {
        alert(t("pages.company.messages.sessionNotFound"));
        return;
      }

      // Defter dosyasını indirmek için
      const url = `/api/sirket/download/${defter.basvuru.id}/defter?email=${encodeURIComponent(storedEmail)}&otp=${encodeURIComponent(storedOtp)}`;

      const response = await fetch(url, {
        method: "GET",
        cache: "no-cache",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "staj_defteri.pdf";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch {
      alert(t("pages.company.messages.diaryDownloadError"));
    }
  };

  if (basvuru) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="border-b border-gray-200 pb-4 mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {t("pages.company.applicationDetails.title")}
              </h1>
              <p className="text-gray-600 mt-1">{t("pages.company.applicationDetails.applicationNumber")}{basvuru.id}</p>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">
                  {t("pages.company.studentInfo")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {t("pages.company.fields.name")}:
                    </p>
                    <p className="text-gray-900">
                      {basvuru.ogrenci?.name || t("pages.company.messages.infoNotFound")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {t("pages.company.fields.studentId")}:
                    </p>
                    <p className="text-gray-900">
                      {basvuru.ogrenci?.studentId || t("pages.company.messages.infoNotFound")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {t("pages.company.fields.email")}:
                    </p>
                    <p className="text-gray-900">
                      {basvuru.ogrenci?.email || t("pages.company.messages.infoNotFound")}
                    </p>
                  </div>
                  {/* For application view prefer CAP values when basvuru.isCapBasvuru is true */}
                  <div>
                    <p className="text-sm font-medium text-gray-700">{t("pages.company.fields.faculty")}:</p>
                    <p className="text-gray-900">
                      {basvuru.isCapBasvuru
                        ? (basvuru.capFakulte ?? basvuru.ogrenci?.capFakulte ?? basvuru.ogrenci?.capDepartman ?? basvuru.ogrenci?.faculty) 
                        : (basvuru.ogrenci?.faculty || t("pages.company.messages.infoNotFound"))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{t("pages.company.fields.class")}:</p>
                    <p className="text-gray-900">
                      {basvuru.isCapBasvuru
                        ? (basvuru.capBolum ?? basvuru.ogrenci?.capBolum ?? basvuru.ogrenci?.class)
                        : (basvuru.ogrenci?.class || t("pages.company.messages.infoNotFound"))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-900 mb-3">
                  {t("pages.company.internshipInfo")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {t("pages.company.fields.internshipType")}:
                    </p>
                    <p className="text-gray-900">{basvuru.stajTipi}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {t("pages.company.fields.totalDays")}:
                    </p>
                    <p className="text-gray-900">{basvuru.toplamGun} {t("pages.company.labels.days")}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-700">
                      {t("pages.company.fields.internshipDates")}:
                    </p>
                    <p className="text-gray-900">
                      {formatDate(basvuru.baslangicTarihi)} -{" "}
                      {formatDate(basvuru.bitisTarihi)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {t("pages.company.fields.advisor")}:
                    </p>
                    <p className="text-gray-900">{basvuru.danismanMail}</p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-orange-900 mb-3">
                  {t("pages.company.companyInfo")}
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {t("pages.company.fields.companyName")}:
                    </p>
                    <p className="text-gray-900">{basvuru.kurumAdi}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {t("pages.company.fields.companyAddress")}:
                    </p>
                    <p className="text-gray-900">{basvuru.kurumAdresi}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {t("pages.company.fields.authorizedPerson")}:
                      </p>
                      <p className="text-gray-900">{basvuru.yetkiliAdi}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {t("pages.company.fields.authorizedTitle")}:
                      </p>
                      <p className="text-gray-900">{basvuru.yetkiliUnvani}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {t("pages.company.fields.responsiblePhone")}:
                      </p>
                      <p className="text-gray-900">{basvuru.sorumluTelefon}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {t("pages.company.fields.responsibleEmail")}:
                      </p>
                      <p className="text-gray-900">{basvuru.sorumluMail}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {t("pages.company.documents")}
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() =>
                      downloadFile(basvuru.id, "transkript", "transkript.pdf")
                    }
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mr-2"
                  >
                    {t("pages.company.buttons.downloadTranscript")}
                  </button>
                  {basvuru.hizmetDokumu && (
                    <button
                      onClick={() =>
                        downloadFile(
                          basvuru.id,
                          "hizmet-dokumu",
                          "hizmet-dokumu.pdf",
                        )
                      }
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors mr-2"
                    >
                      {t("pages.company.buttons.downloadServiceDocument")}
                    </button>
                  )}
                  {basvuru.sigortaDosyasi && (
                    <button
                      onClick={() =>
                        downloadFile(
                          basvuru.id,
                          "sigorta-dosyasi",
                          "sigorta.pdf",
                        )
                      }
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      {t("pages.company.buttons.downloadInsurance")}
                    </button>
                  )}
                </div>
              </div>

              {basvuru.logs && basvuru.logs.length > 0 && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-purple-900 mb-3">
                    {t("pages.company.processHistory")}
                  </h3>
                  <div className="space-y-2">
                    {basvuru.logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start space-x-3 p-3 bg-white rounded border"
                      >
                        <div className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                        <div className="flex-grow">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">
                                {log.action.replace(/([A-Z])/g, " $1").trim()}
                              </p>
                              <p className="text-sm text-gray-600">
                                {log.degisikligiYapan.name} {t("pages.company.labels.by")}
                              </p>
                              {log.detaylar && (
                                <p className="text-sm text-gray-700 mt-1 bg-gray-100 p-2 rounded">
                                  {log.detaylar}
                                </p>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 whitespace-nowrap ml-4">
                              {formatDateTime(log.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="flex justify-center space-x-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsOnayModalOpen(true);
                  }}
                  disabled={processing}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {processing ? t("common.processing") : t("pages.company.buttons.approveApplication")}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsRedModalOpen(true);
                  }}
                  disabled={processing}
                  className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {processing ? t("common.processing") : t("pages.company.buttons.rejectApplication")}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
          </div>
        </div>

        {isOnayModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">{t("pages.company.confirmation.approveApplicationTitle")}</h3>
              <p className="text-gray-600 mb-4">
                {t("pages.company.confirmation.approveApplicationText")}
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("pages.company.labels.description")}
                </label>
                <textarea
                  value={onayAciklama}
                  onChange={(e) => setOnayAciklama(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder={t("pages.company.placeholders.approvalNote")}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsOnayModalOpen(false);
                    setOnayAciklama("");
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleOnayla();
                  }}
                  disabled={processing}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                >
                  {processing ? t("common.processing") : t("common.approve")}
                </button>
              </div>
            </div>
          </div>
        )}

        {isRedModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">{t("pages.company.confirmation.rejectApplicationTitle")}</h3>
              <p className="text-gray-600 mb-4">
                {t("pages.company.confirmation.rejectApplicationText")}
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("pages.company.labels.rejectionReason")}
                </label>
                <textarea
                  value={redSebebi}
                  onChange={(e) => setRedSebebi(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder={t("pages.company.placeholders.rejectionReason")}
                  required
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsRedModalOpen(false);
                    setRedSebebi("");
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleReddet();
                  }}
                  disabled={processing || !redSebebi.trim()}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                >
                  {processing ? t("common.processing") : t("common.reject")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (defter) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="border-b border-gray-200 pb-4 mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {t("pages.company.diaryApproval.title")}
              </h1>
              <p className="text-gray-600 mt-1">
                {t("pages.company.diaryApproval.diaryNumber")}{defter.id} - {t("pages.company.diaryApproval.status")}: {getDefterDurumuLabel(
                  defter.defterDurumu,
                  t,
                  defter.basvuru?.bitisTarihi,
                  defter.basvuru?.baslangicTarihi
                )}
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">
                  {t("pages.company.studentInfo")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {t("pages.company.fields.name")}:
                    </p>
                    <p className="text-gray-900">
                      {defter.basvuru.ogrenci.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {t("pages.company.fields.studentId")}:
                    </p>
                    <p className="text-gray-900">
                      {defter.basvuru.ogrenci.studentId}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {t("pages.company.fields.email")}:
                    </p>
                    <p className="text-gray-900">
                      {defter.basvuru.ogrenci.email}
                    </p>
                  </div>
                  {/* If this defter belongs to a ÇAP application, show the CAP-provided faculty/class directly and don't show a separate CAP badge */}
                  <div>
                    <p className="text-sm font-medium text-gray-700">{t("pages.company.fields.faculty")}:</p>
                    <p className="text-gray-900">
                      {defter.basvuru?.isCapBasvuru
                        ? (defter.basvuru.capFakulte ?? defter.basvuru.ogrenci.capFakulte ?? defter.basvuru.ogrenci.capDepartman ?? defter.basvuru.ogrenci.faculty)
                        : defter.basvuru.ogrenci.faculty}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{t("pages.company.fields.class")}:</p>
                    <p className="text-gray-900">
                      {defter.basvuru?.isCapBasvuru
                        ? (defter.basvuru.capBolum ?? defter.basvuru.ogrenci.capBolum ?? defter.basvuru.ogrenci.class)
                        : defter.basvuru.ogrenci.class}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-900 mb-3">
                  {t("pages.company.internshipInfo")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {t("pages.company.fields.internshipType")}:
                    </p>
                    <p className="text-gray-900">{defter.basvuru.stajTipi}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-700">
                      {t("pages.company.fields.internshipDates")}:
                    </p>
                    <p className="text-gray-900">
                      {formatDate(defter.basvuru.baslangicTarihi)} -{" "}
                      {formatDate(defter.basvuru.bitisTarihi)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-orange-900 mb-3">
                  {t("pages.company.companyInfo")}
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {t("pages.company.fields.companyName")}:
                    </p>
                    <p className="text-gray-900">{defter.basvuru.kurumAdi}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {t("pages.company.fields.companyAddress")}:
                    </p>
                    <p className="text-gray-900">
                      {defter.basvuru.kurumAdresi}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {t("pages.company.fields.authorizedPerson")}:
                      </p>
                      <p className="text-gray-900">
                        {defter.basvuru.yetkiliAdi}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {t("pages.company.fields.authorizedTitle")}:
                      </p>
                      <p className="text-gray-900">
                        {defter.basvuru.yetkiliUnvani}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {t("pages.company.fields.responsibleEmail")}:
                      </p>
                      <p className="text-gray-900">
                        {defter.basvuru.sorumluMail}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-900 mb-3">
                  {t("pages.company.fields.diary")}
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {t("pages.company.diaryApproval.fileStatus")}:
                    </p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getDefterDurumuColor(
                        defter.defterDurumu,
                        defter.basvuru?.bitisTarihi,
                        defter.basvuru?.baslangicTarihi
                      )}`}
                    >
                      {getDefterDurumuLabel(
                        defter.defterDurumu,
                        t,
                        defter.basvuru?.bitisTarihi,
                        defter.basvuru?.baslangicTarihi
                      )}
                    </span>
                  </div>
                  <div>
                    <button
                      onClick={downloadDefter}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      {t("pages.company.diaryApproval.downloadDiary")}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="flex justify-center space-x-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsOnayModalOpen(true);
                  }}
                  disabled={processing}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {processing ? t("common.processing") : t("pages.company.buttons.approveDiary")}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsRedModalOpen(true);
                  }}
                  disabled={processing}
                  className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {processing ? t("common.processing") : t("pages.company.buttons.rejectDiary")}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
          </div>
        </div>

        {isOnayModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">{t("pages.company.confirmation.approveDiaryTitle")}</h3>
              <p className="text-gray-600 mb-4">
                {t("pages.company.confirmation.approveDiaryText")}
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("pages.company.labels.description")}
                </label>
                <textarea
                  value={onayAciklama}
                  onChange={(e) => setOnayAciklama(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder={t("pages.company.placeholders.approvalNote")}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsOnayModalOpen(false);
                    setOnayAciklama("");
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleOnayla();
                  }}
                  disabled={processing}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                >
                  {processing ? t("common.processing") : t("common.approve")}
                </button>
              </div>
            </div>
          </div>
        )}

        {isRedModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">{t("pages.company.confirmation.rejectDiaryTitle")}</h3>
              <p className="text-gray-600 mb-4">
                {t("pages.company.confirmation.rejectDiaryText")}
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("pages.company.labels.rejectionReason")}
                </label>
                <textarea
                  value={redSebebi}
                  onChange={(e) => setRedSebebi(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder={t("pages.company.placeholders.rejectionReason")}
                  required
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsRedModalOpen(false);
                    setRedSebebi("");
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleReddet();
                  }}
                  disabled={processing || !redSebebi.trim()}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                >
                  {processing ? t("common.processing") : t("common.reject")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{
        backgroundImage: "url('/arkaplan-sirket.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >

      {/* Gray and blur overlay */}
      <div className="absolute inset-0 bg-gray-200/60 backdrop-blur-sm z-0" />

      {/* Content */}
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 relative z-10">
        {/* Üniversite Logosu */}
        <div className="flex justify-center mb-6">
          <img
            src="/kirmizi.svg"
            alt="Üniversite Logosu"
            className="h-16 w-auto object-contain"
            loading="lazy"
          />
        </div>
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          {t("pages.company.title")}
        </h2>
        <p className="text-sm text-center text-gray-600 mb-6">
          {t("pages.company.subtitle")}
        </p>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              {t("pages.company.fields.email")}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder={t("pages.company.placeholders.companyEmail")}
            />
          </div>
          <div>
            <label
              htmlFor="otp"
              className="block text-sm font-medium text-gray-700"
            >
              {t("auth.password")} (OTP)
            </label>
            <input
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder={t("pages.company.placeholders.otpCode")}
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
            >
              {loading ? t("auth.loginInProgress") : t("auth.login")}
            </button>
          </div>
        </form>
      </div>

      {isOnayModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">{t("pages.company.confirmation.approveProcess")}</h3>
            <p className="mb-4">
              {t("pages.company.confirmation.confirmProcess")}
            </p>
            <textarea
              className="w-full p-2 border rounded mb-4"
              placeholder={t("pages.company.placeholders.optionalNote")}
              value={onayAciklama}
              onChange={(e) => setOnayAciklama(e.target.value)}
            />
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setIsOnayModalOpen(false)}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleOnayla}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                {t("common.approve")}
              </button>
            </div>
          </div>
        </div>
      )}

      {isRedModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">{t("pages.company.confirmation.rejectProcess")}</h3>
            <textarea
              className="w-full p-2 border rounded mb-4"
              placeholder={t("pages.company.placeholders.requiredRejectionReason")}
              value={redSebebi}
              onChange={(e) => setRedSebebi(e.target.value)}
              required
            />
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setIsRedModalOpen(false)}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleReddet}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                {t("common.reject")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

