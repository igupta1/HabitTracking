import SwiftUI
import SwiftData
import Charts

struct CardioChartsView: View {
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \CardioWorkout.date) private var workouts: [CardioWorkout]

    @State private var selectedName: String = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("By workout")
                        .font(.headline)
                    Picker("Workout", selection: $selectedName) {
                        Text("Select…").tag("")
                        ForEach(distinctNames, id: \.self) { name in
                            Text(name).tag(name)
                        }
                    }
                    .pickerStyle(.menu)

                    if !selectedName.isEmpty {
                        let entries = workouts.filter { $0.name == selectedName }
                        if entries.isEmpty {
                            Text("No data").foregroundStyle(.secondary)
                        } else {
                            VStack(alignment: .leading) {
                                Text("Distance (mi)").font(.caption).foregroundStyle(.secondary)
                                Chart(entries) { w in
                                    if let d = w.distanceMiles {
                                        LineMark(
                                            x: .value("Date", w.date),
                                            y: .value("Distance", d)
                                        )
                                        PointMark(
                                            x: .value("Date", w.date),
                                            y: .value("Distance", d)
                                        )
                                    }
                                }
                                .frame(height: 180)

                                Text("Pace (min/mi)").font(.caption).foregroundStyle(.secondary)
                                Chart(entries) { w in
                                    if let pace = w.paceMinPerMile {
                                        LineMark(
                                            x: .value("Date", w.date),
                                            y: .value("Pace", pace)
                                        )
                                        PointMark(
                                            x: .value("Date", w.date),
                                            y: .value("Pace", pace)
                                        )
                                    }
                                }
                                .frame(height: 180)
                            }
                        }
                    }
                }
                .padding(14)
                .background(RoundedRectangle(cornerRadius: 14).fill(Color(.secondarySystemBackground)))
            }
            .padding(16)
        }
        .navigationTitle("Cardio Charts")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Done") { dismiss() }
            }
        }
    }

    private var distinctNames: [String] {
        var seen = Set<String>()
        var ordered: [String] = []
        for w in workouts {
            if seen.insert(w.name).inserted { ordered.append(w.name) }
        }
        return ordered.sorted()
    }
}
