import Foundation

enum AppGroup {
    static let identifier = "group.com.ishaan.HabitTracking"

    static var containerURL: URL {
        guard let url = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: identifier) else {
            return FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        }
        return url
    }

    static var storeURL: URL {
        containerURL.appendingPathComponent("HabitTracking.sqlite")
    }
}
