import WidgetKit
import SwiftUI

struct SocialWidget: Widget {
    let kind = "SocialWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: HabitTimelineProvider()) { entry in
            SocialWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
                .widgetURL(URL(string: "habittracking://social"))
        }
        .configurationDisplayName("Social")
        .description("Fam / Partner + Friend progress")
        .supportedFamilies([.accessoryCircular])
    }
}

struct SocialWidgetView: View {
    let entry: HabitEntry

    var body: some View {
        let snap = entry.snapshot
        CompletionCircle(
            fraction: snap.socialFraction,
            isComplete: snap.socialComplete,
            symbol: "person.2.fill"
        )
    }
}
