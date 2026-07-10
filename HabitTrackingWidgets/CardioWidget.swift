import WidgetKit
import SwiftUI

struct EnduranceWidget: Widget {
    let kind = "EnduranceWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: HabitTimelineProvider()) { entry in
            EnduranceWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
                .widgetURL(URL(string: "habittracking://endurance"))
        }
        .configurationDisplayName("Endurance")
        .description("Cardio + stretching + pad progress")
        .supportedFamilies([.accessoryCircular])
    }
}

struct EnduranceWidgetView: View {
    let entry: HabitEntry

    var body: some View {
        let snap = entry.snapshot
        CompletionCircle(
            fraction: snap.enduranceFraction,
            isComplete: snap.enduranceComplete,
            symbol: "figure.run"
        )
    }
}
