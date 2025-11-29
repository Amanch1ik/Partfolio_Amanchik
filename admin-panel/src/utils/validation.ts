// Утилиты для валидации форм
import type { Rule } from 'antd/es/form';
import { t } from '@/i18n';

// Базовые правила валидации
export const validationRules = {
  // Обязательное поле
  required: (message?: string): Rule => ({
    required: true,
    message: message || t('errors.required', 'Обязательное поле'),
  }),

  // Email
  email: (message?: string): Rule => ({
    type: 'email',
    message: message || t('errors.invalidEmail', 'Неверный формат email'),
  }),

  // Телефон (Кыргызстан)
  phone: (message?: string): Rule => ({
    pattern: /^(\+996|0)?[57][0-9]{8}$/,
    message: message || 'Введите корректный номер телефона (+996...)',
  }),

  // Минимальная длина
  minLength: (min: number, message?: string): Rule => ({
    min,
    message: message || `Минимум ${min} символов`,
  }),

  // Максимальная длина
  maxLength: (max: number, message?: string): Rule => ({
    max,
    message: message || `Максимум ${max} символов`,
  }),

  // URL
  url: (message?: string): Rule => ({
    type: 'url',
    message: message || 'Введите корректный URL',
  }),

  // Только цифры
  numeric: (message?: string): Rule => ({
    pattern: /^[0-9]+$/,
    message: message || 'Только цифры',
  }),

  // Положительное число
  positiveNumber: (message?: string): Rule => ({
    validator: (_, value) => {
      if (value === undefined || value === null || value === '') {
        return Promise.resolve();
      }
      const num = Number(value);
      if (isNaN(num) || num <= 0) {
        return Promise.reject(message || 'Введите положительное число');
      }
      return Promise.resolve();
    },
  }),

  // Процент (0-100)
  percentage: (message?: string): Rule => ({
    validator: (_, value) => {
      if (value === undefined || value === null || value === '') {
        return Promise.resolve();
      }
      const num = Number(value);
      if (isNaN(num) || num < 0 || num > 100) {
        return Promise.reject(message || 'Введите число от 0 до 100');
      }
      return Promise.resolve();
    },
  }),

  // Координаты широты
  latitude: (message?: string): Rule => ({
    validator: (_, value) => {
      if (value === undefined || value === null || value === '') {
        return Promise.resolve();
      }
      const num = Number(value);
      if (isNaN(num) || num < -90 || num > 90) {
        return Promise.reject(message || 'Широта должна быть от -90 до 90');
      }
      return Promise.resolve();
    },
  }),

  // Координаты долготы
  longitude: (message?: string): Rule => ({
    validator: (_, value) => {
      if (value === undefined || value === null || value === '') {
        return Promise.resolve();
      }
      const num = Number(value);
      if (isNaN(num) || num < -180 || num > 180) {
        return Promise.reject(message || 'Долгота должна быть от -180 до 180');
      }
      return Promise.resolve();
    },
  }),

  // Пароль (минимум 8 символов, буквы и цифры)
  password: (message?: string): Rule => ({
    pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
    message: message || 'Пароль должен содержать минимум 8 символов, включая буквы и цифры',
  }),

  // Дата в будущем
  futureDate: (message?: string): Rule => ({
    validator: (_, value) => {
      if (!value) return Promise.resolve();
      const date = new Date(value);
      if (date <= new Date()) {
        return Promise.reject(message || 'Дата должна быть в будущем');
      }
      return Promise.resolve();
    },
  }),

  // Дата в прошлом
  pastDate: (message?: string): Rule => ({
    validator: (_, value) => {
      if (!value) return Promise.resolve();
      const date = new Date(value);
      if (date >= new Date()) {
        return Promise.reject(message || 'Дата должна быть в прошлом');
      }
      return Promise.resolve();
    },
  }),

  // Кириллица и пробелы
  cyrillicName: (message?: string): Rule => ({
    pattern: /^[а-яА-ЯёЁ\s-]+$/,
    message: message || 'Только кириллица',
  }),

  // Без специальных символов
  noSpecialChars: (message?: string): Rule => ({
    pattern: /^[a-zA-Zа-яА-ЯёЁ0-9\s-]+$/,
    message: message || 'Специальные символы не допускаются',
  }),
};

// Готовые наборы правил для типичных полей
export const fieldRules = {
  companyName: [
    validationRules.required('Введите название компании'),
    validationRules.minLength(2, 'Минимум 2 символа'),
    validationRules.maxLength(100, 'Максимум 100 символов'),
  ],

  email: [
    validationRules.required('Введите email'),
    validationRules.email(),
  ],

  phone: [
    validationRules.required('Введите телефон'),
    validationRules.phone(),
  ],

  address: [
    validationRules.required('Введите адрес'),
    validationRules.minLength(5, 'Минимум 5 символов'),
    validationRules.maxLength(200, 'Максимум 200 символов'),
  ],

  description: [
    validationRules.maxLength(1000, 'Максимум 1000 символов'),
  ],

  partnerName: [
    validationRules.required('Введите название партнёра'),
    validationRules.minLength(2, 'Минимум 2 символа'),
    validationRules.maxLength(100, 'Максимум 100 символов'),
  ],

  userName: [
    validationRules.required('Введите имя пользователя'),
    validationRules.minLength(2, 'Минимум 2 символа'),
    validationRules.maxLength(50, 'Максимум 50 символов'),
  ],

  promotionTitle: [
    validationRules.required('Введите название акции'),
    validationRules.minLength(3, 'Минимум 3 символа'),
    validationRules.maxLength(100, 'Максимум 100 символов'),
  ],

  discount: [
    validationRules.required('Введите размер скидки'),
    validationRules.percentage('Скидка должна быть от 0 до 100%'),
  ],

  cashbackRate: [
    validationRules.required('Введите процент кэшбека'),
    validationRules.percentage('Кэшбек должен быть от 0 до 100%'),
  ],

  coordinates: {
    latitude: [validationRules.latitude()],
    longitude: [validationRules.longitude()],
  },

  password: [
    validationRules.required('Введите пароль'),
    validationRules.password(),
  ],

  url: [
    validationRules.url(),
  ],
};

// Хелпер для показа подсказок
export const fieldHelpers = {
  phone: 'Формат: +996 XXX XXX XXX',
  email: 'Например: example@mail.com',
  password: 'Минимум 8 символов, буквы и цифры',
  discount: 'Введите число от 0 до 100',
  cashback: 'Введите процент кэшбека (0-100%)',
  coordinates: 'Можно выбрать на карте',
  twoGisLink: 'Скопируйте ссылку из 2GIS',
};

// Функция для валидации формы перед отправкой
export const validateForm = async (form: any): Promise<boolean> => {
  try {
    await form.validateFields();
    return true;
  } catch (error) {
    return false;
  }
};

export default validationRules;

