export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

// Log details interface to replace 'any'
export interface LogDetails {
  [key: string]: unknown;
}

// Database query builder interface
export interface QueryBuilder {
  [key: string]: unknown;
}

// Update data interface for flexible updates
export interface UpdateData {
  [key: string]: unknown;
}

// Basvuru update data interface
export interface BasvuruUpdateData {
  kurumAdi?: string;
  kurumAdresi?: string;
  kurumTelefonu?: string;
  sorumluAdi?: string;
  sorumluMail?: string;
  sorumluTelefon?: string;
  baslangicTarihi?: Date;
  bitisTarihi?: Date;
  gunlukCalismaGucu?: number;
  stajGunu?: number;
  aciklama?: string;
  redSebebi?: string;
  onayDurumu?: string;
  [key: string]: unknown;
}

// Basvuru creation data interface
export interface BasvuruCreateData extends BasvuruUpdateData {
  kurumAdi: string;
  kurumAdresi: string;
  kurumTelefonu: string;
  sorumluAdi: string;
  sorumluMail: string;
  sorumluTelefon: string;
  baslangicTarihi: Date;
  bitisTarihi: Date;
  gunlukCalismaGucu: number;
  stajGunu: number;
}

// Hoca interface for teacher data
export interface HocaData {
  tcKimlik: string;
  name: string;
  email: string;
  [key: string]: unknown;
}

// User query filters interface
export interface UserQueryFilters {
  name?: string;
  email?: string;
  userType?: string;
  tcKimlik?: string;
  ogrenciNo?: string;
  bolum?: string;
  sinif?: string;
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

// Defter details interface
export interface DefterDetails {
  id?: number;
  basvuruId?: number;
  action?: string;
  [key: string]: unknown;
}

// Response DTO interface for mapping functions
export interface ResponseDTO {
  [key: string]: unknown;
}

// Request body interface for flexible request handling
export interface RequestBody {
  [key: string]: unknown;
}

// Route parameters interface
export interface RouteParams {
  id?: string;
  [key: string]: string | undefined;
}
