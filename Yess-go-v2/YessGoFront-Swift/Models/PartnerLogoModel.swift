import Foundation

struct PartnerLogoModel: Identifiable {
    let id = UUID()
    let logo: String
    
    init(logo: String) {
        self.logo = logo
    }
}
