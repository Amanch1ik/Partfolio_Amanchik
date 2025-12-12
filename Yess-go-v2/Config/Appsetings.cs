namespace YessApp.Config
{
    public class AppSettings
    {
        public ApiSettings Api { get; set; } = new ApiSettings();
    }

    public class ApiSettings
    {
        // 👇 Замени IP на свой — тот, где запущен Docker backend
        // Если тестируешь на эмуляторе Android → http://10.0.2.2:8000
        // Если на реальном телефоне → http://192.168.2.155:8000
        public string BaseUrl { get; set; } = "http://192.168.2.155:8000";

        public string ApiVersion { get; set; } = "v1";
        public int RequestTimeoutSeconds { get; set; } = 30;
    }
}
