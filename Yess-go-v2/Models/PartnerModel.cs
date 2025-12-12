namespace YessGoFront.Models;

public class PartnerModel
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string LogoUrl { get; set; } = string.Empty;
    public double CashbackPercent { get; set; }

    // 👇 Конструктор под вызов: new("Coffee Boom", "partner_1.png", 7.5)
    public PartnerModel(string name, string logoUrl, double cashbackPercent)
    {
        Name = name;
        LogoUrl = logoUrl;
        CashbackPercent = cashbackPercent;
    }

    public PartnerModel() { }
}
