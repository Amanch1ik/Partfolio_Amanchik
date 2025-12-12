using Microsoft.Extensions.DependencyInjection;
using YessGoFront.Converters;
using YessGoFront.Models;
using YessGoFront.Services.Domain;

namespace YessGoFront.Pages;

[QueryProperty(nameof(PartnerId), "partnerId")]
public partial class PartnerDetailViewPage : ContentPage
{
    private string? partnerId;
    private IPartnersService? _partnersService;
    private PartnerDetailDto? _currentPartner;

    public string? PartnerId
    {
        get => partnerId;
        set
        {
            partnerId = value;
            if (!string.IsNullOrWhiteSpace(partnerId))
            {
                LoadPartnerInfo(partnerId);
            }
        }
    }

    public PartnerDetailViewPage()
    {
        InitializeComponent();
        _partnersService = MauiProgram.Services.GetService<IPartnersService>();
    }

    private async void LoadPartnerInfo(string id)
    {
        try
        {
            if (_partnersService == null)
            {
                System.Diagnostics.Debug.WriteLine("[PartnerDetailViewPage] PartnersService is null");
                return;
            }

            // Загружаем информацию о партнёре
            var partner = await _partnersService.GetPartnerByIdAsync(id);
            
            if (partner != null)
            {
                _currentPartner = partner;
                
                // Устанавливаем название партнёра
                PartnerNameLabel.Text = partner.Name;

                // Загружаем обложку
                if (!string.IsNullOrWhiteSpace(partner.CoverImageUrl))
                {
                    var converter = new StringToImageSourceConverter();
                    var imageSource = converter.Convert(partner.CoverImageUrl, typeof(ImageSource), null, System.Globalization.CultureInfo.CurrentCulture) as ImageSource;
                    if (imageSource != null)
                    {
                        CoverImage.Source = imageSource;
                    }
                }

                // Устанавливаем логотип или текст
                if (!string.IsNullOrWhiteSpace(partner.LogoUrl))
                {
                    try
                    {
                        var converter = new StringToImageSourceConverter();
                        var logoSource = converter.Convert(partner.LogoUrl, typeof(ImageSource), null, System.Globalization.CultureInfo.CurrentCulture) as ImageSource;
                        if (logoSource != null)
                        {
                            // Если есть изображение, заменяем Label на Image
                            var logoImage = new Image
                            {
                                Source = logoSource,
                                Aspect = Aspect.AspectFit,
                                HorizontalOptions = LayoutOptions.Fill,
                                VerticalOptions = LayoutOptions.Fill
                            };
                            LogoFrame.Content = logoImage;
                            LogoText.IsVisible = false;
                        }
                        else
                        {
                            // Используем текст, если изображение не загрузилось
                            LogoText.Text = partner.Name.Length > 10 ? partner.Name.Substring(0, 10).ToUpper() : partner.Name.ToUpper();
                            LogoText.IsVisible = true;
                        }
                    }
                    catch (Exception ex)
                    {
                        System.Diagnostics.Debug.WriteLine($"[PartnerDetailViewPage] Ошибка загрузки логотипа: {ex.Message}");
                        // Используем текст в случае ошибки
                        LogoText.Text = partner.Name.Length > 10 ? partner.Name.Substring(0, 10).ToUpper() : partner.Name.ToUpper();
                        LogoText.IsVisible = true;
                    }
                }
                else
                {
                    // Используем текст по умолчанию
                    LogoText.Text = partner.Name.Length > 10 ? partner.Name.Substring(0, 10).ToUpper() : partner.Name.ToUpper();
                    LogoText.IsVisible = true;
                }

                // Устанавливаем промо (если есть)
                if (partner.CurrentPromotions != null && partner.CurrentPromotions.Count > 0)
                {
                    PromoText.Text = partner.CurrentPromotions.FirstOrDefault() ?? "скидки на все";
                }

                // Устанавливаем максимальную скидку в промо-бейдже
                if (partner.MaxDiscountPercent.HasValue && partner.MaxDiscountPercent.Value > 0)
                {
                    PromoPercentLabel.Text = $"-{partner.MaxDiscountPercent.Value:F0}%";
                    PromoBorder.IsVisible = true;
                }
                else
                {
                    PromoBorder.IsVisible = false;
                }

                // Загружаем продукты
                await LoadProducts(id);
            }
            else
            {
                PartnerNameLabel.Text = $"Партнёр №{id}";
                System.Diagnostics.Debug.WriteLine($"[PartnerDetailViewPage] Партнёр {id} не найден");
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[PartnerDetailViewPage] Ошибка загрузки партнёра: {ex.Message}");
            PartnerNameLabel.Text = $"Партнёр №{id}";
            await DisplayAlert("Ошибка", "Не удалось загрузить информацию о партнёре", "OK");
        }
    }

    private async Task LoadProducts(string partnerId)
    {
        try
        {
            List<ProductDto> products = new List<ProductDto>();

            if (_partnersService != null)
            {
                try
                {
                    products = (await _partnersService.GetPartnerProductsAsync(partnerId))?.ToList() ?? new List<ProductDto>();
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"[PartnerDetailViewPage] Ошибка загрузки продуктов из API: {ex.Message}");
                    // Продолжаем с fallback данными
                }
            }

            // Если продуктов нет, используем тестовые данные
            if (products == null || products.Count == 0)
            {
                products = GetFallbackProducts(partnerId);
                System.Diagnostics.Debug.WriteLine($"[PartnerDetailViewPage] Используются тестовые продукты: {products.Count}");
            }
            else
            {
                // Фильтруем только доступные продукты
                products = products.Where(p => p.IsAvailable).ToList();
                System.Diagnostics.Debug.WriteLine($"[PartnerDetailViewPage] Загружено продуктов из API: {products.Count}");
            }

            ProductsCollection.ItemsSource = products;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[PartnerDetailViewPage] Ошибка загрузки продуктов: {ex.Message}");
            // В случае ошибки показываем тестовые данные
            ProductsCollection.ItemsSource = GetFallbackProducts(partnerId);
        }
    }

    private List<ProductDto> GetFallbackProducts(string partnerId)
    {
        if (!int.TryParse(partnerId, out var id))
        {
            id = 1;
        }

        return new List<ProductDto>
        {
            new ProductDto
            {
                Id = 1,
                PartnerId = id,
                Name = "Курица по-тайски 300 г",
                Ingredients = "Куриное крыло, мука пшеничная высший сорт, крахмал: кукурузный-картофельный, соль, масло подсолнечное, разрыхлитель, ароматизаторы натуральные.",
                ImageUrl = null,
                Weight = "300 г",
                Price = 200m,
                OriginalPrice = 258m,
                DiscountPercent = 30m,
                YessCoins = 58m,
                IsAvailable = true,
                Category = "Готовые блюда"
            },
            new ProductDto
            {
                Id = 2,
                PartnerId = id,
                Name = "Курица в кисло-сладком соусе 420 г",
                Ingredients = "Курица в кисло-сладком соусе: куриная грудка, томатная паста, лаписа, уксусная эссенция, кукурузный крахмал, специи, сахар.",
                ImageUrl = null,
                Weight = "420 г",
                Price = 150m,
                OriginalPrice = 210m,
                DiscountPercent = 30m,
                YessCoins = 60m,
                IsAvailable = true,
                Category = "Готовые блюда"
            },
            new ProductDto
            {
                Id = 3,
                PartnerId = id,
                Name = "Курица с овощами",
                Ingredients = "Куриная грудка, морковь, лук, перец болгарский, помидоры, специи, соль.",
                ImageUrl = null,
                Weight = "350 г",
                Price = 180m,
                OriginalPrice = 250m,
                DiscountPercent = 28m,
                YessCoins = 55m,
                IsAvailable = true,
                Category = "Готовые блюда"
            },
            new ProductDto
            {
                Id = 4,
                PartnerId = id,
                Name = "Фрикасе с рисом",
                Ingredients = "Курица, рис, лук, морковь, сливки, специи, зелень.",
                ImageUrl = null,
                Weight = "400 г",
                Price = 220m,
                OriginalPrice = 280m,
                DiscountPercent = 21m,
                YessCoins = 65m,
                IsAvailable = true,
                Category = "Готовые блюда"
            }
        };
    }

    private async void OnBackClicked(object sender, EventArgs e)
    {
        try
        {
            await Shell.Current.GoToAsync("..", animate: true);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[PartnerDetailViewPage] Ошибка навигации назад: {ex.Message}");
            await Shell.Current.GoToAsync("///main/home", animate: true);
        }
    }

    private async void OnAddToCartClicked(object sender, EventArgs e)
    {
        if (sender is Button button && button.CommandParameter is ProductDto product)
        {
            try
            {
                // TODO: Реализовать добавление в корзину
                await DisplayAlert("Добавлено", $"Продукт {product.Name} добавлен в корзину", "OK");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[PartnerDetailViewPage] Ошибка добавления в корзину: {ex.Message}");
                await DisplayAlert("Ошибка", "Не удалось добавить продукт в корзину", "OK");
            }
        }
    }
}