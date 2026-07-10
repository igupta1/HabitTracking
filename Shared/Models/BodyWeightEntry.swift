import Foundation
import SwiftData

@Model
final class BodyWeightEntry {
    @Attribute(.unique) var date: Date = Date()
    var weightLbs: Double = 0

    init(date: Date, weightLbs: Double) {
        self.date = Calendar.current.startOfDay(for: date)
        self.weightLbs = weightLbs
    }
}
