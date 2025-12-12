import Foundation

struct PartnerDto: Codable, Identifiable {
    let id: String
    let name: String
    let subTitle: String?
    let category: String
    let logoUrl: String?
    let cashbackPercent: Double
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case subTitle
        case category
        case logoUrl
        case cashbackPercent
    }
}
