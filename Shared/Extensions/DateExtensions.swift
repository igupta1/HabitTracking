import Foundation

extension Date {
    var startOfDay: Date {
        Calendar.current.startOfDay(for: self)
    }

    func adding(days: Int) -> Date {
        Calendar.current.date(byAdding: .day, value: days, to: self) ?? self
    }

    func isSameDay(as other: Date) -> Bool {
        Calendar.current.isDate(self, inSameDayAs: other)
    }
}

extension Calendar {
    func last7Days(endingAt end: Date = .now) -> [Date] {
        let today = startOfDay(for: end)
        return (0..<7).reversed().map { offset in
            self.date(byAdding: .day, value: -offset, to: today) ?? today
        }
    }
}
