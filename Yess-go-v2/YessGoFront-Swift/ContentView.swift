import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authService: AuthService
    
    var body: some View {
        Group {
            if authService.isAuthenticated {
                MainTabView()
            } else {
                LoginView()
            }
        }
    }
}

struct MainTabView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            MainPageView()
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("Главная")
                }
                .tag(0)
            
            PartnersPageView()
                .tabItem {
                    Image(systemName: "building.2.fill")
                    Text("Партнеры")
                }
                .tag(1)
            
            QRPageView()
                .tabItem {
                    Image(systemName: "qrcode")
                    Text("QR")
                }
                .tag(2)
            
            NotificationsPageView()
                .tabItem {
                    Image(systemName: "bell.fill")
                    Text("Уведомления")
                }
                .tag(3)
            
            MorePageView()
                .tabItem {
                    Image(systemName: "ellipsis")
                    Text("Еще")
                }
                .tag(4)
        }
        .accentColor(Color(hex: "0F6B53"))
    }
}

// MARK: - Placeholder Views
struct PartnersPageView: View {
    var body: some View {
        NavigationView {
            Text("Партнеры")
                .navigationTitle("Партнеры")
        }
    }
}

struct QRPageView: View {
    var body: some View {
        NavigationView {
            Text("QR Код")
                .navigationTitle("QR Код")
        }
    }
}

struct NotificationsPageView: View {
    var body: some View {
        NavigationView {
            Text("Уведомления")
                .navigationTitle("Уведомления")
        }
    }
}

struct MorePageView: View {
    var body: some View {
        NavigationView {
            Text("Еще")
                .navigationTitle("Еще")
        }
    }
}

struct LoginView: View {
    @StateObject private var authService = AuthService.shared
    @State private var email = ""
    @State private var password = ""
    @State private var rememberMe = false
    @State private var isLoading = false
    @State private var showAlert = false
    @State private var alertMessage = ""
    
    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                // Логотип
                Image("logo")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(height: 80)
                
                Text("YessGo")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(Color(hex: "0F6B53"))
                
                // Форма входа
                VStack(spacing: 16) {
                    TextField("Email", text: $email)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                    
                    SecureField("Пароль", text: $password)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    
                    HStack {
                        Toggle("Запомнить меня", isOn: $rememberMe)
                            .toggleStyle(SwitchToggleStyle(tint: Color(hex: "0F6B53")))
                        
                        Spacer()
                    }
                    
                    Button(action: signIn) {
                        if isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text("Войти")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(hex: "0F6B53"))
                    .foregroundColor(.white)
                    .cornerRadius(10)
                    .disabled(isLoading)
                    
                    Button("Регистрация") {
                        // Навигация к регистрации
                    }
                    .foregroundColor(Color(hex: "0F6B53"))
                }
                .padding(.horizontal, 32)
                
                Spacer()
            }
            .padding()
            .alert("Ошибка", isPresented: $showAlert) {
                Button("OK") { }
            } message: {
                Text(alertMessage)
            }
        }
    }
    
    private func signIn() {
        guard !email.isEmpty && !password.isEmpty else {
            alertMessage = "Заполните все поля"
            showAlert = true
            return
        }
        
        isLoading = true
        
        authService.signIn(email: email, password: password, remember: rememberMe)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { completion in
                    isLoading = false
                    if case .failure(let error) = completion {
                        alertMessage = error.localizedDescription
                        showAlert = true
                    }
                },
                receiveValue: { _ in
                    // Успешный вход
                }
            )
            .store(in: &cancellables)
    }
    
    @State private var cancellables = Set<AnyCancellable>()
}

#Preview {
    ContentView()
        .environmentObject(AuthService.shared)
}
