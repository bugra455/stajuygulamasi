const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Use proxy when accessing from localhost
    return '/api';
  }
  
  // For other devices on the network, use the same host as frontend but port 3000
  return `http://${window.location.hostname}:3000/api`;
};

const API_BASE_URL = getApiBaseUrl();

export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '')
    .trim();
};

class ApiClient {
  private baseURL: string;
  async updateDefterDurumu(id: number, yeniDurum: 'BEKLEMEDE' | 'YUKLENDI' | 'ONAYLANDI' | 'REDDEDILDI', sebep?: string) {
    const body: { yeniDurum: typeof yeniDurum; sebep?: string } = { yeniDurum };
    if (yeniDurum === 'REDDEDILDI' && sebep) {
      body.sebep = sebep;
    }
    const response = await this.makeRequest(`/ogrenci/defter/${id}/durum`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Defter durumu güncellenemedi');
    }
    return response.json();
  }

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  protected async makeRequest(
    endpoint: string, 
    options: RequestInit = {},
    requiresAuth: boolean = true
  ): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      ...(options.headers as Record<string, string>),
    };

    if (options.body && typeof options.body === 'string') {
      headers['Content-Type'] = 'application/json';
    }

    if (requiresAuth) {
      const token = sessionStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle auth errors only for authenticated requests
    if (requiresAuth && response.status === 401) {
      // Clear invalid token
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      
      // Dispatch custom event to notify all components
      window.dispatchEvent(new CustomEvent('tokenExpired'));
      
      window.location.href = '/';
      throw new Error('Oturum süresi dolmuş, lütfen tekrar giriş yapın.');
    }

    // Additional security check for critical operations
    if (requiresAuth && response.status === 403) {
      throw new Error('Bu işlem için yetkiniz bulunmamaktadır.');
    }

    return response;
  }

  // Generic file download method
  async getFile(endpoint: string): Promise<Blob> {
    const response = await this.makeRequest(endpoint);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Dosya bulunamadı');
      } else if (response.status === 403) {
        throw new Error('Bu dosyaya erişim yetkiniz yok');
      } else if (response.status === 401) {
        throw new Error('Oturum süreniz dolmuş');
      } else {
        throw new Error(`Dosya indirilemedi (${response.status})`);
      }
    }
    
    return response.blob();
  }

  // Auth endpoints
  async login(kullaniciAdi: string, password: string) {
    const response = await this.makeRequest('/users/login', {
      method: 'POST',
      body: JSON.stringify({ 
        kullaniciAdi: sanitizeInput(kullaniciAdi), 
        password 
      }),
    }, false);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Giriş başarısız');
    }

    return response.json();
  }

  async logout() {
    const response = await this.makeRequest('/users/logout', {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Çıkış başarısız');
    }

    return response.json();
  }



  // Token validation method
  async validateToken() {
    try {
      const response = await this.makeRequest('/users/profile', {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Get advisor info for student
  async getDanismanInfo() {
    const response = await this.makeRequest('/users/danisman-info', {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Danışman bilgisi bulunamadı');
      }
      throw new Error('Danışman bilgileri alınamadı');
    }

    return response.json();
  }

  // Get student records (normal + CAP)
  async getStudentRecords() {
    const response = await this.makeRequest('/users/student-records', {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Öğrenci kayıtları alınamadı');
    }

    return response.json();
  }

  // Basvuru endpoints
  async getBasvurular() {
    const response = await this.makeRequest('/ogrenci/basvurular');
    
    if (!response.ok) {
      throw new Error('Başvurular yüklenemedi');
    }
    
    try {
      const result = await response.json();
      if (result.success && result.data && result.data.basvurular) {
        return result.data.basvurular;
      }
      return result.success ? result.data : result;
    } catch {
      throw new Error('Sunucudan geçersiz yanıt alındı');
    }
  }

  async getBasvuru(id: number) {
    const response = await this.makeRequest(`/ogrenci/basvuru/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Başvuru bulunamadı');
      }
      throw new Error('Başvuru yüklenemedi');
    }
    
    const result = await response.json();
    return result.success ? result.data : result;
  }

  async createBasvuru(formData: FormData) {
    const response = await this.makeRequest('/ogrenci/basvuru', {
      method: 'POST',
      body: formData, 
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Başvuru oluşturulamadı');
    }

    return response.json();
  }

  async createMuafiyetBasvuru(formData: FormData) {
    const response = await this.makeRequest('/ogrenci/muafiyet-basvuru', {
      method: 'POST',
      body: formData, 
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Muafiyet başvurusu oluşturulamadı');
    }

    return response.json();
  }

  async getMuafiyetBasvurular() {
    const response = await this.makeRequest('/ogrenci/muafiyet-basvurular');
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Muafiyet başvuruları getirilemedi');
    }

    try {
      const result = await response.json();
      if (result.success && result.data) {
        return Array.isArray(result.data) ? result.data : [];
      }
      return result.success ? result.data : [];
    } catch {
      throw new Error('Sunucudan geçersiz yanıt alındı');
    }
  }

  // updateBasvuru removed: students can no longer update applications via the frontend.

  async cancelBasvuru(id: number, iptalSebebi: string) {
    const response = await this.makeRequest(`/ogrenci/basvuru/${id}/iptal`, {
      method: 'POST',
      body: JSON.stringify({ iptalSebebi: sanitizeInput(iptalSebebi) }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Başvuru iptal edilemedi');
    }

    return response.json();
  }

  async getDefterler() {
    const response = await this.makeRequest('/ogrenci/defterler');
    
    if (!response.ok) {
      throw new Error('Defterler yüklenemedi');
    }
    
    const result = await response.json();
    return result.success ? result.data : result;
  }

  async getDefterById(id: number) {
    const response = await this.makeRequest(`/ogrenci/defter/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Defter bulunamadı');
      }
      throw new Error('Defter yüklenemedi');
    }
    
    return response.json();
  }

  async uploadDefterPdf(basvuruId: number, formData: FormData) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 120000);

    try {
      
      const response = await this.makeRequest(`/ogrenci/defter/${basvuruId}/upload-pdf`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'PDF yüklenemedi';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      return result;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      const err = error as Error;

      if (err.name === 'AbortError') {
        throw new Error('Yükleme işlemi zaman aşımına uğradı. Dosya çok büyük olabilir, lütfen daha küçük bir PDF deneyin.');
      }
      
      if (err.message?.includes('NetworkError') || err.message?.includes('fetch')) {
        throw new Error('Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.');
      }
      
      throw err;
    }
  }

  async downloadDefterPdf(defterId: number) {
    const response = await this.makeRequest(`/ogrenci/defter/${defterId}/download-pdf`);
    
    if (!response.ok) {
      throw new Error('PDF indirilemedi');
    }
    
    return response.blob();
  }

  async downloadMuafiyetPdf(muafiyetId: number) {
    const response = await this.makeRequest(`/ogrenci/muafiyet-basvuru/${muafiyetId}/download-pdf`);
    
    if (!response.ok) {
      throw new Error('Muafiyet belgesi indirilemedi');
    }
    
    return response.blob();
  }

  async deleteDefterPdf(defterId: number) {
    const response = await this.makeRequest(`/ogrenci/defter/${defterId}/pdf`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'PDF silinemedi');
    }

    return response.json();
  }



  // ADVISOR/DANISMAN API METHODS
  async getDanismanOgrenciler() {
    const response = await this.makeRequest('/danisman/ogrenciler');
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Öğrenciler getirilemedi');
    }
    
    return response.json();
  }

  async getDanismanBasvurular() {
    const response = await this.makeRequest('/danisman/basvurular');
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Başvurular getirilemedi');
    }
    
    return response.json();
  }

  async getDanismanBasvuru(id: number) {
    const response = await this.makeRequest(`/danisman/basvurular/${id}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Başvuru getirilemedi');
    }
    
    return response.json();
  }

  async getOgrenciTumBasvurulari(ogrenciId: number) {
    const response = await this.makeRequest(`/danisman/ogrenci/${ogrenciId}/basvurular`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Öğrencinin başvuruları getirilemedi');
    }
    
    return response.json();
  }

  async getOgrenciTumBasvurulariModal(ogrenciId: number) {
    const response = await this.makeRequest(`/danisman/ogrenci/${ogrenciId}/basvurular-modal`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Öğrencinin tüm başvuruları getirilemedi');
    }
    
    return response.json();
  }

  async getDanismanOgrenciDetay(ogrenciId: number) {
    const response = await this.makeRequest(`/danisman/ogrenci/${ogrenciId}/detay`);
    if (!response.ok) {
      const error = await response.json();
      if (response.status === 404) {
        throw new Error(error.message || 'Öğrenci bulunamadı');
      }
      throw new Error(error.message || 'Öğrenci detayları getirilemedi');
    }
    return response.json();
  }

  async onaylaBasvuru(basvuruId: number, aciklama?: string) {
    const response = await this.makeRequest(`/danisman/basvurular/${basvuruId}/onayla`, {
      method: 'POST',
      body: JSON.stringify({ aciklama: aciklama || '' }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Başvuru onaylanamadı');
    }

    return response.json();
  }

  async reddetBasvuru(basvuruId: number, redSebebi: string) {
    const response = await this.makeRequest(`/danisman/basvurular/${basvuruId}/reddet`, {
      method: 'POST',
      body: JSON.stringify({ redSebebi }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Başvuru reddedilemedi');
    }

    return response.json();
  }

  async getDanismanDefterler() {
    const response = await this.makeRequest('/danisman/defterler');
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Defterler getirilemedi');
    }
    
    return response.json();
  }

  async getDanismanDefter(id: number) {
  // This endpoint should return a PDF blob. Use getFile to return a Blob.
  return this.getFile(`/danisman/defterler/${id}/download-pdf`);
  }

  async getDanismanDefterDetay(defterId: number) {
    const response = await this.makeRequest(`/danisman/defterler/${defterId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Defter detayı getirilemedi');
    }
    
    return response.json();
  }

  async onaylaDefteri(defterId: number, onayDurumu: 'ONAYLANDI' | 'REDDEDILDI', aciklama?: string) {
    const body: { onayDurumu: typeof onayDurumu; aciklama?: string } = { onayDurumu };
    if (aciklama) {
      body.aciklama = aciklama;
    }

    const response = await this.makeRequest(`/danisman/defterler/${defterId}/onayla`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Defter onaylanamadı');
    }

    return response.json();
  }

  async searchDanismanBasvurular(params: {
    search?: string;
    page?: number;
    limit?: number;
    onayDurumu?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.onayDurumu) searchParams.append('onayDurumu', params.onayDurumu);
    
    const response = await this.makeRequest(`/danisman/basvurular/search?${searchParams.toString()}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Başvurular getirilemedi');
    }
    
    return response.json();
  }

  async searchDanismanDefterler(params: {
    search?: string;
    page?: number;
    limit?: number;
    defterDurumu?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.defterDurumu) searchParams.append('defterDurumu', params.defterDurumu);
    
    const response = await this.makeRequest(`/danisman/defterler/search?${searchParams.toString()}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Defterler getirilemedi');
    }
    
    return response.json();
  }

  async searchDanismanOgrenciler(params: {
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    
    const response = await this.makeRequest(`/danisman/ogrenciler/search?${searchParams.toString()}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Öğrenciler getirilemedi');
    }
    
    return response.json();
  }

  // DANISMAN MUAFIYET API METHODS
  async getDanismanMuafiyetBasvurular() {
    const response = await this.makeRequest('/danisman/muafiyet-basvurular');
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Muafiyet başvuruları getirilemedi');
    }
    
    return response.json();
  }

  async onaylaMuafiyetBasvuru(id: number, aciklama?: string) {
    const body: { aciklama?: string } = {};
    if (aciklama) body.aciklama = aciklama;

    const response = await this.makeRequest(`/danisman/muafiyet-basvuru/${id}/onayla`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Muafiyet başvurusu onaylanamadı');
    }

    return response.json();
  }

  async reddetMuafiyetBasvuru(id: number, redSebebi: string) {
    const response = await this.makeRequest(`/danisman/muafiyet-basvuru/${id}/reddet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ redSebebi }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Muafiyet başvurusu reddedilemedi');
    }

    return response.json();
  }

  async downloadMuafiyetSgk4aByDanisman(id: number) {
    const response = await this.makeRequest(`/danisman/muafiyet-basvuru/${id}/download-sgk4a`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'SGK 4A dosyası indirilemedi');
    }

    return response.blob();
  }

  // KARIYER MERKEZI API METHODS
  async getAllDanismanlar() {
    const response = await this.makeRequest('/kariyer-merkezi/danismanlar');
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Danışmanlar getirilemedi');
    }
    
    return response.json();
  }

  async getAllSirketler() {
    const response = await this.makeRequest('/kariyer-merkezi/sirketler');
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Şirketler getirilemedi');
    }
    
    return response.json();
  }

  async getAllOgrenciler() {
    const response = await this.makeRequest('/kariyer-merkezi/ogrenciler');
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Öğrenciler getirilemedi');
    }
    
    return response.json();
  }

  async getAllBasvurular() {
    const response = await this.makeRequest('/kariyer-merkezi/basvurular');
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Başvurular getirilemedi');
    }
    
    return response.json();
  }

  async getKariyerBasvuru(basvuruId: number) {
    const response = await this.makeRequest(`/kariyer-merkezi/basvurular/${basvuruId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Başvuru detayları getirilemedi');
    }
    
    return response.json();
  }

  async onaylaKariyerBasvuru(basvuruId: number, aciklama?: string) {
    const response = await this.makeRequest(`/kariyer-merkezi/basvurular/${basvuruId}/onayla`, {
      method: 'POST',
      body: JSON.stringify({ aciklama: aciklama || '' }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Başvuru onaylanamadı');
    }

    return response.json();
  }

  async reddetKariyerBasvuru(basvuruId: number, redSebebi: string) {
    const response = await this.makeRequest(`/kariyer-merkezi/basvurular/${basvuruId}/reddet`, {
      method: 'POST',
      body: JSON.stringify({ redSebebi }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Başvuru reddedilemedi');
    }

    return response.json();
  }

  async searchKariyerBasvurular(params: {
    search?: string;
    page?: number;
    limit?: number;
    onayDurumu?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.onayDurumu) searchParams.append('onayDurumu', params.onayDurumu);
    
    const response = await this.makeRequest(`/kariyer-merkezi/basvurular/search?${searchParams.toString()}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Başvurular getirilemedi');
    }
    
    return response.json();
  }

  async searchOnaylanmisBasvurular(params: {
    search?: string;
    page?: number;
    limit?: number;
    faculty?: string;
    stajTipi?: string;
    baslangicTarihiFrom?: string;
    baslangicTarihiTo?: string;
    bitisTarihiFrom?: string;
    bitisTarihiTo?: string;
    export?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.faculty) searchParams.append('faculty', params.faculty);
    if (params.stajTipi) searchParams.append('stajTipi', params.stajTipi);
    if (params.baslangicTarihiFrom) searchParams.append('baslangicTarihiFrom', params.baslangicTarihiFrom);
    if (params.baslangicTarihiTo) searchParams.append('baslangicTarihiTo', params.baslangicTarihiTo);
    if (params.bitisTarihiFrom) searchParams.append('bitisTarihiFrom', params.bitisTarihiFrom);
    if (params.bitisTarihiTo) searchParams.append('bitisTarihiTo', params.bitisTarihiTo);
    if (params.export) searchParams.append('export', 'true');
    
    const response = await this.makeRequest(`/kariyer-merkezi/onaylanmis-basvurular/search?${searchParams.toString()}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Onaylanmış başvurular getirilemedi');
    }
    
    // Excel export için blob response
    if (params.export) {
      return response.blob();
    }
    
    return response.json();
  }

  async getKariyerBolumler() {
    const response = await this.makeRequest('/kariyer-merkezi/bolumler');
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Bölümler getirilemedi');
    }
    
    return response.json();
  }

  async getKariyerStajTipleri() {
    const response = await this.makeRequest('/kariyer-merkezi/staj-tipleri');
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Staj tipleri getirilemedi');
    }
    
    return response.json();
  }

  async searchKariyerOgrenciler(params: {
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    
    const response = await this.makeRequest(`/kariyer-merkezi/ogrenciler/search?${searchParams.toString()}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Öğrenciler getirilemedi');
    }
    
    return response.json();
  }

  async searchKariyerDanismanlar(params: {
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    
    const response = await this.makeRequest(`/kariyer-merkezi/danismanlar/search?${searchParams.toString()}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Danışmanlar getirilemedi');
    }
    
    return response.json();
  }

  async searchKariyerSirketler(params: {
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    
    const response = await this.makeRequest(`/kariyer-merkezi/sirketler/search?${searchParams.toString()}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Şirketler getirilemedi');
    }
    
    return response.json();
  }

  async getKariyerDanismanDetay(danismanId: number) {
    const response = await this.makeRequest(`/kariyer-merkezi/danismanlar/${danismanId}/detay`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Danışman detayı getirilemedi');
    }
    
    return response.json();
  }

  async getKariyerOgrenciDetay(ogrenciId: number) {
    const response = await this.makeRequest(`/kariyer-merkezi/ogrenciler/${ogrenciId}/detay`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Öğrenci detayı getirilemedi');
    }
    
    return response.json();
  }

  async getKariyerSirketDetay(kurumAdi: string) {
    const response = await this.makeRequest(`/kariyer-merkezi/sirketler/${encodeURIComponent(kurumAdi)}/detay`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Şirket detayı getirilemedi');
    }
    
    return response.json();
  }

  // Bu fonksiyon güvenlik nedeniyle devre dışı bırakıldı - kariyer merkezi artık kullanıcı bilgilerini değiştiremez

  async getKariyerOgrenciTumBasvurulari(ogrenciId: number) {
    const response = await this.makeRequest(`/kariyer-merkezi/ogrenci/${ogrenciId}/basvurular`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Öğrencinin başvuruları getirilemedi');
    }
    return response.json();
  }

  // Şirket endpoints
  async sirketGiris(data: { email: string; otp: string }) {
    const response = await this.makeRequest('/sirket/giris', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Giriş başarısız');
    }

    return response.json();
  }

  async sirketOnay(data: { basvuruId: number; email: string; otp: string; onayDurumu: 'ONAYLANDI' | 'REDDEDILDI'; redSebebi?: string; }) {
    const response = await this.makeRequest('/sirket/onay', {
      method: 'POST',
      body: JSON.stringify({ 
        basvuruId: data.basvuruId, 
        email: sanitizeInput(data.email), 
        otp: data.otp, 
        onayDurumu: data.onayDurumu, 
        redSebebi: data.redSebebi ? sanitizeInput(data.redSebebi) : undefined 
      }),
    }, false);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Şirket onay işlemi başarısız');
    }

    const result = await response.json();
    return result;
  }

  async sirketDefterOnay(data: { 
    defterId: number; 
    email: string; 
    otp: string; 
    onayDurumu: 'ONAYLANDI' | 'REDDEDILDI';
    redSebebi?: string;
  }) {
    const response = await this.makeRequest('/sirket/defteronay', {
      method: 'POST',
      body: JSON.stringify({ 
        defterId: data.defterId, 
        email: sanitizeInput(data.email), 
        otp: data.otp, 
        onayDurumu: data.onayDurumu, 
        redSebebi: data.redSebebi ? sanitizeInput(data.redSebebi) : undefined 
      }),
    }, false);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Şirket defter onay işlemi başarısız');
    }

    const result = await response.json();
    return result;
  }

  async testOtpGonder(basvuruId: number) {
    const response = await this.makeRequest('/sirket/test-otp', {
      method: 'POST',
      body: JSON.stringify({ basvuruId: basvuruId }),
    }, false);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'OTP gönderilemedi');
    }

    return response.json();
  }

  async kariyerDownloadFile(basvuruId: number, fileType: 'transkript' | 'sigorta' | 'hizmet') {
    const response = await this.makeRequest(`/kariyer-merkezi/basvurular/${basvuruId}/download/${fileType}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Dosya indirilemedi');
    }
    
    return response.blob();
  }

  async kariyerDownloadDefterPdf(defterId: number) {
    const response = await this.makeRequest(`/kariyer-merkezi/defterler/${defterId}/download-pdf`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Defter PDF indirilemedi');
    }
    
    return response.blob();
  }

  // Admin methods
  async getAdminUsers(params: { page?: number; limit?: number; search?: string; userType?: string } = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.userType) queryParams.append('userType', params.userType);

    const response = await this.makeRequest(`/admin/users?${queryParams}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Kullanıcılar alınamadı');
    }
    return response.json();
  }

  async deleteAdminUser(userId: number) {
    const response = await this.makeRequest(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Kullanıcı silinemedi');
    }
    return response.json();
  }

  async createAdminUser(userData: CreateUserData) {
    const response = await this.makeRequest('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Kullanıcı oluşturulamadı');
    }
    return response.json();
  }

  async updateAdminUser(userId: number, userData: UpdateUserData) {
    const response = await this.makeRequest(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Kullanıcı güncellenemedi');
    }
    return response.json();
  }

  // Admin application management
  async getAdminApplications(params?: { page?: number; limit?: number; search?: string; onayDurumu?: string; stajTipi?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.onayDurumu) queryParams.append('onayDurumu', params.onayDurumu);
    if (params?.stajTipi) queryParams.append('stajTipi', params.stajTipi);
    
    const url = `/admin/staj-basvurulari${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await this.makeRequest(url);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Başvurular alınamadı');
    }
    return response.json();
  }

  async updateAdminApplication(id: number, data: UpdateApplicationData) {
    const response = await this.makeRequest(`/admin/staj-basvurulari/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Başvuru güncellenemedi');
    }
    return response.json();
  }

  async deleteAdminApplication(id: number) {
    const response = await this.makeRequest(`/admin/staj-basvurulari/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Başvuru silinemedi');
    }
    return response.json();
  }

  async getAdminStatistics() {
    const response = await this.makeRequest('/admin/statistics');
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'İstatistikler alınamadı');
    }
    return response.json();
  }

  // Excel Upload Methods
  async uploadHocaExcel(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.makeRequest('/excel/upload/hoca', {
      method: 'POST',
      body: formData,
      // FormData ile Content-Type header'ı otomatik set edilir
    });
    
    if (!response.ok) {
      const error = await response.json();
      
      // 409 Conflict - Already processing
      if (response.status === 409) {
        throw new Error(`⚠️ Zaten işlenmekte olan bir hoca Excel dosyası var!\n\n${error.message}\n\nLütfen mevcut işlem tamamlanana kadar bekleyin.`);
      }
      
      throw new Error(error.message || 'Excel dosyası yüklenemedi');
    }
    return response.json();
  }

  async uploadOgrenciExcel(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.makeRequest('/excel/upload/ogrenci', {
      method: 'POST',
      body: formData,
      // FormData ile Content-Type header'ı otomatik set edilir
    });
    
    if (!response.ok) {
      const error = await response.json();
      
      // 409 Conflict - Already processing
      if (response.status === 409) {
        throw new Error(`⚠️ Zaten işlenmekte olan bir öğrenci Excel dosyası var!\n\n${error.message}\n\nLütfen mevcut işlem tamamlanana kadar bekleyin.`);
      }
      
      throw new Error(error.message || 'Öğrenci Excel dosyası yüklenemedi');
    }
    return response.json();
  }

  async uploadCapOgrenciExcel(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.makeRequest('/excel/upload/cap-ogrenci', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      if (response.status === 409) {
        throw new Error(`⚠️ Zaten işlenmekte olan bir CAP öğrenci Excel dosyası var!\n\n${error.message}\n\nLütfen mevcut işlem tamamlanana kadar bekleyin.`);
      }
      throw new Error(error.message || 'CAP öğrenci Excel dosyası yüklenemedi');
    }
    return response.json();
  }

  async getExcelUploadStatus(dosyaId: number) {
    const response = await this.makeRequest(`/excel/upload/status/${dosyaId}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload durumu alınamadı');
    }
    return response.json();
  }

  async getExcelUploadHistory(limit?: number) {
    const queryParams = limit ? `?limit=${limit}` : '';
    const response = await this.makeRequest(`/excel/upload/history${queryParams}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload geçmişi alınamadı');
    }
    return response.json();
  }

  async cancelExcelUpload(dosyaId: number) {
    const response = await this.makeRequest(`/excel/upload/cancel/${dosyaId}`, {
      method: 'POST'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload iptal edilemedi');
    }
    return response.json();
  }

  async getActiveUploads() {
    try {
      const response = await this.makeRequest('/excel/upload/history?limit=10');
      if (!response.ok) {
        throw new Error('Aktif uploadlar kontrol edilemedi');
      }
      const result = await response.json();
      
      // Filter for active uploads (KUYRUKTA or ISLENIYOR status)
      const activeUploads = result.data?.filter((upload: { durumu: string }) => 
        upload.durumu === 'KUYRUKTA' || upload.durumu === 'ISLENIYOR'
      ) || [];
      
      return {
        success: true,
        data: activeUploads
      };
    } catch (error) {
      console.error('Aktif upload kontrolü başarısız:', error);
      return {
        success: false,
        data: []
      };
    }
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await this.makeRequest('/users/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    }, true);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Parola değiştirilemedi');
    }

    return response.json();
  }
}

const apiClient = new ApiClient(API_BASE_URL);

interface SearchParams {
  search?: string;
  page?: number;
  limit?: number;
}

interface SearchBasvurularParams extends SearchParams {
  onayDurumu?: string;
}

interface SearchOnaylanmisBasvurularParams extends SearchParams {
  faculty?: string;
  stajTipi?: string;
  baslangicTarihiFrom?: string;
  baslangicTarihiTo?: string;
  bitisTarihiFrom?: string;
  bitisTarihiTo?: string;
  export?: boolean;
}

interface SearchDefterlerParams extends SearchParams {
  defterDurumu?: string;
}

interface CreateUserData {
  name: string;
  email: string;
  userType: 'OGRENCI' | 'DANISMAN' | 'YONETICI' | 'KARIYER_MERKEZI';
  tcKimlik?: string;
  studentId?: string;
  faculty?: string;
  class?: string;
  password: string;
  kullaniciAdi?: string;
}
interface UpdateUserData {
  name?: string;
  email?: string;
  tcKimlik?: string;
  studentId?: string;
  faculty?: string;
  class?: string;
  userType?: 'OGRENCI' | 'DANISMAN' | 'YONETICI' | 'KARIYER_MERKEZI';
}

export interface UpdateApplicationData {
  kurumAdi?: string;
  kurumAdresi?: string;
  sorumluTelefon?: string;
  sorumluMail?: string;
  yetkiliAdi?: string;
  yetkiliUnvani?: string;
  stajTipi?: string;
  baslangicTarihi?: string;
  bitisTarihi?: string;
  onayDurumu?: 'HOCA_ONAYI_BEKLIYOR' | 'KARIYER_MERKEZI_ONAYI_BEKLIYOR' | 'SIRKET_ONAYI_BEKLIYOR' | 'ONAYLANDI' | 'REDDEDILDI' | 'IPTAL_EDILDI';
  redSebebi?: string;
  danismanMail?: string;
  ogrenciId?: number;
  ogrenciAdi?: string;
  ogrenciMail?: string;
  ogrenciTcKimlik?: string;
  ogrenciNumarasi?: string;
  fakulte?: string;
  sinif?: string;
  turkFirmasi?: string;
}

type SearchOgrencilerParams = SearchParams;
type SearchDanismanlarParams = SearchParams;
type SearchSirketlerParams = SearchParams;

export const api = {
  updateDefterDurumu: (id: number, yeniDurum: 'BEKLEMEDE' | 'YUKLENDI' | 'ONAYLANDI' | 'REDDEDILDI', sebep?: string) => apiClient.updateDefterDurumu(id, yeniDurum, sebep),
  // Auth
  login: (kullaniciAdi: string, password: string) => apiClient.login(kullaniciAdi, password),
  logout: () => apiClient.logout(),
  validateToken: () => apiClient.validateToken(),
  getDanismanInfo: () => apiClient.getDanismanInfo(),
  getStudentRecords: () => apiClient.getStudentRecords(),

  // Basvuru endpoints
  getBasvurular: () => apiClient.getBasvurular(),
  getBasvuru: (id: number) => apiClient.getBasvuru(id),
  createBasvuru: (data: FormData) => apiClient.createBasvuru(data),
  createMuafiyetBasvuru: (data: FormData) => apiClient.createMuafiyetBasvuru(data),
  getMuafiyetBasvurular: () => apiClient.getMuafiyetBasvurular(),
  downloadMuafiyetPdf: (id: number) => apiClient.downloadMuafiyetPdf(id),
  // updateBasvuru removed: students can no longer update applications via the frontend.
  cancelBasvuru: (id: number, iptalSebebi: string) => apiClient.cancelBasvuru(id, iptalSebebi),

  // Danisman endpoints
  getDanismanBasvurular: () => apiClient.getDanismanBasvurular(),
  searchDanismanBasvurular: (params: SearchBasvurularParams) => apiClient.searchDanismanBasvurular(params),
  searchDanismanDefterler: (params: SearchDefterlerParams) => apiClient.searchDanismanDefterler(params),
  searchDanismanOgrenciler: (params: SearchOgrencilerParams) => apiClient.searchDanismanOgrenciler(params),
  getDanismanBasvuru: (id: number) => apiClient.getDanismanBasvuru(id),
  getOgrenciTumBasvurulari: (ogrenciId: number) => apiClient.getOgrenciTumBasvurulari(ogrenciId),
  getOgrenciTumBasvurulariModal: (ogrenciId: number) => apiClient.getOgrenciTumBasvurulariModal(ogrenciId),
  getDanismanOgrenciDetay: (ogrenciId: number) => apiClient.getDanismanOgrenciDetay(ogrenciId),
  onaylaBasvuru: (id: number, aciklama?: string) => apiClient.onaylaBasvuru(id, aciklama),
  reddetBasvuru: (id: number, sebep: string) => apiClient.reddetBasvuru(id, sebep),

  // Danisman muafiyet endpoints
  getDanismanMuafiyetBasvurular: () => apiClient.getDanismanMuafiyetBasvurular(),
  onaylaMuafiyetBasvuru: (id: number, aciklama?: string) => apiClient.onaylaMuafiyetBasvuru(id, aciklama),
  reddetMuafiyetBasvuru: (id: number, redSebebi: string) => apiClient.reddetMuafiyetBasvuru(id, redSebebi),
  downloadMuafiyetSgk4aByDanisman: (id: number) => apiClient.downloadMuafiyetSgk4aByDanisman(id),

  // Defter endpoints
  uploadDefterPdf: (basvuruId: number, formData: FormData) => apiClient.uploadDefterPdf(basvuruId, formData),
  getDefterler: () => apiClient.getDefterler(),
  downloadDefterPdf: (id: number) => apiClient.downloadDefterPdf(id),
  deleteDefterPdf: (id: number) => apiClient.deleteDefterPdf(id),
  getDefterById: (id: number) => apiClient.getDefterById(id),
  onaylaDefteri: (defterId: number, onayDurumu: 'ONAYLANDI' | 'REDDEDILDI', aciklama?: string) => apiClient.onaylaDefteri(defterId, onayDurumu, aciklama),
  getDanismanDefterler: () => apiClient.getDanismanDefterler(),
  getDanismanDefter: (id: number) => apiClient.getDanismanDefter(id),
  getDanismanDefterDetay: (defterId: number) => apiClient.getDanismanDefterDetay(defterId),


  // Kariyer endpoints
  getAllDanismanlar: () => apiClient.getAllDanismanlar(),
  getAllSirketler: () => apiClient.getAllSirketler(),
  getAllOgrenciler: () => apiClient.getAllOgrenciler(),
  getAllBasvurular: () => apiClient.getAllBasvurular(),
  getKariyerBasvuru: (id: number) => apiClient.getKariyerBasvuru(id),
  getKariyerOgrenciTumBasvurulari: (ogrenciId: number) => apiClient.getKariyerOgrenciTumBasvurulari(ogrenciId),
  onaylaKariyerBasvuru: (id: number, aciklama?: string) => apiClient.onaylaKariyerBasvuru(id, aciklama),
  reddetKariyerBasvuru: (id: number, sebep: string) => apiClient.reddetKariyerBasvuru(id, sebep),
  searchKariyerBasvurular: (params: SearchBasvurularParams) => apiClient.searchKariyerBasvurular(params),
  searchOnaylanmisBasvurular: (params: SearchOnaylanmisBasvurularParams) => apiClient.searchOnaylanmisBasvurular(params),
  getKariyerBolumler: () => apiClient.getKariyerBolumler(),
  getKariyerStajTipleri: () => apiClient.getKariyerStajTipleri(),
  searchKariyerOgrenciler: (params: SearchOgrencilerParams) => apiClient.searchKariyerOgrenciler(params),
  searchKariyerDanismanlar: (params: SearchDanismanlarParams) => apiClient.searchKariyerDanismanlar(params),
  searchKariyerSirketler: (params: SearchSirketlerParams) => apiClient.searchKariyerSirketler(params),
  getKariyerDanismanDetay: (id: number) => apiClient.getKariyerDanismanDetay(id),
  getKariyerOgrenciDetay: (id: number) => apiClient.getKariyerOgrenciDetay(id),
  getKariyerSirketDetay: (kurumAdi: string) => apiClient.getKariyerSirketDetay(kurumAdi),
  kariyerDownloadFile: (basvuruId: number, fileType: 'transkript' | 'sigorta' | 'hizmet') => apiClient.kariyerDownloadFile(basvuruId, fileType),
  kariyerDownloadDefterPdf: (defterId: number) => apiClient.kariyerDownloadDefterPdf(defterId),

  // Şirket endpoints
  sirketGiris: (data: { email: string; otp: string }) => apiClient.sirketGiris(data),
  sirketOnay: (data: { basvuruId: number; email: string; otp: string; onayDurumu: 'ONAYLANDI' | 'REDDEDILDI'; redSebebi?: string; }) => apiClient.sirketOnay(data),
  sirketDefterOnay: (data: { defterId: number; email: string; otp: string; onayDurumu: 'ONAYLANDI' | 'REDDEDILDI'; redSebebi?: string; }) => apiClient.sirketDefterOnay(data),
  testOtpGonder: (basvuruId: number) => apiClient.testOtpGonder(basvuruId),

  // Admin endpoints
  getAdminUsers: (params?: { page?: number; limit?: number; search?: string; userType?: string }) => apiClient.getAdminUsers(params),
  deleteAdminUser: (userId: number) => apiClient.deleteAdminUser(userId),
  createAdminUser: (userData: CreateUserData) => apiClient.createAdminUser(userData),
  updateAdminUser: (userId: number, userData: UpdateUserData) => apiClient.updateAdminUser(userId, userData),
  getAdminApplications: (params?: { page?: number; limit?: number; search?: string; onayDurumu?: string; stajTipi?: string }) => apiClient.getAdminApplications(params),
  updateAdminApplication: (id: number, data: UpdateApplicationData) => apiClient.updateAdminApplication(id, data),
  deleteAdminApplication: (id: number) => apiClient.deleteAdminApplication(id),
  getAdminStatistics: () => apiClient.getAdminStatistics(),

  // Excel Upload endpoints
  uploadHocaExcel: (file: File) => apiClient.uploadHocaExcel(file),
  uploadOgrenciExcel: (file: File) => apiClient.uploadOgrenciExcel(file),
  uploadCapOgrenciExcel: (file: File) => apiClient.uploadCapOgrenciExcel(file),
  getExcelUploadStatus: (dosyaId: number) => apiClient.getExcelUploadStatus(dosyaId),
  getExcelUploadHistory: (limit?: number) => apiClient.getExcelUploadHistory(limit),
  cancelExcelUpload: (dosyaId: number) => apiClient.cancelExcelUpload(dosyaId),
  getActiveUploads: () => apiClient.getActiveUploads(),

  // Password change
  changePassword: (currentPassword: string, newPassword: string) => apiClient.changePassword(currentPassword, newPassword),

  // Other
  getFile: (endpoint: string) => apiClient.getFile(endpoint),
};

export default api;
