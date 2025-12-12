import Foundation

struct CategoryModel: Identifiable {
    let id = UUID()
    let title: String
    let icon: String
    
    init(title: String, icon: String) {
        self.title = title
        self.icon = icon
    }
}
