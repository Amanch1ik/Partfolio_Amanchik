import Foundation
import Combine

class BalanceStore: ObservableObject {
    static let shared = BalanceStore()
    
    @Published var balance: Decimal = 55.7
    
    private init() {}
    
    func updateBalance(_ newBalance: Decimal) {
        balance = newBalance
    }
}
