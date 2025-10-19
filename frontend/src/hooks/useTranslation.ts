import { useTranslation as useI18nextTranslation } from "react-i18next";

export const useTranslation = () => {
  const { t, i18n } = useI18nextTranslation();

  // Helper function to translate error messages
  const translateError = (message: string): string => {
    // Map common error messages to translation keys
    const errorMappings: Record<string, string> = {
      "Başvuru bilgileri yüklenirken bir hata oluştu.":
        "errors.applicationLoadError",
      "Başvuru kaydedilirken bir hata oluştu.": "errors.applicationSaveError",
      "Başvuru güncellenirken bir hata oluştu.":
        "errors.applicationUpdateError",
      "Başvuru iptal edilemedi": "errors.applicationCancelError",
      "Defter detayları yüklenemedi": "errors.diaryLoadError",
      "Defter kaydedilemedi": "errors.diarySaveError",
      "Defter yüklenemedi": "errors.diaryUploadError",
      "Danışman bilgileri yüklenemedi": "errors.advisorLoadError",
      "Öğrenci başvuruları getirilemedi": "errors.studentLoadError",
      "PDF indirilemedi": "errors.pdfDownloadError",
      "Onaylama işlemi başarısız": "errors.approvalError",
      "Reddetme işlemi başarısız": "errors.rejectionError",
      "Veri yüklenirken bir hata oluştu": "errors.dataLoadError",
      "Kaydetme işlemi başarısız": "errors.saveError",
      "Silme işlemi başarısız": "errors.deleteError",
      "Güncelleme işlemi başarısız": "errors.updateError",
      "Dosya yükleme hatası": "errors.fileUploadError",
      "Dosya indirme hatası": "errors.fileDownloadError",
      "Geçersiz dosya formatı": "errors.invalidFile",
      "Dosya boyutu çok büyük": "errors.fileSizeError",
      "Ağ bağlantısı hatası": "errors.networkError",
      "Yetkisiz erişim": "auth.unauthorized",
      "Oturum süresi dolmuş": "auth.sessionExpired",
      "Giriş yapılırken bir hata oluştu": "auth.loginError",
      "Bu alan zorunludur": "validation.required",
      "Geçersiz e-posta adresi": "validation.email",
      "Geçersiz TC Kimlik Numarası": "validation.tcKimlik",
      "Başvuruları getirirken bir hata oluştu.": "errors.applicationLoadError",
      "Defterler yüklenirken bir hata oluştu": "errors.diaryLoadError",
      "Defter yüklenirken bir hata oluştu.": "errors.diaryLoadError",
      "PDF yüklenirken bir hata oluştu.": "errors.fileUploadError",
      "PDF indirilirken bir hata oluştu.": "errors.fileDownloadError",
      "PDF silinirken bir hata oluştu.": "errors.deleteError",
      "Dosya indirilemedi. Lütfen tekrar deneyin.": "errors.fileDownloadError",
      "Sadece PDF dosyaları yüklenebilir.": "files.onlyPDF",
      "Dosya boyutu 50MB'dan büyük olamaz.": "diary.maxFileSize",
      "Giriş başarısız": "auth.loginError",
      "Giriş sırasında hata oluştu": "auth.loginError",
      "İşlem başarısız": "errors.generic",
      "İşlem sırasında hata oluştu": "errors.generic",
      "Veri alınırken bir hata oluştu.": "errors.dataLoadError",
      "Başvuru onaylanırken hata oluştu.": "errors.approvalError",
      "Başvuru reddedilirken hata oluştu.": "errors.rejectionError",
      "Defter durumu güncellenirken hata oluştu.": "errors.updateError",
      "İptal sebebi en az 10 karakter olmalıdır.": "validation.minLength",
      "Red sebebi en az 10 karakter olmalıdır.": "validation.minLength",
    };

    const translationKey = errorMappings[message];
    return translationKey ? t(translationKey) : message;
  };

  // Helper function to translate success messages
  const translateSuccess = (message: string): string => {
    const successMappings: Record<string, string> = {
      "Başarıyla kaydedildi": "success.saved",
      "Başarıyla güncellendi": "success.updated",
      "Başarıyla silindi": "success.deleted",
      "Başarıyla yüklendi": "success.uploaded",
      "Başarıyla indirildi": "success.downloaded",
      "Başvuru başarıyla gönderildi": "success.applicationSubmitted",
      "Başvuru başarıyla güncellendi": "success.applicationUpdated",
      "Başvuru başarıyla iptal edildi": "success.applicationCancelled",
      "Başvuru başarıyla onaylandı": "success.applicationApproved",
      "Başvuru başarıyla reddedildi": "success.applicationRejected",
      "Defter başarıyla onaylandı": "success.diaryApproved",
      "Defter başarıyla reddedildi": "success.diaryRejected",
      "Defter başarıyla yüklendi": "success.diaryUploaded",
      "Başarıyla giriş yapıldı": "auth.loginSuccess",
      "Başarıyla çıkış yapıldı": "auth.logoutSuccess",
      "Staj defteri PDF'i başarıyla yüklendi.": "diary.uploadSuccess",
      "Staj defteri PDF'i başarıyla indirildi.": "diary.downloadSuccess",
      "Staj defteri PDF'i başarıyla silindi.": "diary.deleteSuccess",
      "Defter başarıyla yüklendi!": "diary.uploadSuccess",
      "Veriler başarıyla kaydedildi": "success.dataSaved",
      "İşlem başarıyla tamamlandı": "success.operationCompleted",
    };

    const translationKey = successMappings[message];
    return translationKey ? t(translationKey) : message;
  };

  // Helper function to get translated status labels
  const getStatusLabel = (status: string): string => {
    const statusMappings: Record<string, string> = {
      ONAY_BEKLIYOR: "pages.dashboard.statusPending",
      ONAYLANDI: "pages.dashboard.statusApproved",
      REDDEDILDI: "pages.dashboard.statusRejected",
      IPTAL_EDILDI: "pages.dashboard.statusCancelled",
      HOCA_ONAYI_BEKLIYOR: "pages.dashboard.statusAdvisorApproval",
      KARIYER_MERKEZI_ONAYI_BEKLIYOR: "pages.dashboard.statusCareerApproval",
      SIRKET_ONAYI_BEKLIYOR: "pages.dashboard.statusCompanyApproval",
      DANISMAN_ONAYI_BEKLIYOR: "pages.dashboard.statusAdvisorApproval",
      YUKLENDI: "pages.dashboard.uploaded",
      BEKLEMEDE: "pages.dashboard.statusPending",
    };

    const translationKey = statusMappings[status];
    return translationKey ? t(translationKey) : status;
  };

  // Helper function to translate internship types
  const getInternshipTypeLabel = (type: string): string => {
    const typeMappings: Record<string, string> = {
      "IMU_402": "internshipTypes.IMU_402",
      "IMU_404": "internshipTypes.IMU_404",
      "MESLEKI_EGITIM_UYGULAMALI_DERS": "internshipTypes.vocationalEducation",
      "ISTEGE_BAGLI_STAJ": "internshipTypes.optionalInternship",
      "ZORUNLU_STAJ": "internshipTypes.mandatoryInternship",
    };

    const translationKey = typeMappings[type];
    return translationKey ? t(translationKey) : type;
  };

  // Helper function to translate application field labels
  const getApplicationFieldLabel = (field: string): string => {
    const fieldMappings: Record<string, string> = {
      "startDate": "application.startDate",
      "endDate": "application.endDate",
      "applicationDate": "application.applicationDate",
    };

    const translationKey = fieldMappings[field];
    return translationKey ? t(translationKey) : field;
  };

  // Helper function to change language and persist preference
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("language", lng);
  };

  // Initialize language from localStorage on mount
  const initializeLanguage = () => {
    const savedLanguage = localStorage.getItem("language");
    if (savedLanguage && savedLanguage !== i18n.language) {
      i18n.changeLanguage(savedLanguage);
    }
  };

  return {
    t,
    i18n,
    translateError,
    translateSuccess,
    getStatusLabel,
    getInternshipTypeLabel,
    getApplicationFieldLabel,
    changeLanguage,
    initializeLanguage,
    currentLanguage: i18n.language,
    isRTL: i18n.language === "ar",
  };
};

export default useTranslation;
