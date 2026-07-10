import Foundation
import SwiftData

enum SetType: String, Codable, CaseIterable {
    case normal
    case warmup
    case dropset

    var displayName: String {
        switch self {
        case .normal: return "Normal"
        case .warmup: return "Warm up"
        case .dropset: return "Drop set"
        }
    }

    /// One-character badge shown in the leading set-index circle (e.g. "W", "D").
    /// `normal` returns nil so the row falls back to the set number.
    var badge: String? {
        switch self {
        case .normal: return nil
        case .warmup: return "W"
        case .dropset: return "D"
        }
    }
}

@Model
final class WorkoutSet {
    var id: UUID = UUID()
    var order: Int = 0
    var weight: Double?
    var reps: Int?
    var durationSeconds: Int?
    var exercise: WorkoutExercise?

    var setTypeRaw: String = SetType.normal.rawValue
    var note: String?

    init(
        order: Int,
        weight: Double? = nil,
        reps: Int? = nil,
        durationSeconds: Int? = nil,
        setType: SetType = .normal,
        note: String? = nil
    ) {
        self.id = UUID()
        self.order = order
        self.weight = weight
        self.reps = reps
        self.durationSeconds = durationSeconds
        self.setTypeRaw = setType.rawValue
        self.note = note
    }

    var setType: SetType {
        get { SetType(rawValue: setTypeRaw) ?? .normal }
        set { setTypeRaw = newValue.rawValue }
    }
}
