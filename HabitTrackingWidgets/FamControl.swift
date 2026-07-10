import AppIntents
import WidgetKit
import SwiftUI

struct FamControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(
            kind: "com.ishaan.HabitTracking.FamControl",
            provider: FamValueProvider()
        ) { value in
            ControlWidgetToggle(
                "Fam / Partner",
                isOn: value,
                action: ToggleFamIntent(value: !value)
            ) { isOn in
                Label(
                    isOn ? "Fam / Partner ✓" : "Fam / Partner",
                    systemImage: isOn ? "checkmark.circle.fill" : "house"
                )
            }
        }
        .displayName("Fam / Partner Check-in")
        .description("Toggle today's Fam / Partner habit")
    }
}
