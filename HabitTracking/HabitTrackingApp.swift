import SwiftUI
import SwiftData

@main
struct HabitTrackingApp: App {
    @State private var router = AppRouter()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(router)
                .onOpenURL { url in
                    router.handle(url: url)
                }
        }
        .modelContainer(PersistenceController.shared)
    }
}

@Observable
final class AppRouter {
    var selectedSection: HabitSection?

    func handle(url: URL) {
        guard url.scheme == "habittracking" else { return }
        let host = url.host ?? ""
        switch host {
        case "physique": selectedSection = .physique
        case "endurance", "cardio", "creatinepad": selectedSection = .endurance
        case "social", "fam", "friend": selectedSection = .social
        default: break
        }
    }
}

extension HabitSection {
    var deepLinkURL: URL {
        let host: String
        switch self {
        case .physique: host = "physique"
        case .endurance: host = "endurance"
        case .social: host = "social"
        }
        return URL(string: "habittracking://\(host)")!
    }
}
