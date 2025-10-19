import React, { useState, useEffect } from "react";
import FormSection from "../../../components/forms/FormSection";
import FormInput from "../../../components/forms/FormInput";
import { useTranslation } from "../../../hooks/useTranslation";
import { api } from "../../../lib/api";

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

interface OgrenciBilgileriProps {
  user: {
    tcKimlik: string;
    name: string;
    studentId?: string;
    faculty?: string;
    class?: string;
    userType?: string;
  };
  onDepartmentChange?: (selectedRecord: StudentRecord | null) => void;
}

export const OgrenciBilgileri: React.FC<OgrenciBilgileriProps> = ({ user, onDepartmentChange }) => {
  const { t } = useTranslation();
  const [studentRecords, setStudentRecords] = useState<StudentRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<StudentRecord | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // State for fresh user data from API
  const [userInfo, setUserInfo] = useState<{tcKimlik?: string, studentId?: string, name?: string} | null>(null);

  // Öğrencinin normal ve CAP kayıtlarını getir
  useEffect(() => {
    // Prevent multiple API calls if data is already loaded
    if (hasLoadedData) {
      return;
    }

    const fetchStudentRecords = async () => {
      try {
        setLoading(true);
        const data = await api.getStudentRecords();
        
        // Store user info from API response
        if (data.userInfo) {
          setUserInfo(data.userInfo);
        }
        
        const records: StudentRecord[] = [];
        
        // Normal bölüm kaydı
        if (data.normalRecord) {
          records.push(data.normalRecord);
        }
        
        // CAP kayıtları
        if (data.capRecords && data.capRecords.length > 0) {
          records.push(...data.capRecords);
        }
        
        setStudentRecords(records);
        
        // İlk kaydı varsayılan olarak seç
        if (records.length > 0) {
          setSelectedRecord(records[0]);
          onDepartmentChange?.(records[0]);
          
          // Debug logging
          console.log(`🏫 [MUAFIYET] İlk kayıt otomatik seçildi:`, {
            id: records[0].id,
            type: records[0].type,
            faculty: records[0].faculty,
            class: records[0].class,
            totalRecords: records.length
          });
        }
        
        setHasLoadedData(true);
      } catch (error) {
        console.error('Öğrenci kayıtları alınırken hata:', error);
        // Hata durumunda mevcut user bilgilerini kullan
        const fallbackRecord: StudentRecord = {
          id: 0,
          faculty: user.faculty || 'N/A',
          class: user.class || 'N/A',
          type: 'NORMAL',
          displayText: `${user.faculty || 'N/A'} - ${user.class || 'N/A'} (Ana Bölüm)`,
          advisor: null
        };
        setStudentRecords([fallbackRecord]);
        setSelectedRecord(fallbackRecord);
        onDepartmentChange?.(fallbackRecord);
        setHasLoadedData(true);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentRecords();
  }, [hasLoadedData, user.faculty, user.class, onDepartmentChange]); // onDepartmentChange is now stable with useCallback

  const handleRecordSelect = (record: StudentRecord) => {
    setSelectedRecord(record);
    setIsDropdownOpen(false);
    onDepartmentChange?.(record);
    
    // Debug logging
    console.log(`🏫 [MUAFIYET] Departman seçildi:`, {
      id: record.id,
      type: record.type,
      faculty: record.faculty,
      class: record.class,
      advisor: record.advisor
    });
  };

  return (
    <FormSection title={t("pages.stajBasvuru.steps.studentInfo")}>
      <FormInput
        label={t("pages.stajBasvuru.studentInfo.tcId")}
        id="tc"
        value={userInfo?.tcKimlik || user.tcKimlik || "TC Kimlik bulunamadı"}
        disabled
      />
      <FormInput
        label={t("pages.stajBasvuru.studentInfo.name")}
        id="name"
        value={userInfo?.name || user.name || "İsim bulunamadı"}
        disabled
      />
      <FormInput
        label={t("pages.stajBasvuru.studentInfo.studentId")}
        id="studentId"
        value={userInfo?.studentId || user.studentId || "Öğrenci No bulunamadı"}
        disabled
      />
      
      {/* Fakulte ve Sınıf Dropdown */}
      <div className="relative">
        <label htmlFor="faculty" className="block text-sm font-medium text-gray-700 mb-1">
          {t("pages.stajBasvuru.studentInfo.faculty")} {t("common.and")} {t("pages.stajBasvuru.studentInfo.class")}
        </label>
        <div className="relative">
          <button
            type="button"
            className="block w-full px-3 py-2 border rounded-md shadow-sm text-left focus:outline-none sm:text-sm border-background-300 focus:ring-primary-500 focus:border-primary-500 bg-white hover:bg-gray-50"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={loading || studentRecords.length <= 1}
          >
            <span className="block truncate">
              {loading 
                ? "Yükleniyor..." 
                : selectedRecord?.displayText || "Seçim yapın"
              }
            </span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg
                className={`h-5 w-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </button>

          {isDropdownOpen && studentRecords.length > 1 && (
            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
              {studentRecords.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  className={`cursor-pointer select-none relative py-2 pl-3 pr-9 w-full text-left hover:bg-gray-100 ${
                    selectedRecord?.id === record.id ? 'bg-primary-100 text-primary-900' : 'text-gray-900'
                  }`}
                  onClick={() => handleRecordSelect(record)}
                >
                  <span className="block truncate">
                    {record.displayText}
                  </span>
                  {selectedRecord?.id === record.id && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-primary-600">
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </FormSection>
  );
};
