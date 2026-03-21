import "react-native-get-random-values";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { enableScreens } from "react-native-screens";
import { HomeScreen } from "./src/screens/HomeScreen";
import { ChallengeDetailScreen } from "./src/screens/ChallengeDetailScreen";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { useChallengeController } from "./src/useChallengeController";

enableScreens();

const Tab = createBottomTabNavigator();

const earlybirdsTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#0b0b0c",
    card: "#121213",
    text: "#f4eee1",
    primary: "#ffd361",
    border: "#1f1c17",
  },
};

export default function App() {
  const controller = useChallengeController();

  return (
    <NavigationContainer theme={earlybirdsTheme}>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: "#0b0b0c",
          },
          headerShadowVisible: false,
          headerTitleStyle: {
            color: "#f4eee1",
            fontWeight: "800",
            letterSpacing: 0.6,
          },
          headerTintColor: "#f4eee1",
          tabBarStyle: {
            backgroundColor: "#121213",
            borderTopColor: "#1f1c17",
            height: 74,
            paddingBottom: 12,
            paddingTop: 8,
          },
          tabBarActiveTintColor: "#ffd361",
          tabBarInactiveTintColor: "#7f776a",
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.4,
          },
        }}
      >
        <Tab.Screen name="Home">{() => <HomeScreen controller={controller} />}</Tab.Screen>
        <Tab.Screen name="Challenge">{() => <ChallengeDetailScreen controller={controller} />}</Tab.Screen>
        <Tab.Screen name="History">{() => <HistoryScreen controller={controller} />}</Tab.Screen>
        <Tab.Screen name="Profile">{() => <ProfileScreen controller={controller} />}</Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
