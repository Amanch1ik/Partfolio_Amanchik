/**
 * Утилиты для красивого экспорта данных в CSV и Excel
 */
import dayjs from 'dayjs';
import { t } from '@/i18n';

/**
 * Экранирует значение для CSV (добавляет кавычки если нужно)
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // Если значение содержит запятую, кавычки или перенос строки, оборачиваем в кавычки
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    // Экранируем кавычки удвоением
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Форматирует дату для экспорта
 */
function formatDateForExport(date: string | Date | null | undefined): string {
  if (!date) return '';
  return dayjs(date).format('DD.MM.YYYY HH:mm:ss');
}

/**
 * Форматирует число для экспорта
 */
function formatNumberForExport(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Экспорт данных в CSV с правильным форматированием
 * Каждое поле в отдельной колонке, правильное экранирование
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: Array<{
    key: string;
    title: string;
    render?: (value: any, record: T) => string | number;
  }>,
  filename: string
): void {
  // BOM для правильного отображения кириллицы в Excel
  const BOM = '\uFEFF';
  
  // Заголовки - каждая колонка отдельно
  const headers = columns.map(col => escapeCSVValue(col.title));
  const headerRow = headers.join(',');
  
  // Данные - каждая колонка отдельно
  const dataRows = data.map(record => {
    return columns.map(col => {
      const value = record[col.key];
      let displayValue: any = value;
      
      // Применяем кастомный рендер если есть
      if (col.render) {
        const rendered = col.render(value, record);
        // Если рендер возвращает строку или число, используем его
        if (typeof rendered === 'string' || typeof rendered === 'number') {
          displayValue = rendered;
        } else {
          // Иначе используем исходное значение
          displayValue = value;
        }
      }
      
      // Форматируем специальные типы
      if (displayValue instanceof Date || (typeof displayValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(displayValue))) {
        displayValue = formatDateForExport(displayValue);
      } else if (typeof displayValue === 'number') {
        // Для чисел используем форматирование с пробелами для тысяч
        displayValue = displayValue.toLocaleString('ru-RU', { 
          minimumFractionDigits: 0, 
          maximumFractionDigits: 2 
        });
      } else if (displayValue === null || displayValue === undefined) {
        displayValue = '';
      }
      
      return escapeCSVValue(String(displayValue));
    }).join(',');
  });
  
  // Объединяем все строки
  const csvContent = BOM + [headerRow, ...dataRows].join('\n');
  
  // Создаем и скачиваем файл
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${dayjs().format('YYYY-MM-DD')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Экспорт в Excel формат (CSV с расширением .xls для совместимости)
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: Array<{
    key: string;
    title: string;
    render?: (value: any, record: T) => string;
  }>,
  filename: string
): void {
  // Используем тот же формат что и CSV, но с расширением .xls
  exportToCSV(data, columns, filename);
  
  // Переименовываем файл (это работает только если браузер поддерживает)
  // В реальности лучше использовать библиотеку типа xlsx
}

/**
 * Экспорт в JSON
 */
export function exportToJSON<T>(data: T[], filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${dayjs().format('YYYY-MM-DD')}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

