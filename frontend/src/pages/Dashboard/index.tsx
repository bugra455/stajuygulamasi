import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import ActionCard from "../../components/cards/ActionCard";
import Footer from "../../components/layout/Footer";
import Navbar from "../../components/layout/Navbar";
import ApplicationList from "./ApplicationList";
import { useDashboardData } from "./hooks";
import { useTranslation } from "../../hooks/useTranslation";

function Dashboard() {
  const { user, logout, isAuthenticated, isLoading, isTeacher } = useAuth();
  const navigate = useNavigate();
  const { basvurular, isLoading: dataLoading } = useDashboardData();
  const { t } = useTranslation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/');
    }
    
    // Öğretmen ise öğretmen dashboard'ına yönlendir
    if (!isLoading && isAuthenticated && isTeacher()) {
      navigate('/danisman-panel');
    }
  }, [isLoading, isAuthenticated, isTeacher, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (isLoading || !user) {
    return <div>Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-block-grid flex flex-col">
      <Navbar user={user} onLogout={handleLogout} />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 w-full">
        {/* Hoş geldiniz mesajı */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-accent-green-700">
            {t("pages.dashboard.welcomeMessage")} {user.name}
          </h1>
        </div>
        
        {/* ActionCard'lar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <ActionCard 
            title={t("pages.dashboard.newApplication")}
            description={t("pages.dashboard.applicationDescription")}
            color="accent-blue"
            href="/staj-basvurusu"
            requiredRoles={["OGRENCI"]}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          />
          <ActionCard 
            title={t("pages.dashboard.trackingTitle")}
            description={t("pages.dashboard.trackingDescription")}
            color="accent-green"
            href="/basvuru-takip"
            requiredRoles={["OGRENCI"]}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
          />
          <ActionCard
            title={t("pages.muafiyetBasvuru.title")}
            description={t("pages.muafiyetBasvuru.subtitle")}
            color="accent-yellow"
            href="/muafiyet-basvuru"
            requiredRoles={["OGRENCI"]}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          />
          <ActionCard
            title={t("pages.dashboard.diaryTitle")}
            description={t("pages.dashboard.diaryDescription")}
            color="accent-purple"
            href="/defterim"
            requiredRoles={["OGRENCI"]}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
          />
          <ActionCard 
            title={t("pages.dashboard.guideTitle")}
            description={t("pages.dashboard.guideDescription")}
            color="gray"
            requiredRoles={["OGRENCI"]}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-bold text-text-dark mb-6">
            {t("pages.dashboard.applicationHistory")}
          </h2>
          
          {dataLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-text-light">Başvurular yükleniyor...</p>
            </div>
          ) : (
            <ApplicationList basvurular={basvurular} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default Dashboard;
