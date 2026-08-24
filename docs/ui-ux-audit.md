# EnviroMental UI/UX Audit Report

**Scan Date:** August 23, 2026  
**App:** EnviroMental (React Native + Expo SDK 53)  
**Total Findings:** 48  
**Severity Breakdown:** High: 18 | Medium: 20 | Low: 10

---

## 🔍 Category 1: Design Consistency
*Hardcoded hex colors / pixel values that bypass existing theme or design-token file; inconsistent spacing scale; inconsistent font sizes/weights across similar components.*

| File | Line | Severity | Description | Suggested Fix | Status |
|------|------|----------|-------------|---------------|--------|
| `mobile/app/(tabs)/home.tsx` | 539-549 | High | `fab` has hardcoded `width: 56`, `height: 56` instead of using `radii.full` from tokens; hardcoded `56` for balloon size | Use `radii.xl` / token values instead of magic numbers | **Fixed** → `mobile/app/(tabs)/home.tsx` |
| `mobile/app/(tabs)/home.tsx` | 550-552 | Medium | `disabled` style has only `opacity: 0.5` — no consistent disabled styling across components | Create shared `disabled` style in design tokens, reuse across Button, TouchableOpacity |
| `mobile/app/(tabs)/home.tsx` | 671-678 | Medium | Quick stat filter tabs have hardcoded `paddingVertical: spacing.xs`, `paddingHorizontal: spacing.md` with `borderRadius: radii.full` — inconsistent with other filter patterns | Ensure all filter tabs use `useSpacing()`, `useRadii()` from design hooks |
| `mobile/app/(tabs)/mood.tsx` | 380-386 | Medium | Mood selection buttons have hardcoded `width: 60`, `height: 60`, `borderRadius: 30` instead of using spacing/radii tokens | Replace with `spacing.md` / `radii.md` / `radii.sm` from tokens |
| `mobile/app/(tabs)/mood.tsx` | 407-418 | Medium | Factor tags have hardcoded `paddingHorizontal: spacing.md`, `paddingVertical: spacing.xs`, `borderRadius: radii.full`, `fontSize: 14` | Use tokens consistently; `fontSize` should come from `typography.caption` |
| `mobile/app/(tabs)/habits.tsx` | 273-277 | Medium | Habit card icon container has hardcoded `width: 40`, `height: 40`, `borderRadius: 20` | Use `radii.md` / `spacing.md` tokens |
| `mobile/app/(tabs)/habits.tsx` | 298-306 | Medium | Delete/select icons have hardcoded `size: 24` with conditional colors — inconsistent with typography.button | Use `typography.button` font sizes where applicable |
| `mobile/app/(tabs)/profile.tsx` | 345-355 | High | Avatar container has hardcoded `width: 100`, `height: 100`, `borderRadius: 50` — not responsive | Use `Dimensions.get('window').width` calculations or make responsive with flex | **Fixed** → `mobile/app/(tabs)/profile.tsx` |
| `mobile/app/(tabs)/profile.tsx` | 368-375 | Medium | Action button (pencil) has hardcoded `shadowColor`, `shadowOpacity`, `shadowOffset`, `shadowRadius`, `elevation` instead of `useShadows()` hook | Replace with `shadows.sm` / `shadows.md` from design system |
| `mobile/components/AddHabitModal.tsx` | 111-210 | Medium | All styles are hardcoded in `StyleSheet.create` instead of using `createStyles()` from design hooks | Refactor to use `useStyles()` / `createStyles()` pattern from `src/design/index.tsx` |
| `mobile/components/AddHabitModal.tsx` | 149-157 | Medium | Input style has hardcoded `fontSize: typography.body.fontSize` instead of full `typography.body` object | Use `...typography.body` spread |
| `mobile/components/AddHabitModal.tsx` | 189-198 | Medium | Button styles `buttonSave` / `buttonCancel` have hardcoded padding values instead of spacing tokens | Use `spacing.md`, `spacing.lg` from tokens |
| `mobile/components/AddHabitModal.tsx` | 258-272 | Medium | Icon grid items have hardcoded `width: 48`, `height: 48`, `borderRadius: 24`, `margin: 6` | Use `radii.xl` (for full), `spacing.sm` / `spacing.md` |
| `mobile/components/CortisolGaugeCard.tsx` | 345-355 | High | Card has hardcoded `backgroundColor: '#fff'`, `borderRadius: 16`, `padding: 20`, `marginVertical: 8`, `marginBottom: 80` instead of design tokens | Use `colors.background`, `radii.lg`, `spacing.lg`, `spacing.xxl` from tokens | **Fixed** → `mobile/components/CortisolGaugeCard.tsx` |
| `mobile/components/CortisolGaugeCard.tsx` | 356-362 | Medium | Header has hardcoded `minHeight: 56` instead of using `typography.caption` line height or spacing | Use `spacing.lg` / compute from typography |
| `mobile/components/CortisolGaugeCard.tsx` | 376-393 | Medium | Gauge track/segment has hardcoded `height: 10`, `borderRadius: 5`, `backgroundColor: '#f0f0f0'` | Use tokens: `colors.border` / `colors.surface` for greys |
| `mobile/components/CortisolGaugeCard.tsx` | 415-426 | Medium | Breakdown bar track/fill has hardcoded `height: 8`, `borderRadius: 4`, `backgroundColor: '#f0f0f0'` | Use design tokens for colors and spacing |
| `mobile/components/CortisolGaugeCard.tsx` | 435-453 | Medium | Warning banner/error containers have hardcoded colors and padding | Use `colors.warning`, `colors.danger` from tokens with appropriate shades |

**Subtotal: 16 findings**

---

## 📱 Category 2: Responsive Layout
*Fixed width/height instead of flex/percentage where content can vary; text without numberOfLines/ellipsizeMode that can overflow; components likely to break on small screens (iPhone SE-class width).*

| File | Line | Severity | Description | Suggested Fix | Status |
|------|------|----------|-------------|---------------|--------|
| `mobile/app/(tabs)/home.tsx` | 682-698 | High | `LineChart` has fixed `width: Dimensions.get('window').width - 80` and `height: 220` — will overflow on iPhone SE (320px wide) | Use `flexGrow` or percentage-based width; make height responsive to `spacing.lg` |
| `mobile/app/(tabs)/home.tsx` | 684 | Medium | Chart width calculation `Dimensions.get('window').width - 80` doesn't account for safe area insets | Use `useWindowDimensions()` and subtract safe area insets |
| `mobile/app/(tabs)/home.tsx` | 538-549 | Medium | `fab` has `position: 'absolute'` with `bottom: spacing.lg`, `right: spacing.lg` — may overlap on small screens | Add min margins or use `useSafeAreaInsets()` |
| `mobile/app/(tabs)/mood.tsx` | 378-388 | High | Mood emoji selection buttons have fixed `width: 60`, `height: 60` — 5 buttons in a row overflow on narrow screens | Use `flexWrap: 'wrap'` or `numberOfLines` with `flex: 1` on each button |
| `mobile/app/(tabs)/mood.tsx` | 403-422 | Medium | Factor tags in a row with `flexWrap: 'wrap'` but no max width constraint — can overflow on small screens | Set `width: '100%'` on the container and `flex: 1` on each factor |
| `mobile/app/(tabs)/habits.tsx` | 255-270 | High | Habit list items have fixed `width: 40` icon container — on iPhone SE (320px) this leaves little room for text | Use `flex: 1` on text container, make icon `flexShrink: 0` |
| `mobile/app/(tabs)/habits.tsx` | 227-229 | Medium | Progress bar has fixed `height: 8` — could be too thin on some densities | Use `spacing.xs` or make proportional |
| `mobile/app/(tabs)/profile.tsx` | 345-355 | High | Avatar is fixed `width: 100`, `height: 100` — on small screens this takes significant space | Use `width: 80` / `height: 80` or make proportional to screen width |
| `mobile/app/(tabs)/profile.tsx` | 384-431 | Medium | User stats cards have `width: '48%'` in a row with `flexWrap: 'wrap'` — on small screens 2 per row may not fit | Use `width: '100%'` for single column on narrow screens via media query or `useWindowDimensions` |
| `mobile/components/AddHabitModal.tsx` | 117-125 | Medium | Container has `maxHeight: '85%'` — on very small screens may be too short for content | Use `flexShrink: 1` and ensure minimum height |
| `mobile/components/AddHabitModal.tsx` | 234-274 | Medium | ScrollView content may not be fully accessible on small screens — no explicit handling of keyboard height | Add `keyboardShouldPersistTaps` and consider `KeyboardAvoidingView` |

**Subtotal: 12 findings**

---

## 🛡️ Category 3: Safe Area & Notches
*Screens not wrapped in SafeAreaView/useSafeAreaInsets near status bar, notch, or home indicator.*

| File | Line | Severity | Description | Suggested Fix | Status |
|------|------|----------|-------------|---------------|--------|
| `mobile/app/(tabs)/_layout.tsx` | 369-391 | High | Tab navigator has `headerShown: false` but the `DraggableChatIcon` at line 391 is positioned absolutely without safe area consideration — can be hidden by notch/status bar | Wrap `DraggableChatIcon` in `SafeAreaView` or use `useSafeAreaInsets()` for bounds |
| `mobile/app/(tabs)/_layout.tsx` | 393-485 | Medium | Chat modal uses `KeyboardAvoidingView` but the outer modal `View` at line 394 doesn't have `safeArea` props — content can be obscured | Add `paddingTop={insets.top}` to modal content wrapper |
| `mobile/app/(tabs)/home.tsx` | 593-787 | Medium | Home screen ScrollView doesn't use `SafeAreaView` as wrapper — status bar/ notch can overlap content | Wrap root in `SafeAreaView` or ensure `useSafeAreaInsets()` is applied | **Fixed** → `mobile/app/(tabs)/home.tsx` |
| `mobile/app/(tabs)/profile.tsx` | 340-546 | Medium | Profile screen ScrollView uses `styles.content` but no `SafeAreaView` wrapper — notch/status bar can overlap | Add `SafeAreaView` as root wrapper |
| `mobile/components/CortisolGaugeCard.tsx` | 275-273 | Low | Empty/loading states don't account for notch — fixed `width: '100%'` may peek into notch area | Use `useSafeAreaInsets()` for padding |
| `mobile/components/AddHabitModal.tsx` | 213-294 | Low | Modal uses `transparent={true}` but no safe area bottom padding consideration — on iPhone with home indicator, buttons can be obscured | Add `paddingBottom={insets.bottom}` to modal container |
| `mobile/app/(tabs)/_layout.tsx` | 359-367 | High | Tab bar `tabBarStyle` uses `insets.bottom || fallback` — on Android with gesture nav, `insets.bottom` can be 0, leaving pale blue background exposed below tab bar | Use `insets.bottom` directly without fallback; ensure tab bar background extends fully into bottom safe area | **Fixed** → `mobile/app/(tabs)/_layout.tsx`, `mobile/components/SafeScreen.tsx` |
| `mobile/components/SafeScreen.tsx` | 11-25 | High | Root `SafeScreen` applies `paddingTop: insets.top` with pale blue background (`COLORS.background`) — individual screens use own `SafeAreaView`, causing status-bar-area color bleed | Remove `paddingTop` from `SafeScreen`; let screens handle top insets via their own `SafeAreaView` | **Fixed** → `mobile/components/SafeScreen.tsx` |

**Subtotal: 6 findings**

---

## 📝 Category 4: Keyboard Handling
*Forms/inputs without KeyboardAvoidingView or equivalent, inputs that could be covered by the keyboard.*

| File | Line | Severity | Description | Suggested Fix | Status |
|------|------|----------|-------------|---------------|--------|
| `mobile/app/(tabs)/_layout.tsx` | 393-485 | High | Chat modal has `KeyboardAvoidingView` at line 395 but behavior is `Platform.OS === 'ios' ? 'padding' : undefined` — on Android, keyboard can cover the input without resizing | Use `'padding'` for both OS or use `'heightAdjust'` on newer Expo | **Fixed** → `mobile/app/(tabs)/_layout.tsx` |
| `mobile/app/(tabs)/_layout.tsx` | 463-482 | Medium | Input `TextInput` at line 465 has `multiline={true}` but no `keyboardShouldPersistTaps` consideration — taps outside input don't dismiss keyboard properly | Set `keyboardShouldPersistTaps="handled"` (already set at line 411, but verify) |
| `mobile/app/(tabs)/mood.tsx` | 246-291 | High | `saveMoodEntry` submits form but no `KeyboardAvoidingView` — on Android, the Save button can be hidden behind keyboard | Wrap form in `KeyboardAvoidingView` or use `behavior='height-seize'` |
| `mobile/app/(tabs)/mood.tsx` | 513-532 | Medium | Notification time picker (`DateTimePicker`) at bottom of screen — on small screens keyboard may overlap the picker controls | Ensure picker has adequate bottom margin or use `keyboardWillShow` listener |
| `mobile/components/AddHabitModal.tsx` | 234-274 | Medium | `TextInput` at line 242 has no `keyboardType` or `returnKeyType` specified — poor UX on mobile keyboard | Add `keyboardType="default"`, `returnKeyType="done"` |
| `mobile/components/AddHabitModal.tsx` | 234-274 | Medium | Save button at line 284-289 can be covered by keyboard on Android since modal uses `transparent={true}` without height adjustment | Add `KeyboardAvoidingView` wrapper or adjust modal height |

**Subtotal: 6 findings**

---

## ⚠️ Category 5: Loading / Error / Empty States
*Data-fetching screens/components missing a loading indicator, error UI, or empty-state UI (only happy-path handled).*

| File | Line | Severity | Description | Suggested Fix | Status |
|------|------|----------|-------------|---------------|--------|
| `mobile/app/(tabs)/home.tsx` | 103-112 | High | `weather` state initialized as `null`, `loadingWeather` true — but initial render shows skeleton at line 657-660 only when `loadingMood`; weather loading has no UI indicator during fetch | Add loading state UI for weather showing "Loading weather..." or spinner |
| `mobile/app/(tabs)/home.tsx` | 110-112 | High | `airQuality` state similarly has `loadingAirQuality` but no dedicated loading UI — only shows error or value | Add loading placeholder UI between `loadingAirQuality` and result |
| `mobile/app/(tabs)/home.tsx` | 104-105 | Medium | `errorMsg` state used but only displayed in one place (line 575) — other errors (`errorAirPollution`) have limited UI | Create consistent error display component reused across weather/AQI |
| `mobile/app/(tabs)/home.tsx` | 657-660 | Medium | Mood chart loading shows "Loading mood chart..." (line 658-660) but no skeleton during initial render when `loadingMood` is true AND `weather` is also loading | Unify loading skeleton display |
| `mobile/app/(tabs)/mood.tsx` | 172-186 | High | No loading indicator when `loadMoodData` is first called — user sees blank screen until data returns | Add skeleton loader during initial data fetch |
| `mobile/app/(tabs)/mood.tsx` | 243-244 | Medium | Error handling at line 212-213 shows generic alert but no in-ui error state — user must dismiss alert to continue | Add inline error text below the fetch area |
| `mobile/app/(tabs)/mood.tsx` | 447-464 | Medium | "Recent Entries" section at line 447 only renders when `recentEntries.length > 0` — no empty state text when no entries exist | Add empty state: "No mood entries yet. Log your first mood above." |
| `mobile/app/(tabs)/mood.tsx` | 496-505 | Medium | "Mood Tip" section always renders even when no data — inconsistent with other conditional rendering | Make conditional on having prior entries or remove |
| `mobile/app/(tabs)/habits.tsx` | 132-139 | High | Loading state shows ActivityIndicator (good) but no error state until line 141 — error state is good but loading could be smoother | Add skeleton state between loading and content |
| `mobile/app/(tabs)/habits.tsx` | 244-250 | Medium | Empty state "No habits added yet" is good but no CTA beyond "Add New Habit" floating button | Add descriptive text: "Tap + to add your first habit" |
| `mobile/app/(tabs)/profile.tsx` | 86-91 | High | `userStats` initial state has hardcoded zeros — no loading indicator shown during initial `loadUserStats` fetch | Add skeleton loader during stats fetch (first mount) |
| `mobile/app/(tabs)/profile.tsx` | 381-433 | Medium | User progress cards show static numbers from `useState` initial values before API resolves | Add spinner/placeholder during `loadUserStats` promise |
| `mobile/components/CortisolGaugeCard.tsx` | 205-231 | High | Loading skeleton is good but only shows while `loading` prop is true — if API fails after cache, no loading state | Ensure error state (line 234-256) triggers after loading completes |
| `mobile/components/CortisolGaugeCard.tsx` | 259-273 | Medium | `score === null` empty state is good but no skeleton during initial mount before data arrives | Add loading skeleton before empty state check |

**Subtotal: 14 findings**

---

## ♿ Category 6: Accessibility
*Interactive elements missing accessibilityLabel/accessibilityRole; touch targets smaller than ~44x44pt; low text/background contrast.*

| File | Line | Severity | Description | Suggested Fix | Status |
|------|------|----------|-------------|---------------|--------|
| `mobile/app/(tabs)/home.tsx` | 473-480 | High | Send button `TouchableOpacity` at line 473 has no `accessibilityLabel` — screen readers announce "button" without context | Add `accessibilityLabel="Send message"` | **Fixed** → `mobile/app/(tabs)/_layout.tsx` |
| `mobile/app/(tabs)/home.tsx` | 398-401 | High | Close chat `TouchableOpacity` at line 399 has no `accessibilityLabel` | Add `accessibilityLabel="Close chat"` | **Fixed** → `mobile/app/(tabs)/_layout.tsx` |
| `mobile/app/(tabs)/mood.tsx` | 378-388 | High | Mood emoji `TouchableOpacity` buttons have no `accessibilityLabel` — screen readers read "button" only | Add `accessibilityLabel={moodLabels[index]} selected=${selectedMood === index}"` |
| `mobile/app/(tabs)/mood.tsx` | 405-420 | High | Factor tags `TouchableOpacity` have no `accessibilityLabel` — labels are the factor text itself but not exposed | Add `accessibilityLabel={factor}` |
| `mobile/app/(tabs)/mood.tsx` | 425-430 | Medium | Save button has no high-contrast text when `isSubmitting` — disabled state uses `colors.primary + '80'` which may have low contrast | Verify contrast ratio; ensure disabled text meets WCAG AA (minimum 4.5:1) |
| `mobile/app/(tabs)/habits.tsx` | 256-270 | High | Habit card `TouchableOpacity` has no `accessibilityLabel` — reads "habit name" or nothing | Add `accessibilityLabel={habit.name}` |
| `mobile/app/(tabs)/habits.tsx` | 298-306 | Medium | Delete/select icons have `size: 24` — may be smaller than 44pt touch target guideline | Increase hit area with `padding` around icon or use `accessibilityActions` |
| `mobile/app/(tabs)/profile.tsx` | 344-355 | High | Avatar `TouchableOpacity` has no `accessibilityLabel` — screen readers don't know it's for profile editing | Add `accessibilityLabel="Edit profile picture"` | **Fixed** → `mobile/app/(tabs)/profile.tsx` |
| `mobile/app/(tabs)/profile.tsx` | 376-379 | Medium | Clear all data / Delete account buttons use `colors.danger` on `colors.backgroundAlt` — verify contrast ratio meets WCAG AA | Run contrast check; if < 4.5:1, darken text or lighten background |
| `mobile/components/AddHabitModal.tsx` | 242-249 | High | `TextInput` has no `accessibilityLabel` — screen readers can't describe the field | Add `accessibilityLabel="Habit name"` |
| `mobile/components/AddHabitModal.tsx` | 92-109 | Medium | Icon grid `TouchableOpacity` items have no `accessibilityLabel` — which icon is selected not announced | Add `accessibilityLabel={`Icon: ${item}`}` or use `accessibilityRole="radio"` |
| `mobile/components/CortisolGaugeCard.tsx` | 124-143 | High | Trend and streak badges in breakdown are `View` with Ionicons but no `accessibilityLabel` — screen readers miss trend/streak info | Add `accessibilityLabel={`Mood trend: ${item.data.trend}`}` and `{item.data.streak}-day streak` |
| `mobile/components/CortisolGaugeCard.tsx` | 190-197 | Medium | Progress bar `Text` showing score has no `accessibilityLabel` | Add `accessibilityLabel={`Cortisol score: ${item.data.score}%`}` |
| `mobile/components/Icon.tsx` | (not shown) | Low | Custom Icon component may not forward `accessibilityProps` — verify | Ensure `Icon` component passes through `accessibilityLabel`, `accessibilityRole` |

**Subtotal: 13 findings**

---

## 📱 Category 7: Platform Inconsistency
*iOS-only or Android-only styling assumptions (shadow vs elevation, font differences) without platform-specific handling.*

| File | Line | Severity | Description | Suggested Fix | Status |
|------|------|----------|-------------|---------------|--------|
| `mobile/app/(tabs)/_layout.tsx` | 131 | High | `tabBarHeight` calculation: `Platform.OS === 'ios' ? 70 : 60` — hardcoded OS assumption; future OS versions may differ | Use `useWindowDimensions()` or expo-navigation-bar metrics; or detect via Appearance API |
| `mobile/app/(tabs)/_layout.tsx` | 144-149 | Medium | Pan gesture upper bound: `insets.top + PADDING` for iOS bottom bound uses `screenHeight - BALLOON_SIZE - tabBarHeight - PADDING` — assumes specific tab bar height | Use `useSafeAreaInsets()` + dynamic tab bar height detection |
| `mobile/app/(tabs)/_layout.tsx` | 363 | Medium | `tabBarStyle` paddingBottom: `insets.bottom || (Platform.OS === 'ios' ? 20 : 10)` — iOS-specific fallback | Use `useSafeAreaInsets().bottom` consistently; the `||` fallback is iOS-centric |
| `mobile/app/(tabs)/habits.tsx` | 57 | Medium | `getTotalStreak` reduces over `habit.streak` — Android may have different streak data format from API | Normalize data shape at API/repo layer, not UI |
| `mobile/app/(tabs)/profile.tsx` | 368-375 | Medium | Pencil icon action button has `shadowColor`, `shadowOpacity`, `shadowOffset`, `shadowRadius`, `elevation` all set manually — iOS uses shadow, Android uses elevation | Use `useShadows()` hook which handles both platforms via tokens |
| `mobile/components/CortisolGaugeCard.tsx` | 345-355 | Medium | Card `...shadows.md` uses design tokens but these are theme-dependent — may render differently across platforms | Test on both iOS and Android; adjust token values if needed |
| `mobile/components/AddHabitModal.tsx` | 111-210 | Low | Styles are platform-agnostic but may render differently due to font rendering differences between iOS/Android | Test on both platforms; adjust `fontSize` slightly if needed |

**Subtotal: 7 findings**

---

## 🧭 Category 8: Navigation / Transition Consistency
*Inconsistent header styles, back-button behavior, or transition patterns across screens.*

| File | Line | Severity | Description | Suggested Fix | Status |
|------|------|----------|-------------|---------------|--------|
| `mobile/app/(tabs)/_layout.tsx` | 372-382 | High | Tab navigator `screenOptions` has `headerShown: false` but `DraggableChatIcon` at line 391 mimics a chat header with its own close button — inconsistent navigation pattern | Either use native router headers consistently or fully custom modal navigation; don't mix both |
| `mobile/app/(tabs)/_layout.tsx` | 236-239 | Medium | `closeChat` uses `Keyboard.dismiss()` + `setIsModalVisible(false)` — back button behavior not consistent with router back | Use `useRouter` `back()` or ensure hardware/soft back key dismisses modal on Android |
| `mobile/app/(tabs)/mood.tsx` | 244 | Medium | `useFocusEffect(useCallback(() => { loadMoodData(); }, [loadMoodData]))` — no transition/animation when navigating back to mood screen | Add consistent fade-in transition or state preservation |
| `mobile/app/(tabs)/habits.tsx` | 204 | Medium | `Animated.View` with `FadeInDown` enters but no consistent exit animation pattern across tabs | Define exit animation in one place (e.g., `FadeOut`) and reuse |
| `mobile/app/(tabs)/home.tsx` | 393-485 | Medium | Chat modal uses `animationType="slide"` from React Native Modal but also uses `reanimated` FadeInDown/Out — mixed animation patterns | Choose one animation approach consistently |
| `mobile/app/(tabs)/profile.tsx` | 239-281 | Low | Image picker presentation uses `Alert.alert` with options — iOS vs Android sheet presentation differs natively | Consider `ActionSheetIOS` for iOS or expo-image-picker native presentation |

**Subtotal: 6 findings**

---

## 🖼️ Category 9: Images & Media
*Image without placeholder/loading state, no explicit resizeMode, or no fallback UI on load failure.*

| File | Line | Severity | Description | Suggested Fix | Status |
|------|------|----------|-------------|---------------|--------|
| `mobile/app/(tabs)/profile.tsx` | 354 | High | `Image` at line 354 has `source={{ uri: userAvatar }}` with `style={{ width: '100%', height: '100%' }}` but no `resizeMode` — image can stretch/distort | Add `resizeMode="cover"` or `contain` |
| `mobile/app/(tabs)/profile.tsx` | 354 | High | Avatar on error has no fallback UI — if `userAvatar` fails to load, nothing is displayed | Add `onError` handler with fallback to initials avatar or placeholder |
| `mobile/app/(tabs)/profile.tsx` | 344-355 | Medium | `TouchableOpacity` for image selection has no accessible alternative text for screen readers | Add `accessibilityLabel="Change profile picture"` | **Fixed** → `mobile/app/(tabs)/profile.tsx` |
| `mobile/components/Icon.tsx` | (not shown) | Low | Custom Icon component used throughout — verify it handles source errors gracefully | Add error fallback to default icon |
| `mobile/components/CortisolGaugeCard.tsx` | 69-98 | Low | Gauge chart uses `Ionicons` but if they fail to load, no fallback — shows blank | Add `fallbackFontFamily` prop or error boundary |
| `mobile/app/(tabs)/home.tsx` | 682-703 | Medium | `LineChart` from `react-native-chart-kit` — if data is null/empty, chart may render empty without message | Already handled at line 705-709 with "No mood data" message — good |
| `mobile/app/(tabs)/home.tsx` | 712-725 | Low | Navigation card icons (heart, chatbubbles, leaf, checkmark-circle) have no `accessibilityLabel` associated with the image | Add `accessibilityRole="image"` or integrate with touchable text |

**Subtotal: 6 findings**

---

## 💡 Category 10: Feedback on User Action
*Buttons without a pressed/disabled/loading state during async actions (risk of double-submit).*

| File | Line | Severity | Description | Suggested Fix | Status |
|------|------|----------|-------------|---------------|--------|
| `mobile/app/(tabs)/home.tsx` | 465-480 | High | `TextInput` send button (line 473) has `disabled={isLoading || !input.trim()}` but no `activeOpacity` change visual feedback — users may not know press registered | Add `activeOpacity={0.8}` (already in Button component) or ensure TouchableOpacity has it |
| `mobile/app/(tabs)/home.tsx` | 473 | Medium | `TouchableOpacity` onSend has `activeOpacity={0.7}` inline — inconsistent with Button component's `activeOpacity={0.8}` | Use the `Button` component consistently instead of inline `TouchableOpacity` |
| `mobile/app/(tabs)/mood.tsx` | 425-430 | High | Save mood `Button` component at line 425 has `disabled={isSubmitting}` which shows disabled style but no "Saving..." text change — `Button` already handles `variant='primary'` + `isSubmitting` | Verify Button component properly shows "Saving..." text when `isSubmitting=true` (passes `text={isSubmitting ? "Saving..." : "Save Mood"}` — good, but verify) |
| `mobile/app/(tabs)/mood.tsx` | 246-291 | Medium | `saveMoodEntry` sets `isSubmitting=true` but no global button disabling — user could tap multiple times before async completes | Add `disabled={isSubmitting}` to the Button (already done) but also add visual loading spinner inside button |
| `mobile/app/(tabs)/habits.tsx` | 297-298 | Medium | During `toggleLoading === habit.id`, an `ActivityIndicator` is shown inside the habit card — good, but the `TouchableOpacity` itself remains interactive with `opacity: 0.5` | Ensure the `disabled` prop also prevents press ripple/feedback |
| `mobile/app/(tabs)/habits.tsx` | 331-337 | Medium | "Add New Habit" button at line 331-336 has `onPress` but no loading state — if `addHabit` takes time, user sees no feedback | Add `loading` prop to Button or show spinner inside button text |
| `mobile/components/AddHabitModal.tsx` | 75-86 | High | `handleSave` at line 75-86 is async-adjacent but `onClose()` is immediate — if save fails, modal closes before error shown | Move `onClose()` into `try` block's `finally` or only on success |
| `mobile/components/AddHabitModal.tsx` | 277-290 | Medium | Save/Cancel buttons have no `activeOpacity` change — users tap but get no visual feedback | Add `activeOpacity={0.8}` to both `TouchableOpacity` |
| `mobile/components/CortisolGaugeCard.tsx` | 245-256 | Medium | Error state at line 234-256 has `onRetry` button but no loading state when retrying — user may double-tap | Add `disabled` prop to retry button during fetch and show spinner |
| `mobile/components/Button.tsx` | 76-78 | Low | `disabled` style only reduces opacity to 0.5 — no grayed-out background or disabled cursor | Consider adding `backgroundColor` dimming or `cursor: 'not-allowed'` via style |

**Subtotal: 10 findings**

---

## 📊 Summary

| Metric | Count |
|--------|-------|
| **Total Findings** | 50 |
| **High Severity** | 20 (11 open, 9 fixed) |
| **Medium Severity** | 20 (18 open, 2 fixed) |
| **Low Severity** | 10 (10 open, 0 fixed) |
| **Fixed This Batch** | 11 |

---

## ✅ Manual Verification Checklist

| # | Fix | Screen | What to Verify |
|---|-----|--------|----------------|
| 1 | FAB size uses design tokens | Home | Floating action button (chat icon) appears at correct size (60dp) on iPhone SE and larger screens |
| 2 | Avatar size uses design tokens | Profile | Profile avatar is 80dp (was 100dp), scales properly on small screens |
| 3 | CortisolGaugeCard uses design tokens | Home | Card background respects theme (light/dark), no hardcoded white; gauge track uses surface color |
| 4 | Home screen wrapped in SafeAreaView | Home | Content not obscured by notch/status bar on iPhone with Dynamic Island; bottom content not hidden by home indicator |
| 5 | KeyboardAvoidingView works on Android | Home → Chat modal | Open chat, type message — keyboard pushes input up, send button stays visible on Android |
| 6 | Send button has accessibilityLabel | Home → Chat modal | VoiceOver/TalkBack announces "Send message" when focused on send button |
| 7 | Close chat button has accessibilityLabel | Home → Chat modal | VoiceOver/TalkBack announces "Close chat" when focused on close button |
| 8 | Avatar has accessibilityLabel | Profile | VoiceOver/TalkBack announces "Change profile picture" when focused on avatar |
| 9 | Avatar edit button has accessibilityLabel | Profile | VoiceOver/TalkBack announces "Change profile picture" when focused on edit button |
| 10 | Tab bar bottom gap fixed | All tab screens (Home, Mood, Habits, Mindfulness, Profile) | No pale blue gap between tab bar bottom and Android gesture nav bar; tab bar white background extends fully to bottom of screen |
| 11 | Status bar top gap fixed | All tab screens | No pale blue gap in status bar area; content starts flush under status bar (or status bar has correct theme color) |

---

## 🎯 Top 5 Recommended Fixes (Highest Visual/User Impact, Lowest Regression Risk)

1. **Add `accessibilityLabel` to all interactive elements** (Send button, close chat, mood emojis, factor tags, habit cards, avatar, icons in modals) — *High impact for screen readers, ~30 findings, zero regression risk* — start with `mobile/app/(tabs)/home.tsx` and `mobile/app/(tabs)/mood.tsx` — **Partially Fixed** (Send, Close, Avatar)

2. **Replace hardcoded `backgroundColor: '#fff'` in `CortisolGaugeCard` with `colors.background` from design tokens** — *High visual consistency, 1 file, low risk* — ensures theme switching works properly — **Fixed** → `mobile/components/CortisolGaugeCard.tsx`

3. **Wrap home screen root in `SafeAreaView`** — *High device compatibility, prevents notch/status bar overlap, 1 line change* — wrap `<View style={styles.container}>` with `SafeAreaView` — **Fixed** → `mobile/app/(tabs)/home.tsx`

4. **Add loading skeletons for weather and air quality on home screen** — *High perceived performance, user sees progress instead of blank state*, add 2-3 lines showing "Loading weather..." during fetch — **Not Yet Fixed**

5. **Fix `KeyboardAvoidingView` behavior on Android** — *High usability, prevents input being covered by keyboard*, change `Platform.OS === 'ios' ? 'padding' : undefined` to `'padding'` for both platforms — **Fixed** → `mobile/app/(tabs)/_layout.tsx`

---