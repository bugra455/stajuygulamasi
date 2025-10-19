// Enum display utilities

export const DefterDurumuLabels = {
  'BEKLEMEDE': 'Beklemede',
  'SIRKET_ONAYI_BEKLIYOR': 'Şirket Onayı Bekliyor',
  'SIRKET_REDDETTI': 'Şirket Reddetti',
  'DANISMAN_ONAYI_BEKLIYOR': 'Danışman Onayı Bekliyor',
  'DANISMAN_REDDETTI': 'Danışman Reddetti',
  'ONAYLANDI': 'Onaylandı',
  'REDDEDILDI': 'Reddedildi'
} as const;

export const OnayDurumuLabels = {
  'HOCA_ONAYI_BEKLIYOR': 'Danışman Onayı Bekliyor',
  'KARIYER_MERKEZI_ONAYI_BEKLIYOR': 'Kariyer Merkezi Onayı Bekliyor',
  'SIRKET_ONAYI_BEKLIYOR': 'Şirket Onayı Bekliyor',
  'ONAYLANDI': 'Onaylandı',
  'REDDEDILDI': 'Reddedildi',
  'IPTAL_EDILDI': 'İptal Edildi'
} as const;

export const getDefterDurumuLabel = (durum: string): string => {
  return DefterDurumuLabels[durum as keyof typeof DefterDurumuLabels] || durum;
};

export const getOnayDurumuLabel = (durum: string): string => {
  return OnayDurumuLabels[durum as keyof typeof OnayDurumuLabels] || durum;
};

export const getDefterDurumuColor = (durum: string): string => {
  switch (durum) {
    case 'ONAYLANDI':
      return 'bg-green-100 text-green-800';
    case 'REDDEDILDI':
    case 'SIRKET_REDDETTI':
    case 'DANISMAN_REDDETTI':
      return 'bg-red-100 text-red-800';
    case 'SIRKET_ONAYI_BEKLIYOR':
    case 'DANISMAN_ONAYI_BEKLIYOR':
      return 'bg-yellow-100 text-yellow-800';
    case 'BEKLEMEDE':
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getOnayDurumuColor = (durum: string): string => {
  switch (durum) {
    case 'ONAYLANDI':
      return 'bg-green-100 text-green-800';
    case 'REDDEDILDI':
    case 'IPTAL_EDILDI':
      return 'bg-red-100 text-red-800';
    case 'HOCA_ONAYI_BEKLIYOR':
    case 'KARIYER_MERKEZI_ONAYI_BEKLIYOR':
    case 'SIRKET_ONAYI_BEKLIYOR':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Check if defter can be re-uploaded (rejected states)
export const canReuploadDefter = (durum: string): boolean => {
  return durum === 'REDDEDILDI' || durum === 'SIRKET_REDDETTI' || durum === 'DANISMAN_REDDETTI';
};
