namespace YessGoFront.Config;

public static class ApiEndpoints
{
    // Базовые пути с версией API
    private const string ApiVersion = "/api/v1";

    public const string Auth = $"{ApiVersion}/auth";
    public const string Partners = $"{ApiVersion}/partners";
    public const string Wallet = $"{ApiVersion}/wallet";
    public const string QR = $"{ApiVersion}/qr";
    public const string Users = $"{ApiVersion}/users";
    public const string Transactions = $"{ApiVersion}/transactions";
    public const string Orders = $"{ApiVersion}/orders";
    public const string Notifications = $"{ApiVersion}/notifications";
    public const string Routes = $"{ApiVersion}/routes";
    public const string Location = $"{ApiVersion}/location";
    public const string Promotions = $"{ApiVersion}/promotions";
    public const string Banners = $"{ApiVersion}/banners";

    // Authentication endpoints (✅ FIXED)
    // Authentication endpoints
    public static class AuthEndpoints
    {
        public const string Register = $"{Auth}/register";   // /api/v1/auth/register
        public const string Login = $"{Auth}/login";         // /api/v1/auth/login
        public const string Refresh = $"{Auth}/refresh";     // /api/v1/auth/refresh
        public const string Me = $"{Auth}/me";               // /api/v1/auth/me
        public const string ReferralStats = $"{Auth}/referral-stats"; // /api/v1/auth/referral-stats

        // если позже появятся на backend - просто будут готовы
        public const string Logout = $"{Auth}/logout";
        public const string Verify = $"{Auth}/verify";
        
        // SMS верификация
        public const string SendVerificationCode = $"{Auth}/send-verification-code";
        public const string VerifyCode = $"{Auth}/verify-code";
        
        // Базовый путь для Auth
        public const string Base = Auth;
    }



    // Partners endpoints
    public static class PartnersEndpoints
    {
        public const string List = $"{Partners}/list";
        public static string ById(int id) => $"{Partners}/{id}";
        public static string ByCategory(string category)
            => $"{List}?category={Uri.EscapeDataString(category)}";
        public const string Locations = $"{Partners}/locations";
        public const string Categories = $"{Partners}/categories";
        public static string Nearby(double latitude, double longitude, double radius = 10.0)
            => $"{Locations}?latitude={latitude}&longitude={longitude}&radius={radius}";
        public static string Products(int partnerId) => $"{Partners}/{partnerId}/products";
    }

    // Wallet endpoints
    public static class WalletEndpoints
    {
        // Используем endpoint из payments, который работает с текущим пользователем из токена
        public const string Balance = $"{ApiVersion}/payments/balance";
        public const string Transactions = $"{ApiVersion}/payments/transactions";
        public const string TopUp = $"{Wallet}/topup";
        public static string GetBalance(int userId) => $"{Wallet}?userId={userId}";
    }

    // QR endpoints
    public static class QREndpoints
    {
        public const string Generate = $"{QR}/generate";
        public const string Validate = $"{QR}/validate";
        public const string Scan = $"{QR}/scan";
    }

    // User endpoints
    public static class UserEndpoints
    {
        public const string Me = $"{Users}/me";
        public const string Profile = $"{Users}/me";
        public const string UpdateProfile = $"{Users}/me";
    }

    // Transaction endpoints
    public static class TransactionEndpoints
    {
        public const string List = $"{Transactions}";
        public static string ById(string id) => $"{Transactions}/{id}";
        public static string ByUser(int userId) => $"{List}?user_id={userId}";
    }

    // Order endpoints
    public static class OrderEndpoints
    {
        public const string Create = $"{Orders}";
        public const string List = $"{Orders}";
        public static string ById(string id) => $"{Orders}/{id}";
    }

    // Notification endpoints
    public static class NotificationEndpoints
    {
        public const string List = $"{Notifications}";
        public static string MarkAsRead(int id) => $"{Notifications}/{id}/read";
        public static string ById(int id) => $"{Notifications}/{id}";
    }

    // Route endpoints
    public static class RouteEndpoints
    {
        public const string Calculate = $"{Routes}/calculate";
        public const string Optimize = $"{Routes}/optimize";
        public const string Navigation = $"{Routes}/navigation";
    }

    // Location endpoints
    public static class LocationEndpoints
    {
        public const string Update = $"{Location}/update";
        public const string Nearby = $"{Location}/nearby";
    }

    // Promotion endpoints
    public static class PromotionEndpoints
    {
        public const string List = $"{Promotions}";
        public static string ById(int id) => $"{Promotions}/{id}";
        public static string Active = $"{List}?status=active";
    }

    // Promo Code endpoints
    public static class PromoCodeEndpoints
    {
        public const string Validate = $"{Promotions}/promo-codes/validate";
        public static string GetByCode(string code) => $"{Promotions}/promo-codes/{Uri.EscapeDataString(code)}";
        public const string UserPromoCodes = $"{Promotions}/user/promo-codes";
    }

    // Banner endpoints
    public static class BannerEndpoints
    {
        public const string List = $"{Banners}";
        public const string Active = $"{List}?active=true";
        public static string ById(int id) => $"{Banners}/{id}";
    }
}
