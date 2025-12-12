import Foundation

struct StoryModel: Identifiable {
    let id = UUID()
    let title: String
    let icon: String
    let pages: [String]
    
    init(title: String, icon: String, pages: [String]) {
        self.title = title
        self.icon = icon
        self.pages = pages
    }
}
