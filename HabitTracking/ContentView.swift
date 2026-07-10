import SwiftUI

struct ContentView: View {
    @Environment(AppRouter.self) private var router

    var body: some View {
        @Bindable var router = router
        NavigationStack {
            HomeView()
                .navigationDestination(item: $router.selectedSection) { section in
                    sectionView(for: section)
                }
        }
    }

    @ViewBuilder
    private func sectionView(for section: HabitSection) -> some View {
        switch section {
        case .physique: PhysiqueView()
        case .endurance: EnduranceView()
        case .social: SocialView()
        }
    }
}
