import Foundation
import SwiftData

@Model
final class ExerciseLibraryItem {
    var id: UUID = UUID()
    var name: String = ""
    var muscleGroupRaw: String = MuscleGroup.chest.rawValue
    var exerciseTypeRaw: String = ExerciseType.weighted.rawValue
    var isCustom: Bool = false

    init(name: String, muscleGroup: MuscleGroup, exerciseType: ExerciseType, isCustom: Bool = false) {
        self.id = UUID()
        self.name = name
        self.muscleGroupRaw = muscleGroup.rawValue
        self.exerciseTypeRaw = exerciseType.rawValue
        self.isCustom = isCustom
    }

    var muscleGroup: MuscleGroup {
        get { MuscleGroup(rawValue: muscleGroupRaw) ?? .chest }
        set { muscleGroupRaw = newValue.rawValue }
    }

    var exerciseType: ExerciseType {
        get { ExerciseType(rawValue: exerciseTypeRaw) ?? .weighted }
        set { exerciseTypeRaw = newValue.rawValue }
    }
}

@MainActor
enum ExerciseLibrarySeed {
    static func seedIfNeeded(context: ModelContext) {
        let fetch = FetchDescriptor<ExerciseLibraryItem>()
        let existing = (try? context.fetch(fetch)) ?? []
        if !existing.isEmpty { return }

        let seeds: [(String, MuscleGroup, ExerciseType)] = [
            ("Bench Press", .chest, .weighted),
            ("Incline Dumbbell Press", .chest, .weighted),
            ("Cable Fly", .chest, .weighted),
            ("Push-Up", .chest, .bodyweight),
            ("Dip", .chest, .bodyweight),

            ("Pull-Up", .back, .bodyweight),
            ("Chin-Up", .back, .bodyweight),
            ("Lat Pulldown", .back, .weighted),
            ("Barbell Row", .back, .weighted),
            ("Seated Cable Row", .back, .weighted),
            ("One-Arm Dumbbell Row", .back, .weighted),
            ("Deadlift", .back, .weighted),

            ("Overhead Press", .shoulders, .weighted),
            ("Dumbbell Shoulder Press", .shoulders, .weighted),
            ("Lateral Raise", .shoulders, .weighted),
            ("Rear Delt Fly", .shoulders, .weighted),
            ("Face Pull", .shoulders, .weighted),

            ("Barbell Curl", .biceps, .weighted),
            ("Dumbbell Curl", .biceps, .weighted),
            ("Hammer Curl", .biceps, .weighted),
            ("Incline Dumbbell Curl", .biceps, .weighted),
            ("Cable Curl", .biceps, .weighted),

            ("Tricep Pushdown", .triceps, .weighted),
            ("Overhead Tricep Extension", .triceps, .weighted),
            ("Close-Grip Bench Press", .triceps, .weighted),
            ("Skull Crusher", .triceps, .weighted),

            ("Back Squat", .quads, .weighted),
            ("Front Squat", .quads, .weighted),
            ("Leg Press", .quads, .weighted),
            ("Leg Extension", .quads, .weighted),
            ("Bulgarian Split Squat", .quads, .weighted),
            ("Walking Lunge", .quads, .weighted),

            ("Romanian Deadlift", .hamstrings, .weighted),
            ("Lying Leg Curl", .hamstrings, .weighted),
            ("Seated Leg Curl", .hamstrings, .weighted),
            ("Stiff-Leg Deadlift", .hamstrings, .weighted),

            ("Hip Thrust", .glutes, .weighted),
            ("Glute Bridge", .glutes, .weighted),
            ("Cable Kickback", .glutes, .weighted),
            ("Sumo Deadlift", .glutes, .weighted),

            ("Standing Calf Raise", .calves, .weighted),
            ("Seated Calf Raise", .calves, .weighted),
            ("Calf Press", .calves, .weighted),

            ("Plank", .core, .timeBased),
            ("Hanging Leg Raise", .core, .bodyweight),
            ("Cable Crunch", .core, .weighted),
            ("Russian Twist", .core, .bodyweight),
            ("Ab Wheel Rollout", .core, .bodyweight)
        ]

        for (name, group, type) in seeds {
            context.insert(ExerciseLibraryItem(name: name, muscleGroup: group, exerciseType: type, isCustom: false))
        }
        try? context.save()
    }
}
