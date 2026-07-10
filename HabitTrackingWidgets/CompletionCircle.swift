import SwiftUI
import WidgetKit

/// Lock-screen circular widget visual using a Gauge with `.accessoryCircularCapacity`
/// so iOS renders a ring filled to `fraction` (or the completed checkmark at 1.0).
struct CompletionCircle: View {
    let fraction: Double      // 0..1
    let isComplete: Bool
    let symbol: String
    let label: String?        // optional small label inside ring (e.g. "2/3")

    init(fraction: Double, isComplete: Bool, symbol: String, label: String? = nil) {
        self.fraction = max(0, min(1, fraction))
        self.isComplete = isComplete
        self.symbol = symbol
        self.label = label
    }

    /// Convenience for the old boolean-only call site.
    init(isComplete: Bool, symbol: String) {
        self.init(
            fraction: isComplete ? 1 : 0,
            isComplete: isComplete,
            symbol: symbol,
            label: nil
        )
    }

    var body: some View {
        Gauge(value: fraction, in: 0...1) {
            EmptyView()
        } currentValueLabel: {
            if isComplete {
                Image(systemName: "checkmark")
                    .font(.system(size: 14, weight: .bold))
            } else if let label {
                Text(label)
                    .font(.system(size: 11, weight: .bold))
            } else {
                Image(systemName: symbol)
                    .font(.system(size: 14, weight: .bold))
            }
        }
        .gaugeStyle(.accessoryCircularCapacity)
    }
}
