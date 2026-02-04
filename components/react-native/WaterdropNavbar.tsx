/**
 * WaterdropNavbar – React Native
 * Transparente Navbar mit Ultra-Waterdrop-Effekt in Lila.
 * Kein Blur, reine Transparenz + Waterdrop-Glanz + Glow.
 *
 * Nutzung: In einer Expo/React-Native-App.
 * Abhängigkeit: expo-linear-gradient
 *   npx expo install expo-linear-gradient
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const VIOLET = '#8b5cf6';
const VIOLET_RGB = '139, 92, 246';
const TEXT_NORMAL = '#6b7280';
const TEXT_HOVER = '#8b5cf6';

type NavItem = {
  id: string;
  label: string;
  icon: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: 'kommunikation', label: 'Kommunikation', icon: '💬' },
  { id: 'persoenlich', label: 'Persönlich', icon: '👤' },
  { id: 'professionell', label: 'Professionell', icon: '💼' },
];

function NavItemButton({
  item,
  isActive,
  onPress,
}: {
  item: NavItem;
  isActive: boolean;
  onPress: () => void;
}) {
  const translateY = useRef(new Animated.Value(0)).current;

  const onPressIn = () => {
    Animated.timing(translateY, {
      toValue: -2,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };
  const onPressOut = () => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View
        style={[
          styles.item,
          { transform: [{ translateY }] },
        ]}
      >
        <Text style={styles.icon}>{item.icon}</Text>
        <Text
          style={[styles.label, isActive && styles.labelHover]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function WaterdropNavbar() {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <View style={styles.outerGlow}>
      <View style={styles.shadowWrap}>
        <View style={styles.container}>
          {/* Waterdrop-Highlight oben: 6px, transparent → lila → weiß → lila → transparent */}
          <LinearGradient
            colors={[
              'transparent',
              `rgba(${VIOLET_RGB}, 0.5)`,
              'rgba(255,255,255,0.7)',
              `rgba(${VIOLET_RGB}, 0.5)`,
              'transparent',
            ]}
            locations={[0, 0.25, 0.5, 0.75, 1]}
            style={styles.waterdropHighlight}
          />
          {/* Inset-Schatten-Simulation für 3D-Effekt */}
          <View style={styles.insetShadow} pointerEvents="none" />
          <View style={styles.row}>
            {NAV_ITEMS.map((item) => (
              <NavItemButton
                key={item.id}
                item={item}
                isActive={activeId === item.id}
                onPress={() => setActiveId(item.id)}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerGlow: {
    alignSelf: 'center',
    borderRadius: 27,
    padding: 3,
    // Äußerer Glow-Ring (als heller Rand simuliert; für echten Glow ggf. zusätzlich shadow auf diesem View)
    ...Platform.select({
      ios: {
        shadowColor: VIOLET,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  shadowWrap: {
    borderRadius: 25,
    // Schatten: 0 20px 60px rgba(139, 92, 246, 0.25)
    ...Platform.select({
      ios: {
        shadowColor: VIOLET,
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.25,
        shadowRadius: 60,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  container: {
    borderRadius: 25,
    borderWidth: 2.5,
    borderColor: `rgba(${VIOLET_RGB}, 0.4)`,
    backgroundColor: `rgba(${VIOLET_RGB}, 0.2)`,
    overflow: 'hidden',
    paddingTop: 6, // Platz für Waterdrop
    minHeight: 56,
  },
  waterdropHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 6,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  insetShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    backgroundColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: `rgba(0,0,0,0.08)`,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 90,
  },
  icon: {
    fontSize: 22,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT_NORMAL,
  },
  labelHover: {
    color: TEXT_HOVER,
  },
});

export default WaterdropNavbar;
