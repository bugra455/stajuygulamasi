import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useWebSocketNotifications, setGlobalNotificationHandler } from '../../hooks/useWebSocketNotifications';
import { showNotification } from '../../components/ui/notificationApi';

interface UploadResult {
  success: boolean;
  message: string;
  data?: {
    dosyaId: number;
    totalRows: number;
    processedRows: number;
    successfulRows: number;
    errorRows: number;
    errors: string[];
  };
}

interface UploadProgress {
  isUploading: boolean;
  stage: 'uploading' | 'processing' | 'completed' | 'error';
  percentage: number;
  message: string;
  dosyaId?: number;
  totalRows?: number;
  processedRows?: number;
  successfulRows?: number;
  errorRows?: number;
}

const CapGuncelle: React.FC = () => {
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    isUploading: false,
    stage: 'uploading',
    percentage: 0,
    message: ''
  });

  // WebSocket notifications
  const { lastNotification, cancelCurrentUpload } = useWebSocketNotifications();

  // Set up global notification handler
  useEffect(() => {
    setGlobalNotificationHandler((message, type, duration) => {
      showNotification({ message, type, duration });
    });
  }, []);

  // Check for active uploads on component mount
  useEffect(() => {
    const checkActiveUploads = async () => {
      try {
        const result = await api.getActiveUploads();
        if (result.success && result.data.length > 0) {
          // Find CAP uploads specifically
          const activeCapUpload = result.data.find((upload: { dosyaTipi: string; durumu: string; id: number }) => upload.dosyaTipi === 'cap-ogrenci');
          
          if (activeCapUpload) {
            console.log('🔄 [Component] Found active CAP upload:', activeCapUpload);
            setUploadProgress({
              isUploading: true,
              stage: activeCapUpload.durumu === 'ISLENIYOR' ? 'processing' : 'uploading',
              percentage: 0, // We'll get updates via WebSocket
              message: activeCapUpload.durumu === 'ISLENIYOR' ? 'İşleniyor...' : 'Kuyrukta bekliyor...',
              dosyaId: activeCapUpload.id
            });
          }
        }
      } catch (error) {
        console.error('❌ [Component] Failed to check active uploads:', error);
      }
    };

    checkActiveUploads();
  }, []);

  // WebSocket notification handling
  useEffect(() => {
    if (lastNotification) {
      console.log('📬 WebSocket notification:', lastNotification);
      
      // Handle progress updates from backend (every 1000 rows)
      if (lastNotification.data?.percentage !== undefined && lastNotification.type === 'progress_update') {
        const percentage = lastNotification.data.percentage;
        console.log(`📊 Real progress update: ${percentage}%`);
        
        setUploadProgress(prev => ({
          ...prev,
          isUploading: true,
          stage: 'processing',
          percentage: percentage, // Use exact percentage from backend
          message: `İşleniyor... ${percentage}% tamamlandı`
        }));
      }
      
      // Handle completion
      if (lastNotification.type === 'excel_upload_complete') {
        console.log('✅ Upload completed via WebSocket');
        setUploadProgress(prev => ({
          ...prev,
          isUploading: false,
          stage: 'completed',
          percentage: 100,
          message: 'İşlem tamamlandı!',
          totalRows: lastNotification.data?.totalRows,
          successfulRows: lastNotification.data?.successfulRows,
          errorRows: lastNotification.data?.errorRows
        }));
        
        // Set the upload result
        setUploadResult({
          success: true,
          message: lastNotification.message,
          data: {
            dosyaId: lastNotification.dosyaId,
            totalRows: lastNotification.data?.totalRows || 0,
            processedRows: lastNotification.data?.totalRows || 0,
            successfulRows: lastNotification.data?.successfulRows || 0,
            errorRows: lastNotification.data?.errorRows || 0,
            errors: lastNotification.data?.errors || []
          }
        });
        
        setIsLoading(false);
      }
      
      // Handle cancellation
      if (lastNotification.type === 'upload_cancelled') {
        console.log('⚠️ Upload cancelled via WebSocket');
        setUploadProgress(prev => ({
          ...prev,
          isUploading: false,
          stage: 'error',
          percentage: 0,
          message: 'Dosya yükleme iptal edildi'
        }));
        
        setUploadResult({
          success: false,
          message: 'Dosya yükleme iptal edildi',
          data: undefined
        });
        
        setIsLoading(false);
      }
      
      // Handle errors
      if (lastNotification.type === 'excel_upload_failed') {
        console.log('❌ Upload failed via WebSocket');
        setUploadProgress(prev => ({
          ...prev,
          isUploading: false,
          stage: 'error',
          percentage: 0,
          message: 'Yükleme hatası!'
        }));
        
        setUploadResult({
          success: false,
          message: lastNotification.message,
          data: undefined
        });
        
        setIsLoading(false);
        
        // Hide progress after 5 seconds
        setTimeout(() => {
          setUploadProgress(prev => ({ ...prev, isUploading: false }));
        }, 5000);
      }
    }
  }, [lastNotification]);

  // Handle upload cancellation
  const handleCancelUpload = async () => {
    if (uploadProgress.isUploading) {
      console.log('🚫 Kullanıcı yüklemeyi iptal etti, dosyaId:', uploadProgress.dosyaId);
      
      try {
        // Try to cancel with specific dosyaId if available
        if (uploadProgress.dosyaId) {
          console.log('🚫 Dosya ID ile iptal ediliyor:', uploadProgress.dosyaId);
          await api.cancelExcelUpload(uploadProgress.dosyaId);
          console.log('✅ Cancel API call successful');
        } else {
          console.log('⚠️ Dosya ID bulunamadı, genel cancel çağrılıyor');
          cancelCurrentUpload();
        }
      } catch (error) {
        console.error('❌ Cancel API call failed:', error);
        // Fallback to WebSocket cancel
        cancelCurrentUpload();
      }
      
      // Reset all upload states immediately
      setUploadProgress({
        isUploading: false,
        stage: 'error',
        percentage: 0,
        message: 'Yükleme iptal ediliyor...'
      });
      
      // Reset loading and selection states
      setIsLoading(false);
      setSelectedFile(null);
      setUploadResult(null);
      
      // Show notification
      showNotification({
        message: '⚠️ Yükleme iptal edildi',
        type: 'warning',
        duration: 3000
      });
    }
  };

  // Prevent navigation during upload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (uploadProgress.isUploading) {
        e.preventDefault();
        e.returnValue = 'Excel dosyası yükleniyor. Sayfayı kapatmak istiyor musunuz?';
        return e.returnValue;
      }
    };

    if (uploadProgress.isUploading) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [uploadProgress.isUploading]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      showNotification({
        message: 'Lütfen sadece Excel dosyası (.xlsx, .xls) yükleyin.',
        type: 'error',
        duration: 5000
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB
      showNotification({
        message: 'Dosya boyutu 50MB\'dan büyük olamaz.',
        type: 'error',
        duration: 5000
      });
      return;
    }

    setSelectedFile(file);
    setUploadResult(null);
    
    showNotification({
      message: `📁 Dosya seçildi: ${file.name}`,
      type: 'info',
      duration: 3000
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setUploadProgress({
      isUploading: true,
      stage: 'uploading',
      percentage: 0, // Start from 0%
      message: 'Dosya yükleniyor...'
    });

    try {
      const result = await api.uploadCapOgrenciExcel(selectedFile);
      
      console.log('📤 Upload API response:', result);
      
      if (result.success) {
        // Save dosyaId for cancellation
        const dosyaId = result.data?.dosyaId;
        if (dosyaId) {
          setUploadProgress(prev => ({
            ...prev,
            dosyaId: dosyaId
          }));
          console.log('💾 Dosya ID kaydedildi:', dosyaId);
        }
        
        // Always wait for WebSocket progress updates from backend
        console.log('📊 Upload accepted, waiting for WebSocket progress updates');
        setUploadProgress(prev => ({
          ...prev,
          stage: 'processing',
          percentage: 0,
          message: 'İşleme başlandı... Canlı progress takibi aktif'
        }));
        // Keep isLoading true; WebSocket will report completion
      } else {
        console.log('❌ Upload failed:', result.message);
        setUploadProgress({
          isUploading: false,
          stage: 'error',
          percentage: 0,
          message: result.message || 'Yükleme hatası'
        });
        setIsLoading(false);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      console.error('Upload hatası:', error);
      
      setUploadProgress({
        isUploading: false,
        stage: 'error',
        percentage: 0,
        message: `Hata: ${errorMessage}`
      });
      setIsLoading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setUploadResult(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative">
      {/* Upload Progress Overlay */}
      {uploadProgress.isUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform animate-in fade-in zoom-in duration-300">
            <div className="text-center">
              {/* Progress Circle */}
              <div className={`relative w-32 h-32 mb-6 ${
                uploadProgress.stage === 'processing' ? 'animate-pulse' : ''
              }`}>
                <svg 
                  width="128" 
                  height="128" 
                  viewBox="0 0 100 100"
                  className={uploadProgress.stage === 'processing' ? 'animate-spin' : ''}
                  style={uploadProgress.stage === 'processing' ? { 
                    animationDuration: '3s',
                    animationTimingFunction: 'linear',
                    animationIterationCount: 'infinite'
                  } : {}}
                >
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    stroke="#e5e7eb" 
                    strokeWidth="8" 
                    fill="none"
                    className="opacity-20"
                  />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    stroke="#8b5cf6" 
                    strokeWidth="8" 
                    fill="none" 
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - uploadProgress.percentage / 100)}`}
                    className="transition-all duration-500 ease-out"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-purple-600">
                    {Math.round(uploadProgress.percentage)}%
                  </span>
                </div>
              </div>

              {/* Progress Info */}
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-gray-900">
                  {uploadProgress.stage === 'uploading' && '📤 Dosya Yükleniyor'}
                  {uploadProgress.stage === 'processing' && '⚙️ İşleniyor'}
                  {uploadProgress.stage === 'completed' && '✅ Tamamlandı'}
                  {uploadProgress.stage === 'error' && '❌ Hata'}
                </h3>
                
                <p className="text-gray-600 font-medium">
                  {uploadProgress.message}
                </p>

                {uploadProgress.stage === 'processing' && (
                  <div className="text-sm text-gray-500 space-y-1">
                    {uploadProgress.processedRows && uploadProgress.totalRows && (
                      <p>
                        İşlenen: {uploadProgress.processedRows.toLocaleString()} / {uploadProgress.totalRows.toLocaleString()} kayıt
                      </p>
                    )}
                    <p className="text-xs">Bu işlem birkaç dakika sürebilir...</p>
                  </div>
                )}

                {uploadProgress.stage === 'completed' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
                    <div className="space-y-2">
                      {uploadProgress.totalRows && (
                        <p className="text-green-800">
                          📊 Toplam: <span className="font-bold">{uploadProgress.totalRows.toLocaleString()}</span> kayıt
                        </p>
                      )}
                      {uploadProgress.successfulRows && (
                        <p className="text-green-700">
                          ✅ Başarılı: <span className="font-bold">{uploadProgress.successfulRows.toLocaleString()}</span> kayıt
                        </p>
                      )}
                      {uploadProgress.errorRows !== undefined && uploadProgress.errorRows > 0 && (
                        <p className="text-orange-700">
                          ⚠️ Hatalı: <span className="font-bold">{uploadProgress.errorRows.toLocaleString()}</span> kayıt
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                {uploadProgress.stage === 'completed' || uploadProgress.stage === 'error' ? (
                  <button
                    onClick={() => setUploadProgress(prev => ({ ...prev, isUploading: false }))}
                    className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
                  >
                    Kapat
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleCancelUpload}
                      className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                    >
                      İptal Et
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          🎓 CAP Öğrenci Bilgileri Güncelle
        </h1>
        <p className="text-gray-600 text-lg">
          Excel dosyası yükleyerek toplu CAP öğrenci bilgilerini güncelleyin
        </p>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <span className="text-3xl">�</span>
          Excel Dosyası Yükle
        </h2>
        
        <div
          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
            dragActive
              ? 'border-purple-500 bg-purple-50 scale-105'
              : selectedFile
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isLoading || uploadProgress.isUploading}
          />
          
          {selectedFile ? (
            <div className="flex flex-col items-center gap-4">
              <div className="text-6xl">✅</div>
              <div>
                <p className="text-xl font-bold text-green-600">Dosya seçildi!</p>
                <p className="text-gray-600 mt-2">{selectedFile.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Boyut: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={clearSelection}
                disabled={isLoading || uploadProgress.isUploading}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Dosyayı Kaldır
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="text-6xl">📁</div>
              <div>
                <p className="text-xl font-bold text-gray-700">Excel dosyasını buraya sürükleyin</p>
                <p className="text-gray-500 mt-2">veya tıklayarak seçin</p>
                <p className="text-sm text-gray-400 mt-2">
                  Desteklenen formatlar: .xlsx, .xls (Maksimum: 50MB)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Button */}
      {selectedFile && (
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleUpload}
              disabled={isLoading || uploadProgress.isUploading}
              className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 ${
                isLoading || uploadProgress.isUploading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white transform hover:scale-105 shadow-lg hover:shadow-xl'
              }`}
            >
              {isLoading || uploadProgress.isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                  {uploadProgress.isUploading ? 'İşleniyor...' : 'Yükleniyor...'}
                </>
              ) : (
                <>
                  <span className="text-xl">🚀</span>
                  CAP Öğrenci Bilgilerini Güncelle
                </>
              )}
            </button>
            
            <button
              onClick={clearSelection}
              disabled={isLoading || uploadProgress.isUploading}
              className="px-8 py-4 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-bold text-lg hover:from-red-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-xl">🗑️</span>
              Temizle
            </button>
          </div>
        </div>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <div className={`bg-white rounded-2xl shadow-xl p-8 border-2 ${
          uploadResult.success ? 'border-green-200' : 'border-red-200'
        }`}>
          <div className="text-center">
            <div className={`text-6xl mb-4 ${
              uploadResult.success ? 'text-green-500' : 'text-red-500'
            }`}>
              {uploadResult.success ? '✅' : '❌'}
            </div>
            
            <h3 className={`text-2xl font-bold mb-4 ${
              uploadResult.success ? 'text-green-700' : 'text-red-700'
            }`}>
              {uploadResult.success ? 'İşlem Başarılı!' : 'İşlem Başarısız!'}
            </h3>
            
            <p className="text-gray-600 mb-6 text-lg">
              {uploadResult.message}
            </p>

            {uploadResult.success && uploadResult.data && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {uploadResult.data.totalRows.toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-800">Toplam Kayıt</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {uploadResult.data.successfulRows.toLocaleString()}
                  </div>
                  <div className="text-sm text-green-800">Başarılı</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {uploadResult.data.errorRows.toLocaleString()}
                  </div>
                  <div className="text-sm text-orange-800">Hatalı</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round((uploadResult.data.successfulRows / uploadResult.data.totalRows) * 100)}%
                  </div>
                  <div className="text-sm text-purple-800">Başarı Oranı</div>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setUploadResult(null);
                setSelectedFile(null);
                setUploadProgress({
                  isUploading: false,
                  stage: 'uploading',
                  percentage: 0,
                  message: ''
                });
              }}
              className="px-8 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-300"
            >
              Yeni Dosya Yükle
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CapGuncelle;
