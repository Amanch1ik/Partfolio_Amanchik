import Foundation

struct UserDto: Codable, Identifiable {
    let id: String
    let fullName: String?
    let phone: String?
    let city: String?
    let avatarUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case fullName
        case phone
        case city
        case avatarUrl
    }
}
