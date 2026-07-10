import SwiftUI
import SwiftData

struct ExerciseLibraryView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \ExerciseLibraryItem.name) private var items: [ExerciseLibraryItem]

    @State private var searchText: String = ""
    @State private var selectedCategory: WorkoutCategory?
    @State private var showAddCustom = false

    var onSelect: (ExerciseLibraryItem) -> Void

    var body: some View {
        Group {
            if !searchText.trimmingCharacters(in: .whitespaces).isEmpty {
                searchResultsList
            } else if let category = selectedCategory {
                categoryDetailList(category)
            } else {
                categoriesList
            }
        }
        .searchable(text: $searchText, placement: .navigationBarDrawer(displayMode: .always), prompt: searchPrompt)
        .navigationTitle(currentTitle)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                if selectedCategory != nil {
                    Button {
                        selectedCategory = nil
                    } label: {
                        Image(systemName: "chevron.left")
                    }
                } else {
                    Button("Cancel") { dismiss() }
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showAddCustom = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showAddCustom) {
            NavigationStack {
                AddCustomExerciseView(initialCategory: selectedCategory) { item in
                    context.insert(item)
                    try? context.save()
                }
            }
        }
    }

    // MARK: - Lists

    private var categoriesList: some View {
        List {
            ForEach(WorkoutCategory.ordered) { category in
                Button {
                    selectedCategory = category
                } label: {
                    HStack {
                        Text(category.displayName)
                            .foregroundStyle(.primary)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
    }

    private func categoryDetailList(_ category: WorkoutCategory) -> some View {
        let groupItems = items.filter { $0.muscleGroup.category == category }
        return List {
            ForEach(groupItems) { item in
                exerciseRow(item)
            }
        }
        .listStyle(.insetGrouped)
        .overlay {
            if groupItems.isEmpty {
                Text("No exercises yet.\nTap + to add a custom one.")
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
                    .padding()
            }
        }
    }

    private var searchResultsList: some View {
        let s = searchText.trimmingCharacters(in: .whitespaces).lowercased()
        let results = items.filter { $0.name.lowercased().contains(s) }
        return List {
            ForEach(WorkoutCategory.ordered) { category in
                let groupItems = results.filter { $0.muscleGroup.category == category }
                if !groupItems.isEmpty {
                    Section(category.displayName) {
                        ForEach(groupItems) { item in
                            exerciseRow(item)
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .overlay {
            if results.isEmpty {
                Text("No matches")
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func exerciseRow(_ item: ExerciseLibraryItem) -> some View {
        Button {
            onSelect(item)
            dismiss()
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.name)
                        .foregroundStyle(.primary)
                    Text(item.exerciseType.displayName)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if item.isCustom {
                    Image(systemName: "person.fill")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                } else {
                    Image(systemName: "info.circle")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .swipeActions {
            if item.isCustom {
                Button(role: .destructive) {
                    context.delete(item)
                    try? context.save()
                } label: {
                    Label("Delete", systemImage: "trash")
                }
            }
        }
    }

    private var currentTitle: String {
        if !searchText.trimmingCharacters(in: .whitespaces).isEmpty {
            return "Search"
        }
        return selectedCategory?.displayName ?? "Select Exercise"
    }

    private var searchPrompt: String {
        if let category = selectedCategory {
            return "Search \(category.displayName)"
        }
        return "Search Exercises"
    }
}

struct AddCustomExerciseView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var name: String = ""
    @State private var muscleGroup: MuscleGroup
    @State private var exerciseType: ExerciseType = .weighted

    var onSave: (ExerciseLibraryItem) -> Void

    init(initialCategory: WorkoutCategory?, onSave: @escaping (ExerciseLibraryItem) -> Void) {
        self._muscleGroup = State(initialValue: initialCategory?.defaultMuscleGroup ?? .chest)
        self.onSave = onSave
    }

    var body: some View {
        Form {
            TextField("Name", text: $name)
            Picker("Muscle Group", selection: $muscleGroup) {
                ForEach(MuscleGroup.ordered, id: \.self) { group in
                    Text(group.displayName).tag(group)
                }
            }
            Picker("Type", selection: $exerciseType) {
                ForEach(ExerciseType.allCases, id: \.self) { type in
                    Text(type.displayName).tag(type)
                }
            }
        }
        .navigationTitle("Custom Exercise")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !trimmed.isEmpty else { return }
                    let item = ExerciseLibraryItem(name: trimmed, muscleGroup: muscleGroup, exerciseType: exerciseType, isCustom: true)
                    onSave(item)
                    dismiss()
                }
                .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
    }
}
