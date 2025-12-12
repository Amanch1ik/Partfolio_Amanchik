import Foundation
import Combine

class AppClient: ObservableObject {
    static let shared = AppClient()
    
    private let session = URLSession.shared
    private let baseURL = "https://api.yessgo.com" // Замените на реальный URL
    
    private init() {}
    
    func get<T: Codable>(_ endpoint: String, responseType: T.Type) -> AnyPublisher<T, Error> {
        guard let url = URL(string: baseURL + endpoint) else {
            return Fail(error: URLError(.badURL))
                .eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        return session.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: T.self, decoder: JSONDecoder())
            .eraseToAnyPublisher()
    }
    
    func post<T: Codable, R: Codable>(_ endpoint: String, body: T, responseType: R.Type) -> AnyPublisher<R, Error> {
        guard let url = URL(string: baseURL + endpoint) else {
            return Fail(error: URLError(.badURL))
                .eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        do {
            request.httpBody = try JSONEncoder().encode(body)
        } catch {
            return Fail(error: error)
                .eraseToAnyPublisher()
        }
        
        return session.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: R.self, decoder: JSONDecoder())
            .eraseToAnyPublisher()
    }
}
