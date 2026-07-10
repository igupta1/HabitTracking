import SwiftUI
import SwiftData

enum PhysiqueTheme {
    /// Repcount-inspired teal accent used across the Strength section.
    static let accent = Color(red: 0.35, green: 0.85, blue: 0.85)
    /// Card background that sits well over both light and dark system backgrounds.
    static let card = Color(.secondarySystemBackground)
}

struct PhysiqueView: View {
    @Environment(\.modelContext) private var context

    @Query(sort: \StrengthWorkout.date, order: .reverse) private var workouts: [StrengthWorkout]
    @Query(sort: \CreatineEntry.date, order: .reverse) private var creatineEntries: [CreatineEntry]

    @State private var showBodyWeight = false
    @State private var showCharts = false
    @State private var activeWorkout: StrengthWorkout?

    var body: some View {
        let today = Calendar.current.startOfDay(for: .now)
        let creatineToday = creatineEntries.first(where: { $0.date == today })?.done ?? false

        List {
            Section {
                creatineRow(today: today, done: creatineToday)
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
                    .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
            }

            Section {
                if workouts.isEmpty {
                    HStack {
                        Spacer()
                        VStack(spacing: 6) {
                            Image(systemName: "dumbbell")
                                .font(.system(size: 28))
                                .foregroundStyle(.secondary)
                            Text("No workouts yet")
                                .foregroundStyle(.secondary)
                            Text("Tap + to start your first workout.")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 20)
                        Spacer()
                    }
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
                } else {
                    ForEach(workouts) { workout in
                        Button {
                            activeWorkout = workout
                        } label: {
                            WorkoutLogCard(workout: workout)
                        }
                        .buttonStyle(.plain)
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                        .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) {
                                delete(workout: workout)
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                    }
                }
            } header: {
                logHeader
            }
        }
        .listStyle(.plain)
        .navigationTitle("Log")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: 14) {
                    Button {
                        showCharts = true
                    } label: {
                        Image(systemName: "chart.xyaxis.line")
                            .font(.title3)
                            .foregroundStyle(.primary)
                    }
                    .accessibilityLabel("Charts")

                    Button {
                        showBodyWeight = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                            .foregroundStyle(.blue)
                    }
                    .accessibilityLabel("Log Body Weight")

                    Button {
                        createAndOpenWorkout()
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                            .foregroundStyle(PhysiqueTheme.accent)
                    }
                    .accessibilityLabel("New Workout")
                }
            }
        }
        .sheet(isPresented: $showBodyWeight) {
            NavigationStack {
                BodyWeightView()
            }
        }
        .sheet(isPresented: $showCharts) {
            NavigationStack {
                PhysiqueChartsView()
            }
        }
        .navigationDestination(item: $activeWorkout) { workout in
            StrengthWorkoutEditView(workout: workout)
        }
    }

    private var logHeader: some View {
        HStack(alignment: .lastTextBaseline) {
            Text(currentMonthYearLabel)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Spacer()
            Text("\(workouts.count) Workout\(workouts.count == 1 ? "" : "s")")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .textCase(nil)
        .padding(.horizontal, 4)
    }

    private var currentMonthYearLabel: String {
        let df = DateFormatter()
        df.dateFormat = "LLLL yyyy"
        let mostRecent = workouts.first?.date ?? Date()
        return df.string(from: mostRecent)
    }

    private func creatineRow(today: Date, done: Bool) -> some View {
        HStack {
            Image(systemName: "pills.fill")
                .foregroundStyle(done ? PhysiqueTheme.accent : .secondary)
            Text("Creatine today")
                .font(.subheadline.weight(.semibold))
            Spacer()
            Toggle("", isOn: Binding(
                get: { done },
                set: { newValue in
                    DayCompletionService.setCreatine(on: today, done: newValue, context: context)
                    WidgetReloader.reloadAll()
                }
            ))
            .labelsHidden()
            .tint(PhysiqueTheme.accent)
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 16)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(PhysiqueTheme.card)
        )
    }

    private func delete(workout: StrengthWorkout) {
        context.delete(workout)
        try? context.save()
        WidgetReloader.reloadAll()
    }

    private func createAndOpenWorkout() {
        let workout = StrengthWorkout(name: "", date: Date())
        context.insert(workout)
        try? context.save()
        activeWorkout = workout
    }
}

/// Repcount-style row: a tile with date on the left, name + top exercises in the middle.
struct WorkoutLogCard: View {
    let workout: StrengthWorkout

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            DateTile(date: workout.date)

            VStack(alignment: .leading, spacing: 4) {
                Text(displayName)
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(.primary)
                    .lineLimit(1)

                ForEach(previewLines, id: \.self) { line in
                    Text(line)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                if previewLines.isEmpty {
                    Text("No exercises")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(PhysiqueTheme.card)
        )
    }

    private var displayName: String {
        let trimmed = workout.name.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? "Workout" : trimmed
    }

    private var previewLines: [String] {
        workout.sortedExercises.prefix(4).map { exercise in
            let setCount = exercise.sortedSets.count
            return "\(setCount)x \(exercise.exerciseName)"
        }
    }
}

/// Day-of-week + day-of-month tile shown at the left of a workout log row.
struct DateTile: View {
    let date: Date

    var body: some View {
        VStack(spacing: 2) {
            Text(weekdayLabel)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
            Text(dayLabel)
                .font(.title2.weight(.semibold))
                .foregroundStyle(.primary)
        }
        .frame(width: 56, height: 56)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color(.tertiarySystemBackground))
        )
    }

    private var weekdayLabel: String {
        let df = DateFormatter()
        df.dateFormat = "EEE"
        return df.string(from: date)
    }

    private var dayLabel: String {
        let df = DateFormatter()
        df.dateFormat = "d"
        return df.string(from: date)
    }
}
