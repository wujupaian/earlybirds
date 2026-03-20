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
    background: "#f5f1e8",
    card: "#fffdf7",
    text: "#132a13",
    primary: "#bc6c25",
    border: "#e9e1d3",
  },
};

export default function App() {
  const controller = useChallengeController();

  return (
    <NavigationContainer theme={earlybirdsTheme}>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: "#132a13",
          },
          headerTintColor: "#fff8e7",
          tabBarStyle: {
            backgroundColor: "#fffdf7",
            borderTopColor: "#e9e1d3",
            height: 70,
            paddingBottom: 10,
            paddingTop: 8,
          },
          tabBarActiveTintColor: "#bc6c25",
          tabBarInactiveTintColor: "#6b7280",
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
