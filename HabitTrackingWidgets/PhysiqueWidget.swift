import WidgetKit
import SwiftUI

struct PhysiqueWidget: Widget {
    let kind = "PhysiqueWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: HabitTimelineProvider()) { entry in
            PhysiqueWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
                .widgetURL(URL(string: "habittracking://physique"))
        }
        .configurationDisplayName("Physique")
        .description("Strength + body weight + creatine progress")
        .supportedFamilies([.accessoryCircular])
    }
}

struct PhysiqueWidgetView: View {
    let entry: HabitEntry

    var body: some View {
        let snap = entry.snapshot
        CompletionCircle(
            fraction: snap.physiqueFraction,
            isComplete: snap.physiqueComplete,
            symbol: "dumbbell.fill"
        )
    }
}
