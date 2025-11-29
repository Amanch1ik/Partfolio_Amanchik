import React, { useState, useRef } from 'react';
import { Modal } from 'antd';
import '../styles/DeleteButton.css';

interface DeleteButtonProps {
  onDelete: () => void;
  text?: string;
  className?: string;
  disabled?: boolean;
  confirmTitle?: string;
  confirmContent?: string;
  confirmOkText?: string;
  confirmCancelText?: string;
}

export const DeleteButton: React.FC<DeleteButtonProps> = ({
  onDelete,
  text = 'Delete Item',
  className = '',
  disabled = false,
  confirmTitle = 'Удалить?',
  confirmContent = 'Это действие нельзя отменить',
  confirmOkText = 'Удалить',
  confirmCancelText = 'Отменить',
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const startAnimation = () => {
    if (disabled || isDeleting) return;

    setIsDeleting(true);
    
    // Вызываем callback после завершения анимации
    setTimeout(() => {
      onDelete();
      // Сбрасываем состояние через небольшой промежуток
      setTimeout(() => {
        setIsDeleting(false);
      }, 100);
    }, 3200);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled || isDeleting) return;

    // Показываем модальное окно подтверждения
    Modal.confirm({
      title: confirmTitle,
      content: confirmContent,
      okText: confirmOkText,
      cancelText: confirmCancelText,
      okButtonProps: { danger: true },
      onOk: () => {
        // После подтверждения запускаем анимацию
        startAnimation();
      },
    });
  };

  const isIconOnly = className.includes('icon-only');
  
  return (
    <button
      ref={buttonRef}
      className={`delete-button ${isDeleting ? 'delete' : ''} ${className}`}
      onClick={handleClick}
      disabled={disabled || isDeleting}
      type="button"
    >
      <div className="trash">
        <div className="top">
          <div className="paper"></div>
        </div>
        <div className="box"></div>
        <div className="check">
          <svg viewBox="0 0 8 6">
            <polyline points="1 3.4 2.71428571 5 7 1"></polyline>
          </svg>
        </div>
      </div>
      {!isIconOnly && <span>{text}</span>}
    </button>
  );
};

