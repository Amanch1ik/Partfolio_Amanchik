import { useEffect, useCallback, useRef, useState } from 'react';

interface KeyboardNavigationOptions {
  onEscape?: () => void;
  onEnter?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onTab?: () => void;
  onShiftTab?: () => void;
  onSpace?: () => void;
  enabled?: boolean;
  preventDefault?: boolean;
}

export const useKeyboardNavigation = (options: KeyboardNavigationOptions = {}) => {
  const {
    onEscape,
    onEnter,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onTab,
    onShiftTab,
    onSpace,
    enabled = true,
    preventDefault = true,
  } = options;

  const handlerRef = useRef<(event: KeyboardEvent) => void>();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const { key, shiftKey, ctrlKey, altKey, metaKey } = event;

    // Пропускаем если зажаты модификаторы (кроме Shift для Shift+Tab)
    if ((ctrlKey || altKey || metaKey) && key !== 'Tab') return;

    let handled = false;

    switch (key) {
      case 'Escape':
        if (onEscape) {
          onEscape();
          handled = true;
        }
        break;
      case 'Enter':
        if (onEnter) {
          onEnter();
          handled = true;
        }
        break;
      case 'ArrowUp':
        if (onArrowUp) {
          onArrowUp();
          handled = true;
        }
        break;
      case 'ArrowDown':
        if (onArrowDown) {
          onArrowDown();
          handled = true;
        }
        break;
      case 'ArrowLeft':
        if (onArrowLeft) {
          onArrowLeft();
          handled = true;
        }
        break;
      case 'ArrowRight':
        if (onArrowRight) {
          onArrowRight();
          handled = true;
        }
        break;
      case 'Tab':
        if (shiftKey && onShiftTab) {
          onShiftTab();
          handled = true;
        } else if (!shiftKey && onTab) {
          onTab();
          handled = true;
        }
        break;
      case ' ':
      case 'Space':
        if (onSpace) {
          onSpace();
          handled = true;
        }
        break;
    }

    if (handled && preventDefault) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, [
    enabled,
    preventDefault,
    onEscape,
    onEnter,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onTab,
    onShiftTab,
    onSpace,
  ]);

  useEffect(() => {
    handlerRef.current = handleKeyDown;
  }, [handleKeyDown]);

  useEffect(() => {
    if (!enabled) return;

    const handler = (event: KeyboardEvent) => {
      if (handlerRef.current) {
        handlerRef.current(event);
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [enabled]);

  return {
    // Можно добавить дополнительные утилиты для управления фокусом
    focusElement: (element: HTMLElement | null) => {
      if (element) {
        element.focus();
      }
    },
    focusFirstFocusable: (container: HTMLElement) => {
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      if (firstElement) {
        firstElement.focus();
      }
    },
    trapFocus: (container: HTMLElement) => {
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTabKey = (event: KeyboardEvent) => {
        if (event.key === 'Tab') {
          if (event.shiftKey) {
            if (document.activeElement === firstElement) {
              event.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              event.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      container.addEventListener('keydown', handleTabKey);
      return () => container.removeEventListener('keydown', handleTabKey);
    },
  };
};

// Хук для управления фокусом в модальных окнах
export const useModalFocus = (isOpen: boolean, modalRef: React.RefObject<HTMLElement>) => {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Сохраняем текущий фокус
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Перемещаем фокус в модальное окно
      setTimeout(() => {
        if (modalRef.current) {
          const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const firstElement = focusableElements[0] as HTMLElement;
          if (firstElement) {
            firstElement.focus();
          } else {
            modalRef.current.focus();
          }
        }
      }, 100);
    } else if (!isOpen && previousFocusRef.current) {
      // Возвращаем фокус обратно
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen, modalRef]);

  // Обработчик клавиатуры для модального окна
  const modalKeyboardHandler = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && modalRef.current) {
      // Можно добавить коллбэк для закрытия модального окна
      const closeButton = modalRef.current.querySelector('[data-close-modal]') as HTMLElement;
      if (closeButton) {
        closeButton.click();
      }
    }
  }, [modalRef]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', modalKeyboardHandler);
      return () => document.removeEventListener('keydown', modalKeyboardHandler);
    }
  }, [isOpen, modalKeyboardHandler]);
};

// Хук для навигации по элементам с клавиатуры
export const useArrowNavigation = (
  items: any[],
  onSelect?: (item: any, index: number) => void,
  loop = true
) => {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const keyboardNavigation = useKeyboardNavigation({
    onArrowDown: () => {
      setFocusedIndex(prev => {
        const next = loop ? (prev + 1) % items.length : Math.min(prev + 1, items.length - 1);
        if (onSelect && items[next]) {
          onSelect(items[next], next);
        }
        return next;
      });
    },
    onArrowUp: () => {
      setFocusedIndex(prev => {
        const next = loop ? (prev - 1 + items.length) % items.length : Math.max(prev - 1, 0);
        if (onSelect && items[next]) {
          onSelect(items[next], next);
        }
        return next;
      });
    },
    onEnter: () => {
      if (focusedIndex >= 0 && onSelect && items[focusedIndex]) {
        onSelect(items[focusedIndex], focusedIndex);
      }
    },
    onEscape: () => {
      setFocusedIndex(-1);
    },
  });

  return {
    focusedIndex,
    setFocusedIndex,
    ...keyboardNavigation,
  };
};

export default useKeyboardNavigation;
