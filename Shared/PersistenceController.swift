import Foundation
import SwiftData

@MainActor
enum PersistenceController {
    static let schema = Schema([
        StrengthWorkout.self,
        WorkoutExercise.self,
        WorkoutSet.self,
        ExerciseLibraryItem.self,
        BodyWeightEntry.self,
        CardioWorkout.self,
        StretchingEntry.self,
        CreatineEntry.self,
        PadEntry.self,
        FamEntry.self,
        FriendEntry.self
    ])

    static let shared: ModelContainer = {
        let config = ModelConfiguration(
            "HabitTracking",
            schema: schema,
            url: AppGroup.storeURL,
            cloudKitDatabase: .none
        )
        do {
            let container = try ModelContainer(for: schema, configurations: [config])
            ExerciseLibrarySeed.seedIfNeeded(context: container.mainContext)
            return container
        } catch {
            // Fallback to in-memory if disk fails (shouldn't happen in practice).
            let mem = ModelConfiguration(isStoredInMemoryOnly: true)
            return try! ModelContainer(for: schema, configurations: [mem])
        }
    }()
}
