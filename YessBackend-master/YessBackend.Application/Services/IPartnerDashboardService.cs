using YessBackend.Application.DTOs.PartnerDashboard;
using YessBackend.Domain.Entities;

namespace YessBackend.Application.Services;

/// <summary>
/// Интерфейс сервиса панели партнера
/// </summary>
public interface IPartnerDashboardService
{
    #region Authentication & Profile
    
    /// <summary>
    /// Получить ID партнера для пользователя
    /// </summary>
    Task<int?> GetPartnerIdForUserAsync(int userId);
    
    /// <summary>
    /// Получить профиль партнера
    /// </summary>
    Task<PartnerProfileDto?> GetPartnerProfileAsync(int userId);
    
    /// <summary>
    /// Проверить, является ли пользователь партнером или сотрудником партнера
    /// </summary>
    Task<bool> IsPartnerOrEmployeeAsync(int userId);
    
    /// <summary>
    /// Проверить, является ли пользователь владельцем партнера
    /// </summary>
    Task<bool> IsPartnerOwnerAsync(int userId, int partnerId);
    
    #endregion

    #region Dashboard & Statistics
    
    /// <summary>
    /// Получить статистику партнера
    /// </summary>
    Task<PartnerStatsDto?> GetPartnerStatsAsync(int partnerId);
    
    /// <summary>
    /// Получить данные для графиков
    /// </summary>
    Task<PartnerChartsDto> GetPartnerChartsAsync(int partnerId, int days = 30);
    
    #endregion

    #region Transactions
    
    /// <summary>
    /// Получить транзакции партнера
    /// </summary>
    Task<PartnerPaginatedResponseDto<PartnerTransactionDto>> GetTransactionsAsync(
        int partnerId, 
        PartnerTransactionFilterDto filter,
        int limit = 50, 
        int offset = 0);
    
    /// <summary>
    /// Получить транзакцию по ID
    /// </summary>
    Task<PartnerTransactionDto?> GetTransactionByIdAsync(int partnerId, int transactionId);
    
    #endregion

    #region Orders
    
    /// <summary>
    /// Получить заказы партнера
    /// </summary>
    Task<PartnerPaginatedResponseDto<PartnerOrderDto>> GetOrdersAsync(
        int partnerId,
        PartnerOrderFilterDto filter,
        int limit = 50,
        int offset = 0);
    
    /// <summary>
    /// Получить заказ по ID
    /// </summary>
    Task<PartnerOrderDto?> GetOrderByIdAsync(int partnerId, int orderId);
    
    /// <summary>
    /// Обновить статус заказа
    /// </summary>
    Task<bool> UpdateOrderStatusAsync(int partnerId, int orderId, string status, string? notes = null);
    
    #endregion

    #region Products
    
    /// <summary>
    /// Получить продукты партнера
    /// </summary>
    Task<PartnerPaginatedResponseDto<PartnerProductDto>> GetProductsAsync(
        int partnerId,
        string? search = null,
        string? category = null,
        bool? isActive = null,
        int limit = 50,
        int offset = 0);
    
    /// <summary>
    /// Получить продукт по ID
    /// </summary>
    Task<PartnerProductDto?> GetProductByIdAsync(int partnerId, int productId);
    
    /// <summary>
    /// Создать продукт
    /// </summary>
    Task<PartnerProductDto> CreateProductAsync(int partnerId, PartnerProductRequestDto request);
    
    /// <summary>
    /// Обновить продукт
    /// </summary>
    Task<PartnerProductDto?> UpdateProductAsync(int partnerId, int productId, PartnerProductRequestDto request);
    
    /// <summary>
    /// Удалить продукт
    /// </summary>
    Task<bool> DeleteProductAsync(int partnerId, int productId);
    
    /// <summary>
    /// Получить категории продуктов партнера
    /// </summary>
    Task<List<string>> GetProductCategoriesAsync(int partnerId);
    
    #endregion

    #region Locations
    
    /// <summary>
    /// Получить локации партнера
    /// </summary>
    Task<List<PartnerLocationDto>> GetLocationsAsync(int partnerId);
    
    /// <summary>
    /// Получить локацию по ID
    /// </summary>
    Task<PartnerLocationDto?> GetLocationByIdAsync(int partnerId, int locationId);
    
    #endregion

    #region Employees
    
    /// <summary>
    /// Получить сотрудников партнера
    /// </summary>
    Task<List<PartnerEmployeeDto>> GetEmployeesAsync(int partnerId);
    
    /// <summary>
    /// Добавить сотрудника
    /// </summary>
    Task<PartnerEmployeeDto?> AddEmployeeAsync(int partnerId, AddEmployeeRequestDto request);
    
    /// <summary>
    /// Удалить сотрудника
    /// </summary>
    Task<bool> RemoveEmployeeAsync(int partnerId, int employeeId);
    
    #endregion

    #region Reports
    
    /// <summary>
    /// Получить отчет по продажам
    /// </summary>
    Task<object> GetSalesReportAsync(int partnerId, DateTime? startDate, DateTime? endDate);
    
    /// <summary>
    /// Экспорт отчета
    /// </summary>
    Task<byte[]> ExportReportAsync(int partnerId, string reportType, string format = "csv");
    
    #endregion
}

