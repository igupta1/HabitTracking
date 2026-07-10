import Foundation
#if canImport(WidgetKit)
import WidgetKit
#endif

enum WidgetReloader {
    static func reloadAll() {
        #if canImport(WidgetKit)
        WidgetCenter.shared.reloadAllTimelines()
        #endif
    }
}
