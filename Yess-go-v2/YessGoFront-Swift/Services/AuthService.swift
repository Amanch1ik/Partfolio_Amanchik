import Foundation
import Combine

class AuthService: ObservableObject {
    static let shared = AuthService()
    
    @Published var isAuthenticated = false
    
    private let appClient = AppClient.shared
    private let accountStore = AccountStore.shared
    
    private init() {
        isAuthenticated = accountStore.tryAutoSignIn()
    }
    
    func signIn(email: String, password: String, remember: Bool) -> AnyPublisher<Bool, Error> {
        // Здесь должна быть реальная логика аутентификации
        // Пока что симулируем успешный вход
        return Future<Bool, Error> { promise in
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                self.accountStore.signIn(
                    email: email,
                    firstName: "Пользователь",
                    lastName: "Тест",
                    remember: remember
                )
                self.isAuthenticated = true
                promise(.success(true))
            }
        }
        .eraseToAnyPublisher()
    }
    
    func signOut() {
        accountStore.signOut()
        isAuthenticated = false
    }
    
    func register(email: String, password: String, firstName: String?, lastName: String?) -> AnyPublisher<Bool, Error> {
        // Здесь должна быть реальная логика регистрации
        return Future<Bool, Error> { promise in
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                self.accountStore.signIn(
                    email: email,
                    firstName: firstName,
                    lastName: lastName,
                    remember: true
                )
                self.isAuthenticated = true
                promise(.success(true))
            }
        }
        .eraseToAnyPublisher()
    }
}
