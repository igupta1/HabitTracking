import AppIntents
import WidgetKit
import SwiftUI

struct FriendControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(
            kind: "com.ishaan.HabitTracking.FriendControl",
            provider: FriendValueProvider()
        ) { value in
            ControlWidgetToggle(
                "Friend",
                isOn: value,
                action: ToggleFriendIntent(value: !value)
            ) { isOn in
                Label(
                    isOn ? "Friend ✓" : "Friend",
                    systemImage: isOn ? "checkmark.circle.fill" : "person.2"
                )
            }
        }
        .displayName("Friend Check-in")
        .description("Toggle today's Friend habit")
    }
}
