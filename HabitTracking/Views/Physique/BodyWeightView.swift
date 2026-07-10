import SwiftUI
import SwiftData

struct BodyWeightView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    @State private var date: Date = .now
    @State private var weightString: String = ""
    @State private var editingEntry: BodyWeightEntry?
    @State private var entryToDelete: BodyWeightEntry?

    @Query(sort: \BodyWeightEntry.date, order: .reverse) private var entries: [BodyWeightEntry]

    var body: some View {
        Form {
            Section(editingEntry == nil ? "Log" : "Editing entry") {
                DatePicker("Date", selection: $date, displayedComponents: .date)
                HStack {
                    TextField("Weight (lbs)", text: $weightString)
                        .keyboardType(.decimalPad)
                    Text("lbs").foregroundStyle(.secondary)
                }
                Button(editingEntry == nil ? "Save" : "Update") { save() }
                    .disabled(Double(weightString) == nil)
                if let editing = editingEntry {
                    Button("Cancel edit") {
                        resetForm()
                    }
                    Button(role: .destructive) {
                        entryToDelete = editing
                    } label: {
                        Label("Delete entry", systemImage: "trash")
                    }
                }
            }

            Section("History") {
                if entries.isEmpty {
                    Text("No entries yet").foregroundStyle(.secondary)
                } else {
                    ForEach(entries) { entry in
                        HStack(spacing: 12) {
                            Button {
                                startEditing(entry)
                            } label: {
                                HStack {
                                    Text(entry.date, format: .dateTime.month().day().year())
                                        .foregroundStyle(.primary)
                                    Spacer()
                                    Text("\(entry.weightLbs, specifier: "%.1f") lbs")
                                        .foregroundStyle(.secondary)
                                }
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)

                            Button {
                                entryToDelete = entry
                            } label: {
                                Image(systemName: "trash")
                                    .foregroundStyle(.red)
                                    .font(.caption)
                            }
                            .buttonStyle(.borderless)
                            .accessibilityLabel("Delete entry")
                        }
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) {
                                entryToDelete = entry
                            } label: { Label("Delete", systemImage: "trash") }
                        }
                    }
                }
            }
        }
        .navigationTitle("Body Weight")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Done") { dismiss() }
            }
        }
        .confirmationDialog(
            entryToDelete.map { "Delete entry from \($0.date.formatted(.dateTime.month().day().year()))?" }
                ?? "Delete entry?",
            isPresented: Binding(
                get: { entryToDelete != nil },
                set: { if !$0 { entryToDelete = nil } }
            ),
            titleVisibility: .visible,
            presenting: entryToDelete
        ) { entry in
            Button("Delete", role: .destructive) {
                if editingEntry?.persistentModelID == entry.persistentModelID {
                    resetForm()
                }
                context.delete(entry)
                try? context.save()
                WidgetReloader.reloadAll()
                entryToDelete = nil
            }
            Button("Cancel", role: .cancel) {
                entryToDelete = nil
            }
        }
        .onAppear {
            let start = Calendar.current.startOfDay(for: .now)
            if let todays = entries.first(where: { $0.date == start }) {
                weightString = String(format: "%.1f", todays.weightLbs)
            }
        }
    }

    private func startEditing(_ entry: BodyWeightEntry) {
        editingEntry = entry
        date = entry.date
        weightString = String(format: "%.1f", entry.weightLbs)
    }

    private func resetForm() {
        editingEntry = nil
        date = .now
        weightString = ""
    }

    private func save() {
        guard let value = Double(weightString) else { return }
        let start = Calendar.current.startOfDay(for: date)
        if let existing = entries.first(where: { $0.date == start }) {
            existing.weightLbs = value
        } else {
            context.insert(BodyWeightEntry(date: start, weightLbs: value))
        }
        try? context.save()
        WidgetReloader.reloadAll()
        resetForm()
    }
}
