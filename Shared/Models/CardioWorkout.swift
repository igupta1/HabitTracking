import Foundation
import SwiftData

enum CardioType: String, Codable, CaseIterable {
    case run = "Run"
    case bike = "Bike"
    case sport = "Sport"
    case rest = "Rest"

    var displayName: String { rawValue }
}

@Model
final class CardioWorkout {
    var id: UUID = UUID()
    var typeRaw: String = CardioType.run.rawValue
    var name: String = ""
    var date: Date = Date()
    var distanceMiles: Double?
    var durationMinutes: Double?
    var createdAt: Date = Date()

    init(type: CardioType, name: String, date: Date, distanceMiles: Double? = nil, durationMinutes: Double? = nil) {
        self.id = UUID()
        self.typeRaw = type.rawValue
        self.name = name
        self.date = Calendar.current.startOfDay(for: date)
        self.distanceMiles = distanceMiles
        self.durationMinutes = durationMinutes
        self.createdAt = Date()
    }

    var type: CardioType {
        get { CardioType(rawValue: typeRaw) ?? .run }
        set { typeRaw = newValue.rawValue }
    }

    var isRest: Bool {
        name.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == "rest" || type == .rest
    }

    /// Average pace in minutes per mile, or nil if not computable.
    var paceMinPerMile: Double? {
        guard let d = distanceMiles, d > 0, let m = durationMinutes else { return nil }
        return m / d
    }
}
