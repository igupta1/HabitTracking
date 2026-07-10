import SwiftUI

struct SevenDayStrip: View {
    let completion: [Bool]   // length 7, oldest to newest
    let labels: [String]     // length 7, e.g. ["M","T",...]

    init(completion: [Bool], labels: [String]? = nil) {
        self.completion = completion
        if let labels = labels {
            self.labels = labels
        } else {
            let cal = Calendar.current
            let today = cal.startOfDay(for: .now)
            let fmt = DateFormatter()
            fmt.dateFormat = "EEEEE"
            self.labels = (0..<7).reversed().map { offset in
                let d = cal.date(byAdding: .day, value: -offset, to: today) ?? today
                return fmt.string(from: d)
            }
        }
    }

    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<7, id: \.self) { i in
                VStack(spacing: 4) {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(completion[i] ? Color.accentColor : Color.secondary.opacity(0.18))
                        .frame(height: 32)
                    Text(labels[i])
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
}
