import Foundation
import SwiftData

@Model
final class StrengthWorkout {
    var id: UUID = UUID()
    var name: String = ""
    var date: Date = Date()
    var isFinished: Bool = false
    var createdAt: Date = Date()

    var startTime: Date?
    var endTime: Date?
    var bodyweightLbs: Double?
    var notes: String?

    @Relationship(deleteRule: .cascade, inverse: \WorkoutExercise.workout)
    var exercises: [WorkoutExercise]? = []

    init(name: String, date: Date) {
        self.id = UUID()
        self.name = name
        self.date = Calendar.current.startOfDay(for: date)
        self.isFinished = false
        self.createdAt = Date()
        self.startTime = Date()
        self.exercises = []
    }

    var sortedExercises: [WorkoutExercise] {
        (exercises ?? []).sorted { $0.order < $1.order }
    }

    var isRest: Bool {
        name.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == "rest"
    }

    /// Duration in seconds between start and end (or now if not finished).
    var durationSeconds: TimeInterval? {
        guard let start = startTime else { return nil }
        let end = endTime ?? Date()
        let value = end.timeIntervalSince(start)
        return value > 0 ? value : nil
    }

    /// Duration formatted like "80 min" / "1 hr" — matches the Log row in repcount.
    var durationLabel: String? {
        guard let seconds = durationSeconds else { return nil }
        let minutes = Int(seconds / 60)
        if minutes < 1 { return "1 min" }
        return "\(minutes) min"
    }
}
