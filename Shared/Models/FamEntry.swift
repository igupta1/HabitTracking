import Foundation
import SwiftData

@Model
final class FamEntry {
    var id: UUID = UUID()
    var date: Date = Date()
    var desc: String = ""
    var createdAt: Date = Date()

    init(date: Date, desc: String) {
        self.id = UUID()
        self.date = Calendar.current.startOfDay(for: date)
        self.desc = desc
        self.createdAt = Date()
    }
}
