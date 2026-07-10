import SwiftUI
import SwiftData

struct HomeView: View {
    @Environment(\.modelContext) private var context
    @Environment(AppRouter.self) private var router

    @Query private var bodyWeights: [BodyWeightEntry]
    @Query private var strengthWorkouts: [StrengthWorkout]
    @Query private var cardioWorkouts: [CardioWorkout]
    @Query private var stretching: [StretchingEntry]
    @Query private var creatine: [CreatineEntry]
    @Query private var pads: [PadEntry]
    @Query private var fams: [FamEntry]
    @Query private var friends: [FriendEntry]

    var body: some View {
        let today = Calendar.current.startOfDay(for: .now)
        let completion = DayCompletionService.completion(on: today, context: context)
        let chartPoints = makeChartPoints()

        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Last 7 days")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    HomeBarChart(points: chartPoints)
                }
                .padding(14)
                .background(RoundedRectangle(cornerRadius: 14).fill(Color(.secondarySystemBackground)))

                LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                    ForEach(HabitSection.allCases) { section in
                        SectionTile(
                            section: section,
                            statusLine: statusLine(for: section, completion: completion),
                            isComplete: completion.isComplete(section),
                            progress: completion.progress(section)
                        ) {
                            router.selectedSection = section
                        }
                    }
                }
            }
            .padding(16)
        }
        .navigationTitle("Today")
    }

    private func makeChartPoints() -> [HomeBarChart.Point] {
        let days = Calendar.current.last7Days()
        let fmt = DateFormatter()
        fmt.dateFormat = "EEE"
        return days.map { day in
            let count = DayCompletionService.completion(on: day, context: context).completedCount
            return HomeBarChart.Point(day: day, label: fmt.string(from: day), count: count)
        }
    }

    private func statusLine(for section: HabitSection, completion: DayCompletion) -> String {
        switch section {
        case .physique:
            return "\(completion.strength ? "✓" : "○") Workout   "
                + "\(completion.weight ? "✓" : "○") Weight   "
                + "\(completion.creatine ? "✓" : "○") Creatine"
        case .endurance:
            return "\(completion.cardio ? "✓" : "○") Cardio   "
                + "\(completion.stretch ? "✓" : "○") Stretch   "
                + "\(completion.pad ? "✓" : "○") Pad"
        case .social:
            return "\(completion.fam ? "✓" : "○") Fam   "
                + "\(completion.friend ? "✓" : "○") Friend"
        }
    }
}
