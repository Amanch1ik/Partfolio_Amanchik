namespace YessGoFront.Models
{
    public class StoryModel
    {
        public string Title { get; set; } = "";
        public string Icon { get; set; } = "";              // иконка превью (круг)
        public List<string> Pages { get; set; } = new();    // картинки внутри сторис (по порядку)
    }
}
