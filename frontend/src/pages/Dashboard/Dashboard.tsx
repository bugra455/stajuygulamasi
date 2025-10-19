import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import ActionCard from "../../components/cards/ActionCard";
import Footer from "../../components/layout/Footer";
import Navbar from "../../components/layout/Navbar";
import { useTranslation } from "../../hooks/useTranslation";

// Prisma'daki enum'a karşılık gelen bir arayüz
import { StajTipiEnum } from "../../types/staj.types";
import { getStajTipiLabel } from "../../utils/helpers";

interface StajBasvurusu {
  id: number;
  kurumAdi: string;
  stajTipi: StajTipiEnum;
  baslangicTarihi: string;
  bitisTarihi: string;
  onayDurumu:
    | "HOCA_ONAYI_BEKLIYOR"
    | "KARIYER_MERKEZI_ONAYI_BEKLIYOR"
    | "SIRKET_ONAYI_BEKLIYOR"
    | "ONAYLANDI"
    | "REDDEDILDI"
    | "IPTAL_EDILDI";
  iptalSebebi?: string | null;
}

function Dashboard() {
  const { user, token, logout, isAuthenticated, isLoading, isTeacher } =
    useAuth();
  const navigate = useNavigate();
  const { t, translateError } = useTranslation();
  const [basvurular, setBasvurular] = useState<StajBasvurusu[]>([]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/");
    }

    // Öğretmen ise öğretmen dashboard'ına yönlendir
    if (!isLoading && isAuthenticated && isTeacher()) {
      navigate("/danisman-panel");
    }
  }, [isLoading, isAuthenticated, isTeacher, navigate]);

  useEffect(() => {
    const fetchBasvurular = async () => {
      if (isAuthenticated && token) {
        try {
          const data = await api.getBasvurular();

          // API client zaten success wrapper'ı parse ediyor
          setBasvurular(Array.isArray(data) ? data : []);
        } catch (error: unknown) {
          // Hata durumunda başvuruları boş bırak
          setBasvurular([]);
          console.error(
            translateError(
              error instanceof Error
                ? error.message
                : "Başvurular yüklenirken bir hata oluştu.",
            ),
          );
        }
      }
    };
    fetchBasvurular();
  }, [isAuthenticated, token, translateError]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (isLoading) {
    return <div>{t("common.loading")}</div>;
  }

  const getStatusStyle = (status: StajBasvurusu["onayDurumu"]) => {
    switch (status) {
      case "ONAYLANDI":
        return "bg-accent-green-100 text-accent-green-800";
      case "REDDEDILDI":
        return "bg-primary-100 text-primary-800";
      case "IPTAL_EDILDI":
        return "bg-gray-200 text-gray-800";
      default:
        return "bg-accent-orange-100 text-accent-orange-800";
    }
  };

  const getStatusText = (app: StajBasvurusu) => {
    if (app.onayDurumu === "ONAYLANDI") {
      const now = new Date();
      const baslangicTarihi = new Date(app.baslangicTarihi);

      // Eğer başvuru onaylandı ama staj başlangıç tarihi henüz gelmemişse
      if (now < baslangicTarihi) {
        return "Staj Başlangıcı Bekleniyor";
      }
      return "Onaylandı";
    }

    return app.onayDurumu.replace(/([A-Z])/g, " $1").trim();
  };

  return (
    <div className="min-h-screen bg-block-grid flex flex-col">
      <Navbar user={user!} onLogout={handleLogout} />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 w-full">
        <div className="mb-8 relative">
          <h1 className="text-4xl font-bold text-accent-green-700">
            {t("pages.dashboard.welcomeMessage")} {user?.name}
          </h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <ActionCard
            title={t("pages.dashboard.applyForInternship")}
            description={t("dashboard.applyForInternshipDescription")}
            color="accent-blue"
            href="/staj-basvurusu"
            requiredRoles={["OGRENCI"]}
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            }
          />
          <ActionCard
            title={t("pages.dashboard.trackingTitle")}
            description={t("pages.dashboard.trackingDescription")}
            color="accent-green"
            href="/basvuru-takip"
            requiredRoles={["OGRENCI"]}
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            }
          />
          <ActionCard
            title={t("pages.dashboard.diaryTitle")}
            description={t("pages.dashboard.diaryDescription")}
            color="accent-purple"
            href="/defterim"
            requiredRoles={["OGRENCI"]}
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            }
          />
          <ActionCard
            title={t("pages.dashboard.guideTitle")}
            description={t("pages.dashboard.guideDescription")}
            color="gray"
            requiredRoles={["OGRENCI"]}
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-bold text-text-dark mb-4">
            {t("pages.dashboard.applicationHistory")}
          </h2>
          <div className="bg-background-50 shadow-md rounded-lg overflow-hidden">
            <ul className="divide-y divide-background-200">
              {basvurular.length > 0 ? (
                basvurular.map((app) => (
                  <li
                    key={app.id}
                    className="px-6 py-4 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-semibold text-text-dark">
                        {app.kurumAdi}
                      </p>
                      <p className="text-sm text-text-light">
                        {getStajTipiLabel(app.stajTipi as StajTipiEnum, t) ||
                          app.stajTipi ||
                          t("common.unknown")} {" "}
                        - {new Date(app.baslangicTarihi).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusStyle(app.onayDurumu)}`}
                    >
                      {getStatusText(app)}
                    </span>
                  </li>
                ))
              ) : (
                <p className="text-text-light p-6">
                  {t("common.noApplications")}
                </p>
              )}
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default Dashboard;
