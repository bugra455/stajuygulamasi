import { StajTipiEnum, stajTipiLabels } from '../types/common';

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('tr-TR');
};

export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('tr-TR');
};

export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return 'N/A';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
};

export const getStajTipiLabel = (stajTipi: StajTipiEnum, t?: (key: string) => string): string => {
  // If translation function provided, try to resolve via translation keys under pages.internshipTypes
  if (t) {
    try {
      const key = `internshipTypes.${String(stajTipi)}`;
      const translated = t(key);
      if (translated && translated !== key) return translated;
    } catch {
      // ignore translation errors
    }
  }

  return stajTipiLabels[stajTipi] || stajTipi;
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'ONAYLANDI':
      return 'bg-accent-green-100 text-accent-green-800';
    case 'REDDEDILDI':
      return 'bg-primary-100 text-primary-800';
    case 'IPTAL_EDILDI':
      return 'bg-gray-200 text-gray-800';
    default:
      return 'bg-accent-orange-100 text-accent-orange-800';
  }
};

// Dinamik defter durumu belirleme - staj bitişine göre
export const getDynamicDefterDurumu = (staticDurum: string, bitisTarihi?: string, baslangicTarihi?: string): string => {
  // Eğer staj henüz bitmemişse ve durum BEKLEMEDE ise, tarih kontrolü yap
  if (staticDurum === 'BEKLEMEDE' && bitisTarihi && baslangicTarihi) {
    const endDate = new Date(bitisTarihi);
    const startDate = new Date(baslangicTarihi);
    const today = new Date();
    
    // Tarihleri sadece gün bazında karşılaştır (saat bilgisini göz ardı et)
    endDate.setHours(23, 59, 59, 999);
    startDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    // Staj henüz başlamamışsa STAJ_BASLANGICI_BEKLENIYOR olsun
    if (today < startDate) {
      return 'STAJ_BASLANGICI_BEKLENIYOR';
    }
    
    // Staj başlamış ve devam ediyorsa STAJ_DEVAM_EDIYOR
    if (today >= startDate && today <= endDate) {
      return 'STAJ_DEVAM_EDIYOR';
    }
    
    // Staj bitmiş ve defter yüklenmemiş/onaylanmamışsa BEKLEMEDE olarak kal
    if (today > endDate) {
      return 'BEKLEMEDE';
    }
  }
  
  return staticDurum;
};

export const getDefterDurumuColor = (durum: string, bitisTarihi?: string, baslangicTarihi?: string): string => {
  const dynamicDurum = getDynamicDefterDurumu(durum, bitisTarihi, baslangicTarihi);
  
  switch (dynamicDurum) {
    case 'ONAYLANDI':
      return 'bg-green-100 text-green-800';
    case 'REDDEDILDI':
    case 'SIRKET_REDDETTI':
    case 'DANISMAN_REDDETTI':
      return 'bg-red-100 text-red-800';
    case 'STAJ_BASLANGICI_BEKLENIYOR':
      return 'bg-yellow-100 text-yellow-800';
    case 'BEKLEMEDE':
      return 'bg-yellow-100 text-yellow-800';  
    case 'STAJ_DEVAM_EDIYOR':
      return 'bg-blue-100 text-blue-800';
    case 'SURE_DOLDU':
      return 'bg-gray-100 text-gray-800';
    case 'SIRKET_ONAYI_BEKLIYOR':
      return 'bg-purple-100 text-purple-800';
    case 'DANISMAN_ONAYI_BEKLIYOR':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getDefterDurumuLabel = (durum: string, t?: (key: string) => string, bitisTarihi?: string, baslangicTarihi?: string): string => {
  const dynamicDurum = getDynamicDefterDurumu(durum, bitisTarihi, baslangicTarihi);
  
  if (t) {
    switch (dynamicDurum) {
      case 'ONAYLANDI':
        return t('pages.defterimc.statusApproved');
      case 'REDDEDILDI':
      case 'SIRKET_REDDETTI':
      case 'DANISMAN_REDDETTI':
        return t('pages.defterim.statusRejected');
      case 'BEKLEMEDE':
        return t('pages.defterim.statusPending');
      case 'STAJ_BASLANGICI_BEKLENIYOR':
        return t('pages.defterim.statusWaitingForStart');
      case 'STAJ_DEVAM_EDIYOR':
        return t('pages.defterim.statusInProgress');
      case 'SURE_DOLDU':
        return t('pages.defterim.statusExpired');
      case 'SIRKET_ONAYI_BEKLIYOR':
        return t('pages.defterim.statusCompanyApproval');
      case 'DANISMAN_ONAYI_BEKLIYOR':
        return t('pages.defterim.statusAdvisorApproval');
      default:
        return durum;
    }
  }
  
  // Fallback without translation
  switch (dynamicDurum) {
    case 'ONAYLANDI':
      return 'Onaylandı';
    case 'REDDEDILDI':
    case 'SIRKET_REDDETTI':
    case 'DANISMAN_REDDETTI':
      return 'Reddedildi';
    case 'BEKLEMEDE':
      return 'Defter Bekleniyor';
    case 'STAJ_BASLANGICI_BEKLENIYOR':
      return 'Staj Başlangıcı Bekleniyor';
    case 'STAJ_DEVAM_EDIYOR':
      return 'Staj Devam Ediyor';
    case 'SURE_DOLDU':
      return 'Yükleme Süresi Doldu';
    case 'SIRKET_ONAYI_BEKLIYOR':
      return 'Şirket Onayı Bekliyor';
    case 'DANISMAN_ONAYI_BEKLIYOR':
      return 'Danışman Onayı Bekliyor';
    default:
      return durum;
  }
};

export const validateEmail = (email: string): boolean => {
  return /^\S+@\S+\.\S+$/.test(email);
};

export const countBusinessDays = (startDate: string, endDate: string, selectedDays: number[]): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (selectedDays.includes(dayOfWeek)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};
