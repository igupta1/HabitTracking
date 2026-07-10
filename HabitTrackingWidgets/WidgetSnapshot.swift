import Foundation
import SwiftData

/// Lightweight, value-type snapshot the widgets render from. Built on the main actor
/// from the shared SwiftData store. Keeping the timeline entries value-typed avoids
/// dragging managed objects across actor/timeline boundaries.
struct HabitSnapshot {
    // Counts out of N — drives fractional ring fill in widgets.
    var physiqueCompleted: Int     // 0..3
    var enduranceCompleted: Int    // 0..3
    var socialCompleted: Int       // 0..2

    static let physiqueTotal = 3
    static let enduranceTotal = 3
    static let socialTotal = 2

    var physiqueFraction: Double { Double(physiqueCompleted) / Double(Self.physiqueTotal) }
    var enduranceFraction: Double { Double(enduranceCompleted) / Double(Self.enduranceTotal) }
    var socialFraction: Double { Double(socialCompleted) / Double(Self.socialTotal) }

    var physiqueComplete: Bool { physiqueCompleted == Self.physiqueTotal }
    var enduranceComplete: Bool { enduranceCompleted == Self.enduranceTotal }
    var socialComplete: Bool { socialCompleted == Self.socialTotal }

    static let placeholder = HabitSnapshot(
        physiqueCompleted: 0,
        enduranceCompleted: 0,
        socialCompleted: 0
    )

    @MainActor
    static func current() -> HabitSnapshot {
        let container = PersistenceController.shared
        let ctx = container.mainContext
        let today = Calendar.current.startOfDay(for: .now)
        let comp = DayCompletionService.completion(on: today, context: ctx)
        return HabitSnapshot(
            physiqueCompleted: comp.progress(.physique).completed,
            enduranceCompleted: comp.progress(.endurance).completed,
            socialCompleted: comp.progress(.social).completed
        )
    }
}

struct HabitEntry: TimelineEntry {
    let date: Date
    let snapshot: HabitSnapshot
}

import WidgetKit

struct HabitTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> HabitEntry {
        HabitEntry(date: .now, snapshot: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping @Sendable (HabitEntry) -> Void) {
        Task { @MainActor in
            let snap = HabitSnapshot.current()
            completion(HabitEntry(date: .now, snapshot: snap))
        }
    }

    func getTimeline(in context: Context, completion: @escaping @Sendable (Timeline<HabitEntry>) -> Void) {
        Task { @MainActor in
            let snap = HabitSnapshot.current()
            let now = Date()
            let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: now) ?? now
            completion(Timeline(entries: [HabitEntry(date: now, snapshot: snap)], policy: .after(nextRefresh)))
        }
    }
}
