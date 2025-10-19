import React, { useState } from "react";
import { api } from "../../lib/api";
import { useTranslation } from "../../hooks/useTranslation";
import { getDefterDurumuColor, getDefterDurumuLabel } from "../../utils/helpers";

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
    };
  };
}

export default function SirketDefterOnay() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [defter, setDefter] = useState<DefterDetay | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.sirketGiris({ email, otp });
      if (response.success && response.data.type === "defter") {
        setDefter(response.data.defter);
        // Email ve OTP'yi localStorage'a kaydet (defter indirme için)
        localStorage.setItem("sirketEmail", email);
        localStorage.setItem("sirketOtp", otp);
      } else if (response.data.type === "basvuru") {
        setError(
          "Bu OTP başvuru onayı için kullanılır. Defter onayı için farklı bir OTP gerekmektedir.",
        );
      } else {
        setError(response.message || "Defter onayı için giriş başarısız");
      }
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "Giriş sırasında hata oluştu",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (
    onayDurumu: "ONAYLANDI" | "REDDEDILDI",
    aciklama?: string,
  ) => {
    if (!defter) return;

    setProcessing(true);
    setError("");

    try {
      const response = await api.sirketDefterOnay({
        defterId: defter.id,
        email,
        otp,
        onayDurumu,
        redSebebi: aciklama, // Backend'te halen redSebebi parametresi bekliyor ama artık hem onay açıklaması hem de red sebebi için kullanılıyor
      });

      if (response.success) {
        alert(
          `Defter ${onayDurumu === "ONAYLANDI" ? "onaylandı ve danışman onayına gönderildi" : "reddedildi"}!`,
        );
        setDefter(null);
        setEmail("");
        setOtp("");
        // localStorage'dan temizle
        localStorage.removeItem("sirketEmail");
        localStorage.removeItem("sirketOtp");
      } else {
        setError(response.message || "İşlem başarısız");
      }
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "İşlem sırasında hata oluştu",
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = () => {
    const redSebebi = prompt("Red sebebini giriniz:");
    if (redSebebi) {
      handleApprove("REDDEDILDI", redSebebi);
    }
  };

  const handleApproval = () => {
    const onayAciklama = prompt("Onay açıklaması (isteğe bağlı):");
    handleApprove("ONAYLANDI", onayAciklama || undefined);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR");
  };

  const downloadDefter = async () => {
    if (!defter) return;

    try {
      // Defter dosyasını indirmek için basit bir fetch kullan
      const url = `/api/sirket/download/${defter.basvuru.id}/defter?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`;

      const response = await fetch(url, {
        method: "GET",
        cache: "no-cache",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
      alert("Defter indirilemedi. Lütfen tekrar deneyin.");
    }
  };

  if (defter) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="border-b border-gray-200 pb-4 mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                Staj Defteri Onayı
              </h1>
              <p className="text-gray-600 mt-1">
                Defter #{defter.id} - Durum: {getDefterDurumuLabel(
                  defter.defterDurumu,
                  t,
                  defter.basvuru?.bitisTarihi,
                  defter.basvuru?.baslangicTarihi
                )}
              </p>
            </div>

            <div className="space-y-6">
              {/* Öğrenci Bilgileri */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">
                  Öğrenci Bilgileri
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Ad Soyad:
                    </p>
                    <p className="text-gray-900">
                      {defter.basvuru.ogrenci.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Öğrenci No:
                    </p>
                    <p className="text-gray-900">
                      {defter.basvuru.ogrenci.studentId}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      E-posta:
                    </p>
                    <p className="text-gray-900">
                      {defter.basvuru.ogrenci.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Fakülte:
                    </p>
                    <p className="text-gray-900">
                      {defter.basvuru.ogrenci.faculty}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Sınıf:</p>
                    <p className="text-gray-900">
                      {defter.basvuru.ogrenci.class}
                    </p>
                  </div>
                </div>
              </div>

              {/* Staj Bilgileri */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-900 mb-3">
                  Staj Bilgileri
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Staj Tipi:
                    </p>
                    <p className="text-gray-900">{defter.basvuru.stajTipi}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-700">
                      Staj Tarihleri:
                    </p>
                    <p className="text-gray-900">
                      {formatDate(defter.basvuru.baslangicTarihi)} -{" "}
                      {formatDate(defter.basvuru.bitisTarihi)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Kurum Bilgileri */}
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-orange-900 mb-3">
                  Kurum Bilgileri
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Kurum Adı:
                    </p>
                    <p className="text-gray-900">{defter.basvuru.kurumAdi}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Kurum Adresi:
                    </p>
                    <p className="text-gray-900">
                      {defter.basvuru.kurumAdresi}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Yetkili Kişi:
                      </p>
                      <p className="text-gray-900">
                        {defter.basvuru.yetkiliAdi}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Yetkili Ünvanı:
                      </p>
                      <p className="text-gray-900">
                        {defter.basvuru.yetkiliUnvani}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Sorumlu E-posta:
                      </p>
                      <p className="text-gray-900">
                        {defter.basvuru.sorumluMail}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Defter Dosyası */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-900 mb-3">
                  Staj Defteri
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Dosya Durumu:
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
                      📋 Staj Defterini İndir
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Onay Butonları */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleReject}
                  disabled={processing}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400"
                >
                  {processing ? t("common.processing") : "Reddet"}
                </button>
                <button
                  onClick={handleApproval}
                  disabled={processing}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                  {processing
                    ? t("common.processing")
                    : "Onayla ve Danışmana Gönder"}
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {t("pages.sirketDefterOnay.title")}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Staj defterini görüntülemek ve onaylamak için e-posta adresinizi ve
            OTP kodunuzu girin
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                E-posta Adresi
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="sirket@ornek.com"
              />
            </div>

            <div>
              <label
                htmlFor="otp"
                className="block text-sm font-medium text-gray-700"
              >
                Defter OTP Kodu
              </label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="123456"
                maxLength={6}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </div>
        </form>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Defter onayı için özel OTP kodunuzu e-postanızdan kontrol edin. Kod
            30 dakika süreyle geçerlidir.
          </p>
        </div>
      </div>
    </div>
  );
}
