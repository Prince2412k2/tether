import React from "react";
import { View } from "react-native";
import { Slot } from "expo-router";

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Slot />
    </View>
  );
}
