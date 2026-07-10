import SwiftUI
import Charts

struct HomeBarChart: View {
    struct Point: Identifiable {
        let id = UUID()
        let day: Date
        let label: String
        let count: Int
    }

    let points: [Point]

    /// Total possible sub-habits per day: physique (3) + endurance (3) + social (2) = 8.
    static let maxPerDay = 8

    var body: some View {
        Chart {
            ForEach(points) { p in
                BarMark(
                    x: .value("Day", p.label),
                    y: .value("Completed", p.count)
                )
                .foregroundStyle(
                    p.count == HomeBarChart.maxPerDay
                        ? Color.accentColor
                        : Color.accentColor.opacity(0.6)
                )
                .cornerRadius(4)
            }
            RuleMark(y: .value("Max", HomeBarChart.maxPerDay))
                .lineStyle(StrokeStyle(lineWidth: 0.5, dash: [3]))
                .foregroundStyle(.secondary.opacity(0.4))
        }
        .chartYScale(domain: 0...HomeBarChart.maxPerDay)
        .chartYAxis {
            AxisMarks(values: [0, 2, 4, 6, 8]) { _ in
                AxisGridLine()
                AxisValueLabel()
            }
        }
        .frame(height: 140)
    }
}
