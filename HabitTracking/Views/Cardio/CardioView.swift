import SwiftUI
import SwiftData

struct EnduranceView: View {
    @Environment(\.modelContext) private var context

    @Query(sort: \CardioWorkout.date, order: .reverse) private var workouts: [CardioWorkout]
    @Query(sort: \StretchingEntry.date, order: .reverse) private var stretching: [StretchingEntry]
    @Query(sort: \PadEntry.date, order: .reverse) private var pads: [PadEntry]

    @State private var showNew = false
    @State private var showCharts = false

    var body: some View {
        let today = Calendar.current.startOfDay(for: .now)
        let stretchedToday = stretching.first(where: { $0.date == today })?.done ?? false
        let padToday = pads.first(where: { $0.date == today })?.done ?? false

        List {
            Section {
                togglesCard(
                    today: today,
                    stretched: stretchedToday,
                    pad: padToday
                )
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
            }

            Section {
                if workouts.isEmpty {
                    HStack {
                        Spacer()
                        VStack(spacing: 6) {
                            Image(systemName: "figure.run")
                                .font(.system(size: 28))
                                .foregroundStyle(.secondary)
                            Text("No cardio yet")
                                .foregroundStyle(.secondary)
                            Text("Tap + to log a session.")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 20)
                        Spacer()
                    }
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
                } else {
                    ForEach(workouts.prefix(40)) { workout in
                        NavigationLink {
                            CardioEditView(workout: workout)
                        } label: {
                            cardioCard(workout)
                        }
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                        .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) {
                                context.delete(workout)
                                try? context.save()
                                WidgetReloader.reloadAll()
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                    }
                }
            } header: {
                HStack {
                    Text("Cardio")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("\(workouts.count) total")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .textCase(nil)
                .padding(.horizontal, 4)
            }
        }
        .listStyle(.plain)
        .navigationTitle("Endurance")
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
                        showNew = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                            .foregroundStyle(PhysiqueTheme.accent)
                    }
                    .accessibilityLabel("New Cardio")
                }
            }
        }
        .sheet(isPresented: $showNew) {
            NavigationStack { CardioEditView(workout: nil) }
        }
        .sheet(isPresented: $showCharts) {
            NavigationStack { CardioChartsView() }
        }
    }

    private func togglesCard(today: Date, stretched: Bool, pad: Bool) -> some View {
        VStack(spacing: 0) {
            toggleRow(
                label: "Stretched today",
                symbol: "figure.flexibility",
                isOn: stretched
            ) { newValue in
                DayCompletionService.setStretching(on: today, done: newValue, context: context)
                WidgetReloader.reloadAll()
            }
            Divider().padding(.leading, 16)
            toggleRow(
                label: "Pad today",
                symbol: "bandage.fill",
                isOn: pad
            ) { newValue in
                DayCompletionService.setPad(on: today, done: newValue, context: context)
                WidgetReloader.reloadAll()
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(PhysiqueTheme.card)
        )
    }

    private func toggleRow(
        label: String,
        symbol: String,
        isOn: Bool,
        setTo: @escaping (Bool) -> Void
    ) -> some View {
        HStack {
            Image(systemName: symbol)
                .foregroundStyle(isOn ? PhysiqueTheme.accent : .secondary)
            Text(label)
                .font(.subheadline.weight(.semibold))
            Spacer()
            Toggle("", isOn: Binding(get: { isOn }, set: setTo))
                .labelsHidden()
                .tint(PhysiqueTheme.accent)
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 16)
    }

    private func cardioCard(_ workout: CardioWorkout) -> some View {
        HStack(alignment: .top, spacing: 12) {
            DateTile(date: workout.date)
            VStack(alignment: .leading, spacing: 4) {
                Text(workout.name.isEmpty ? "Cardio" : workout.name)
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                Text(workout.type.displayName)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                HStack(spacing: 12) {
                    if let d = workout.distanceMiles {
                        Text("\(d, specifier: "%.2f") mi")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    if let m = workout.durationMinutes {
                        Text("\(Int(m)) min")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
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
}
