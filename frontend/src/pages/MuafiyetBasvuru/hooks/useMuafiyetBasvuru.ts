import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api';

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

export const useMuafiyetBasvuru = () => {
  const { user, logout, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // State'ler
  const [sgk4dosyasi, setSgk4Dosyasi] = useState<File | null>(null);
  const [danismanMail, setDanismanMail] = useState("");
  const [danismanLoading, setDanismanLoading] = useState(false);
  const [errors, setErrors] = useState<ErrorMessages>({});
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<StudentRecord | null>(null);

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
          } else if (selectedDepartment?.type === 'NORMAL' && selectedDepartment.advisor) {
            setDanismanMail(selectedDepartment.advisor.email);
          } else {
            // Eğer advisor bilgisi yoksa mevcut danışmanı yükle
            const response = await api.getDanismanInfo();
            if (response.danisman) {
              setDanismanMail(response.danisman.email);
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


  // Handler functions
  const handleDosyaSecimi = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSgk4Dosyasi(e.target.files[0]);
    }
  };

  const handleDepartmentChange = useCallback((record: StudentRecord | null) => {
    setSelectedDepartment(record);
    
    // Debug logging
    console.log(`📋 [MUAFIYET] Hook departman değişti:`, {
      id: record?.id,
      type: record?.type,
      faculty: record?.faculty,
      advisor: record?.advisor?.email
    });
  }, []);

  const validateForm = (): ErrorMessages => {
    const newErrors: ErrorMessages = {};
    
    // Advisor email is now automatically determined by backend, no validation needed
    
    if (!sgk4dosyasi) {
      newErrors.sgk4dosyasi = ["SGK 4A hizmet dökümü dosyası yüklenmelidir."];
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
        message: "Lütfen zorunlu alanları doldurun.",
        type: "error",
      });
      return;
    }
    
    if (!sgk4dosyasi) return;

    const formData = new FormData();    
    formData.append("sgk4a", sgk4dosyasi, sgk4dosyasi.name);
    // danismanMail artık otomatik backend'de doldurulacak - formdan gönderilmiyor

    // CAP bilgilerini ekle
    if (selectedDepartment) {
      if (selectedDepartment.type === 'CAP') {
        formData.append("isCapBasvuru", 'true');
        formData.append("capId", selectedDepartment.id.toString());
        formData.append("capFakulte", selectedDepartment.faculty);
        // class alanından bölüm ve departman çıkar (format: "Bölüm - Departman")
        const [bolum, departman] = selectedDepartment.class.split(' - ');
        formData.append("capBolum", bolum || selectedDepartment.class);
        formData.append("capDepartman", departman || "");
        
        // Debug logging
        console.log(`🚀 [MUAFIYET] CAP başvurusu gönderiliyor:`, {
          capId: selectedDepartment.id,
          capFakulte: selectedDepartment.faculty,
          capBolum: bolum || selectedDepartment.class,
          capDepartman: departman || "",
          selectedDepartment
        });
      } else {
        formData.append("isCapBasvuru", 'false');
        console.log(`🚀 [MUAFIYET] Normal başvuru gönderiliyor`);
      }
    } else {
      formData.append("isCapBasvuru", 'false');
      console.log(`🚀 [MUAFIYET] Departman seçilmemiş, normal başvuru`);
    }

    try {
      await api.createMuafiyetBasvuru(formData);
      setNotification({
        message: "Muafiyet başvurunuz başarıyla gönderildi!",
        type: "success",
      });
      setTimeout(() => navigate("/ogrenci-panel"), 2000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu";
      setNotification({
        message: errorMessage || "Başvuru sırasında bir hata oluştu.",
        type: "error",
      });
    }
  };

  // GÜNCELLENDİ: Component'in ihtiyaç duyduğu ek değerler return'e eklendi.
  return {
    // Auth & User data
    user,
    isLoading,
    logout, 
    
    // Form State
    danismanMail,
    setDanismanMail, 
    danismanLoading,
    sgk4dosyasi,
    setSgk4Dosyasi,
    selectedDepartment,
    
    // UI State
    errors,
    notification,
    setNotification, 
    
    // Handlers
    handleDosyaSecimi,
    handleSubmit,
    handleDepartmentChange,
  };
};