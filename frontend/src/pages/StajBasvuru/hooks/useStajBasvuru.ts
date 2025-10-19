import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api';
import { StajTipiEnum } from '../../../types/staj.types';

// Types
type ErrorMessages = {
  [key: string]: string[] | undefined;
};

interface StudentRecord {
  id: number;
  faculty: string;
  class: string;
  type: 'NORMAL' | 'CAP';
  displayText: string;
  advisor?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export const useStajBasvuru = () => {
  const { user, logout, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // File states
  const [hizmetDokumu, setHizmetDokumu] = useState<File | null>(null);
  const [sigortaDosyasi, setSigortaDosyasi] = useState<File | null>(null);
  const [transkriptDosyasi, setTranskriptDosyasi] = useState<File | null>(null);
  
  // Location states
  const [yurtDisi, setYurtDisi] = useState<"yurtiçi" | "yurtdışı" | "">("");
  const [turkFirmasi, setTurkFirmasi] = useState<"evet" | "hayır" | "">("");
  
  // Form states
  const [stajTipi, setStajTipi] = useState<StajTipiEnum | "">("");
  const [seciliGunler, setSeciliGunler] = useState<number[]>([]);
  const [baslangicTarihi, setBaslangicTarihi] = useState("");
  const [bitisTarihi, setBitisTarihi] = useState("");
  const [toplamGun, setToplamGun] = useState(0);
  const [kurumAdi, setKurumAdi] = useState("");
  const [kurumAdresi, setKurumAdresi] = useState("");
  const [sorumluTelefon, setSorumluTelefon] = useState("");
  const [sorumluMail, setSorumluMail] = useState("");
  const [yetkiliAdi, setYetkiliAdi] = useState("");
  const [yetkiliUnvani, setYetkiliUnvani] = useState("");
  const [saglikSigortasiDurumu, setSaglikSigortasiDurumu] = useState("");
  const [danismanMail, setDanismanMail] = useState("");
  const [danismanAdi, setDanismanAdi] = useState("");
  const [danismanLoading, setDanismanLoading] = useState(false);
  
  // Student department selection
  const [selectedDepartment, setSelectedDepartment] = useState<StudentRecord | null>(null);
  
  // UI states
  const [errors, setErrors] = useState<ErrorMessages>({});
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Authentication check
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/");
      return;
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Token expiration handling
  useEffect(() => {
    const handleTokenExpired = () => {
      logout();
      navigate("/");
    };
    window.addEventListener('tokenExpired', handleTokenExpired);
    return () => window.removeEventListener('tokenExpired', handleTokenExpired);
  }, [logout, navigate]);

  // Load advisor info for student - CAP seçildiğinde güncelle
  useEffect(() => {
    if (user && isAuthenticated && user.userType === 'OGRENCI') {
      const loadDanismanInfo = async () => {
        setDanismanLoading(true);
        try {
          // CAP başvurusu ise CAP danışman bilgilerini kullan
          if (selectedDepartment?.type === 'CAP' && selectedDepartment.advisor) {
            setDanismanMail(selectedDepartment.advisor.email);
            setDanismanAdi(selectedDepartment.advisor.name);
          } else if (selectedDepartment?.type === 'NORMAL' && selectedDepartment.advisor) {
            setDanismanMail(selectedDepartment.advisor.email);
            setDanismanAdi(selectedDepartment.advisor.name);
          } else {
            // Eğer advisor bilgisi yoksa mevcut danışmanı yükle
            const response = await api.getDanismanInfo();
            if (response.danisman) {
              setDanismanMail(response.danisman.email);
              setDanismanAdi(response.danisman.name);
            }
          }
        } catch (error) {
          console.warn('Danışman bilgisi yüklenemedi:', error);
          // Danışman bilgisi yüklenemezse, kullanıcı manuel girebilir
        } finally {
          setDanismanLoading(false);
        }
      };
      
      loadDanismanInfo();
    }
  }, [user, isAuthenticated, selectedDepartment]);

  // Total days calculation
  useEffect(() => {
    if (baslangicTarihi && bitisTarihi && seciliGunler.length > 0) {
      let sayac = 0;
      
      // Tarihleri doğru parse et
      const baslangic = new Date(baslangicTarihi + 'T12:00:00');
      const bitis = new Date(bitisTarihi + 'T12:00:00');
      
      // Tarihleri normalize et
      baslangic.setHours(0, 0, 0, 0);
      bitis.setHours(0, 0, 0, 0);
      
      const mevcutTarih = new Date(baslangic);

      while (mevcutTarih <= bitis) {
        const haftaninGunu = mevcutTarih.getDay();
        if (seciliGunler.includes(haftaninGunu)) {
          sayac++;
        }
        mevcutTarih.setDate(mevcutTarih.getDate() + 1);
      }
      
      setToplamGun(sayac);

      // Staj tipi limitlerini kontrol et
      if (stajTipi) {
        const maxGun = stajTipi === StajTipiEnum.ISTEGE_BAGLI_STAJ ? 30 : 
                       (stajTipi === StajTipiEnum.IMU_402 || stajTipi === StajTipiEnum.IMU_404) ? 70 : 
                       90;
        
        if (sayac > maxGun) {
          setErrors((prev) => ({
            ...prev,
            toplamGun: [`Bu staj tipi için maksimum ${maxGun} gün seçilebilir. Şu an ${sayac} gün seçildi.`]
          }));
        } else {
          setErrors((prev) => ({ ...prev, toplamGun: undefined }));
        }
      }
    } else {
      setToplamGun(0);
    }
  }, [baslangicTarihi, bitisTarihi, seciliGunler, stajTipi]);

  // Handler functions
  const handleGunSecimi = (gunIndex: number, secildi: boolean) => {
    setSeciliGunler((onceki) =>
      secildi ? [...onceki, gunIndex] : onceki.filter((d) => d !== gunIndex)
    );
  };

  const handleDosyaSecimi = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setTranskriptDosyasi(e.target.files[0]);
    }
  };

  const validateForm = (): ErrorMessages => {
    const newErrors: ErrorMessages = {};

    if (kurumAdi.trim().length < 3)
      newErrors.kurumAdi = ["Kurum adı en az 3 karakter olmalıdır."];
    if (kurumAdresi.trim().length < 10)
      newErrors.kurumAdresi = ["Kurum adresi en az 10 karakter olmalıdır."];
    if (sorumluTelefon.trim().length < 1)
      newErrors.sorumluTelefon = ["Sorumlu telefonu boş bırakılamaz."];
    if (!/^\S+@\S+\.\S+$/.test(sorumluMail))
      newErrors.sorumluMail = ["Geçerli bir sorumlu e-posta adresi giriniz."];
    if (yetkiliAdi.trim().length < 1)
      newErrors.yetkiliAdi = ["Yetkili adı boş bırakılamaz."];
    if (yetkiliUnvani.trim().length < 1)
      newErrors.yetkiliUnvani = ["Yetkili unvanı boş bırakılamaz."];
    // danismanMail validation kaldırıldı - otomatik doldurulacak
    if (!transkriptDosyasi)
      newErrors.transkriptDosyasi = ["Transkript dosyası yüklenmelidir."];
    if (!stajTipi) newErrors.stajTipi = ["Staj tipi seçilmelidir."];
    else if (!Object.values(StajTipiEnum).includes(stajTipi as StajTipiEnum)) newErrors.stajTipi = ["Geçersiz staj tipi seçimi."];
    if (!baslangicTarihi)
      newErrors.baslangicTarihi = ["Başlangıç tarihi seçilmelidir."];
    if (!bitisTarihi) newErrors.bitisTarihi = ["Bitiş tarihi seçilmelidir."];

    // Date validations
    if (baslangicTarihi) {
      const selectedDate = new Date(baslangicTarihi + 'T12:00:00');
      const gun = selectedDate.getDate();
      
      if (gun < 1 || gun > 31) {
        newErrors.baslangicTarihi = [
          "Geçerli bir gün seçiniz.",
        ];
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // En az 10 gün sonra olmalı
      const minDate = new Date(today);
      minDate.setDate(today.getDate() + 10);
      
      // Bu ay içinde olmalı
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const selectedMonth = selectedDate.getMonth();
      const selectedYear = selectedDate.getFullYear();
      
      const checkDate = new Date(selectedDate);
      checkDate.setHours(0, 0, 0, 0);
      
      if (checkDate < minDate) {
        newErrors.baslangicTarihi = [
          "Staj başlangıç tarihi başvuru tarihinden en az 10 gün sonra olmalıdır.",
        ];
      }
      
      if (selectedMonth !== currentMonth || selectedYear !== currentYear) {
        newErrors.baslangicTarihi = [
          "Staj başvurusu sadece bulunduğunuz ay için yapılabilir.",
        ];
      }
    }

    if (bitisTarihi) {
      if (baslangicTarihi && bitisTarihi <= baslangicTarihi) {
        newErrors.bitisTarihi = [
          "Bitiş tarihi, başlangıç tarihinden sonra olmalıdır.",
        ];
      }
      
      // Bitiş tarihi de bu ay içinde olmalı
      const bitisDate = new Date(bitisTarihi + 'T12:00:00');
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const bitisMonth = bitisDate.getMonth();
      const bitisYear = bitisDate.getFullYear();
      
      if (bitisMonth !== currentMonth || bitisYear !== currentYear) {
        newErrors.bitisTarihi = [
          "Staj bitiş tarihi de bulunduğunuz ay içinde olmalıdır.",
        ];
      }
    }

    // Total days validation
    if (toplamGun > 0 && stajTipi) {
      const maxGun = stajTipi === StajTipiEnum.ISTEGE_BAGLI_STAJ ? 30 : 
                     (stajTipi === StajTipiEnum.IMU_402 || stajTipi === StajTipiEnum.IMU_404) ? 70 : 
                     90;
      
      if (toplamGun > maxGun) {
        newErrors.toplamGun = [
          `Bu staj tipi için maksimum ${maxGun} gün seçilebilir. Şu an ${toplamGun} gün seçildi.`,
        ];
      }
    }

    if (!seciliGunler.length) {
      newErrors.seciliGunler = ["En az bir staj günü seçilmelidir."];
    }

    if (
      !saglikSigortasiDurumu ||
      (saglikSigortasiDurumu !== "ALIYORUM" &&
        saglikSigortasiDurumu !== "ALMIYORUM")
    ) {
      newErrors.saglikSigortasiDurumu = [
        "Sağlık sigortası durumu belirtilmelidir.",
      ];
    }

    // Staj type specific validations
    if (stajTipi === StajTipiEnum.ISTEGE_BAGLI_STAJ && toplamGun > 30) {
      newErrors.toplamGun = ["Gönüllü staj en fazla 30 gün olabilir."];
    }
    if (
      (stajTipi === StajTipiEnum.IMU_402 || stajTipi === StajTipiEnum.IMU_404) &&
      toplamGun > 70
    ) {
      newErrors.toplamGun = ["IMU stajları en fazla 70 gün olabilir."];
    }

    // IMU_404 için tam 70 gün zorunluluğu
    if (stajTipi === StajTipiEnum.IMU_404 && toplamGun !== 70) {
      newErrors.toplamGun = ["IMU 404 stajı için toplam gün sayısı tam olarak 70 iş günü olmalıdır."];
    }

    if (
    (stajTipi === StajTipiEnum.IMU_404) &&
      !hizmetDokumu
    ) {
      newErrors.hizmetDokumu = [
        "6 aylık e-devlet uzun vade hizmet dökümü yüklenmelidir.",
      ];
    }

    // Location validations
    if (yurtDisi === "") {
      newErrors.yurtDisi = ["Staj yeri seçilmelidir."];
    }
    if (yurtDisi === "yurtdışı" && turkFirmasi === "") {
      newErrors.turkFirmasi = ["Firma tipi seçilmelidir."];
    }
    if (yurtDisi === "yurtdışı" && turkFirmasi === "hayır" && !sigortaDosyasi) {
      newErrors.sigortaDosyasi = ["Sigorta dosyası yüklenmelidir."];
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setNotification({
        message:
          "Lütfen formdaki tüm zorunlu alanları doğru bir şekilde doldurun.",
        type: "error",
      });

      const firstErrorKey = Object.keys(validationErrors)[0];
      if (firstErrorKey) {
        const element = document.getElementById(firstErrorKey);
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    if (!user || !transkriptDosyasi) {
      setNotification({
        message: "Kullanıcı bilgileri veya dosya eksik. Lütfen tekrar deneyin.",
        type: "error",
      });
      return;
    }

    const formData = new FormData();
    formData.append("ogrenciId", user.id.toString());
    formData.append("kurumAdi", kurumAdi);
    formData.append("kurumAdresi", kurumAdresi);
    formData.append("sorumluTelefon", sorumluTelefon);
    formData.append("sorumluMail", sorumluMail);
    formData.append("yetkiliAdi", yetkiliAdi);
    formData.append("yetkiliUnvani", yetkiliUnvani);
    
    const stajTipiKey = Object.keys(StajTipiEnum).find(
      key => StajTipiEnum[key as keyof typeof StajTipiEnum] === stajTipi
    );
    if (stajTipiKey) {
      formData.append("stajTipi", stajTipiKey);
    }
    
    formData.append("baslangicTarihi", baslangicTarihi);
    formData.append("bitisTarihi", bitisTarihi);
    formData.append("seciliGunler", JSON.stringify(seciliGunler));
    formData.append("toplamGun", toplamGun.toString());
    formData.append("saglikSigortasiDurumu", saglikSigortasiDurumu);
    formData.append("yurtDisi", yurtDisi);
    
    if (yurtDisi === "yurtdışı") {
      formData.append("turkFirmasi", turkFirmasi);
    }
    
    // danismanMail artık otomatik backend'de doldurulacak - formdan gönderilmiyor
    formData.append("transkriptDosyasi", transkriptDosyasi, transkriptDosyasi.name);
    
    if (hizmetDokumu) {
      formData.append("hizmetDokumu", hizmetDokumu, hizmetDokumu.name);
    }
    if (sigortaDosyasi) {
      formData.append("sigortaDosyasi", sigortaDosyasi, sigortaDosyasi.name);
    }

    // CAP başvuru bilgilerini ekle
    if (selectedDepartment) {
      if (selectedDepartment.type === 'CAP') {
        formData.append("isCapBasvuru", "true");
        formData.append("capId", selectedDepartment.id.toString());
        formData.append("capFakulte", selectedDepartment.faculty);
        // class alanından bölüm ve departman çıkar (format: "Bölüm - Departman")
        const [bolum, departman] = selectedDepartment.class.split(' - ');
        formData.append("capBolum", bolum || selectedDepartment.class);
        formData.append("capDepartman", departman || "");
        console.log(`🚀 [FRONTEND] CAP başvurusu gönderiliyor - ID: ${selectedDepartment.id}, Bölüm: ${bolum}`);
      } else if (selectedDepartment.id === 1) {
        // Ana bölüm seçildi (ID = 1)
        formData.append("isCapBasvuru", "false");
        console.log(`🚀 [FRONTEND] Ana bölüm başvurusu gönderiliyor`);
      } else {
        formData.append("isCapBasvuru", "false");
      }
    } else {
      formData.append("isCapBasvuru", "false");
    }

    try {
      await api.createBasvuru(formData);
      setNotification({
        message: "Başvurunuz başarıyla gönderildi!",
        type: "success",
      });
      setTimeout(() => navigate("/ogrenci-panel"), 2000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu";
      if (errorMessage.includes('errors')) {
        setNotification({
          message: "Lütfen formdaki hataları düzeltin.",
          type: "error",
        });
      } else {
        setNotification({
          message: errorMessage || "Başvuru sırasında bir hata oluştu.",
          type: "error",
        });
      }
    }
  };

  return {
    // Auth
    user,
    logout,
    isLoading,
    isAuthenticated,
    
    // Files
    hizmetDokumu,
    setHizmetDokumu,
    sigortaDosyasi,
    setSigortaDosyasi,
    transkriptDosyasi,
    setTranskriptDosyasi,
    
    // Location
    yurtDisi,
    setYurtDisi,
    turkFirmasi,
    setTurkFirmasi,
    
    // Form data
    stajTipi,
    setStajTipi,
    seciliGunler,
    setSeciliGunler,
    baslangicTarihi,
    setBaslangicTarihi,
    bitisTarihi,
    setBitisTarihi,
    toplamGun,
    setToplamGun,
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
    saglikSigortasiDurumu,
    setSaglikSigortasiDurumu,
    danismanMail,
    setDanismanMail,
    danismanAdi,
    setDanismanAdi,
    danismanLoading,
    
    // Department selection
    selectedDepartment,
    setSelectedDepartment,
    
    // UI
    errors,
    setErrors,
    notification,
    setNotification,
    
    // Handlers
    handleGunSecimi,
    handleDosyaSecimi,
    handleSubmit,
    validateForm,
  };
};
