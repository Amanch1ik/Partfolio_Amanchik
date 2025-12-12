import SwiftUI

struct MainPageView: View {
    @StateObject private var viewModel = MainPageViewModel()
    @StateObject private var accountStore = AccountStore.shared
    
    var body: some View {
        ZStack {
            Color(hex: "F4F6F8")
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Основной контент
                ScrollView {
                    VStack(spacing: 0) {
                        // Шапка
                        headerView
                        
                        // Основной контент
                        VStack(spacing: 16) {
                            quickAccessSection
                            bannersSection
                            partnersSection
                        }
                        .padding(.horizontal, 16)
                        .padding(.bottom, 20)
                    }
                }
                
                // Нижний навбар
                BottomNavBar()
            }
            
            // Story Overlay
            if viewModel.isStoryOpen {
                storyOverlay
            }
            
            // Banner Overlay
            if viewModel.isBannerOpen {
                bannerOverlay
            }
        }
    }
    
    // MARK: - Header View
    private var headerView: some View {
        VStack(spacing: 16) {
            // Профиль
            HStack(spacing: 12) {
                // Аватар
                Image("profile")
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 56, height: 56)
                    .clipShape(Circle())
                    .overlay(
                        Circle()
                            .stroke(Color.white.opacity(0.2), lineWidth: 1)
                    )
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(accountStore.displayName)
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.white)
                    
                    Text(accountStore.email ?? "")
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.8))
                }
                
                Spacer()
            }
            
            // Кошелек
            walletCard
        }
        .padding(.horizontal, 16)
        .padding(.top, 48)
        .padding(.bottom, 14)
        .background(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color(hex: "0F6B53"))
        )
    }
    
    // MARK: - Wallet Card
    private var walletCard: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Ваш Баланс")
                    .font(.system(size: 13))
                    .foregroundColor(Color(hex: "DAA520"))
                
                Spacer()
                
                Button("История") {
                    // Навигация к истории
                }
                .font(.system(size: 13))
                .foregroundColor(Color(hex: "7A7A7A"))
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(Color.white)
                .cornerRadius(10)
            }
            
            HStack {
                HStack(spacing: 8) {
                    Text(viewModel.balance)
                        .font(.system(size: 30, weight: .bold))
                        .foregroundColor(Color(hex: "0F6B53"))
                    
                    Text("Yess!Coin")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(Color(hex: "0F6B53"))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color(hex: "EEF2F7"))
                        .cornerRadius(10)
                }
                
                Spacer()
                
                Image("coin")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 40, height: 40)
            }
            .padding(.top, 8)
        }
        .padding(14)
        .frame(width: 360, height: 130)
        .background(Color.white)
        .cornerRadius(18)
        .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Quick Access Section
    private var quickAccessSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Быстрый доступ")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(Color(hex: "333"))
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 4) {
                    ForEach(viewModel.stories) { story in
                        StoryItemView(story: story) {
                            viewModel.openStory(story)
                        }
                    }
                }
                .padding(.horizontal, 24)
            }
            .frame(height: 100)
        }
    }
    
    // MARK: - Banners Section
    private var bannersSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(viewModel.banners) { banner in
                    BannerItemView(banner: banner) {
                        viewModel.openBanner(banner)
                    }
                }
            }
            .padding(.horizontal, 16)
        }
        .frame(height: 120)
    }
    
    // MARK: - Partners Section
    private var partnersSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Наши партнёры")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(Color(hex: "555"))
                .padding(.bottom, 2)
            
            VStack(spacing: 0) {
                // Ряд 1
                PartnersRowView(partners: viewModel.partnersRow1)
                
                // Ряд 2
                PartnersRowView(partners: viewModel.partnersRow2)
                
                // Ряд 3
                PartnersRowView(partners: viewModel.partnersRow3)
            }
        }
    }
    
    // MARK: - Story Overlay
    private var storyOverlay: some View {
        ZStack {
            Color.black.opacity(0.8)
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Прогресс бар
                HStack(spacing: 4) {
                    ForEach(0..<viewModel.pageProgressList.count, id: \.self) { index in
                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                Rectangle()
                                    .fill(Color.white.opacity(0.3))
                                    .frame(height: 4)
                                
                                Rectangle()
                                    .fill(Color.white)
                                    .frame(width: geometry.size.width * viewModel.pageProgressList[index], height: 4)
                            }
                        }
                        .frame(height: 4)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 44)
                
                // Контент сторис
                ZStack {
                    if let currentPageImage = viewModel.currentPageImage {
                        AsyncImage(url: URL(string: currentPageImage)) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Image(currentPageImage)
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .clipped()
                    }
                    
                    // Заголовок сторис
                    VStack {
                        HStack {
                            if let currentStory = viewModel.currentStory {
                                HStack(spacing: 10) {
                                    Image(currentStory.icon)
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                        .frame(width: 42, height: 42)
                                        .clipShape(Circle())
                                        .overlay(
                                            Circle()
                                                .stroke(Color.white, lineWidth: 1.5)
                                        )
                                    
                                    Text(currentStory.title)
                                        .font(.system(size: 16, weight: .bold))
                                        .foregroundColor(.white)
                                        .shadow(color: .black.opacity(0.7), radius: 4, x: 1, y: 1)
                                }
                            }
                            
                            Spacer()
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 44)
                        
                        Spacer()
                    }
                    
                    // Навигация
                    HStack {
                        Rectangle()
                            .fill(Color.clear)
                            .onTapGesture {
                                viewModel.prevPage()
                            }
                        
                        Rectangle()
                            .fill(Color.clear)
                            .onTapGesture {
                                viewModel.nextPage()
                            }
                    }
                }
            }
        }
        .onTapGesture {
            viewModel.closeStory()
        }
    }
    
    // MARK: - Banner Overlay
    private var bannerOverlay: some View {
        ZStack {
            Color.black.opacity(0.8)
                .ignoresSafeArea()
            
            if let currentBanner = viewModel.currentBanner {
                Image(currentBanner.image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .clipped()
            }
        }
        .onTapGesture {
            viewModel.closeBanner()
        }
    }
}

// MARK: - Story Item View
struct StoryItemView: View {
    let story: StoryModel
    let onTap: () -> Void
    
    var body: some View {
        VStack(spacing: 4) {
            Button(action: onTap) {
                Image(story.icon)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 64, height: 64)
                    .clipShape(Circle())
                    .overlay(
                        Circle()
                            .stroke(Color(hex: "DAA520"), lineWidth: 2)
                    )
            }
            
            Text(story.title)
                .font(.system(size: 12))
                .foregroundColor(Color(hex: "333"))
                .lineLimit(1)
                .frame(width: 80)
        }
    }
}

// MARK: - Banner Item View
struct BannerItemView: View {
    let banner: BannerModel
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            Image(banner.image)
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: 200, height: 120)
                .cornerRadius(16)
                .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
        }
    }
}

// MARK: - Partners Row View
struct PartnersRowView: View {
    let partners: [PartnerLogoModel]
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 20) {
                ForEach(partners) { partner in
                    Image(partner.logo)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: 84, height: 84)
                        .clipShape(Circle())
                        .overlay(
                            Circle()
                                .stroke(Color(hex: "0F6B53"), lineWidth: 1)
                        )
                }
            }
            .padding(.horizontal, 24)
        }
        .frame(height: 98)
    }
}

// MARK: - Color Extension
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

#Preview {
    MainPageView()
}
