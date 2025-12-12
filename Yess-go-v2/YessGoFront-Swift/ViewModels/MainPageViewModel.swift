import Foundation
import Combine
import SwiftUI

class MainPageViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var stories: [StoryModel] = []
    @Published var banners: [BannerModel] = []
    @Published var topCategories: [CategoryModel] = []
    @Published var partnersRow1: [PartnerLogoModel] = []
    @Published var partnersRow2: [PartnerLogoModel] = []
    @Published var partnersRow3: [PartnerLogoModel] = []
    
    // Story overlay state
    @Published var isStoryOpen = false
    @Published var currentStory: StoryModel?
    @Published var currentStoryIndex = -1
    @Published var currentPageIndex = -1
    @Published var currentPageImage: String?
    @Published var pageProgress: Double = 0.0
    @Published var pageProgressList: [Double] = []
    
    // Banner overlay state
    @Published var isBannerOpen = false
    @Published var currentBanner: BannerModel?
    
    // Balance
    var balance: String {
        String(format: "%.2f", BalanceStore.shared.balance)
    }
    
    // MARK: - Private Properties
    private var cancellables = Set<AnyCancellable>()
    private var storyTimer: Timer?
    
    // MARK: - Services
    private let balanceStore = BalanceStore.shared
    private let accountStore = AccountStore.shared
    
    init() {
        setupBindings()
        loadData()
    }
    
    private func setupBindings() {
        // Подписка на изменения баланса
        balanceStore.$balance
            .sink { [weak self] _ in
                self?.objectWillChange.send()
            }
            .store(in: &cancellables)
    }
    
    private func loadData() {
        loadStories()
        loadBanners()
        loadTopCategories()
        loadPartners()
    }
    
    // MARK: - Data Loading
    private func loadStories() {
        stories = [
            StoryModel(
                title: "Бонусы",
                icon: "sc_bonus",
                pages: [
                    "https://picsum.photos/seed/bonus1/1200/2200",
                    "https://picsum.photos/seed/bonus2/1200/2200",
                    "https://picsum.photos/seed/bonus3/1200/2200"
                ]
            ),
            StoryModel(
                title: "Йесскоины",
                icon: "sc_coin",
                pages: [
                    "https://picsum.photos/seed/coin1/1200/2200",
                    "https://picsum.photos/seed/coin2/1200/2200"
                ]
            ),
            StoryModel(
                title: "Мы",
                icon: "sc_we",
                pages: ["we_stories"]
            ),
            StoryModel(
                title: "Акции",
                icon: "sc_sale",
                pages: [
                    "sales_stories1",
                    "sales_stories2",
                    "sales_stories3",
                    "sales_stories4"
                ]
            ),
            StoryModel(
                title: "Новости",
                icon: "sc_news",
                pages: [
                    "https://picsum.photos/seed/news1/1200/2200",
                    "https://picsum.photos/seed/news2/1200/2200"
                ]
            )
        ]
    }
    
    private func loadBanners() {
        banners = [
            BannerModel(image: "banner_1", partnerName: "Партнёр A"),
            BannerModel(image: "banner_2", partnerName: "Партнёр B"),
            BannerModel(image: "banner_3", partnerName: "Партнёр C")
        ]
    }
    
    private func loadTopCategories() {
        topCategories = [
            CategoryModel(title: "Одежда и обувь", icon: "cat_clothes"),
            CategoryModel(title: "Для дома", icon: "cat_home"),
            CategoryModel(title: "Электроника", icon: "cat_electronics"),
            CategoryModel(title: "Здоровье", icon: "cat_beauty"),
            CategoryModel(title: "Детям", icon: "cat_kids")
        ]
    }
    
    private func loadPartners() {
        let logos = [
            "promzona", "faiza", "navat", "flask", "chickenstar",
            "bublik", "sierra", "ants", "supara", "teplo", "savetheales"
        ]
        
        partnersRow1 = logos.map { PartnerLogoModel(logo: $0) }
        partnersRow2 = logos.reversed().map { PartnerLogoModel(logo: $0) }
        partnersRow3 = logos.map { PartnerLogoModel(logo: $0) }
        
        // Дублирование для бесшовной ленты
        partnersRow1.append(contentsOf: logos.map { PartnerLogoModel(logo: $0) })
        partnersRow2.append(contentsOf: logos.reversed().map { PartnerLogoModel(logo: $0) })
        partnersRow3.append(contentsOf: logos.map { PartnerLogoModel(logo: $0) })
    }
    
    // MARK: - Story Actions
    func openStory(_ story: StoryModel) {
        storyTimer?.invalidate()
        
        if let index = stories.firstIndex(where: { $0.id == story.id }) {
            currentStoryIndex = index
            playFromStoryIndex(index)
        }
    }
    
    private func playFromStoryIndex(_ storyIndex: Int) {
        guard storyIndex >= 0 && storyIndex < stories.count else { return }
        
        currentStoryIndex = storyIndex
        currentStory = stories[storyIndex]
        
        let pages = currentStory?.pages ?? []
        guard !pages.isEmpty else { return }
        
        prepareSegments(pages.count)
        isStoryOpen = true
        
        playCurrentPage()
    }
    
    private func playCurrentPage() {
        guard let currentStory = currentStory,
              currentPageIndex >= 0,
              currentPageIndex < currentStory.pages.count else {
            closeStory()
            return
        }
        
        currentPageImage = currentStory.pages[currentPageIndex]
        
        // Запуск таймера для прогресса
        startProgressTimer()
    }
    
    private func startProgressTimer() {
        storyTimer?.invalidate()
        
        let duration: TimeInterval = 5.5
        let startTime = Date()
        
        storyTimer = Timer.scheduledTimer(withTimeInterval: 0.016, repeats: true) { [weak self] timer in
            guard let self = self else {
                timer.invalidate()
                return
            }
            
            let elapsed = Date().timeIntervalSince(startTime)
            let progress = min(elapsed / duration, 1.0)
            
            DispatchQueue.main.async {
                self.pageProgress = progress
                if self.currentPageIndex >= 0 && self.currentPageIndex < self.pageProgressList.count {
                    self.pageProgressList[self.currentPageIndex] = progress
                }
            }
            
            if progress >= 1.0 {
                timer.invalidate()
                self.nextPage()
            }
        }
    }
    
    private func prepareSegments(_ pagesCount: Int) {
        pageProgressList = Array(repeating: 0.0, count: pagesCount)
        pageProgress = 0.0
        currentPageIndex = 0
    }
    
    func nextPage() {
        guard isStoryOpen, let currentStory = currentStory else { return }
        
        storyTimer?.invalidate()
        
        let pages = currentStory.pages
        if currentPageIndex + 1 < pages.count {
            currentPageIndex += 1
            playCurrentPage()
        } else {
            // Переход к следующей истории
            if currentStoryIndex + 1 < stories.count {
                playFromStoryIndex(currentStoryIndex + 1)
            } else {
                closeStory()
            }
        }
    }
    
    func prevPage() {
        guard isStoryOpen else { return }
        
        storyTimer?.invalidate()
        
        if let currentStory = currentStory, currentPageIndex - 1 >= 0 {
            currentPageIndex -= 1
            playCurrentPage()
        } else {
            // Переход к предыдущей истории
            if currentStoryIndex - 1 >= 0 {
                let prevStory = stories[currentStoryIndex - 1]
                let lastPage = max(0, prevStory.pages.count - 1)
                currentStoryIndex = currentStoryIndex - 1
                currentStory = prevStory
                currentPageIndex = lastPage
                playCurrentPage()
            } else {
                playFromStoryIndex(0)
            }
        }
    }
    
    func closeStory() {
        storyTimer?.invalidate()
        isStoryOpen = false
        currentStory = nil
        currentStoryIndex = -1
        currentPageIndex = -1
        currentPageImage = nil
        pageProgress = 0.0
        pageProgressList = []
    }
    
    // MARK: - Banner Actions
    func openBanner(_ banner: BannerModel) {
        storyTimer?.invalidate()
        
        currentBanner = banner
        isBannerOpen = true
        
        // Автоматическое закрытие через 25 секунд
        DispatchQueue.main.asyncAfter(deadline: .now() + 25) {
            if self.isBannerOpen {
                self.closeBanner()
            }
        }
    }
    
    func closeBanner() {
        isBannerOpen = false
        currentBanner = nil
    }
}
