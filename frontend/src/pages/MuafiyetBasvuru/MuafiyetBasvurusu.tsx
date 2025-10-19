import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import AppNotification from "../../components/common/AppNotification";
import { useMuafiyetBasvuru } from "./hooks/useMuafiyetBasvuru";
import { OgrenciBilgileri } from "./components/OgrenciBilgileri";
import { DanismanBelge } from "./components/MuafiyetBelge";
import { useTranslation } from "../../hooks/useTranslation";

function MuafiyetBasvurusu() {
  const {
    user,
    logout,
    isLoading,
    notification,
    setNotification,
    danismanMail,
    setDanismanMail,
    danismanLoading,
    handleDosyaSecimi,
    errors,
    handleSubmit,
    handleDepartmentChange,
  } = useMuafiyetBasvuru();

  const { t } = useTranslation();

  if (isLoading || !user) return <div>{t("common.loading")}</div>;

  return (
    <div className="min-h-screen bg-block-grid flex flex-col">
      {notification && (
        <AppNotification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      <Navbar user={user} onLogout={logout} />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 w-full flex-grow">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text-dark">
            {t("pages.muafiyetBasvuru.title")}
          </h1>
          <p className="mt-2 text-text-light">{t("pages.muafiyetBasvuru.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <OgrenciBilgileri user={user} onDepartmentChange={handleDepartmentChange} />

          <DanismanBelge
            danismanMail={danismanMail}
            setDanismanMail={setDanismanMail}
            danismanLoading={danismanLoading}
            handleDosyaSecimi={handleDosyaSecimi}
            errors={errors}
          />

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-primary-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Gönder
            </button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}

export default MuafiyetBasvurusu;
