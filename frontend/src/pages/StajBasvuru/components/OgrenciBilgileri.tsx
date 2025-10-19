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
  };
  onDepartmentChange?: (selectedRecord: StudentRecord | null) => void;
  initialSelectedRecord?: StudentRecord | null;
  studentRecords?: StudentRecord[] | null;
}

export const OgrenciBilgileri: React.FC<OgrenciBilgileriProps> = ({ user, onDepartmentChange, initialSelectedRecord, studentRecords: parentStudentRecords }) => {
  const { t } = useTranslation();
  const [studentRecords, setStudentRecords] = useState<StudentRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<StudentRecord | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<{tcKimlik?: string, studentId?: string, name?: string} | null>(null);

  // Öğrencinin normal ve CAP kayıtlarını getir veya parent'tan kullan
  useEffect(() => {
    let cancelled = false;

    const applyRecords = (records: StudentRecord[], info?: {tcKimlik?: string, studentId?: string, name?: string}) => {
      if (cancelled) return;
      setStudentRecords(records);

      // Use initial selected record if provided, otherwise use first record
      if (initialSelectedRecord) {
        const matchingRecord = records.find(r => r.type === initialSelectedRecord.type && r.id === initialSelectedRecord.id);
        if (matchingRecord) {
          setSelectedRecord(matchingRecord);
          onDepartmentChange?.(matchingRecord);
        } else if (records.length > 0) {
          setSelectedRecord(records[0]);
          onDepartmentChange?.(records[0]);
        }
      } else if (records.length > 0) {
        setSelectedRecord(records[0]);
        onDepartmentChange?.(records[0]);
      }

      if (info) setUserInfo(info);
    };

    const fetchIfNeeded = async () => {
      try {
        setLoading(true);

        if (parentStudentRecords && parentStudentRecords.length > 0) {
          applyRecords(parentStudentRecords);
          return;
        }

        const data = await api.getStudentRecords();
        // API'den gelen fresh user data'yı kaydet
        if (data.userInfo) setUserInfo(data.userInfo);

        const records: StudentRecord[] = [];
        if (data.normalRecord) records.push(data.normalRecord);
        if (data.capRecords && data.capRecords.length > 0) records.push(...data.capRecords);

        applyRecords(records, data.userInfo);
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
        applyRecords([fallbackRecord]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchIfNeeded();

    return () => { cancelled = true; };
  }, [user.faculty, user.class, onDepartmentChange, initialSelectedRecord, parentStudentRecords]);

  const handleRecordSelect = (record: StudentRecord) => {
    setSelectedRecord(record);
    setIsDropdownOpen(false);
    onDepartmentChange?.(record);
  };

  return (
    <FormSection title={t("pages.stajBasvuru.steps.studentInfo")}>
      <FormInput
        label={t("pages.stajBasvuru.studentInfo.tcId")}
        id="tc"
        value={userInfo?.tcKimlik || "19783719320"}
        disabled
      />
      <FormInput
        label={t("pages.stajBasvuru.studentInfo.name")}
        id="name"
        value={userInfo?.name || user.name || "ÖMER FARUK ŞAHİN"}
        disabled
      />
      <FormInput
        label={t("pages.stajBasvuru.studentInfo.studentId")}
        id="studentId"
        value={userInfo?.studentId || "20171049012"}
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
