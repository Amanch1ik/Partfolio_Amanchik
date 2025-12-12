using System.Text.Json;
using System.Text.Json.Serialization;

namespace YessGoFront.Models;

/// <summary>
/// Конвертер для безопасного преобразования decimal в double при десериализации
/// </summary>
public class DecimalToDoubleConverter : JsonConverter<double>
{
    public override double Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Number)
        {
            // Если это число, читаем как decimal и конвертируем в double
            if (reader.TryGetDecimal(out decimal decimalValue))
            {
                return (double)decimalValue;
            }
            // Если не получилось как decimal, пробуем как double напрямую
            if (reader.TryGetDouble(out double doubleValue))
            {
                return doubleValue;
            }
        }
        else if (reader.TokenType == JsonTokenType.String)
        {
            // Если это строка, пробуем распарсить
            var stringValue = reader.GetString();
            if (decimal.TryParse(stringValue, out decimal decimalValue))
            {
                return (double)decimalValue;
            }
            if (double.TryParse(stringValue, out double doubleValue))
            {
                return doubleValue;
            }
        }
        
        throw new JsonException($"Unable to convert value to double. TokenType: {reader.TokenType}");
    }

    public override void Write(Utf8JsonWriter writer, double value, JsonSerializerOptions options)
    {
        writer.WriteNumberValue(value);
    }
}

public class PartnerDto
{
    [JsonPropertyName("id")] 
    public int Id { get; set; }
    
    [JsonPropertyName("name")] 
    public string? Name { get; set; }
    
    [JsonPropertyName("subTitle")] 
    public string? SubTitle { get; set; }
    
    [JsonPropertyName("category")] 
    public string? Category { get; set; }
    
    [JsonPropertyName("description")]
    public string? Description { get; set; }
    
    [JsonPropertyName("logoUrl")] 
    public string? LogoUrl { get; set; }
    
    [JsonPropertyName("coverImageUrl")] 
    public string? CoverImageUrl { get; set; }
    
    [JsonPropertyName("cashback_rate")]
    [JsonConverter(typeof(DecimalToDoubleConverter))]
    public double CashbackPercent { get; set; }
    
    [JsonPropertyName("categories")]
    public List<CategoryDto>? Categories { get; set; }
}
