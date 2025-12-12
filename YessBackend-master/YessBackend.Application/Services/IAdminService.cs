using YessBackend.Application.DTOs.Admin;
using YessBackend.Domain.Entities;

namespace YessBackend.Application.Services;

/// <summary>
/// Интерфейс сервиса администрирования
/// </summary>
public interface IAdminService
{
    #region Dashboard
    
    /// <summary>
    /// Получить статистику дашборда
    /// </summary>
    Task<DashboardStatsDto> GetDashboardStatsAsync();
    
    /// <summary>
    /// Получить данные для графиков дашборда
    /// </summary>
    Task<DashboardChartsDto> GetDashboardChartsAsync(int days = 30);
    
    /// <summary>
    /// Получить статистику транзакций за период
    /// </summary>
    Task<TransactionStatsDto> GetTransactionStatsAsync(DateTime? startDate, DateTime? endDate);
    
    #endregion

    #region User Management
    
    /// <summary>
    /// Получить список пользователей с пагинацией и фильтрацией
    /// </summary>
    Task<PaginatedResponseDto<AdminUserDto>> GetUsersAsync(UserFilterDto filter, PaginationParams pagination);
    
    /// <summary>
    /// Получить пользователя по ID
    /// </summary>
    Task<AdminUserDto?> GetUserByIdAsync(int userId);
    
    /// <summary>
    /// Создать пользователя
    /// </summary>
    Task<AdminUserDto> CreateUserAsync(CreateUserRequestDto request);
    
    /// <summary>
    /// Обновить пользователя
    /// </summary>
    Task<AdminUserDto?> UpdateUserAsync(int userId, UpdateUserRequestDto request);
    
    /// <summary>
    /// Заблокировать/разблокировать пользователя
    /// </summary>
    Task<OperationResultDto> ToggleUserBlockAsync(int userId, bool block);
    
    /// <summary>
    /// Удалить (деактивировать) пользователя
    /// </summary>
    Task<OperationResultDto> DeleteUserAsync(int userId);
    
    /// <summary>
    /// Изменить роль пользователя
    /// </summary>
    Task<OperationResultDto> ChangeUserRoleAsync(int userId, ChangeUserRoleRequestDto request);
    
    #endregion

    #region Partner Management
    
    /// <summary>
    /// Получить список партнеров с пагинацией и фильтрацией
    /// </summary>
    Task<PaginatedResponseDto<AdminPartnerDto>> GetPartnersAsync(PartnerFilterDto filter, PaginationParams pagination);
    
    /// <summary>
    /// Получить партнера по ID
    /// </summary>
    Task<AdminPartnerDto?> GetPartnerByIdAsync(int partnerId);
    
    /// <summary>
    /// Создать партнера
    /// </summary>
    Task<AdminPartnerDto> CreatePartnerAsync(CreatePartnerRequestDto request);
    
    /// <summary>
    /// Обновить партнера
    /// </summary>
    Task<AdminPartnerDto?> UpdatePartnerAsync(int partnerId, UpdatePartnerRequestDto request);
    
    /// <summary>
    /// Верифицировать партнера
    /// </summary>
    Task<OperationResultDto> VerifyPartnerAsync(int partnerId);
    
    /// <summary>
    /// Удалить (деактивировать) партнера
    /// </summary>
    Task<OperationResultDto> DeletePartnerAsync(int partnerId);
    
    /// <summary>
    /// Получить список категорий партнеров
    /// </summary>
    Task<List<string>> GetPartnerCategoriesAsync();
    
    #endregion

    #region Transaction Management
    
    /// <summary>
    /// Получить список транзакций с пагинацией и фильтрацией
    /// </summary>
    Task<PaginatedResponseDto<AdminTransactionDto>> GetTransactionsAsync(TransactionFilterDto filter, PaginationParams pagination);
    
    /// <summary>
    /// Получить транзакцию по ID
    /// </summary>
    Task<AdminTransactionDto?> GetTransactionByIdAsync(int transactionId);
    
    /// <summary>
    /// Обновить статус транзакции
    /// </summary>
    Task<OperationResultDto> UpdateTransactionStatusAsync(int transactionId, UpdateTransactionStatusDto request);
    
    #endregion

    #region Order Management
    
    /// <summary>
    /// Получить список заказов с пагинацией и фильтрацией
    /// </summary>
    Task<PaginatedResponseDto<AdminOrderDto>> GetOrdersAsync(OrderFilterDto filter, PaginationParams pagination);
    
    /// <summary>
    /// Получить заказ по ID
    /// </summary>
    Task<AdminOrderDto?> GetOrderByIdAsync(int orderId);
    
    /// <summary>
    /// Обновить статус заказа
    /// </summary>
    Task<OperationResultDto> UpdateOrderStatusAsync(int orderId, UpdateOrderStatusDto request);
    
    #endregion

    #region City Management
    
    /// <summary>
    /// Получить список городов
    /// </summary>
    Task<List<CityDto>> GetCitiesAsync();
    
    /// <summary>
    /// Создать город
    /// </summary>
    Task<CityDto> CreateCityAsync(CreateCityRequestDto request);
    
    /// <summary>
    /// Удалить город
    /// </summary>
    Task<OperationResultDto> DeleteCityAsync(int cityId);
    
    #endregion

    #region Notification Management
    
    /// <summary>
    /// Получить список уведомлений
    /// </summary>
    Task<PaginatedResponseDto<AdminNotificationDto>> GetNotificationsAsync(PaginationParams pagination);
    
    /// <summary>
    /// Отправить массовое уведомление
    /// </summary>
    Task<OperationResultDto> BroadcastNotificationAsync(BroadcastNotificationRequestDto request);
    
    #endregion

    #region Wallet Management
    
    /// <summary>
    /// Получить список кошельков
    /// </summary>
    Task<PaginatedResponseDto<AdminWalletDto>> GetWalletsAsync(PaginationParams pagination);
    
    /// <summary>
    /// Корректировать баланс кошелька
    /// </summary>
    Task<OperationResultDto> AdjustWalletBalanceAsync(int userId, decimal amount, string reason);
    
    #endregion

    #region Admin Profile
    
    /// <summary>
    /// Получить профиль текущего администратора
    /// </summary>
    Task<AdminProfileDto?> GetAdminProfileAsync(int userId);
    
    /// <summary>
    /// Проверить, является ли пользователь администратором
    /// </summary>
    Task<bool> IsAdminAsync(int userId);
    
    #endregion

    #region Reports
    
    /// <summary>
    /// Получить отчет по пользователям
    /// </summary>
    Task<object> GetUsersReportAsync(DateTime? startDate, DateTime? endDate);
    
    /// <summary>
    /// Получить отчет по партнерам
    /// </summary>
    Task<object> GetPartnersReportAsync();
    
    /// <summary>
    /// Экспорт данных в CSV
    /// </summary>
    Task<byte[]> ExportDataAsync(string entityType, string format = "csv");
    
    #endregion
}
