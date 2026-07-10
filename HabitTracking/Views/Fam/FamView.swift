import SwiftUI
import SwiftData

struct SocialView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \FamEntry.date, order: .reverse) private var famEntries: [FamEntry]
    @Query(sort: \FriendEntry.date, order: .reverse) private var friendEntries: [FriendEntry]

    @State private var addingFam = false
    @State private var addingFriend = false
    @State private var editingFamEntry: FamEntry?
    @State private var editingFriendEntry: FriendEntry?
    @State private var tab: Tab = .fam

    enum Tab: String, CaseIterable, Identifiable {
        case fam = "Fam / Partner"
        case friend = "Friend"
        var id: String { rawValue }
    }

    var body: some View {
        let today = Calendar.current.startOfDay(for: .now)
        let famToday = famEntries.contains { $0.date == today }
        let friendToday = friendEntries.contains { $0.date == today }

        List {
            Section {
                togglesCard(today: today, famDone: famToday, friendDone: friendToday)
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
                    .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
            }

            Section {
                Picker("", selection: $tab) {
                    ForEach(Tab.allCases) { t in
                        Text(t.rawValue).tag(t)
                    }
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 8, trailing: 16))
            }

            switch tab {
            case .fam:
                famSection
            case .friend:
                friendSection
            }
        }
        .listStyle(.plain)
        .navigationTitle("Social")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    switch tab {
                    case .fam: addingFam = true
                    case .friend: addingFriend = true
                    }
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundStyle(PhysiqueTheme.accent)
                }
                .accessibilityLabel("Log new event")
            }
        }
        .sheet(isPresented: $addingFam) {
            NavigationStack { FamEventEditView(entry: nil) }
        }
        .sheet(item: $editingFamEntry) { entry in
            NavigationStack { FamEventEditView(entry: entry) }
        }
        .sheet(isPresented: $addingFriend) {
            NavigationStack { FriendEventEditView(entry: nil) }
        }
        .sheet(item: $editingFriendEntry) { entry in
            NavigationStack { FriendEventEditView(entry: entry) }
        }
    }

    @ViewBuilder
    private var famSection: some View {
        if famEntries.isEmpty {
            emptyRow(text: "No Fam events yet", symbol: "house.fill")
        } else {
            ForEach(famEntries) { entry in
                Button {
                    editingFamEntry = entry
                } label: {
                    eventCard(date: entry.date, desc: entry.desc)
                }
                .buttonStyle(.plain)
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                .swipeActions(edge: .trailing) {
                    Button(role: .destructive) {
                        context.delete(entry)
                        try? context.save()
                        WidgetReloader.reloadAll()
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var friendSection: some View {
        if friendEntries.isEmpty {
            emptyRow(text: "No Friend events yet", symbol: "person.2.fill")
        } else {
            ForEach(friendEntries) { entry in
                Button {
                    editingFriendEntry = entry
                } label: {
                    eventCard(date: entry.date, desc: entry.desc)
                }
                .buttonStyle(.plain)
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                .swipeActions(edge: .trailing) {
                    Button(role: .destructive) {
                        context.delete(entry)
                        try? context.save()
                        WidgetReloader.reloadAll()
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                }
            }
        }
    }

    private func togglesCard(today: Date, famDone: Bool, friendDone: Bool) -> some View {
        VStack(spacing: 0) {
            toggleRow(
                label: "Fam / Partner today",
                symbol: "house.fill",
                isOn: famDone
            ) { newValue in
                _ = DayCompletionService.setFam(on: today, hasEvent: newValue, context: context)
                WidgetReloader.reloadAll()
            }
            Divider().padding(.leading, 16)
            toggleRow(
                label: "Friend today",
                symbol: "person.2.fill",
                isOn: friendDone
            ) { newValue in
                _ = DayCompletionService.setFriend(on: today, hasEvent: newValue, context: context)
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

    private func eventCard(date: Date, desc: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            DateTile(date: date)
            VStack(alignment: .leading, spacing: 4) {
                Text(desc.isEmpty ? "(no description)" : desc)
                    .font(.subheadline)
                    .foregroundStyle(.primary)
                    .lineLimit(3)
                    .multilineTextAlignment(.leading)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(PhysiqueTheme.card)
        )
    }

    private func emptyRow(text: String, symbol: String) -> some View {
        HStack {
            Spacer()
            VStack(spacing: 6) {
                Image(systemName: symbol)
                    .font(.system(size: 28))
                    .foregroundStyle(.secondary)
                Text(text)
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, 20)
            Spacer()
        }
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
    }
}

struct FamEventEditView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    var entry: FamEntry?

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
        .navigationTitle(entry == nil ? "New Fam Event" : "Edit Fam Event")
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
            context.insert(FamEntry(date: date, desc: trimmed))
        }
        try? context.save()
        WidgetReloader.reloadAll()
        dismiss()
    }
}
