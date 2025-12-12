import Foundation
import Combine

class AccountStore: ObservableObject {
    static let shared = AccountStore()
    
    @Published var email: String?
    @Published var firstName: String?
    @Published var lastName: String?
    @Published var phone: String?
    @Published var rememberMe: Bool = false
    @Published var isSignedIn: Bool = false
    
    private let userDefaults = UserDefaults.standard
    
    private init() {
        load()
    }
    
    var displayName: String {
        if let firstName = firstName, let lastName = lastName {
            return "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces)
        }
        return email ?? "Гость"
    }
    
    private func load() {
        email = userDefaults.string(forKey: "acc_email")
        firstName = userDefaults.string(forKey: "acc_firstname")
        lastName = userDefaults.string(forKey: "acc_lastname")
        phone = userDefaults.string(forKey: "acc_phone")
        rememberMe = userDefaults.bool(forKey: "acc_remember")
        isSignedIn = userDefaults.bool(forKey: "acc_signed_in")
        
        if !rememberMe {
            isSignedIn = false
        }
    }
    
    private func save() {
        if let email = email {
            userDefaults.set(email, forKey: "acc_email")
        } else {
            userDefaults.removeObject(forKey: "acc_email")
        }
        
        if let firstName = firstName {
            userDefaults.set(firstName, forKey: "acc_firstname")
        } else {
            userDefaults.removeObject(forKey: "acc_firstname")
        }
        
        if let lastName = lastName {
            userDefaults.set(lastName, forKey: "acc_lastname")
        } else {
            userDefaults.removeObject(forKey: "acc_lastname")
        }
        
        if let phone = phone {
            userDefaults.set(phone, forKey: "acc_phone")
        } else {
            userDefaults.removeObject(forKey: "acc_phone")
        }
        
        userDefaults.set(rememberMe, forKey: "acc_remember")
        userDefaults.set(isSignedIn, forKey: "acc_signed_in")
    }
    
    func signIn(email: String, firstName: String?, lastName: String?, remember: Bool, phone: String? = nil) {
        self.email = email.trimmingCharacters(in: .whitespaces)
        self.firstName = firstName?.trimmingCharacters(in: .whitespaces)
        self.lastName = lastName?.trimmingCharacters(in: .whitespaces)
        self.phone = phone?.trimmingCharacters(in: .whitespaces)
        self.rememberMe = remember
        self.isSignedIn = true
        save()
    }
    
    func updateProfile(firstName: String?, lastName: String?, phone: String? = nil) {
        self.firstName = firstName?.trimmingCharacters(in: .whitespaces)
        self.lastName = lastName?.trimmingCharacters(in: .whitespaces)
        self.phone = phone?.trimmingCharacters(in: .whitespaces)
        save()
    }
    
    func updateRemember(_ remember: Bool) {
        self.rememberMe = remember
        save()
    }
    
    func signOut(keepProfile: Bool = false) {
        isSignedIn = false
        
        if !keepProfile {
            email = nil
            firstName = nil
            lastName = nil
            phone = nil
            rememberMe = false
        }
        
        save()
    }
    
    func tryAutoSignIn() -> Bool {
        load()
        return isSignedIn
    }
    
    func resetAll() {
        userDefaults.removeObject(forKey: "acc_email")
        userDefaults.removeObject(forKey: "acc_firstname")
        userDefaults.removeObject(forKey: "acc_lastname")
        userDefaults.removeObject(forKey: "acc_phone")
        userDefaults.removeObject(forKey: "acc_remember")
        userDefaults.removeObject(forKey: "acc_signed_in")
        
        email = nil
        firstName = nil
        lastName = nil
        phone = nil
        rememberMe = false
        isSignedIn = false
    }
}
