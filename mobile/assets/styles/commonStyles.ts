import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

export const colors = {
  // Pastel color scheme for mental wellness
  primary: '#8B9DC3',      // Soft lavender blue
  secondary: '#DDB892',    // Warm beige
  accent: '#F4A261',       // Soft orange
  background: '#F8F9FA',   // Very light gray
  backgroundAlt: '#FFFFFF', // Pure white
  text: '#2D3436',         // Dark gray for readability
  textLight: '#636E72',    // Medium gray
  success: '#81C784',      // Soft green
  warning: '#FFB74D',      // Soft amber
  danger: '#E57373',       // Soft red
  card: '#FFFFFF',         // White cards
  border: '#E9ECEF',       // Light border
  shadow: 'rgba(0, 0, 0, 0.1)',
  
  // Mood colors
  moodVeryHappy: '#81C784',
  moodHappy: '#AED581',
  moodNeutral: '#FFB74D',
  moodSad: '#F06292',
  moodVerySad: '#E57373',
};

export const gradients = {
  primary: ['#8B9DC3', '#A8B8D8'],
  secondary: ['#DDB892', '#E8C4A0'],
  accent: ['#F4A261', '#F7B267'],
  wellness: ['#81C784', '#A5D6A7'],
  calm: ['#B39DDB', '#C5CAE9'],
} as const;

export const buttonStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0px 4px 12px ${colors.shadow}`,
    elevation: 4,
  },
  secondary: {
    backgroundColor: colors.secondary,
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0px 4px 12px ${colors.shadow}`,
    elevation: 4,
  },
  accent: {
    backgroundColor: colors.accent,
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0px 4px 12px ${colors.shadow}`,
    elevation: 4,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 25,
    paddingVertical: 13,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  large: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
});

export const textStyles = StyleSheet.create({
  h1: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 24,
  },
  bodyLight: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textLight,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textLight,
    lineHeight: 20,
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.backgroundAlt,
  },
  buttonOutline: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
});

export const commonStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    boxShadow: `0px 4px 12px ${colors.shadow}`,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardSmall: {
    backgroundColor: colors.card,
    padding: 16,
    marginVertical: 6,
    boxShadow: `0px 2px 8px ${colors.shadow}`,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  section: {
    marginVertical: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0px 6px 16px ${colors.shadow}`,
    elevation: 6,
  },

});

export const chatStyles = StyleSheet.create({
  chatBalloon: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#F1F1F1',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3.5,
    zIndex: 9999,
  },
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    padding: 20,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    height: '60%',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  messageBubble: {
    borderRadius: 10,
    padding: 10,
    marginVertical: 4,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#dff0ff',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#e9e9e9',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  inputBox: {
    flex: 1,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'white',
  },
  sendIcon: {
    marginLeft: 8,
  },
});
