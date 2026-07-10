import SwiftUI

struct SectionTile: View {
    let section: HabitSection
    let statusLine: String
    let isComplete: Bool
    /// (completed, total) for the segmented ring. Nil = no segmented progress.
    let progress: (completed: Int, total: Int)?
    let action: () -> Void

    init(
        section: HabitSection,
        statusLine: String,
        isComplete: Bool,
        progress: (completed: Int, total: Int)? = nil,
        action: @escaping () -> Void
    ) {
        self.section = section
        self.statusLine = statusLine
        self.isComplete = isComplete
        self.progress = progress
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: section.symbolName)
                        .font(.title2)
                        .foregroundStyle(isComplete ? Color.accentColor : .secondary)
                    Spacer()
                    progressIndicator
                        .frame(width: 32, height: 32)
                }
                Text(section.displayName)
                    .font(.headline)
                Text(statusLine)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(14)
            .frame(maxWidth: .infinity, minHeight: 120, alignment: .topLeading)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(Color(.secondarySystemBackground))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(isComplete ? Color.accentColor.opacity(0.4) : .clear, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var progressIndicator: some View {
        if let progress {
            SegmentedRing(completed: progress.completed, total: progress.total)
        } else {
            Image(systemName: isComplete ? "checkmark.circle.fill" : "circle")
                .font(.title3)
                .foregroundStyle(isComplete ? Color.accentColor : Color.secondary.opacity(0.5))
        }
    }
}

/// Ring that fills based on `completed / total`. Shows checkmark at full.
private struct SegmentedRing: View {
    let completed: Int
    let total: Int

    private let lineWidth: CGFloat = 4

    var body: some View {
        let fraction = total > 0 ? Double(completed) / Double(total) : 0
        ZStack {
            Circle()
                .stroke(Color.secondary.opacity(0.25), lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: fraction)
                .stroke(
                    fraction >= 1 ? Color.accentColor : Color.accentColor.opacity(0.85),
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
            if fraction >= 1 {
                Image(systemName: "checkmark")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Color.accentColor)
            } else {
                Text("\(completed)/\(total)")
                    .font(.system(size: 9, weight: .semibold, design: .rounded))
                    .foregroundStyle(.secondary)
            }
        }
    }
}
