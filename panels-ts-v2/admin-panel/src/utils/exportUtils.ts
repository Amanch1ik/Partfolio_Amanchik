/**
 * Утилиты для красивого экспорта данных в CSV и Excel
 */
import dayjs from 'dayjs';

// Разделитель для CSV (точка с запятой для Excel в русской локали)
const CSV_SEPARATOR = ';';

/**
 * Экранирует значение для CSV (добавляет кавычки если нужно)
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // Если значение содержит разделитель, кавычки или перенос строки, оборачиваем в кавычки
  if (stringValue.includes(CSV_SEPARATOR) || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
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
  // Проверка данных
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.error('Export error: No data to export');
    throw new Error('Нет данных для экспорта');
  }

  if (!columns || columns.length === 0) {
    console.error('Export error: No columns defined');
    throw new Error('Не определены колонки для экспорта');
  }

  // BOM для правильного отображения кириллицы в Excel
  const BOM = '\uFEFF';
  
  // Заголовки - каждая колонка отдельно
  const headers = columns.map(col => escapeCSVValue(col.title));
  const headerRow = headers.join(CSV_SEPARATOR);
  
  console.log('Exporting CSV:', {
    rows: data.length,
    columns: columns.length,
    headers: headers
  });
  
  // Данные - каждая колонка отдельно, каждая строка на новой строке
  const dataRows = data.map((record, index) => {
    const rowValues = columns.map((col, colIndex) => {
      // Получаем значение из записи
      let value = record[col.key];
      
      // Если значение не найдено напрямую, пробуем через вложенные объекты
      if (value === undefined && col.key.includes('.')) {
        const keys = col.key.split('.');
        value = keys.reduce((obj, key) => obj?.[key], record);
      }
      
      // Если значение все еще не найдено, логируем для отладки
      if (value === undefined && index === 0) {
        console.warn(`Column "${col.key}" not found in record:`, Object.keys(record));
      }
      
      let displayValue: any = value;
      
      // Применяем кастомный рендер если есть
      if (col.render) {
        try {
          const rendered = col.render(value, record);
          // Если рендер возвращает строку или число, используем его
          if (typeof rendered === 'string' || typeof rendered === 'number') {
            displayValue = rendered;
          } else {
            // Иначе используем исходное значение
            displayValue = value;
          }
        } catch (error) {
          console.warn(`Error rendering column ${col.key} for row ${index}:`, error);
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
      
      // Преобразуем в строку и экранируем
      const escapedValue = escapeCSVValue(String(displayValue));
      
      // Логируем первую строку для отладки
      if (index === 0 && colIndex === 0) {
        console.log('First cell value:', { key: col.key, value, displayValue, escapedValue });
      }
      
      return escapedValue;
    });
    
    // Объединяем значения строки через разделитель
    const rowString = rowValues.join(CSV_SEPARATOR);
    
    // Логируем первую строку для отладки
    if (index === 0) {
      console.log('First row:', rowString.substring(0, 100));
    }
    
    return rowString;
  });
  
  // Объединяем все строки (каждая строка на новой строке)
  // Используем \r\n для совместимости с Windows Excel
  const allRows = [headerRow, ...dataRows];
  const csvContent = BOM + allRows.join('\r\n');
  
  // Проверяем содержимое перед созданием файла
  if (!csvContent || csvContent.length < headerRow.length) {
    console.error('Export error: Empty CSV content', { 
      headerRow, 
      dataRowsCount: dataRows.length,
      csvContentLength: csvContent?.length,
      firstDataRow: dataRows[0]?.substring(0, 50)
    });
    throw new Error('Ошибка при создании файла: пустое содержимое');
  }
  
  console.log('CSV export summary:', {
    totalRows: allRows.length,
    headerRow: headerRow.substring(0, 100),
    firstDataRow: dataRows[0]?.substring(0, 100),
    contentLength: csvContent.length,
    contentPreview: csvContent.substring(0, 300)
  });
  
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
  
  console.log('File downloaded:', link.download);
}

/**
 * Экспорт в Excel формат (использует CSV, но можно расширить до xlsx)
 * Для полноценного Excel используйте библиотеку xlsx:
 * npm install xlsx
 * import * as XLSX from 'xlsx';
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: Array<{
    key: string;
    title: string;
    render?: (value: any, record: T) => string | number;
  }>,
  filename: string
): void {
  // Проверка данных
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.error('Export error: No data to export');
    throw new Error('Нет данных для экспорта');
  }

  if (!columns || columns.length === 0) {
    console.error('Export error: No columns defined');
    throw new Error('Не определены колонки для экспорта');
  }

  // Используем CSV формат (совместим с Excel)
  // Для полноценного .xlsx формата нужно установить библиотеку xlsx
  const BOM = '\uFEFF';
  
  const headers = columns.map(col => escapeCSVValue(col.title));
  const headerRow = headers.join(CSV_SEPARATOR);
  
  console.log('Exporting Excel:', {
    rows: data.length,
    columns: columns.length,
    headers: headers
  });
  
  const dataRows = data.map((record, index) => {
    const rowValues = columns.map(col => {
      // Получаем значение из записи
      let value = record[col.key];
      
      // Если значение не найдено напрямую, пробуем через вложенные объекты
      if (value === undefined && col.key.includes('.')) {
        const keys = col.key.split('.');
        value = keys.reduce((obj, key) => obj?.[key], record);
      }
      
      let displayValue: any = value;
      
      if (col.render) {
        try {
          const rendered = col.render(value, record);
          if (typeof rendered === 'string' || typeof rendered === 'number') {
            displayValue = rendered;
          } else {
            displayValue = value;
          }
        } catch (error) {
          console.warn(`Error rendering column ${col.key} for row ${index}:`, error);
          displayValue = value;
        }
      }
      
      if (displayValue instanceof Date || (typeof displayValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(displayValue))) {
        displayValue = formatDateForExport(displayValue);
      } else if (typeof displayValue === 'number') {
        displayValue = displayValue.toLocaleString('ru-RU', { 
          minimumFractionDigits: 0, 
          maximumFractionDigits: 2 
        });
      } else if (displayValue === null || displayValue === undefined) {
        displayValue = '';
      }
      
      return escapeCSVValue(String(displayValue));
    });
    
    return rowValues.join(CSV_SEPARATOR);
  });
  
  // Используем \r\n для совместимости с Windows Excel
  const csvContent = BOM + [headerRow, ...dataRows].join('\r\n');
  
  // Проверяем содержимое перед созданием файла
  if (!csvContent || csvContent.length < headerRow.length) {
    console.error('Export error: Empty CSV content', { headerRow, dataRowsCount: dataRows.length });
    throw new Error('Ошибка при создании файла: пустое содержимое');
  }
  
  console.log('Excel content preview:', csvContent.substring(0, 200));
  
  // Для Excel используем правильный MIME type и расширение .csv
  // Excel автоматически распознает CSV с точкой с запятой как разделитель
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  // Используем .csv расширение - Excel правильно откроет файл с точкой с запятой
  link.download = `${filename}-${dayjs().format('YYYY-MM-DD')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  
  console.log('File downloaded:', link.download);
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

