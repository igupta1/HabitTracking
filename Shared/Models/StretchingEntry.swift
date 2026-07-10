import Foundation
import SwiftData

@Model
final class StretchingEntry {
    @Attribute(.unique) var date: Date = Date()
    var done: Bool = false

    init(date: Date, done: Bool) {
        self.date = Calendar.current.startOfDay(for: date)
        self.done = done
    }
}
