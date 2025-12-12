namespace YessGoFront.Models;

public class Category
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = string.Empty;
    public string Image { get; set; } = string.Empty;
    public bool IsSelected
    {
        get; set;
    }
}
