import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import AppNotification from "../../components/common/AppNotification";
import { StajTipiEnum } from "../../types/common";
import { useStajBasvuru } from "./hooks/useStajBasvuru";
import { OgrenciBilgileri } from "./components/OgrenciBilgileri";
import { StajYeri } from "./components/StajYeri";
import { KurumBilgileri } from "./components/KurumBilgileri";
import { DanismanBelge } from "./components/DanismanBelge";
import { StajTipiSection } from "./components/StajTipiSection";
import { StajTarihGun } from "./components/StajTarihGun";
import { StajTaahhutnamesi } from "./components/StajTaahhutnamesi";
import { useTranslation } from "../../hooks/useTranslation";

function StajBasvuru() {
  const {
    user,
    logout,
    isLoading,
    notification,
    setNotification,
    yurtDisi,
    setYurtDisi,
    turkFirmasi,
    setTurkFirmasi,
    setSigortaDosyasi,
    kurumAdi,
    setKurumAdi,
    kurumAdresi,
    setKurumAdresi,
    sorumluTelefon,
    setSorumluTelefon,
    sorumluMail,
    setSorumluMail,
    yetkiliAdi,
    setYetkiliAdi,
    yetkiliUnvani,
    setYetkiliUnvani,
    danismanMail,
    setDanismanMail,
    danismanAdi,
    danismanLoading,
    handleDosyaSecimi,
    stajTipi,
    setStajTipi,
    setHizmetDokumu,
    baslangicTarihi,
    setBaslangicTarihi,
    bitisTarihi,
    setBitisTarihi,
    seciliGunler,
    handleGunSecimi,
    toplamGun,
    saglikSigortasiDurumu,
    setSaglikSigortasiDurumu,
    setSelectedDepartment,
    errors,
    handleSubmit,
  } = useStajBasvuru();

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
            {t("pages.stajBasvuru.title")}
          </h1>
          <p className="mt-2 text-text-light">{t("pages.stajBasvuru.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <OgrenciBilgileri 
            user={user} 
            onDepartmentChange={setSelectedDepartment}
          />

          <StajYeri
            yurtDisi={yurtDisi}
            setYurtDisi={setYurtDisi}
            turkFirmasi={turkFirmasi}
            setTurkFirmasi={setTurkFirmasi}
            setSigortaDosyasi={setSigortaDosyasi}
            errors={errors}
          />

          <KurumBilgileri
            kurumAdi={kurumAdi}
            setKurumAdi={setKurumAdi}
            kurumAdresi={kurumAdresi}
            setKurumAdresi={setKurumAdresi}
            sorumluTelefon={sorumluTelefon}
            setSorumluTelefon={setSorumluTelefon}
            sorumluMail={sorumluMail}
            setSorumluMail={setSorumluMail}
            yetkiliAdi={yetkiliAdi}
            setYetkiliAdi={setYetkiliAdi}
            yetkiliUnvani={yetkiliUnvani}
            setYetkiliUnvani={setYetkiliUnvani}
            errors={errors}
          />

          <DanismanBelge
            danismanMail={danismanMail}
            setDanismanMail={setDanismanMail}
            danismanAdi={danismanAdi}
            danismanLoading={danismanLoading}
            handleDosyaSecimi={handleDosyaSecimi}
            stajTipi={stajTipi}
            setHizmetDokumu={setHizmetDokumu}
            errors={errors}
          />

          <StajTipiSection
            stajTipi={stajTipi}
            setStajTipi={(value: string) => setStajTipi(value as StajTipiEnum)}
            errors={errors}
          />

          <StajTarihGun
            baslangicTarihi={baslangicTarihi}
            setBaslangicTarihi={setBaslangicTarihi}
            bitisTarihi={bitisTarihi}
            setBitisTarihi={setBitisTarihi}
            seciliGunler={seciliGunler}
            handleGunSecimi={handleGunSecimi}
            toplamGun={toplamGun}
            stajTipi={stajTipi}
            errors={errors}
          />

          <StajTaahhutnamesi
            saglikSigortasiDurumu={saglikSigortasiDurumu}
            setSaglikSigortasiDurumu={setSaglikSigortasiDurumu}
            errors={errors}
          />

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-primary-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-700 transition-colors"
            >
              {t("pages.stajBasvuru.buttons.submit")}
            </button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}

export default StajBasvuru;
