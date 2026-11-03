import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <View style={styles.page}>
      <Text accessibilityRole="header" style={styles.title}>
        We couldn&apos;t find that product or page
      </Text>
      <Link accessibilityLabel="Back to shop" href="/shop" style={styles.link}>
        Back to shop
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    alignItems: 'center',
    backgroundColor: '#121417',
    flex: 1,
    gap: 20,
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  link: {
    color: '#3EE6B0',
    fontSize: 16,
    fontWeight: '700',
  },
});
