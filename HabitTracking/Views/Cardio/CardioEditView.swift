import SwiftUI
import SwiftData

struct CardioEditView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    var workout: CardioWorkout?

    @State private var type: CardioType = .run
    @State private var name: String = ""
    @State private var date: Date = .now
    @State private var distanceString: String = ""
    @State private var durationString: String = ""
    @State private var showDeleteDialog = false

    var body: some View {
        Form {
            Section("Type") {
                Picker("Type", selection: $type) {
                    ForEach(CardioType.allCases, id: \.self) { t in
                        Text(t.displayName).tag(t)
                    }
                }
                .pickerStyle(.segmented)
            }
            Section("Details") {
                TextField("Name (e.g. Mt. Tam loop, Pickleball, Rest)", text: $name)
                DatePicker("Date", selection: $date, displayedComponents: .date)
                HStack {
                    TextField("Distance (miles)", text: $distanceString)
                        .keyboardType(.decimalPad)
                    Text("mi").foregroundStyle(.secondary)
                }
                HStack {
                    TextField("Duration (minutes)", text: $durationString)
                        .keyboardType(.decimalPad)
                    Text("min").foregroundStyle(.secondary)
                }
            }
            Section {
                Button(workout == nil ? "Save" : "Update") { save() }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                if workout != nil {
                    Button(role: .destructive) {
                        showDeleteDialog = true
                    } label: {
                        Label("Delete Cardio", systemImage: "trash")
                    }
                }
            }
        }
        .confirmationDialog(
            "Delete this cardio workout?",
            isPresented: $showDeleteDialog,
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                if let w = workout {
                    context.delete(w)
                    try? context.save()
                    WidgetReloader.reloadAll()
                    dismiss()
                }
            }
            Button("Cancel", role: .cancel) {}
        }
        .navigationTitle(workout == nil ? "New Cardio" : "Edit Cardio")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
        }
        .onAppear {
            if let w = workout {
                type = w.type
                name = w.name
                date = w.date
                distanceString = w.distanceMiles.map { String(format: "%.2f", $0) } ?? ""
                durationString = w.durationMinutes.map { String(format: "%.0f", $0) } ?? ""
            }
        }
    }

    private func save() {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let d = Double(distanceString)
        let m = Double(durationString)

        if let w = workout {
            w.type = type
            w.name = trimmed
            w.date = Calendar.current.startOfDay(for: date)
            w.distanceMiles = d
            w.durationMinutes = m
        } else {
            let new = CardioWorkout(type: type, name: trimmed, date: date, distanceMiles: d, durationMinutes: m)
            context.insert(new)
        }
        try? context.save()
        WidgetReloader.reloadAll()
        dismiss()
    }
}
