import SwiftUI
import SwiftData

struct StrengthWorkoutEditView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Bindable var workout: StrengthWorkout

    @State private var showLibrary = false
    @State private var exerciseSheet: WorkoutExercise?
    @State private var replaceTarget: WorkoutExercise?
    @State private var setSheet: WorkoutSet?
    @State private var showDeleteWorkoutDialog = false

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                infoCard
                    .padding(.horizontal, 16)

                ForEach(workout.sortedExercises) { exercise in
                    ExerciseCard(
                        exercise: exercise,
                        onExerciseMenu: { exerciseSheet = exercise },
                        onSetMenu: { setSheet = $0 }
                    )
                    .padding(.horizontal, 16)
                }

                addExerciseButton
                    .padding(.horizontal, 16)

                if workout.exercises?.isEmpty ?? true {
                    Text("Tap “Add Exercise” to start logging sets.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.top, 4)
                }
            }
            .padding(.vertical, 16)
        }
        .background(Color(.systemBackground).ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    save()
                    dismiss()
                } label: {
                    Image(systemName: "chevron.down")
                        .font(.callout.weight(.semibold))
                        .foregroundStyle(.primary)
                        .padding(8)
                        .background(Circle().fill(PhysiqueTheme.card))
                }
            }

            ToolbarItem(placement: .principal) {
                Text(workout.date, format: .dateTime.month(.abbreviated).day())
                    .font(.headline)
            }

            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button {
                        showDeleteWorkoutDialog = true
                    } label: {
                        Label("Delete Workout", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .font(.callout.weight(.semibold))
                        .foregroundStyle(.primary)
                        .padding(8)
                        .background(Circle().fill(PhysiqueTheme.card))
                }
            }
        }
        .sheet(isPresented: $showLibrary) {
            NavigationStack {
                ExerciseLibraryView { item in
                    addExercise(from: item)
                }
            }
        }
        .sheet(item: $replaceTarget) { exercise in
            NavigationStack {
                ExerciseLibraryView { item in
                    replace(exercise: exercise, with: item)
                }
            }
        }
        .sheet(item: $exerciseSheet) { exercise in
            ExerciseActionSheet(
                exercise: exercise,
                onReplace: {
                    exerciseSheet = nil
                    replaceTarget = exercise
                },
                onDelete: {
                    context.delete(exercise)
                    try? context.save()
                    exerciseSheet = nil
                },
                onMoveUp: {
                    move(exercise: exercise, by: -1)
                    exerciseSheet = nil
                },
                onMoveDown: {
                    move(exercise: exercise, by: 1)
                    exerciseSheet = nil
                }
            )
            .presentationDetents([.medium])
        }
        .sheet(item: $setSheet) { set in
            SetActionSheet(
                set: set,
                onCopy: {
                    copy(set: set)
                    setSheet = nil
                },
                onDelete: {
                    context.delete(set)
                    try? context.save()
                    setSheet = nil
                }
            )
            .presentationDetents([.medium])
        }
        .confirmationDialog(
            "Delete this workout?",
            isPresented: $showDeleteWorkoutDialog,
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                context.delete(workout)
                try? context.save()
                WidgetReloader.reloadAll()
                dismiss()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will permanently remove the workout and all its exercises and sets.")
        }
        .onDisappear { save() }
    }

    // MARK: - Header / info card

    private var infoCard: some View {
        VStack(spacing: 0) {
            // Name
            TextField("Name", text: $workout.name, axis: .horizontal)
                .font(.title3.weight(.semibold))
                .padding(.vertical, 16)
                .padding(.horizontal, 16)

            Divider().padding(.leading, 16)

            // Date
            HStack {
                Text("Date")
                Spacer()
                DatePicker(
                    "",
                    selection: Binding(
                        get: { workout.date },
                        set: { workout.date = Calendar.current.startOfDay(for: $0) }
                    ),
                    displayedComponents: .date
                )
                .labelsHidden()
            }
            .padding(.vertical, 12)
            .padding(.horizontal, 16)
        }
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(PhysiqueTheme.card)
        )
    }

    private var addExerciseButton: some View {
        Button {
            showLibrary = true
        } label: {
            HStack {
                Image(systemName: "plus.circle.fill")
                Text("Add Exercise")
                    .fontWeight(.semibold)
                Spacer()
            }
            .foregroundStyle(PhysiqueTheme.accent)
            .padding(.vertical, 14)
            .padding(.horizontal, 16)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(PhysiqueTheme.card)
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Actions

    private func addExercise(from item: ExerciseLibraryItem) {
        let order = (workout.exercises ?? []).map(\.order).max().map { $0 + 1 } ?? 0
        let exercise = WorkoutExercise(
            exerciseName: item.name,
            muscleGroup: item.muscleGroup,
            exerciseType: item.exerciseType,
            order: order
        )
        exercise.workout = workout
        context.insert(exercise)

        // Seed the new exercise with the sets from the last time it was logged, so the
        // previous weight/reps appear as an editable target for today's session.
        let seedSets = previousSets(forExerciseNamed: item.name, before: workout, context: context)
        if seedSets.isEmpty {
            let firstSet = WorkoutSet(order: 0)
            firstSet.exercise = exercise
            context.insert(firstSet)
        } else {
            for (index, previous) in seedSets.enumerated() {
                let set = WorkoutSet(
                    order: index,
                    weight: previous.weight,
                    reps: previous.reps,
                    durationSeconds: previous.durationSeconds,
                    setType: previous.setType
                )
                set.exercise = exercise
                context.insert(set)
            }
        }
        try? context.save()
    }

    private func replace(exercise: WorkoutExercise, with item: ExerciseLibraryItem) {
        exercise.exerciseName = item.name
        exercise.muscleGroup = item.muscleGroup
        exercise.exerciseType = item.exerciseType
        try? context.save()
    }

    private func move(exercise: WorkoutExercise, by delta: Int) {
        var ordered = workout.sortedExercises
        guard let idx = ordered.firstIndex(where: { $0.id == exercise.id }) else { return }
        let target = idx + delta
        guard target >= 0 && target < ordered.count else { return }
        ordered.swapAt(idx, target)
        for (i, ex) in ordered.enumerated() { ex.order = i }
        try? context.save()
    }

    private func copy(set: WorkoutSet) {
        guard let exercise = set.exercise else { return }
        let nextOrder = (exercise.sortedSets.map(\.order).max() ?? set.order) + 1
        let new = WorkoutSet(
            order: nextOrder,
            weight: set.weight,
            reps: set.reps,
            durationSeconds: set.durationSeconds
        )
        new.exercise = exercise
        context.insert(new)
        try? context.save()
    }

    private func save() {
        try? context.save()
        WidgetReloader.reloadAll()
    }
}

// MARK: - Previous-session lookup

/// Sets from the most recent workout *before* `workout` that contains an exercise named
/// `name`. Ordering is by date, then creation time, so two workouts logged on the same
/// day still resolve correctly. Empty if the exercise was never logged before.
private func previousSets(
    forExerciseNamed name: String,
    before workout: StrengthWorkout,
    context: ModelContext
) -> [WorkoutSet] {
    let currentDate = workout.date
    let currentCreatedAt = workout.createdAt
    let workoutID = workout.id
    let predicate = #Predicate<StrengthWorkout> { w in
        w.date < currentDate || (w.date == currentDate && w.createdAt < currentCreatedAt)
    }
    var fd = FetchDescriptor(predicate: predicate)
    fd.sortBy = [
        SortDescriptor(\.date, order: .reverse),
        SortDescriptor(\.createdAt, order: .reverse)
    ]
    fd.fetchLimit = 25
    let workouts = (try? context.fetch(fd)) ?? []
    for w in workouts where w.id != workoutID {
        if let match = (w.exercises ?? []).first(where: { $0.exerciseName == name }) {
            return match.sortedSets
        }
    }
    return []
}

// MARK: - Exercise card

private struct ExerciseCard: View {
    @Environment(\.modelContext) private var context
    @Bindable var exercise: WorkoutExercise
    var onExerciseMenu: () -> Void
    var onSetMenu: (WorkoutSet) -> Void

    var body: some View {
        VStack(spacing: 0) {
            // Header: name + menu
            HStack {
                Text(exercise.exerciseName)
                    .font(.headline.weight(.semibold))
                Spacer()
                Button(action: onExerciseMenu) {
                    Image(systemName: "ellipsis")
                        .font(.callout.weight(.semibold))
                        .foregroundStyle(PhysiqueTheme.accent)
                        .frame(width: 32, height: 32)
                }
                .buttonStyle(.plain)
            }
            .padding(.top, 14)
            .padding(.horizontal, 16)

            Divider()
                .padding(.top, 10)
                .padding(.leading, 16)

            // Column headers
            columnHeaders
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 4)

            // Sets
            ForEach(Array(exercise.sortedSets.enumerated()), id: \.element.id) { idx, set in
                SetRow(
                    set: set,
                    type: exercise.exerciseType,
                    placeholder: placeholderSet(at: idx),
                    onMenu: { onSetMenu(set) }
                )
                .padding(.horizontal, 16)
                .padding(.vertical, 6)

                if idx < exercise.sortedSets.count - 1 {
                    Divider().padding(.leading, 16)
                }
            }

            // Add Set
            HStack {
                Button(action: addSet) {
                    HStack(spacing: 6) {
                        Image(systemName: "plus.circle.fill")
                        Text("Add Set")
                            .fontWeight(.semibold)
                    }
                    .foregroundStyle(PhysiqueTheme.accent)
                }
                .buttonStyle(.plain)
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(PhysiqueTheme.card)
        )
    }

    private var columnHeaders: some View {
        HStack(spacing: 8) {
            Text("")
                .frame(width: 28)
            Group {
                switch exercise.exerciseType {
                case .weighted:
                    columnHeader("Weight")
                    columnHeader("Reps")
                case .bodyweight:
                    columnHeader("Reps")
                    Spacer().frame(maxWidth: .infinity)
                case .timeBased:
                    columnHeader("Time (s)")
                    Spacer().frame(maxWidth: .infinity)
                }
            }
            Color.clear.frame(width: 28)
        }
        .font(.caption)
        .foregroundStyle(.secondary)
    }

    private func columnHeader(_ text: String, alignment: Alignment = .center) -> some View {
        Text(text)
            .frame(maxWidth: .infinity, alignment: alignment)
    }

    private func placeholderSet(at index: Int) -> WorkoutSet? {
        guard let workout = exercise.workout else { return nil }
        let sets = previousSets(forExerciseNamed: exercise.exerciseName, before: workout, context: context)
        return sets.indices.contains(index) ? sets[index] : nil
    }

    private func addSet() {
        let nextOrder = exercise.sortedSets.map(\.order).max().map { $0 + 1 } ?? 0
        let template = exercise.sortedSets.last
        let set = WorkoutSet(
            order: nextOrder,
            weight: template?.weight,
            reps: template?.reps,
            durationSeconds: template?.durationSeconds
        )
        set.exercise = exercise
        context.insert(set)
        try? context.save()
    }
}

// MARK: - Set row

private struct SetRow: View {
    @Environment(\.modelContext) private var context
    @Bindable var set: WorkoutSet
    let type: ExerciseType
    let placeholder: WorkoutSet?
    var onMenu: () -> Void

    var body: some View {
        HStack(spacing: 8) {
            SetIndexBadge(order: set.order)
                .frame(width: 28)
                .onTapGesture { onMenu() }

            switch type {
            case .weighted:
                weightField()
                repsField()
            case .bodyweight:
                repsField()
                Spacer().frame(maxWidth: .infinity)
            case .timeBased:
                timeField()
                Spacer().frame(maxWidth: .infinity)
            }

            Button(action: onMenu) {
                Image(systemName: "ellipsis")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(PhysiqueTheme.accent)
                    .frame(width: 28, height: 28)
            }
            .buttonStyle(.plain)
        }
        .onChange(of: set.weight) { _, _ in try? context.save() }
        .onChange(of: set.reps) { _, _ in try? context.save() }
        .onChange(of: set.durationSeconds) { _, _ in try? context.save() }
    }

    private func weightField() -> some View {
        let ph: String = placeholder?.weight.map { format($0) } ?? "—"
        return TextField(ph, value: $set.weight, format: .number)
            .keyboardType(.decimalPad)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
    }

    private func repsField() -> some View {
        let ph: String = placeholder?.reps.map { "\($0)" } ?? "—"
        return TextField(ph, value: $set.reps, format: .number)
            .keyboardType(.numberPad)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
    }

    private func timeField() -> some View {
        let ph: String = placeholder?.durationSeconds.map { "\($0)" } ?? "—"
        return TextField(ph, value: $set.durationSeconds, format: .number)
            .keyboardType(.numberPad)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
    }

    private func format(_ d: Double) -> String {
        let f = NumberFormatter()
        f.maximumFractionDigits = 1
        return f.string(from: NSNumber(value: d)) ?? "\(d)"
    }
}

private struct SetIndexBadge: View {
    let order: Int

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.secondary.opacity(0.5), lineWidth: 1.5)
                .frame(width: 24, height: 24)
            Text("\(order + 1)")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
        }
    }
}

// MARK: - Action sheets

private struct ExerciseActionSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var exercise: WorkoutExercise
    var onReplace: () -> Void
    var onDelete: () -> Void
    var onMoveUp: () -> Void
    var onMoveDown: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Text(exercise.exerciseName)
                    .font(.headline.weight(.semibold))
                Spacer()
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }

            HStack(spacing: 0) {
                actionButton(title: "Move ↑", systemImage: "arrow.up", color: .primary, action: onMoveUp)
                Divider().frame(height: 32)
                actionButton(title: "Move ↓", systemImage: "arrow.down", color: .primary, action: onMoveDown)
                Divider().frame(height: 32)
                actionButton(title: "Replace", systemImage: "arrow.triangle.2.circlepath", color: .primary, action: onReplace)
                Divider().frame(height: 32)
                actionButton(title: "Delete", systemImage: "xmark", color: .red, action: onDelete)
            }
            .padding(.vertical, 8)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Color(.tertiarySystemBackground))
            )

            Spacer()
        }
        .padding(20)
    }

    private func actionButton(title: String, systemImage: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: systemImage)
                Text(title)
                    .font(.caption)
            }
            .foregroundStyle(color)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 6)
        }
        .buttonStyle(.plain)
    }
}

private struct SetActionSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var set: WorkoutSet
    var onCopy: () -> Void
    var onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Set \(set.order + 1)")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
                Spacer()
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }

            Button(action: onCopy) {
                HStack {
                    Image(systemName: "square.on.square")
                    Text("Copy")
                    Spacer()
                }
                .padding(14)
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(Color(.tertiarySystemBackground))
                )
            }
            .buttonStyle(.plain)
            .foregroundStyle(.primary)

            Button(role: .destructive, action: onDelete) {
                HStack {
                    Text("Delete")
                    Spacer()
                    Image(systemName: "trash")
                }
                .padding(14)
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(Color(.tertiarySystemBackground))
                )
            }
            .buttonStyle(.plain)

            Spacer()
        }
        .padding(20)
    }
}
