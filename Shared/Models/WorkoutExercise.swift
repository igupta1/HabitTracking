import Foundation
import SwiftData

enum ExerciseType: String, Codable, CaseIterable {
    case weighted
    case bodyweight
    case timeBased

    var displayName: String {
        switch self {
        case .weighted: return "Weighted"
        case .bodyweight: return "Bodyweight"
        case .timeBased: return "Time-based"
        }
    }
}

enum MuscleGroup: String, Codable, CaseIterable {
    case chest, back, shoulders, biceps, triceps, quads, hamstrings, glutes, calves, core

    var displayName: String {
        rawValue.prefix(1).uppercased() + rawValue.dropFirst()
    }

    static let ordered: [MuscleGroup] = [
        .chest, .back, .shoulders, .biceps, .triceps,
        .quads, .hamstrings, .glutes, .calves, .core
    ]

    var category: WorkoutCategory {
        switch self {
        case .chest: return .chest
        case .back: return .back
        case .shoulders: return .shoulders
        case .biceps: return .biceps
        case .triceps: return .triceps
        case .quads, .hamstrings, .glutes, .calves: return .legs
        case .core: return .core
        }
    }
}

/// High-level grouping shown in the exercise picker (mirrors repcount's category list).
enum WorkoutCategory: String, CaseIterable, Identifiable, Hashable {
    case back, biceps, chest, core, legs, shoulders, triceps

    var id: String { rawValue }

    var displayName: String {
        rawValue.prefix(1).uppercased() + rawValue.dropFirst()
    }

    /// Alphabetical order, mirroring the repcount picker.
    static let ordered: [WorkoutCategory] = [
        .back, .biceps, .chest, .core, .legs, .shoulders, .triceps
    ]

    /// When the user adds a custom exercise inside a category, this is the
    /// underlying `MuscleGroup` we tag it with.
    var defaultMuscleGroup: MuscleGroup {
        switch self {
        case .back: return .back
        case .biceps: return .biceps
        case .chest: return .chest
        case .core: return .core
        case .legs: return .quads
        case .shoulders: return .shoulders
        case .triceps: return .triceps
        }
    }
}

@Model
final class WorkoutExercise {
    var id: UUID = UUID()
    var exerciseName: String = ""
    var muscleGroupRaw: String = MuscleGroup.chest.rawValue
    var exerciseTypeRaw: String = ExerciseType.weighted.rawValue
    var order: Int = 0
    var note: String?
    var workout: StrengthWorkout?

    @Relationship(deleteRule: .cascade, inverse: \WorkoutSet.exercise)
    var sets: [WorkoutSet]? = []

    init(exerciseName: String, muscleGroup: MuscleGroup, exerciseType: ExerciseType, order: Int) {
        self.id = UUID()
        self.exerciseName = exerciseName
        self.muscleGroupRaw = muscleGroup.rawValue
        self.exerciseTypeRaw = exerciseType.rawValue
        self.order = order
        self.sets = []
    }

    var muscleGroup: MuscleGroup {
        get { MuscleGroup(rawValue: muscleGroupRaw) ?? .chest }
        set { muscleGroupRaw = newValue.rawValue }
    }

    var exerciseType: ExerciseType {
        get { ExerciseType(rawValue: exerciseTypeRaw) ?? .weighted }
        set { exerciseTypeRaw = newValue.rawValue }
    }

    var sortedSets: [WorkoutSet] {
        (sets ?? []).sorted { $0.order < $1.order }
    }
}
