import { z } from 'zod';

const sanitizedString = (min: number, max: number = 255) => 
  z.string()
    .min(min)
    .max(max)
    .regex(/^[^<>"\\'&]*$/, { message: 'Özel karakterler kullanılamaz.' })
    .transform(str => str.trim());

// Email validation
const emailSchema = z.string()
  .email({ message: 'Geçerli bir e-posta adresi giriniz.' })
  .max(255)
  .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, { 
    message: 'E-posta formatı geçersiz.' 
  });

// Kullanıcı adı validation - can be email or student number
const kullaniciAdiSchema = z.string()
  .min(3, { message: 'Kullanıcı adı en az 3 karakter olmalıdır.' })
  .max(100, { message: 'Kullanıcı adı en fazla 100 karakter olabilir.' })
  .refine(val => {
    // Allow email format or alphanumeric/underscore (for student numbers)
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const usernamePattern = /^[a-zA-Z0-9_]+$/;
    return emailPattern.test(val) || usernamePattern.test(val);
  }, { message: 'Kullanıcı adı geçerli bir e-posta adresi veya sadece harf, rakam ve alt çizgi içerebilir.' });

// Password validation
const passwordSchema = z.string()
  .min(1, { message: 'parola en az 1 karakter olmalıdır.' })
  .max(128, { message: 'parola maksimum 128 karakter olabilir.' });

export const loginSchema = z.object({
  kullaniciAdi: kullaniciAdiSchema,
  password: z.string().min(1, { message: 'parola boş bırakılamaz.' })
});

export const registerSchema = z.object({
  tcKimlik: sanitizedString(11, 11),
  kullaniciAdi: kullaniciAdiSchema,
  name: sanitizedString(2, 100),
  email: emailSchema,
  password: passwordSchema,
  userType: z.enum(['OGRENCI', 'DANISMAN', 'KARIYER_MERKEZI', 'YONETICI'], {
    errorMap: () => ({ message: 'Geçerli bir kullanıcı tipi seçilmelidir.' })
  }),
  studentId: z.string().optional().refine(val => !val || /^\d{8,12}$/.test(val), {
    message: 'Öğrenci numarası 8-12 haneli rakam olmalıdır.'
  }),
  faculty: sanitizedString(2, 100).optional(),
  class: sanitizedString(1, 50).optional()
});
