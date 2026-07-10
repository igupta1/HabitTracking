import SwiftUI
import SwiftData

struct FriendEventEditView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    var entry: FriendEntry?

    @State private var date: Date = .now
    @State private var desc: String = ""

    var body: some View {
        Form {
            Section("Event") {
                DatePicker("Date", selection: $date, displayedComponents: .date)
                TextField("What did you do?", text: $desc, axis: .vertical)
                    .lineLimit(3...8)
            }
            if entry != nil {
                Section {
                    Button(role: .destructive) {
                        if let e = entry {
                            context.delete(e)
                            try? context.save()
                            WidgetReloader.reloadAll()
                            dismiss()
                        }
                    } label: {
                        Text("Delete event")
                    }
                }
            }
        }
        .navigationTitle(entry == nil ? "New Friend Event" : "Edit Friend Event")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") { save() }
                    .disabled(desc.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .onAppear {
            if let e = entry {
                date = e.date
                desc = e.desc
            }
        }
    }

    private func save() {
        let trimmed = desc.trimmingCharacters(in: .whitespacesAndNewlines)
        if let e = entry {
            e.date = Calendar.current.startOfDay(for: date)
            e.desc = trimmed
        } else {
            context.insert(FriendEntry(date: date, desc: trimmed))
        }
        try? context.save()
        WidgetReloader.reloadAll()
        dismiss()
    }
}
