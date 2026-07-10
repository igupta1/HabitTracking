import SwiftUI
import SwiftData
import Charts

struct PhysiqueChartsView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    @Query(sort: \StrengthWorkout.date) private var workouts: [StrengthWorkout]
    @Query(sort: \BodyWeightEntry.date) private var bodyWeights: [BodyWeightEntry]

    @State private var selectedExercise: String = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Top set by exercise")
                        .font(.headline)
                    Picker("Exercise", selection: $selectedExercise) {
                        Text("Select…").tag("")
                        ForEach(distinctExerciseNames, id: \.self) { name in
                            Text(name).tag(name)
                        }
                    }
                    .pickerStyle(.menu)

                    if !selectedExercise.isEmpty {
                        let points = topSetPoints(for: selectedExercise)
                        if points.isEmpty {
                            Text("No data yet")
                                .foregroundStyle(.secondary)
                        } else {
                            Chart(points) { p in
                                LineMark(
                                    x: .value("Date", p.date),
                                    y: .value("Weight", p.weight)
                                )
                                .interpolationMethod(.monotone)
                                PointMark(
                                    x: .value("Date", p.date),
                                    y: .value("Weight", p.weight)
                                )
                            }
                            .frame(height: 220)
                        }
                    }
                }
                .padding(14)
                .background(RoundedRectangle(cornerRadius: 14).fill(Color(.secondarySystemBackground)))

                VStack(alignment: .leading, spacing: 8) {
                    Text("Body weight over time")
                        .font(.headline)
                    if bodyWeights.isEmpty {
                        Text("No data yet")
                            .foregroundStyle(.secondary)
                    } else {
                        Chart(bodyWeights) { entry in
                            LineMark(
                                x: .value("Date", entry.date),
                                y: .value("Weight", entry.weightLbs)
                            )
                            .interpolationMethod(.monotone)
                            PointMark(
                                x: .value("Date", entry.date),
                                y: .value("Weight", entry.weightLbs)
                            )
                        }
                        .frame(height: 220)
                    }
                }
                .padding(14)
                .background(RoundedRectangle(cornerRadius: 14).fill(Color(.secondarySystemBackground)))
            }
            .padding(16)
        }
        .navigationTitle("Physique Charts")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Done") { dismiss() }
            }
        }
    }

    private var distinctExerciseNames: [String] {
        var seen = Set<String>()
        var ordered: [String] = []
        for workout in workouts {
            for ex in workout.exercises ?? [] {
                if seen.insert(ex.exerciseName).inserted {
                    ordered.append(ex.exerciseName)
                }
            }
        }
        return ordered.sorted()
    }

    struct TopSetPoint: Identifiable {
        let id = UUID()
        let date: Date
        let weight: Double
    }

    private func topSetPoints(for name: String) -> [TopSetPoint] {
        var points: [TopSetPoint] = []
        for workout in workouts {
            for ex in workout.exercises ?? [] where ex.exerciseName == name {
                let maxWeight = (ex.sets ?? []).compactMap(\.weight).max() ?? 0
                if maxWeight > 0 {
                    points.append(TopSetPoint(date: workout.date, weight: maxWeight))
                }
            }
        }
        return points.sorted { $0.date < $1.date }
    }
}
