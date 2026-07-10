import AppIntents
import WidgetKit
import SwiftData

struct ToggleFamIntent: AppIntent, SetValueIntent {
    static var title: LocalizedStringResource = "Toggle Fam / Partner check-in"
    static var description = IntentDescription("Add or remove today's Fam / Partner quick check-in event.")

    @Parameter(title: "Done")
    var value: Bool

    init() {}

    init(value: Bool) {
        self.value = value
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        let ctx = PersistenceController.shared.mainContext
        _ = DayCompletionService.setFam(on: .now, hasEvent: value, context: ctx)
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

struct ToggleFriendIntent: AppIntent, SetValueIntent {
    static var title: LocalizedStringResource = "Toggle Friend check-in"
    static var description = IntentDescription("Add or remove today's Friend quick check-in event.")

    @Parameter(title: "Done")
    var value: Bool

    init() {}

    init(value: Bool) {
        self.value = value
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        let ctx = PersistenceController.shared.mainContext
        _ = DayCompletionService.setFriend(on: .now, hasEvent: value, context: ctx)
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

// MARK: - Value providers for control widgets

struct FamValueProvider: ControlValueProvider {
    var previewValue: Bool { false }

    @MainActor
    func currentValue() async throws -> Bool {
        let ctx = PersistenceController.shared.mainContext
        let today = Calendar.current.startOfDay(for: .now)
        return DayCompletionService.hasFam(on: today, context: ctx)
    }
}

struct FriendValueProvider: ControlValueProvider {
    var previewValue: Bool { false }

    @MainActor
    func currentValue() async throws -> Bool {
        let ctx = PersistenceController.shared.mainContext
        let today = Calendar.current.startOfDay(for: .now)
        return DayCompletionService.hasFriend(on: today, context: ctx)
    }
}
