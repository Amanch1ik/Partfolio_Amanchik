import Foundation

struct BannerModel: Identifiable {
    let id = UUID()
    let image: String
    let partnerName: String
    
    init(image: String, partnerName: String) {
        self.image = image
        self.partnerName = partnerName
    }
}
