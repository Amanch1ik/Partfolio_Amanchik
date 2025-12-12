import SwiftUI

struct BottomNavBar: View {
    @State private var selectedTab = 0
    
    var body: some View {
        HStack(spacing: 0) {
            // Главная
            TabButton(
                icon: "house.fill",
                title: "Главная",
                isSelected: selectedTab == 0
            ) {
                selectedTab = 0
            }
            
            Spacer()
            
            // Партнеры
            TabButton(
                icon: "building.2.fill",
                title: "Партнеры",
                isSelected: selectedTab == 1
            ) {
                selectedTab = 1
            }
            
            Spacer()
            
            // QR
            TabButton(
                icon: "qrcode",
                title: "QR",
                isSelected: selectedTab == 2
            ) {
                selectedTab = 2
            }
            
            Spacer()
            
            // Уведомления
            TabButton(
                icon: "bell.fill",
                title: "Уведомления",
                isSelected: selectedTab == 3
            ) {
                selectedTab = 3
            }
            
            Spacer()
            
            // Еще
            TabButton(
                icon: "ellipsis",
                title: "Еще",
                isSelected: selectedTab == 4
            ) {
                selectedTab = 4
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(Color.white)
        .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: -2)
    }
}

struct TabButton: View {
    let icon: String
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(isSelected ? Color(hex: "0F6B53") : Color.gray)
                
                Text(title)
                    .font(.system(size: 10))
                    .foregroundColor(isSelected ? Color(hex: "0F6B53") : Color.gray)
            }
        }
        .frame(maxWidth: .infinity)
    }
}

#Preview {
    BottomNavBar()
        .padding()
}
