import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { useTranslation } from "../../hooks/useTranslation";
import LanguageSwitcher from "../../components/common/LanguageSwitcher";
import AppNotification from "../../components/common/AppNotification";

function Home() {
  const [kullaniciAdi, setKullaniciAdi] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t, translateError } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // API'ye kullaniciAdi ile gönder
      const data = await api.login(kullaniciAdi, password);

      // AuthContext'i API'den gelen kullanıcı verileri ve token ile güncelle
      login(data.user, data.token);

      // UserType'a göre dashboard'a yönlendir
      if (data.user.userType === "DANISMAN") {
        navigate("/danisman-panel");
      } else if (data.user.userType === "KARIYER_MERKEZI") {
        navigate("/kariyer-panel");
      } else if (data.user.userType === "YONETICI") {
        navigate("/admin-panel");
      } else {
        navigate("/ogrenci-panel");
      }
    } catch (err: unknown) {
      setError(
        translateError(
          err instanceof Error
            ? err.message
            : t("auth.loginError"),
        ),
      );
      setNotification({
        message: translateError(
          err instanceof Error
            ? err.message
            : t("auth.loginError"),
        ),
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[url(/arkaplan-giris.jpg)] bg-cover flex items-center justify-center px-4 sm:px-6 lg:px-8">
      {notification && (
        <AppNotification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      
      <div className="max-w-6xl w-full flex flex-col lg:flex-row items-center justify-center gap-4 mx-auto self-center">
        {/* Login Form */}
        <div className="max-w-lg w-full space-y-8 bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-lg flex-shrink-0">
          <div>
            <div className="mx-auto h-36 sm:w-75 flex items-center justify-center bg-primary-50 rounded-2xl border-2 border-primary-200">
              <img src="/kirmizi.svg" alt="KURUMSAL LOGO" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-bold text-text-dark">
              {t("auth.login")}
            </h2>
            <p className="mt-2 text-center text-sm text-text-light">
              {t("auth.loginSubtitle")}
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="kullaniciAdi"
                  className="block text-sm font-medium text-text-dark mb-2"
                >
                  {t("auth.userIdPlaceholder")}
                </label>
                <input
                  id="kullaniciAdi"
                  name="kullaniciAdi"
                  type="text"
                  autoComplete="username"
                  required
                  className="relative block w-full px-3 py-3 border border-background-300 placeholder-text-light text-text-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors"
                  placeholder={t("auth.userIdTextPlaceholder")}
                  value={kullaniciAdi}
                  onChange={(e) => setKullaniciAdi(e.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-text-dark mb-2"
                >
                  {t("auth.passwordPlaceholder")}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="relative block w-full px-3 py-3 border border-background-300 placeholder-text-light text-text-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors"
                  placeholder={t("auth.passwordTextPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200 disabled:bg-primary-400 disabled:cursor-not-allowed"
              >
                {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
              </button>
            </div>
          </form>
        </div>

        {/* Information Panel */}
        <div
          className="w-full max-w-md space-y-6 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg  lg:mt-0 lg:ml-4 flex-shrink-0
            p-4 text-sm
            sm:p-6 sm:text-base
            lg:p-8 lg:text-base"
        >
          <div className="text-center">
            <h3 className="text-xl sm:text-2xl font-bold text-primary-700 mb-4">
              📚 Giriş Bilgileri
            </h3>
            <div className="w-12 sm:w-16 h-1 bg-primary-500 mx-auto mb-6"></div>
          </div>

          <div className="space-y-6 sm:space-y-8">
            {/* Öğrenci Bilgileri */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-xl border-l-4 border-blue-500">
              <div className="flex items-center mb-3">
                <span className="text-xl sm:text-2xl mr-3">👨‍🎓</span>
                <h4 className="text-base sm:text-lg font-semibold text-blue-800">Öğrenciler İçin</h4>
              </div>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-semibold min-w-fit">Kullanıcı Adı:</span>
                  <span className="text-blue-700">Öğrenci numaranız</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-semibold min-w-fit">parola:</span>
                  <span className="text-blue-700">TC Kimlik numaranız</span>
                </div>
                <div className="mt-3 p-2 sm:p-3 bg-blue-100 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-blue-800">
                    <span className="font-semibold">Örnek:</span><br/>
                    Kullanıcı Adı: 20222013999<br/>
                    Parola: 23988888888
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Alt Bilgi */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-[10px] sm:text-xs text-gray-600 text-break-words">
              Giriş yaparken sorun yaşıyorsanız Strateji Geliştirme Daire Başkanlığı ile iletişime geçiniz.
            </p>
            <p className="text-[10px] sm:text-xs text-gray-600 text-break-words">
              departman@uni.edu.tr
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
