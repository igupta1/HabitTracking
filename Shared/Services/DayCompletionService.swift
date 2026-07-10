import Foundation
import SwiftData

enum HabitSection: String, CaseIterable, Identifiable {
    case physique, endurance, social

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .physique: return "Physique"
        case .endurance: return "Endurance"
        case .social: return "Social"
        }
    }

    var symbolName: String {
        switch self {
        case .physique: return "dumbbell.fill"
        case .endurance: return "figure.run"
        case .social: return "person.2.fill"
        }
    }
}

@MainActor
struct DayCompletion {
    // Physique (3 sub-habits)
    let strength: Bool
    let weight: Bool
    let creatine: Bool

    // Endurance (3 sub-habits)
    let cardio: Bool
    let stretch: Bool
    let pad: Bool

    // Social (2 sub-habits)
    let fam: Bool
    let friend: Bool

    /// Sum of all sub-habits completed — out of 8.
    var completedCount: Int {
        [strength, weight, creatine, cardio, stretch, pad, fam, friend]
            .reduce(0) { $0 + ($1 ? 1 : 0) }
    }

    func isComplete(_ section: HabitSection) -> Bool {
        let p = progress(section)
        return p.completed == p.total
    }

    /// (completed, total) for a section.
    func progress(_ section: HabitSection) -> (completed: Int, total: Int) {
        switch section {
        case .physique:
            return ([strength, weight, creatine].filter { $0 }.count, 3)
        case .endurance:
            return ([cardio, stretch, pad].filter { $0 }.count, 3)
        case .social:
            return ([fam, friend].filter { $0 }.count, 2)
        }
    }
}

@MainActor
enum DayCompletionService {
    static func completion(on day: Date, context: ModelContext) -> DayCompletion {
        let startOfDay = Calendar.current.startOfDay(for: day)

        let strength = hasFinishedStrengthWorkout(on: startOfDay, context: context)
        let weight = hasBodyWeight(on: startOfDay, context: context)
        let creatine = hasCreatine(on: startOfDay, context: context)

        let cardio = hasCardioWorkout(on: startOfDay, context: context)
        let stretch = hasStretching(on: startOfDay, context: context)
        let pad = hasPad(on: startOfDay, context: context)

        let fam = hasFam(on: startOfDay, context: context)
        let friend = hasFriend(on: startOfDay, context: context)

        return DayCompletion(
            strength: strength,
            weight: weight,
            creatine: creatine,
            cardio: cardio,
            stretch: stretch,
            pad: pad,
            fam: fam,
            friend: friend
        )
    }

    // MARK: - Individual checks

    static func hasFinishedStrengthWorkout(on day: Date, context: ModelContext) -> Bool {
        // A workout existing for the day counts as the day's strength activity.
        let start = Calendar.current.startOfDay(for: day)
        let predicate = #Predicate<StrengthWorkout> { $0.date == start }
        var fd = FetchDescriptor(predicate: predicate)
        fd.fetchLimit = 1
        return ((try? context.fetch(fd))?.first) != nil
    }

    static func hasBodyWeight(on day: Date, context: ModelContext) -> Bool {
        let start = Calendar.current.startOfDay(for: day)
        let predicate = #Predicate<BodyWeightEntry> { $0.date == start }
        var fd = FetchDescriptor(predicate: predicate)
        fd.fetchLimit = 1
        return ((try? context.fetch(fd))?.first) != nil
    }

    static func hasCardioWorkout(on day: Date, context: ModelContext) -> Bool {
        let start = Calendar.current.startOfDay(for: day)
        let predicate = #Predicate<CardioWorkout> { $0.date == start }
        var fd = FetchDescriptor(predicate: predicate)
        fd.fetchLimit = 1
        return ((try? context.fetch(fd))?.first) != nil
    }

    static func hasStretching(on day: Date, context: ModelContext) -> Bool {
        let start = Calendar.current.startOfDay(for: day)
        let predicate = #Predicate<StretchingEntry> { $0.date == start && $0.done }
        var fd = FetchDescriptor(predicate: predicate)
        fd.fetchLimit = 1
        return ((try? context.fetch(fd))?.first) != nil
    }

    static func hasCreatine(on day: Date, context: ModelContext) -> Bool {
        let start = Calendar.current.startOfDay(for: day)
        let predicate = #Predicate<CreatineEntry> { $0.date == start && $0.done }
        var fd = FetchDescriptor(predicate: predicate)
        fd.fetchLimit = 1
        return ((try? context.fetch(fd))?.first) != nil
    }

    static func hasPad(on day: Date, context: ModelContext) -> Bool {
        let start = Calendar.current.startOfDay(for: day)
        let predicate = #Predicate<PadEntry> { $0.date == start && $0.done }
        var fd = FetchDescriptor(predicate: predicate)
        fd.fetchLimit = 1
        return ((try? context.fetch(fd))?.first) != nil
    }

    static func hasFam(on day: Date, context: ModelContext) -> Bool {
        let start = Calendar.current.startOfDay(for: day)
        let predicate = #Predicate<FamEntry> { $0.date == start }
        var fd = FetchDescriptor(predicate: predicate)
        fd.fetchLimit = 1
        return ((try? context.fetch(fd))?.first) != nil
    }

    static func hasFriend(on day: Date, context: ModelContext) -> Bool {
        let start = Calendar.current.startOfDay(for: day)
        let predicate = #Predicate<FriendEntry> { $0.date == start }
        var fd = FetchDescriptor(predicate: predicate)
        fd.fetchLimit = 1
        return ((try? context.fetch(fd))?.first) != nil
    }

    // MARK: - Toggle helpers used by widgets/controls

    /// Marker description for events created by the lock-screen control widget.
    /// Tap-off only deletes events with this description so detailed events are preserved.
    static let quickCheckInMarker = "Quick check-in"

    static func setFam(on day: Date, hasEvent: Bool, context: ModelContext) -> Bool {
        let start = Calendar.current.startOfDay(for: day)
        let predicate = #Predicate<FamEntry> { $0.date == start }
        let fd = FetchDescriptor(predicate: predicate)
        let entries = (try? context.fetch(fd)) ?? []
        if hasEvent {
            if entries.isEmpty {
                context.insert(FamEntry(date: start, desc: quickCheckInMarker))
            }
        } else {
            // Only delete bare quick check-ins so detailed events are preserved.
            for entry in entries where entry.desc == quickCheckInMarker {
                context.delete(entry)
            }
        }
        try? context.save()
        return !entries.filter({ $0.desc != quickCheckInMarker }).isEmpty || hasEvent
    }

    static func setFriend(on day: Date, hasEvent: Bool, context: ModelContext) -> Bool {
        let start = Calendar.current.startOfDay(for: day)
        let predicate = #Predicate<FriendEntry> { $0.date == start }
        let fd = FetchDescriptor(predicate: predicate)
        let entries = (try? context.fetch(fd)) ?? []
        if hasEvent {
            if entries.isEmpty {
                context.insert(FriendEntry(date: start, desc: quickCheckInMarker))
            }
        } else {
            for entry in entries where entry.desc == quickCheckInMarker {
                context.delete(entry)
            }
        }
        try? context.save()
        return !entries.filter({ $0.desc != quickCheckInMarker }).isEmpty || hasEvent
    }

    static func setCreatine(on day: Date, done: Bool, context: ModelContext) {
        let start = Calendar.current.startOfDay(for: day)
        let predicate = #Predicate<CreatineEntry> { $0.date == start }
        let fd = FetchDescriptor(predicate: predicate)
        if let existing = (try? context.fetch(fd))?.first {
            existing.done = done
        } else {
            context.insert(CreatineEntry(date: start, done: done))
        }
        try? context.save()
    }

    static func setPad(on day: Date, done: Bool, context: ModelContext) {
        let start = Calendar.current.startOfDay(for: day)
        let predicate = #Predicate<PadEntry> { $0.date == start }
        let fd = FetchDescriptor(predicate: predicate)
        if let existing = (try? context.fetch(fd))?.first {
            existing.done = done
        } else {
            context.insert(PadEntry(date: start, done: done))
        }
        try? context.save()
    }

    static func setStretching(on day: Date, done: Bool, context: ModelContext) {
        let start = Calendar.current.startOfDay(for: day)
        let predicate = #Predicate<StretchingEntry> { $0.date == start }
        let fd = FetchDescriptor(predicate: predicate)
        if let existing = (try? context.fetch(fd))?.first {
            existing.done = done
        } else {
            context.insert(StretchingEntry(date: start, done: done))
        }
        try? context.save()
    }
}
